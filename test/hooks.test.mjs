// WhytCard-Cortex, hook behaviour tests. Zero dependencies: Node's built-in test runner.
//   node --test     (or)     npm test
//
// Each hook is exercised as a real process (stdin in, stdout/exit out), exactly as Claude
// Code runs it. We assert the two things that matter: it emits the right question at the
// right moment, and it stays silent (and never crashes) the rest of the time.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hook = (name) => join(root, "hooks", name);
const cliPath = join(root, "cortex.mjs");

// Run the cortex CLI against a given project, with the store enabled. Returns { out, code }.
function runCli(args, proj) {
  const res = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: "utf8",
    env: { ...process.env, CORTEX_LOG: "1", CLAUDE_PROJECT_DIR: proj },
  });
  return { out: (res.stdout || "").trim(), code: res.status };
}

let seq = 0;
const newSession = () => `test-${process.pid}-${Date.now()}-${seq++}`;

// Run a hook with the given stdin; return { stdout, code, context }.
// File I/O (the .cortex/ store) is OFF by default here (CORTEX_LOG=0) so the behaviour tests
// stay pure and never write into the working tree. The persistence tests below re-enable it
// against a throwaway temp project via opts.env.
function run(name, input, opts = {}) {
  const res = spawnSync(process.execPath, [hook(name)], {
    input: typeof input === "string" ? input : JSON.stringify(input ?? {}),
    encoding: "utf8",
    env: { ...process.env, CORTEX_LOG: "0", ...(opts.env || {}) },
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

// ---------------------------------------------------------------- the .cortex/ store
// A fresh temp project per test, with the store ENABLED and pointed at it via CLAUDE_PROJECT_DIR.
function withProject(fn) {
  const proj = mkdtempSync(join(tmpdir(), "cortex-test-"));
  const on = (name, input) => run(name, input, { env: { CORTEX_LOG: "1", CLAUDE_PROJECT_DIR: proj } });
  try {
    return fn(proj, on);
  } finally {
    rmSync(proj, { recursive: true, force: true });
  }
}
const logLines = (proj) => {
  const f = join(proj, ".cortex", "log.jsonl");
  return existsSync(f) ? readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};

test("store: a speaking hook seeds .cortex/ and appends exactly one log line", () => {
  withProject((proj, on) => {
    const r = on("frame.mjs", { prompt: "refactor the auth module", session_id: "s1" });
    assert.equal(r.code, 0);
    assert.ok(existsSync(join(proj, ".cortex", "memory.md")), "memory.md seeded");
    assert.ok(existsSync(join(proj, ".cortex", ".gitignore")), ".gitignore seeded");
    const entries = logLines(proj);
    assert.equal(entries.length, 1, "one line per speaking hook");
    assert.equal(entries[0].hook, "frame");
    assert.equal(entries[0].action, "emit");
    assert.equal(entries[0].detail, "refactor the auth module");
    assert.ok(entries[0].ts && entries[0].event === "UserPromptSubmit");
  });
});

test("store: a silent hook writes nothing", () => {
  withProject((proj, on) => {
    on("frame.mjs", { prompt: "merci" });
    assert.equal(logLines(proj).length, 0, "no line when the hook stays silent");
  });
});

test("store: the seeded .gitignore keeps memory.md but ignores the log", () => {
  withProject((proj, on) => {
    on("frame.mjs", { prompt: "do real work" });
    const gi = readFileSync(join(proj, ".cortex", ".gitignore"), "utf8");
    // Look at the rules only (drop comments and blanks): log ignored, memory kept.
    const rules = gi.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
    assert.ok(rules.includes("log.jsonl"), "log.jsonl is ignored");
    assert.ok(!rules.some((r) => r.includes("memory.md")), "memory.md is not ignored");
  });
});

test("store: CORTEX_LOG=0 disables all file I/O", () => {
  const proj = mkdtempSync(join(tmpdir(), "cortex-test-"));
  try {
    run("frame.mjs", { prompt: "a real task" }, { env: { CORTEX_LOG: "0", CLAUDE_PROJECT_DIR: proj } });
    assert.ok(!existsSync(join(proj, ".cortex")), "no .cortex/ created when disabled");
  } finally {
    rmSync(proj, { recursive: true, force: true });
  }
});

test("orient: confirms activation and re-injects accumulated memory", () => {
  withProject((proj, on) => {
    mkdirSync(join(proj, ".cortex"), { recursive: true });
    writeFileSync(join(proj, ".cortex", "memory.md"), "# Cortex memory\n\n- The build requires Node 24.\n");
    const r = on("orient.mjs", { source: "startup", session_id: "s2" });
    assert.match(r.context, /\[Cortex active\]/);
    assert.match(r.context, /1 memory note/);
    assert.match(r.context, /The build requires Node 24/);
    assert.match(r.context, /Orient before working/);
    const entries = logLines(proj);
    assert.equal(entries[0].hook, "orient");
    assert.equal(entries[0].memory_notes, 1);
  });
});

test("orient: reports no memory when none has accumulated yet", () => {
  withProject((proj, on) => {
    const r = on("orient.mjs", { source: "startup" });
    assert.match(r.context, /\[Cortex active\]/);
    assert.match(r.context, /No durable project memory yet/);
  });
});

// ------------------------------------------------------- the CLI (config + guide manipulation)
test("cli: init sets the working language, show reflects it", () => {
  withProject((proj) => {
    runCli(["init", "--lang=Français", "--scope=project"], proj);
    const r = runCli(["show"], proj);
    assert.equal(r.code, 0);
    assert.match(r.out, /Language : Français/);
    assert.match(r.out, /open \(learning on\)/);
    assert.match(r.out, /Reflexes/);
  });
});

test("cli: add is de-duplicated, show numbers the rules, forget removes by text", () => {
  withProject((proj) => {
    runCli(["add", "use 2-space indent"], proj);
    const dup = runCli(["add", "use 2-space indent"], proj);
    assert.match(dup.out, /1 rule/, "duplicate add does not grow the guide");
    assert.match(runCli(["show"], proj).out, /1\. use 2-space indent/);
    assert.match(runCli(["forget", "2-space"], proj).out, /Removed:/);
    assert.match(runCli(["show"], proj).out, /0 rule/);
  });
});

test("cli: forget by index removes the right rule", () => {
  withProject((proj) => {
    runCli(["add", "rule one"], proj);
    runCli(["add", "rule two"], proj);
    runCli(["forget", "1"], proj);
    const r = runCli(["show"], proj).out;
    assert.doesNotMatch(r, /rule one/);
    assert.match(r, /1\. rule two/);
  });
});

test("cli: lock and unlock flip the status", () => {
  withProject((proj) => {
    runCli(["lock"], proj);
    assert.match(runCli(["show"], proj).out, /LOCKED/);
    runCli(["unlock"], proj);
    assert.match(runCli(["show"], proj).out, /open \(learning on\)/);
  });
});

test("cli: status emits valid JSON with config, guide and the seven reflexes", () => {
  withProject((proj) => {
    runCli(["add", "verify before asserting"], proj);
    const data = JSON.parse(runCli(["status"], proj).out);
    assert.equal(data.guide.count, 1);
    assert.equal(data.config.locked, false);
    // Exactly 7 conceptual reflexes (the REFLEXES list in cortex.mjs): the 6 command-hook .mjs
    // files plus Self-critique, which is the inline `prompt` hook in hooks.json (no .mjs). That
    // is why the "wires every referenced hook file" test above counts >= 6, and this one == 7.
    assert.ok(Array.isArray(data.reflexes) && data.reflexes.length === 7);
  });
});

// ------------------------------------------------------- the guide, injected by the reflexes
test("frame: injects the inherited guide and working language when set", () => {
  withProject((proj, on) => {
    runCli(["init", "--lang=Français"], proj);
    runCli(["add", "always run the tests before pushing"], proj);
    const r = on("frame.mjs", { prompt: "ship the feature" });
    assert.match(r.context, /Frame before acting/); // the base question is still the floor
    assert.match(r.context, /Working language: Français/);
    assert.match(r.context, /always run the tests before pushing/);
    assert.match(r.context, /Watch for a durable preference/); // not locked -> capture nudge on
  });
});

test("frame: when locked, the guide is still followed but the capture nudge is off", () => {
  withProject((proj, on) => {
    runCli(["add", "prefer composition over inheritance"], proj);
    runCli(["lock"], proj);
    const r = on("frame.mjs", { prompt: "design the module" });
    assert.match(r.context, /prefer composition over inheritance/);
    assert.match(r.context, /locked/);
    assert.doesNotMatch(r.context, /Watch for a durable preference/);
  });
});

test("frame: stays silent on a pleasantry even when a guide exists", () => {
  withProject((proj, on) => {
    runCli(["add", "be concise"], proj);
    assert.equal(on("frame.mjs", { prompt: "merci" }).stdout, "");
  });
});

test("orient: loads the guide and working language at session start", () => {
  withProject((proj, on) => {
    runCli(["init", "--lang=Español"], proj);
    runCli(["add", "document public APIs"], proj);
    const r = on("orient.mjs", { source: "startup" });
    assert.match(r.context, /Orient before working/);
    assert.match(r.context, /Working language: Español/);
    assert.match(r.context, /document public APIs/);
  });
});
