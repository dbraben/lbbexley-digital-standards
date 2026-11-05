#!/usr/bin/env node
'use strict';
// Before one of Microsoft's Power Automate (FlowAgent) tools runs:
//   - deleting a flow or a connection, or copying a flow, is blocked: flows are
//     built in the dev environment and moved on only by the pipeline. So is
//     smoke_test, which creates, runs and then deletes a flow
//   - running a flow, resubmitting a run or calling a connector directly asks
//     the person first, because it can send real emails or messages outside
//     the environment
//   - changing the environment or the account it works with asks the person
//     first, so it stays in the dev environment named in AGENTS.md
//   - restoring a backup asks first, because it replaces the flow's definition
//   - everything else, including creating, editing, publishing and turning off
//     flows in the dev environment, goes ahead
// In Copilot this runs before every tool, so anything that isn't a FlowAgent
// tool is let through without comment.

const { readStdin, normalise, toolDecision } = require('./lib/hook-io');
const { operationOf } = require('./lib/environment');

const DENY = {
  delete_flow: 'deleting a flow',
  delete_connection: 'deleting a connection',
  copy_flow: 'copying a flow, which can put it in another environment',
  smoke_test: 'smoke_test, which creates, runs and then deletes a flow',
};
const OUTSIDE = ['run_flow', 'resubmit_run', 'invoke_operation', 'run_desktop_flow', 'cancel_run', 'cancel_all_runs'];
const ENVIRONMENT = ['set_current_env', 'switch_account'];

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const input = normalise(await readStdin());
  const tool = input.toolName;
  if (!/flowagent/i.test(tool)) return;

  const denied = operationOf(tool, Object.keys(DENY));
  if (denied) {
    toolDecision('deny', `Blocked by the Bexley guardrails: ${DENY[denied]} isn't allowed through the assistant. Build flows in the dev environment, inside the solution, and let the pipeline move them on. To stop a flow, turn it off instead.`);
    return;
  }
  const outside = operationOf(tool, OUTSIDE);
  if (outside) {
    toolDecision('ask', `Bexley guardrails: ${outside} runs a flow or a connector, which can send real emails or messages outside the dev environment. Continue only with fictional data and test recipients.`);
    return;
  }
  const environment = operationOf(tool, ENVIRONMENT);
  if (environment) {
    toolDecision('ask', `Bexley guardrails: ${environment} changes the environment or account the assistant works in. Continue only if it's the dev environment named in AGENTS.md.`);
    return;
  }
  if (operationOf(tool, ['restore_backup'])) {
    toolDecision('ask', 'Bexley guardrails: restoring a backup replaces the flow\'s current definition. Continue only in the dev environment.');
  }
})().catch(() => {
  process.exitCode = 0;
});
