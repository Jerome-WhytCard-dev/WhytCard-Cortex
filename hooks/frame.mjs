#!/usr/bin/env node
// WhytCard-Cortex, UserPromptSubmit hook ("Frame before acting").
// On each prompt, inject the single orienting question that carries both forces:
// rigor (what do I know vs. assume) and ambition (the minimum vs. the remarkable).
// Guidance only: it orients, it never blocks. Always exits 0.
//
// Why a fixed `command` here and not a `prompt` (LLM) hook: the framing question is
// universal, so it needs no per-prompt LLM call. Free and instant beats slow and costly
// on something that fires on every single prompt. (REASONING-PIPELINE.md, section 4.)

let raw = "";
try {
  for await (const chunk of process.stdin) raw += chunk;
} catch {
  // the framing question does not depend on the prompt body
}
void raw;

const CONTEXT = [
  "[Cortex - Frame before acting]",
  "Before answering or acting, frame the turn (scaled to the stakes):",
  "  - Beneath the wording, what is actually being asked, and what is the real stake behind it?",
  "  - What do you KNOW (verified this turn) versus what do you ASSUME? Whatever you have not proven, will you verify it or name it as unproven?",
  "  - Is the stake reversible, visible, risky? So where to think first: verify, search, or act?",
  "  - What level are you aiming for: the minimum that works, or the remarkable? The safe minimum is the floor, never the ceiling.",
  "This framing orients everything else: what verified ground do you already stand on, and what is left to prove before moving?",
].join("\n");

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: CONTEXT,
    },
  })
);
process.exit(0);
