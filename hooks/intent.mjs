#!/usr/bin/env node
// WhytCard-Cortex, PreToolUse hook on Bash|PowerShell ("Intention before a grave gesture").
// Before an irreversible or destructive command (force push, hard reset, rm -rf, prod deploy,
// drop/truncate, publish...), ask whether it is the right gesture and whether it is reversible.
// Guidance only (additionalContext), NEVER blocks, always exits 0. Silent on ordinary commands.
//
// Command, not prompt/agent: free and instant, and the agent answers the question itself.
// Strongly filtered so it only ever speaks on genuinely grave gestures (rare = no flood).
// (REASONING-PIPELINE.md, section 4.)

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
  /git\s+push\b[^|]*(--force|-f)\b/i,
  /git\s+push\b[^|]*--mirror|git\s+filter-branch/i,
  /git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|git\s+branch\s+-D|git\s+checkout\s+--\s/i,
  /\bdrop\s+(table|database|schema)\b|\btruncate\s+table\b/i,
  /\bdelete\s+from\b(?!.*\bwhere\b)/i,
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

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: msg,
    },
  })
);
process.exit(0);
