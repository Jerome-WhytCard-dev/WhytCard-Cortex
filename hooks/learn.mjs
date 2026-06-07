#!/usr/bin/env node
// WhytCard-Cortex, PostToolUse hook on Bash|PowerShell ("Learn from the action").
// After a command whose RESULT actually teaches something (a test, a build, a lint,
// a push, a deploy...), ask what it changes. This is the most neglected and most
// precious moment of the loop. Guidance only, never blocks, always exits 0.
//
// Flood is the enemy here: PostToolUse can fire constantly. Three guards keep it rare:
//   1. matcher Bash|PowerShell (already excludes Read/Grep/Edit/etc.)
//   2. a whitelist of "carrier" commands below (excludes ls, cat, cd, echo, trivia)
//   3. a per-session time throttle (survives debug bursts that rerun the same test)
// (REASONING-PIPELINE.md, section 4.)

import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
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
  process.exit(0);
}

const ti = (input && input.tool_input) || {};
const cmd = String(ti.command || "").trim();
if (!cmd) process.exit(0);

// Only nudge after commands whose RESULT teaches something. Whitelist, not blacklist:
// anything not matched stays silent.
const carrier = [
  /\btests?\b|jest|vitest|pytest|mocha|playwright|go\s+test|cargo\s+test|phpunit|rspec/i,
  /\bbuild\b|\btsc\b|webpack|vite\s+build|next\s+build|cargo\s+build|go\s+build|\bmake\b|gradle|mvn\s/i,
  /\blint\b|eslint|ruff|clippy|\bmypy\b|type-?check/i,
  /(npm|pnpm|yarn|bun|pip|poetry|cargo|composer)\s+(install|add|ci)\b/i,
  /git\s+(push|pull|merge|rebase|fetch|clone|cherry-pick|revert|reset)\b/i,
  /\bcurl\b|\bwget\b/i,
  /deploy|vercel|docker\s+(build|compose|push)|kubectl|terraform\s+(apply|plan)/i,
  /migrat|prisma\s+(migrate|db)|alembic|flyway/i,
];
if (!carrier.some((re) => re.test(cmd))) process.exit(0);

// Throttle: at most one "learn" nudge per THROTTLE_MS per session, so a burst of
// carrier commands (e.g. rerunning a test in a debug loop) does not flood the context.
const THROTTLE_MS = 60_000;
try {
  const now = Date.now();
  const sid = String((input && input.session_id) || "default").replace(/[^a-zA-Z0-9_-]/g, "");
  const stamp = join(tmpdir(), `cortex-learn-${sid}.txt`);
  let last = 0;
  try {
    last = parseInt(readFileSync(stamp, "utf8").trim(), 10) || 0;
  } catch {
    last = 0;
  }
  if (now - last < THROTTLE_MS) process.exit(0);
  try {
    writeFileSync(stamp, String(now));
  } catch {
    // if the stamp can't be persisted, nudge once rather than crash
  }
} catch {
  // throttle is best-effort; never let it block the hook
}

const msg = [
  "[Cortex - What does this teach you?]",
  "This result just came in. Before moving on:",
  "  - What does it actually teach you? Does it confirm or contradict what you believed?",
  "  - Does your plan still hold, or does this result change it? If it contradicts an assumption, which one, and what do you fix now?",
  "  - Is there a reusable understanding here - a method worth carrying forward - or is it a one-off?",
  "  - If it is reusable, write it as one short, true line in .cortex/memory.md so the next session starts from it instead of relearning it; if it is a one-off, let it go.",
].join("\n");

log(input, { event: "PostToolUse", hook: "learn", action: "emit", note: "What does this teach you?", detail: cmd });

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: msg,
    },
  })
);
process.exit(0);
