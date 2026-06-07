#!/usr/bin/env node
// WhytCard-Cortex, PostToolUseFailure hook on Bash|PowerShell ("Rebound from failure").
// When a command fails, ask for the real cause and a different next hypothesis, instead of
// retrying the same thing. Guidance only (additionalContext); this event cannot block
// (the tool already failed). Always exits 0.
//
// The question is universal, so it does NOT depend on the error payload (whose exact field
// name is not documented in the hooks reference). It reads only the standard tool fields.
// (REASONING-PIPELINE.md, section 4.)

import { log } from "./cortex-store.mjs";

let raw = "";
try {
  for await (const chunk of process.stdin) raw += chunk;
} catch {
  process.exit(0);
}

let input;
try {
  input = JSON.parse(raw);
} catch {
  input = {};
}

const cmd = String(((input && input.tool_input) || {}).command || "").trim();
const label = cmd ? cmd.split(/\s+/).slice(0, 4).join(" ") : String((input && input.tool_name) || "this action");

const msg = [
  `[Cortex - Rebound from failure -> ${label}]`,
  "That just failed. Before retrying:",
  "  - What is the real cause, not the symptom? What does this failure reveal that you did not see?",
  "  - Is the answer already written down where you have not looked yet - the full error, the official docs, the source? Reach the ground truth before guessing again.",
  "  - What is your next hypothesis, a different one, rather than rerunning the same thing and hoping for a different result?",
].join("\n");

log(input, { event: "PostToolUseFailure", hook: "rebound", action: "emit", note: "Rebound from failure", detail: cmd || label });

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUseFailure",
      additionalContext: msg,
    },
  })
);
process.exit(0);
