// WhytCard-Cortex, hook behaviour tests. Zero dependencies: Node's built-in test runner.
//   node --test     (or)     npm test
//
// Each hook is exercised as a real process (stdin in, stdout/exit out), exactly as Claude
// Code runs it. We assert the two things that matter: it emits the right question at the
// right moment, and it stays silent (and never crashes) the rest of the time.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hook = (name) => join(root, "hooks", name);

let seq = 0;
const newSession = () => `test-${process.pid}-${Date.now()}-${seq++}`;

// Run a hook with the given stdin; return { stdout, code, context }.
function run(name, input) {
  const res = spawnSync(process.execPath, [hook(name)], {
    input: typeof input === "string" ? input : JSON.stringify(input ?? {}),
    encoding: "utf8",
  });
  let context = null;
  const out = (res.stdout || "").trim();
  if (out) {
    const parsed = JSON.parse(out); // must be valid JSON when anything is emitted
    context = parsed.hookSpecificOutput?.additionalContext ?? null;
  }
  return { stdout: out, code: res.status, context, raw: res };
}

const emits = (name, input) => {
  const r = run(name, input);
  assert.equal(r.code, 0, `${name} should exit 0`);
  assert.ok(r.context && r.context.includes("[Cortex"), `${name} should emit a Cortex question`);
  return r;
};

const silent = (name, input) => {
  const r = run(name, input);
  assert.equal(r.code, 0, `${name} should exit 0`);
  assert.equal(r.stdout, "", `${name} should stay silent`);
  return r;
};

// ---------------------------------------------------------------- frame (UserPromptSubmit)
test("frame: emits on a substantive prompt", () => {
  const r = emits("frame.mjs", { prompt: "refactor the auth module" });
  assert.match(r.context, /Frame before acting/);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, "UserPromptSubmit");
});
test("frame: emits even on empty stdin", () => emits("frame.mjs", ""));
test("frame: emits on a short real request", () => emits("frame.mjs", { prompt: "deploy" }));
test("frame: silent on a bare pleasantry", () => {
  silent("frame.mjs", { prompt: "thanks!" });
  silent("frame.mjs", { prompt: "ok" });
  silent("frame.mjs", { prompt: "merci" });
});

// ---------------------------------------------------------------- intent (PreToolUse)
test("intent: emits on grave gestures", () => {
  for (const command of [
    "git push --force origin main",
    "rm -rf build/",
    "sudo rm -rf /var/data",
    "dd if=/dev/zero of=/dev/sda",
    "mkfs.ext4 /dev/sdb",
    "find . -name node_modules -delete",
    "truncate -s 0 important.log",
    "git push origin :feature",
    "git stash clear",
    "shred secret.key",
    "psql -c \"delete from users\"",
    "git reset --hard HEAD~3",
  ]) {
    const r = emits("intent.mjs", { tool_input: { command } });
    assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, "PreToolUse", command);
  }
});
test("intent: silent on ordinary or guarded commands", () => {
  for (const command of [
    "git status",
    "ls -la",
    "psql -c \"delete from t where id=1\"",
    "git push origin main",
    "git checkout -b feature",
    "cat file.txt",
  ]) {
    silent("intent.mjs", { tool_input: { command } });
  }
});
test("intent: no false positive on multiline DELETE ... WHERE", () => {
  silent("intent.mjs", { tool_input: { command: "psql -c \"delete from t\nwhere id=1\"" } });
});

// ---------------------------------------------------------------- learn (PostToolUse)
test("learn: emits on a carrier command, then throttles", () => {
  const session_id = newSession();
  const r = emits("learn.mjs", { session_id, tool_input: { command: "npm test" } });
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, "PostToolUse");
  // immediate second carrier call in the same session is throttled
  silent("learn.mjs", { session_id, tool_input: { command: "npm test" } });
});
test("learn: silent on trivial commands", () => {
  silent("learn.mjs", { session_id: newSession(), tool_input: { command: "ls -la" } });
  silent("learn.mjs", { session_id: newSession(), tool_input: { command: "cd src" } });
});
test("learn: emits on a deploy/build/git carrier", () => {
  emits("learn.mjs", { session_id: newSession(), tool_input: { command: "git push origin main" } });
  emits("learn.mjs", { session_id: newSession(), tool_input: { command: "vite build" } });
});

// ---------------------------------------------------------------- rebound (PostToolUseFailure)
test("rebound: emits with a command label", () => {
  const r = emits("rebound.mjs", { tool_input: { command: "npm run build --prod" } });
  assert.match(r.context, /npm run build/);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, "PostToolUseFailure");
});
test("rebound: emits a generic label when no command is present", () => {
  emits("rebound.mjs", { tool_name: "Bash" });
});

// ---------------------------------------------------------------- orient (SessionStart)
test("orient: emits the orient question on startup/resume/clear", () => {
  for (const source of ["startup", "resume", "clear"]) {
    const r = emits("orient.mjs", { source });
    assert.match(r.context, /Orient before working/);
    assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, "SessionStart");
  }
});
test("orient: emits the recovery question after a compaction", () => {
  const r = emits("orient.mjs", { source: "compact" });
  assert.match(r.context, /Re-orient after compaction/);
});

// ---------------------------------------------------------------- delegate (SubagentStop)
test("delegate: emits the cross-check question", () => {
  const r = emits("delegate.mjs", {});
  assert.match(r.context, /Delegation, on return/);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.hookEventName, "SubagentStop");
});

// ---------------------------------------------------------------- robustness
test("every command hook survives malformed JSON and exits 0", () => {
  for (const name of ["frame.mjs", "intent.mjs", "learn.mjs", "rebound.mjs", "orient.mjs", "delegate.mjs"]) {
    const r = run(name, "NOT JSON {{{");
    assert.equal(r.code, 0, `${name} must exit 0 on garbage input`);
  }
});

// ---------------------------------------------------------------- manifests
test("all JSON manifests parse", () => {
  for (const f of [
    "hooks/hooks.json",
    ".claude-plugin/plugin.json",
    ".claude-plugin/marketplace.json",
    "package.json",
  ]) {
    JSON.parse(readFileSync(join(root, f), "utf8"));
  }
});
test("hooks.json wires every referenced hook file and only those", () => {
  const cfg = JSON.parse(readFileSync(join(root, "hooks/hooks.json"), "utf8"));
  const referenced = JSON.stringify(cfg).match(/hooks\/([a-z]+\.mjs)/g) || [];
  assert.ok(referenced.length >= 6, "expected at least 6 command hooks wired");
  for (const ref of referenced) {
    const file = ref.replace("hooks/", "");
    assert.doesNotThrow(() => readFileSync(hook(file), "utf8"), `${file} referenced but missing`);
  }
});
