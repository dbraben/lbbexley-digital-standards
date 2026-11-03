'use strict';
// Reads hook input and writes hook output for both assistants:
//   - Claude Code (plugin hooks): snake_case input, Claude Code output fields
//   - GitHub Copilot (repository hooks in .github/hooks/lbbexley.json, preview):
//     camelCase or snake_case input, Copilot output fields
// The Copilot hook file sets LBBEXLEY_HARNESS=copilot so the scripts know.

function readStdin() {
  return new Promise(resolve => {
    if (process.stdin.isTTY) return resolve({});
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => (data += chunk));
    process.stdin.on('end', () => {
      try {
        resolve(data.trim() ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));
  });
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function harness() {
  return process.env.LBBEXLEY_HARNESS === 'copilot' ? 'copilot' : 'claude';
}

function parseMaybeJson(v) {
  if (typeof v !== 'string') return v || {};
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}

// One shape for the fields the scripts use, whichever assistant sent them.
function normalise(input) {
  const i = input || {};
  const toolInput = parseMaybeJson(i.tool_input ?? i.toolArgs ?? i.tool_args ?? i.toolInput);
  const paths = [];
  for (const key of ['file_path', 'filePath', 'path', 'filename', 'notebook_path']) {
    if (typeof toolInput[key] === 'string') paths.push(toolInput[key]);
  }
  for (const key of ['paths', 'files', 'filePaths']) {
    if (Array.isArray(toolInput[key])) for (const p of toolInput[key]) if (typeof p === 'string') paths.push(p);
  }
  return {
    sessionId: String(i.session_id ?? i.sessionId ?? 'session'),
    cwd: process.env.CLAUDE_PROJECT_DIR || i.cwd || process.cwd(),
    prompt: String(i.prompt ?? i.userPrompt ?? i.initialPrompt ?? ''),
    toolName: String(i.tool_name ?? i.toolName ?? ''),
    toolInput,
    paths,
    stopHookActive: Boolean(i.stop_hook_active ?? i.stopHookActive),
    agentType: String(i.agent_type ?? i.agentType ?? i.agent_name ?? i.agentName ?? ''),
    lastMessage: String(i.last_assistant_message ?? i.lastAssistantMessage ?? i.result ?? ''),
  };
}

// Context for the assistant at session start.
function sessionContext(text) {
  if (harness() === 'copilot') return emit({ additionalContext: text });
  return emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } });
}

// Allow, ask or deny a tool call.
function toolDecision(decision, reason) {
  if (harness() === 'copilot') return emit({ permissionDecision: decision, permissionDecisionReason: reason });
  return emit({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } });
}

// Problems found after a tool ran. Claude Code is made to fix them straight
// away (exit 2); Copilot gets them as context, and the stop gate enforces them.
function afterTool(text, { mustFix }) {
  if (harness() === 'copilot') return emit({ additionalContext: text });
  if (mustFix) {
    process.stderr.write(text + '\n');
    process.exitCode = 2;
    return undefined;
  }
  return emit({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } });
}

// Keep the assistant working instead of finishing, or let it finish with a
// message for the person.
function blockStop(reason) {
  return emit({ decision: 'block', reason });
}

function allowStop(message) {
  if (message) return emit({ systemMessage: message });
  return undefined;
}

module.exports = { readStdin, emit, harness, normalise, sessionContext, toolDecision, afterTool, blockStop, allowStop };
