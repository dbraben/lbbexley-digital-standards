#!/usr/bin/env node
'use strict';
// After a tool runs: notes when it changed the dev environment, and when the
// latest version came back into the repository, so the end-of-run check can
// bring it in before the review and the commit. Changes come from Microsoft's
// canvas authoring tools (compile_canvas), its Power Automate tools (creating,
// editing, publishing, turning off or restoring a flow), the Dataverse MCP
// server (creating or changing tables or columns: records aren't part of the
// solution) and pac pages upload. The latest version comes in with
// pac solution sync or clone. Quiet outside Bexley app repositories.

const path = require('path');
const { readStdin, normalise } = require('./lib/hook-io');
const { isBexleyProject } = require('./lib/config');
const { load, save } = require('./lib/state');
const { environmentChange, isSolutionSync } = require('./lib/environment');

// pac reports failures as "Error: ...". Copilot also says whether the tool failed.
function failed(raw) {
  const result = raw.tool_response ?? raw.toolResponse ?? raw.toolResult ?? raw.tool_result ?? {};
  if (typeof result === 'string') return /^\s*error:/im.test(result);
  if (/failure|error|denied/i.test(String(result.resultType ?? ''))) return true;
  if (result.interrupted === true || result.is_error === true) return true;
  return /^\s*error:/im.test(`${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.textResultForLlm ?? ''}`);
}

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const raw = await readStdin();
  const input = normalise(raw);
  const root = input.cwd;
  if (!isBexleyProject(root)) return;
  const command = typeof input.toolInput.command === 'string' ? input.toolInput.command : '';
  const change = environmentChange(input.toolName, command, input.toolInput);
  const synced = isSolutionSync(command) && !failed(raw);
  if (!change && !synced) return;

  const state = load(root, input.sessionId);
  const env = state.environment || {};
  if (change && !failed(raw)) {
    env.pending = true;
    env.changes = [...new Set([...(env.changes || []), change.what])];
    if (change.folder) {
      const rel = path.relative(root, path.resolve(root, change.folder)).replace(/\\/g, '/');
      env.canvasFolders = [...new Set([...(env.canvasFolders || []), rel])];
    }
    env.syncAsks = 0;
  }
  if (synced) {
    env.pending = false;
    env.changes = [];
    env.syncAsks = 0;
  }
  state.environment = env;
  save(root, input.sessionId, state);
})().catch(() => {
  process.exitCode = 0;
});
