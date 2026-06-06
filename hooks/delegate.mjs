#!/usr/bin/env node
// WhytCard-Cortex, SubagentStop hook ("Delegation, on return").
// When a subagent hands its result back, ask whether to take it at face value or
// cross-check it, and what to actually do with it now. Guidance only (additionalContext),
// never blocks, always exits 0.
//
// SubagentStop accepts hookSpecificOutput.additionalContext (verified, official docs:
// "Stop and SubagentStop also accept additionalContext for non-error feedback that
// continues the conversation"). The question is universal, so it reads nothing from the
// payload. No decision field is returned, so it can never force a continuation -- it only
// offers the cross-check question as the parent picks the thread back up.
// (docs/DOCTRINE.md.)

let raw = "";
try {
  for await (const chunk of process.stdin) raw += chunk;
} catch {
  // the question does not depend on the payload
}
void raw;

const msg = [
  "[Cortex - Delegation, on return]",
  "A subagent just reported back. Before you build on it:",
  "  - Do you take its result at face value, or does it need a cross-check against the ground truth (the code, a test, the docs)?",
  "  - Does what it returned actually answer what you delegated, or only part of it?",
  "  - What do you do with it now - integrate it, verify it, or send it back sharper?",
].join("\n");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SubagentStop",
      additionalContext: msg,
    },
  })
);
process.exit(0);
