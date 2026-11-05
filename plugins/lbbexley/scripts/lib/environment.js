'use strict';
// Which tool calls change the dev environment, and which bring its latest
// version back into the repository, whichever assistant made them.
//
// Claude Code names a project MCP server's tools mcp__<server>__<tool> and a
// plugin's mcp__plugin_<plugin>_<server>__<tool>; VS Code names them
// <server>/<tool>. Commands come from the Bash or PowerShell tool, or VS Code's
// terminal tool, as the command text.

const fs = require('fs');
const path = require('path');

// The last part of a tool name: the operation.
function operation(toolName) {
  return String(toolName || '').split(/__|\//).pop().toLowerCase();
}

const FLOW_CHANGES = new Set(['create_flow', 'edit_flow', 'update_flow', 'publish_flow', 'disable_flow', 'restore_backup']);
const DATAVERSE_CHANGES = /create|update|upsert|insert|patch|import|add|alter/;
// Records aren't part of the solution, so changing them needs no sync.
const DATAVERSE_RECORDS = /record|row|assign|associate/;

// A command that starts with these words, on its own or after another command.
const commandRe = words => new RegExp(`(^|[;&|(]\\s*)pac(\\.exe)?\\s+${words}`, 'i');
const PAGES_UPLOAD = commandRe('pages\\s+upload');
const SOLUTION_SYNC = commandRe('solution\\s+(sync|clone)\\b');
const PAC_ENVIRONMENT = commandRe('(pages\\s+(upload|download)|solution\\s+(sync|clone)\\b)');

// What a tool call changed in the dev environment, or null.
function environmentChange(toolName, command, toolInput = {}) {
  const tool = String(toolName || '');
  const op = operation(tool);
  if (/canvas-authoring/i.test(tool) && op === 'compile_canvas') {
    const folder = ['directory', 'workingDirectory', 'working_directory', 'path', 'folder', 'dir', 'appDirectory']
      .map(k => toolInput[k]).find(v => typeof v === 'string' && v.trim());
    return { what: 'the canvas app', folder: folder || null };
  }
  if (/flowagent/i.test(tool) && FLOW_CHANGES.has(op)) return { what: 'a flow' };
  if (/dataverse/i.test(tool) && DATAVERSE_CHANGES.test(op) && !DATAVERSE_RECORDS.test(op) && !/^(list|describe|get|read|search|fetch)/.test(op)) return { what: 'Dataverse' };
  if (command && PAGES_UPLOAD.test(command)) return { what: 'the Power Pages site' };
  return null;
}

// Did this command bring the solution from the dev environment into the repository?
function isSolutionSync(command) {
  return Boolean(command) && SOLUTION_SYNC.test(command);
}

// Does this pac command read from or write to an environment?
function usesPacEnvironment(command) {
  return Boolean(command) && PAC_ENVIRONMENT.test(command);
}

// The dev environment named in AGENTS.md, or null if there isn't one yet.
function devEnvironmentUrl(root) {
  let text = '';
  try {
    text = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  } catch {
    return null;
  }
  const row = text.match(/^\|\s*Dev environment\s*\|\s*([^|\n]*)\|/im);
  const url = row && row[1].match(/https:\/\/[^\s|)>]+/i);
  return url ? url[0] : null;
}

const host = url => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

module.exports = { operation, environmentChange, isSolutionSync, usesPacEnvironment, devEnvironmentUrl, host };
