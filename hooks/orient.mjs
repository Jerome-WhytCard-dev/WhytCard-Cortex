#!/usr/bin/env node
// WhytCard-Cortex, SessionStart hook ("Orient before working").
// At a session boundary (startup, resume, clear, or right after a compaction), inject the
// orienting question: where does this work stand, and -- above all -- what tools, docs and
// resources are available RIGHT NOW, so the agent uses them instead of improvising.
// Guidance only (additionalContext), never blocks, always exits 0.
//
// SessionStart supports additionalContext (verified, official docs, with a worked example).
// On the `compact` source it asks the recovery question instead (what essential thread to
// re-establish), because PreCompact itself cannot inject context -- so the "memory across
// forgetting" concern is carried here, through a channel that actually works.
// (REASONING-PIPELINE.md, docs/DOCTRINE.md.)

let raw = "";
try {
  for await (const chunk of process.stdin) raw += chunk;
} catch {
  // the orienting question does not depend on the payload
}

let input = {};
try {
  input = JSON.parse(raw) || {};
} catch {
  input = {};
}

// SessionStart exposes how the session began (startup | resume | clear | compact).
const source = String(input.source || input.matcher || "startup").toLowerCase();

const orient = [
  "[Cortex - Orient before working]",
  "Before touching anything, get your bearings (scaled to the stakes):",
  "  - Where does this work stand: what is already decided or in flight that you must respect, and what changed since last time?",
  "  - What is actually available to you RIGHT NOW - tools, MCP servers, skills, official docs, the codebase itself? Inventory them and reach for the right one instead of improvising by hand.",
  "  - What do you genuinely know about this project versus what you would only be assuming? For the gaps, where is the ground truth, and how will you reach it?",
  "Start from solid ground and from the resources you actually have - don't reinvent what a tool or a doc already gives you.",
].join("\n");

const recover = [
  "[Cortex - Re-orient after compaction]",
  "The context was just compacted; some detail is now gone. Before continuing:",
  "  - What is the essential thread - the goal, the decisions already made, the state reached - that you must re-establish from what remains?",
  "  - What might have been lost that you should re-verify against the ground truth (the code, the docs, the transcript) rather than assume?",
  "  - Are you still on the path to the original goal, or has the thread quietly drifted?",
].join("\n");

const context = source === "compact" ? recover : orient;

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
  })
);
process.exit(0);
