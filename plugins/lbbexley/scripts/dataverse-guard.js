#!/usr/bin/env node
'use strict';
// Before a Dataverse MCP tool runs:
//   - schema tools (list or describe tables) run as normal
//   - deletes are blocked
//   - anything that reads records or changes data asks the person first,
//     with a reminder that only dev environments with fictional data are allowed
// Matching on the operation name keeps this working as Microsoft adds tools.
// In Copilot this runs before every tool, so anything that isn't a Dataverse
// tool is let through without comment.

const { readStdin, normalise, toolDecision, harness } = require('./lib/hook-io');

const SCHEMA_ONLY = /^(list|describe|get)_?(tables?|columns?|schema|metadata|entit(y|ies)|table_?definitions?|knowledge_?sources|prompts)$/;

(async () => {
  if (process.env.LBBEXLEY_NESTED === '1') return;
  const input = normalise(await readStdin());
  const tool = input.toolName;
  if (harness() === 'copilot' && !/dataverse/i.test(tool)) return;
  const op = tool.split(/__|\/|\./).pop().toLowerCase();
  if (!op || SCHEMA_ONLY.test(op)) return;

  if (/delete|drop|truncate|purge/.test(op)) {
    toolDecision('deny', `Blocked by the Bexley guardrails: ${op} deletes Dataverse data or schema. Make deletions yourself in the dev environment, or through a reviewed solution change.`);
    return;
  }
  if (/create|update|upsert|insert|patch|execute|run|import|assign|associate/.test(op)) {
    toolDecision('ask', `Bexley guardrails: ${op} changes Dataverse. Continue only if this is the dev environment.`);
    return;
  }
  toolDecision('ask', `Bexley guardrails: ${op} reads Dataverse records into this conversation. Continue only if this is the dev environment with fictional data, never real resident or staff records.`);
})().catch(() => {
  process.exitCode = 0;
});
