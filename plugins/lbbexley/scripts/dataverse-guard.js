#!/usr/bin/env node
'use strict';
// Before a Dataverse MCP tool runs: deletes are blocked. Everything else,
// reading and changing tables, columns and records, goes ahead without asking:
// the Dataverse MCP server points only at the dev environment, which holds
// fictional data only (AGENTS.md), and the end-of-run check brings any change
// into the repository. Matching on the operation name keeps this working as
// Microsoft adds tools. In Copilot this runs before every tool, so anything
// that isn't a Dataverse tool is let through without comment.

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
  }
})().catch(() => {
  process.exitCode = 0;
});
