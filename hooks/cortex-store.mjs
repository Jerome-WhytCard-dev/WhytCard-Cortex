#!/usr/bin/env node
// WhytCard-Cortex, shared persistence helper for the project's `.cortex/` folder.
// Two artefacts, both serving the doctrine ("questions, not orders"), never replacing it:
//   - `.cortex/log.jsonl`  -- one structured line each time a hook actually SPEAKS, so the
//                             user can SEE what reaction Cortex triggered, and when.
//   - `.cortex/memory.md`  -- durable, project-specific understanding. The agent writes it
//                             (the Learn hook invites it to); Orient re-reads it every session.
//                             The hook still only asks; the model still provides the content.
//
// Zero dependencies. Every function here is BEST-EFFORT: it must never throw, so a hook that
// uses it always still exits 0 and behaves exactly as before if the filesystem refuses.
// Set CORTEX_LOG=0 (or off/false/no) to disable all file I/O and keep the pure reflex plugin.

import { mkdirSync, appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// File I/O is opt-out: on by default, silenced by CORTEX_LOG=0|off|false|no.
const DISABLED = /^(0|off|false|no)$/i.test(String(process.env.CORTEX_LOG ?? ""));

// Resolve the project root the way Claude Code exposes it: CLAUDE_PROJECT_DIR first (set by
// Claude Code for hooks), then the hook payload's `cwd`, then the process cwd as a last resort.
export function projectRoot(input) {
  const fromEnv = process.env.CLAUDE_PROJECT_DIR;
  const fromInput = input && typeof input.cwd === "string" ? input.cwd : "";
  return fromEnv || fromInput || process.cwd();
}

// Seeded once, then owned by the project. memory.md is kept (shared, durable); the local log
// is ignored by default. Each project edits this file to choose its own policy ("selon le projet").
const SEED_GITIGNORE = [
  "# WhytCard-Cortex working files -- edit this per project to choose what git tracks.",
  "# Default policy: the curated memory.md is kept (shared, durable); the local log is ignored.",
  "log.jsonl",
  "",
].join("\n");

const SEED_MEMORY = [
  "# Cortex memory",
  "",
  "> Durable, project-specific understanding worth carrying across sessions.",
  "> Cortex re-reads this file at the start of every session, and the Learn reflex asks the",
  "> agent to add a line here whenever a result teaches something reusable.",
  "> Keep it short and true: facts verified, decisions made, traps to avoid -- not a diary.",
  "",
].join("\n");

const SEED_README = [
  "# `.cortex/`",
  "",
  "Working memory for the WhytCard-Cortex reasoning hooks.",
  "",
  "- **`memory.md`** -- durable, project-specific understanding. The agent curates it; Orient",
  "  re-injects it at every session start so hard-won knowledge is not relearned each time.",
  "- **`log.jsonl`** -- one line each time a Cortex hook actually speaks (the reaction it",
  "  triggered, with a timestamp). Your window into what the plugin is doing. Local by default.",
  "- **`.gitignore`** -- the git policy for this folder. Edit it per project.",
  "",
  "Disable all of this (back to pure stateless reflexes) with `CORTEX_LOG=0`.",
  "",
].join("\n");

// Ensure `.cortex/` exists and is seeded once. Returns its absolute path, or null if file
// I/O is disabled or the directory cannot be created.
export function ensureDir(root) {
  if (DISABLED) return null;
  try {
    const dir = join(root, ".cortex");
    mkdirSync(dir, { recursive: true });
    seedOnce(join(dir, ".gitignore"), SEED_GITIGNORE);
    seedOnce(join(dir, "memory.md"), SEED_MEMORY);
    seedOnce(join(dir, "README.md"), SEED_README);
    return dir;
  } catch {
    return null;
  }
}

function seedOnce(file, content) {
  try {
    if (!existsSync(file)) writeFileSync(file, content);
  } catch {
    // best-effort
  }
}

// Append one structured line to `.cortex/log.jsonl`. Call this ONLY when a hook speaks.
// `detail` is truncated and flattened so the log never bloats or spans lines.
export function log(input, entry) {
  if (DISABLED) return;
  try {
    const dir = ensureDir(projectRoot(input));
    if (!dir) return;
    const session = String((input && input.session_id) || "").slice(0, 64);
    const detail = entry && entry.detail != null
      ? String(entry.detail).replace(/\s+/g, " ").trim().slice(0, 160)
      : undefined;
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      session,
      ...entry,
      ...(detail !== undefined ? { detail } : {}),
    });
    appendFileSync(join(dir, "log.jsonl"), line + "\n");
  } catch {
    // never let logging break a hook
  }
}

// Read the curated memory, capped so it can never flood the Orient context. Returns
// { text, notes, truncated } or null. `notes` counts real content lines (ignoring blanks,
// markdown headings and the seeded quote block) as a rough signal of accumulated knowledge.
const CAP = 4000;
export function readMemory(root) {
  if (DISABLED) return null;
  try {
    const file = join(root, ".cortex", "memory.md");
    if (!existsSync(file)) return null;
    let text = readFileSync(file, "utf8");
    const notes = text
      .split(/\r?\n/)
      .filter((l) => l.trim() && !/^\s*(#|>)/.test(l)).length;
    if (notes === 0) return { text: "", notes: 0, truncated: false };
    let truncated = false;
    if (text.length > CAP) {
      text = text.slice(0, CAP);
      truncated = true;
    }
    return { text: text.trim(), notes, truncated };
  } catch {
    return null;
  }
}

export { DISABLED };
