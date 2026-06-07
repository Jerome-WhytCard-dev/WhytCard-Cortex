#!/usr/bin/env node
// WhytCard-Cortex, PreToolUse hook on Bash|PowerShell ("Intention before a grave gesture").
// Before an irreversible or destructive command (force push, hard reset, rm -rf, prod deploy,
// drop/truncate, publish, disk wipe...), ask whether it is the right gesture and whether it is
// reversible. Guidance only (additionalContext), NEVER blocks, always exits 0. Silent on
// ordinary commands.
//
// Command, not prompt/agent: free and instant, and the agent answers the question itself.
// Strongly filtered so it only ever speaks on genuinely grave gestures (rare = no flood).
// Scope is the shell (Bash|PowerShell), the main destructive surface; an irreversible gesture
// made through another tool is caught instead by the "Frame" anticipation question, by design
// (a hook on every tool call would flood). (REASONING-PIPELINE.md section 4, docs/DOCTRINE.md.)

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

const cmd = String(((input && input.tool_input) || {}).command || "").trim();
if (!cmd) process.exit(0);

// Whitelist of genuinely destructive / hard-to-reverse gestures. Everything else stays silent.
const grave = [
  /\brm\s+-[a-z]*r/i,
  /\brmdir\b/i,
  /Remove-Item\b[^|]*-Recurse|Remove-Item\b[^|]*-Force/i,
  /\bdel\s+\/[sq]/i,
  /\bshred\b/i,
  /\bdd\b[^|]*\bof=\/dev\//i,
  /\bmkfs\b|>\s*\/dev\/(sd|nvme|hd|disk|mmcblk)/i,
  /\bfind\b[^|]*\s-delete\b/i,
  /\btruncate\b[^|]*-s\s*0\b/i,
  /git\s+push\b[^|]*(--force|-f)\b/i,
  /git\s+push\b[^|]*--mirror|git\s+filter-branch/i,
  /git\s+push\b[^|]*(--delete|--prune)|git\s+push\b[^|]*\s:[A-Za-z]/i,
  /git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|git\s+branch\s+-D|git\s+checkout\s+--\s/i,
  /git\s+stash\s+(clear|drop)\b/i,
  /\bdrop\s+(table|database|schema)\b|\btruncate\s+table\b/i,
  /\bdelete\s+from\b(?![\s\S]*\bwhere\b)/i,
  /(vercel|netlify|wrangler)\b[^|]*(--prod|deploy)|deploy\b[^|]*(prod|production)/i,
  /kubectl\s+delete|terraform\s+(apply|destroy)|docker\s+(system\s+prune|volume\s+rm)/i,
  /\b(npm|pnpm|yarn|cargo)\s+publish\b/i,
];
if (!grave.some((re) => re.test(cmd))) process.exit(0);

const msg = [
  "[Cortex - Intention before a grave gesture]",
  "This gesture is destructive or hard to undo. Before you run it:",
  "  - Is it the right gesture, or the first one that came to mind? What verified ground does it rest on?",
  "  - Is it reversible? If you are wrong here, can you go back, and how?",
  "  - Do you have a safety net (a backup, a branch, a confirmation) if the result is not the one you expect?",
].join("\n");

log(input, { event: "PreToolUse", hook: "intent", action: "emit", note: "Intention before a grave gesture", detail: cmd });

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: msg,
    },
  })
);
process.exit(0);
