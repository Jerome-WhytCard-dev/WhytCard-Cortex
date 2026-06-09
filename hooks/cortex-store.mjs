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
  "- **`guide.md`** -- your *inherited reasoning*: durable preferences about HOW the agent should",
  "  work here, captured with your consent. Injected at the start of every prompt and session so",
  "  the agent follows your way. Steer it with the `cortex-*` commands (cortex-add / cortex-forget / cortex-lock).",
  "- **`memory.md`** -- durable, project-specific *facts* the agent verified (decisions, traps).",
  "  Orient re-injects it at every session start so hard-won knowledge is not relearned each time.",
  "- **`config.json`** -- Cortex settings for this project (working language, lock state, scope),",
  "  set once by the `init` command.",
  "- **`log.jsonl`** -- one line each time a Cortex hook actually speaks (the reaction it",
  "  triggered, with a timestamp). Your window into what the plugin is doing. Local by default.",
  "- **`.gitignore`** -- the git policy for this folder. Edit it per project.",
  "",
  "Disable all of this (back to pure stateless reflexes) with `CORTEX_LOG=0`.",
  "",
].join("\n");

const SEED_GUIDE = [
  "# Cortex guide",
  "",
  "> Your inherited reasoning: durable preferences about HOW the agent should work here,",
  "> captured with your consent. Cortex injects these at the start of every prompt and session,",
  "> so the agent follows your way rather than a generic default. One short, true, actionable",
  "> line per rule. Add or drop them with cortex-add / cortex-forget, or freeze with cortex-lock.",
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
    seedOnce(join(dir, "guide.md"), SEED_GUIDE);
    seedOnce(join(dir, "README.md"), SEED_README);
    return dir;
  } catch {
    return null;
  }
}

// Write `content` to `file` only if it does not exist yet. Best-effort; never throws.
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

// ----------------------------------------------------------------------------- config + guide
// The persistent side grows a second artefact beside memory.md: a *guide* -- the user's durable
// preferences about HOW the agent should work here ("inherited reasoning"), captured by consent
// and injected at the boundaries (Frame, Orient) so it actually steers behaviour. Plus a small
// config (working language, lock state) set once by the `init` command. Both are best-effort and
// honour CORTEX_LOG=0 exactly like the log: when the store is off, they all no-op.
//
// guide.md (HOW to work, the user's preferences) is kept distinct from memory.md (WHAT is true
// about the project, verified facts): one steers behaviour, the other recalls knowledge.

const CONFIG_DEFAULTS = { version: 1, language: "", locked: false, scope: "project" };
const GUIDE_CAP = 2000;

// Read the project config (.cortex/config.json), merged over the defaults. Never throws.
export function readConfig(root) {
  if (DISABLED) return { ...CONFIG_DEFAULTS };
  try {
    const file = join(root, ".cortex", "config.json");
    if (!existsSync(file)) return { ...CONFIG_DEFAULTS };
    return { ...CONFIG_DEFAULTS, ...(JSON.parse(readFileSync(file, "utf8")) || {}) };
  } catch {
    return { ...CONFIG_DEFAULTS };
  }
}

// Merge `patch` into the config and persist it. Returns the new config, or null if I/O is off.
export function writeConfig(root, patch) {
  if (DISABLED) return null;
  try {
    const dir = ensureDir(root);
    if (!dir) return null;
    const next = { ...readConfig(root), ...(patch || {}) };
    writeFileSync(join(dir, "config.json"), JSON.stringify(next, null, 2) + "\n");
    return next;
  } catch {
    return null;
  }
}

// Read the guide (.cortex/guide.md). Returns { text, rules[], count } or null. A "rule" is any
// "- ..." bullet line; the heading and the seeded quote block do not count.
export function readGuide(root) {
  if (DISABLED) return null;
  try {
    const file = join(root, ".cortex", "guide.md");
    if (!existsSync(file)) return null;
    const text = readFileSync(file, "utf8");
    const rules = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).trim())
      .filter(Boolean);
    return { text, rules, count: rules.length };
  } catch {
    return null;
  }
}

// Append one rule to the guide, de-duplicated (case-insensitive). Returns the new guide or null.
export function appendRule(root, rule) {
  if (DISABLED) return null;
  const clean = String(rule || "").replace(/\s+/g, " ").trim();
  if (!clean) return null;
  try {
    const dir = ensureDir(root);
    if (!dir) return null;
    const cur = readGuide(root);
    if (cur && cur.rules.some((r) => r.toLowerCase() === clean.toLowerCase())) return cur;
    appendFileSync(join(dir, "guide.md"), `- ${clean}\n`);
    return readGuide(root);
  } catch {
    return null;
  }
}

// Remove a rule by 1-based index (a digits-only `match`) or by case-insensitive substring.
// Removes at most one (the first hit). Returns { removed, guide } or null.
export function removeRule(root, match) {
  if (DISABLED) return null;
  const m = String(match || "").trim();
  if (!m) return null;
  try {
    const file = join(root, ".cortex", "guide.md");
    if (!existsSync(file)) return null;
    const asIndex = /^\d+$/.test(m) ? parseInt(m, 10) : null;
    let idx = 0;
    let removed = null;
    const kept = readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => {
        const t = line.trim();
        if (!t.startsWith("- ")) return true;
        idx++;
        const body = t.slice(2).trim();
        const hit = asIndex ? idx === asIndex : body.toLowerCase().includes(m.toLowerCase());
        if (hit && removed === null) {
          removed = body;
          return false;
        }
        return true;
      });
    if (removed !== null) writeFileSync(file, kept.join("\n"));
    return { removed, guide: readGuide(root) };
  } catch {
    return null;
  }
}

// Build the context block injected by Frame and Orient: the working-language line (if set) and
// the guide rules (capped). With { watch: true } it also adds the capture nudge (Frame only,
// and only when not locked). Returns "" when there is nothing to say or I/O is off. The
// scaffolding stays in English like the other reflexes; the rules and the language line carry
// the localisation and the actual steering.
export function guideContext(root, opts = {}) {
  if (DISABLED) return "";
  try {
    const cfg = readConfig(root);
    const guide = readGuide(root);
    const parts = [];
    const lang = String(cfg.language || "").trim();
    if (lang) parts.push(`[Cortex] Working language: ${lang} -- reason and reply in ${lang}.`);
    if (guide && guide.count > 0) {
      let body = guide.rules.map((r) => `  - ${r}`).join("\n");
      if (body.length > GUIDE_CAP) body = body.slice(0, GUIDE_CAP) + "\n  - [...truncated; see .cortex/guide.md]";
      parts.push(
        `[Cortex - Your inherited guide (${guide.count} rule(s)${cfg.locked ? ", locked" : ""})]`,
        "How the user wants you to work on this project, inherited across sessions. Follow it:",
        body
      );
    }
    if (opts.watch && !cfg.locked) {
      parts.push(
        "[Cortex - Watch for a durable preference]",
        "If the user states a durable preference about how you should work (a standing always/never/prefer, or a correction of your behaviour) that is not already in the guide above, offer to save it to their guide -- ask, don't impose. If they retract one, drop it."
      );
    }
    return parts.join("\n").trimEnd();
  } catch {
    return "";
  }
}

export { DISABLED };
