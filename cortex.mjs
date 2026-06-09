#!/usr/bin/env node
// WhytCard-Cortex CLI -- the deterministic backend the /whytcard-cortex skills call. It reads and
// steers the project's .cortex/ store (config + guide) so the user can SEE the pipeline and shape
// it toward their "perfect" one. Plain Node, zero dependencies. Best-effort, and it honours
// CORTEX_LOG=0 (the store off-switch) exactly like the hooks.
//
//   node cortex.mjs init [--lang=fr --scope=project --locked]
//   node cortex.mjs show | status
//   node cortex.mjs add <rule text>
//   node cortex.mjs forget <text | index>
//   node cortex.mjs lock | unlock

import {
  projectRoot,
  ensureDir,
  readConfig,
  writeConfig,
  readGuide,
  appendRule,
  removeRule,
  DISABLED,
} from "./hooks/cortex-store.mjs";

const root = projectRoot({});
const [cmd, ...rest] = process.argv.slice(2);
const argstr = rest.filter((a) => !a.startsWith("--")).join(" ").trim();

// Read a `--name=value` flag from the args, or `def` when it is absent.
function flag(name, def = "") {
  const hit = rest.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
}

// The always-on reflexes, shown by `show` so the whole pipeline is visible in one place.
const REFLEXES = [
  ["Orient", "SessionStart", "session boundary -- inventory tools/docs, load the guide + memory"],
  ["Frame", "UserPromptSubmit", "every substantive prompt -- frame the turn, inject the guide, watch for a preference"],
  ["Intention", "PreToolUse", "before a grave / irreversible shell gesture only"],
  ["Learn", "PostToolUse", "after a carrier command (test / build / deploy...), throttled"],
  ["Rebound", "PostToolUseFailure", "after a failed command"],
  ["Delegation", "SubagentStop", "when a subagent hands its result back"],
  ["Self-critique", "Stop", "every turn end -- an LLM judges if it is finished and at the level"],
];

if (DISABLED) {
  console.log("Cortex store is disabled (CORTEX_LOG is off). Unset it to use the guide and config.");
  process.exit(0);
}

// Render the human-readable pipeline snapshot for `show`: language, lock, reflexes, guide rules.
function showText() {
  const cfg = readConfig(root);
  const guide = readGuide(root);
  const n = guide ? guide.count : 0;
  const lines = [
    "WhytCard-Cortex -- your pipeline",
    "",
    `Language : ${cfg.language || "(not set -- run init)"}`,
    `Scope    : ${cfg.scope}`,
    `Status   : ${cfg.locked ? "LOCKED (learning paused, the agent just follows the guide)" : "open (learning on)"}`,
    "",
    "Reflexes (always-on, in the background):",
    ...REFLEXES.map(([name, ev, when]) => `  - ${name} (${ev}) -- ${when}`),
    "",
    `Your inherited guide -- ${n} rule(s):`,
  ];
  if (n === 0) {
    lines.push("  (empty -- the agent offers to add rules as you express durable preferences, or use `add`)");
  } else {
    guide.rules.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`));
  }
  return lines.join("\n");
}

switch (cmd) {
  case "init": {
    const language = flag("lang") || flag("language");
    const scope = flag("scope", "project");
    const locked = rest.includes("--locked");
    ensureDir(root);
    const cfg = writeConfig(root, { language, scope, locked });
    console.log(
      cfg
        ? `Cortex initialized. Language: ${cfg.language || "(none)"} | Scope: ${cfg.scope} | ${cfg.locked ? "locked" : "open"}.`
        : "Could not write config (store unavailable)."
    );
    break;
  }
  case "status": {
    console.log(
      JSON.stringify(
        {
          config: readConfig(root),
          guide: readGuide(root) || { rules: [], count: 0 },
          reflexes: REFLEXES.map(([name, event, when]) => ({ name, event, when })),
        },
        null,
        2
      )
    );
    break;
  }
  case "show": {
    console.log(showText());
    break;
  }
  case "add": {
    if (!argstr) {
      console.log("Usage: add <rule text>");
      break;
    }
    const g = appendRule(root, argstr);
    console.log(g ? `Added. Your guide now holds ${g.count} rule(s).` : "Could not add the rule (store unavailable).");
    break;
  }
  case "forget": {
    if (!argstr) {
      console.log("Usage: forget <text | index>");
      break;
    }
    const res = removeRule(root, argstr);
    if (res && res.removed != null) {
      console.log(`Removed: "${res.removed}". ${res.guide ? res.guide.count : 0} rule(s) left.`);
    } else {
      console.log(`No rule matched "${argstr}".`);
    }
    break;
  }
  case "lock":
  case "unlock": {
    const cfg = writeConfig(root, { locked: cmd === "lock" });
    console.log(
      cfg
        ? `Cortex ${cfg.locked ? "LOCKED -- learning paused, the agent just follows the guide." : "unlocked -- learning on again."}`
        : "Could not update config (store unavailable)."
    );
    break;
  }
  default:
    console.log(
      "Cortex CLI. Commands: init [--lang=.. --scope=.. --locked], show, status, add <rule>, forget <text|index>, lock, unlock."
    );
}
