#!/usr/bin/env node
// WhytCard-Cortex, UserPromptSubmit hook ("Frame before acting").
// On each substantive prompt, inject the single orienting question that carries the forces
// a good start needs at once: understand the real ask, separate what is KNOWN from what is
// ASSUMED (and go to the ground truth for the gaps), use the tools actually available, look
// one step ahead, and aim past the bare minimum.
// Guidance only: it orients, it never blocks. Always exits 0.
//
// A fixed `command`, not a per-prompt LLM call: the framing question is universal, so it
// stays free and instant on something that fires on every prompt. It steps aside only for a
// pure pleasantry (a bare "thanks" / "ok"), so it does not flood non-tasks.
// (REASONING-PIPELINE.md section 4, docs/DOCTRINE.md.)

import { log, projectRoot, guideContext } from "./cortex-store.mjs";

let raw = "";
try {
  for await (const chunk of process.stdin) raw += chunk;
} catch {
  raw = "";
}

let input = {};
try {
  input = JSON.parse(raw) || {};
} catch {
  input = {};
}
const prompt = String(input.prompt || "");

// Step aside for a pure pleasantry / acknowledgement: framing it is noise, not thought.
// Conservative on purpose -- it only skips when the WHOLE prompt is an obvious non-task,
// so it never suppresses a real (even short) request like "deploy" or "fix it".
const trivial =
  /^\s*(thanks?|thank you|thx|ok(ay)?|cool|nice|great|perfect|got it|merci|d'accord|parfait|bravo|👍|🙏)\s*[.!]*\s*$/i;
if (prompt && trivial.test(prompt)) process.exit(0);

const CONTEXT = [
  "[Cortex - Frame before acting]",
  "Before answering or acting, frame the turn (scaled to the stakes):",
  "  - Beneath the wording, what is actually being asked, and what is the real stake behind it?",
  "  - What do you KNOW (verified this turn) versus what do you ASSUME? For anything unproven, go to the ground truth - official docs, the actual code, a quick test - instead of trusting memory.",
  "  - What tools, MCP servers and resources are available to you right now? Reach for the right existing one rather than improvising by hand.",
  "  - Look one step ahead: what will this require next, what could go wrong, what are you not seeing yet?",
  "  - What level are you aiming for: the minimum that works, or the remarkable? The safe minimum is the floor, never the ceiling.",
  "Build your own method from these answers - that is the work, not waiting to be told how.",
].join("\n");

log(input, { event: "UserPromptSubmit", hook: "frame", action: "emit", note: "Frame before acting", detail: prompt });

// Append the inherited guide (the user's durable preferences) + working language, and the watch
// nudge that lets new preferences be captured. Best-effort: empty string when the store is off or
// nothing has been set yet, so the pure framing question is always the floor.
const guide = guideContext(projectRoot(input), { watch: true });
const additionalContext = guide ? `${CONTEXT}\n\n${guide}` : CONTEXT;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext,
    },
  })
);
process.exit(0);
