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
//
// This is also where the persistent side of Cortex surfaces: it confirms the plugin is active
// (visible feedback), re-reads the project's `.cortex/memory.md` and injects it so hard-won
// understanding is not relearned each session, and logs the activation. All of it is
// best-effort via cortex-store and silenced by CORTEX_LOG=0 -- the question always fires.

import { projectRoot, ensureDir, readMemory, guideContext, log } from "./cortex-store.mjs";

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

const question = source === "compact" ? recover : orient;

// Confirm activation, and load the durable project memory so it resurfaces this session.
// Best-effort: if the store is disabled or unreadable, we just emit the question alone.
const root = projectRoot(input);
ensureDir(root);
const mem = readMemory(root);
const noteCount = mem ? mem.notes : 0;

const banner =
  noteCount > 0
    ? `[Cortex active] ${noteCount} memory note(s) loaded from .cortex/memory.md.`
    : "[Cortex active] No durable project memory yet (.cortex/memory.md); it grows as results teach something reusable.";

const parts = [banner, "", question];
if (mem && noteCount > 0 && mem.text) {
  parts.push(
    "",
    "--- Project memory (.cortex/memory.md), carried from earlier sessions ---",
    mem.text,
    mem.truncated ? "[...truncated; open .cortex/memory.md for the rest]" : null
  );
}

// Load the inherited guide + working language, so the session starts already speaking the user's
// language and following their preferences. Best-effort, empty when nothing is set.
const gctx = guideContext(root);
if (gctx) parts.push("", gctx);

const context = parts.filter((p) => p !== null).join("\n").trimEnd();

log(input, {
  event: "SessionStart",
  hook: "orient",
  action: source === "compact" ? "recover" : "orient",
  memory_notes: noteCount,
  detail: source,
});

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: context,
    },
  })
);
process.exit(0);
