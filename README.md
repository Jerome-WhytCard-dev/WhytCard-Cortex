# WhytCard-Cortex

[![CI](https://github.com/Jerome-WhytCard-dev/WhytCard-Cortex/actions/workflows/ci.yml/badge.svg)](https://github.com/Jerome-WhytCard-dev/WhytCard-Cortex/actions/workflows/ci.yml)

A reasoning pipeline as hooks for Claude Code. At the boundaries of the agent cycle, Cortex asks the right question instead of dictating an answer. It replaces the pile of fixed skills and instructions with a few excellent questions, asked at the right moment, that make the agent think -- research, reach for the right available tool, go to the source -- and let it find the best path for itself.

Questions, not orders. See `docs/DOCTRINE.md` for the rationale, `REASONING-PIPELINE.md` for the full analysis.

## What is wired (7 moments, the full session)

| Moment | Event | Type | File | When it speaks |
|---|---|---|---|---|
| **Orient** | `SessionStart` (`startup\|resume\|clear\|compact`) | `command` | `hooks/orient.mjs` | At a session boundary. Asks where the work stands and what tools/MCP/docs are available to use; after a compaction, asks what essential thread to re-establish. |
| **Frame** | `UserPromptSubmit` | `command` | `hooks/frame.mjs` | On every substantive prompt (steps aside for a bare "thanks"/"ok"). Asks: what is really asked? know vs. assume (and go to the docs/code for the gaps)? which available tool? one step ahead? minimum or remarkable? |
| **Intention** | `PreToolUse` (`Bash\|PowerShell`) | `command` | `hooks/intent.mjs` | Only before a destructive or irreversible gesture (force-push, reset --hard, rm -rf, disk wipe, prod deploy, drop/truncate, publish, remote-branch delete). Silent on ordinary commands. |
| **Learn** | `PostToolUse` (`Bash\|PowerShell`) | `command` | `hooks/learn.mjs` | Only after a carrier command (test, build, lint, install, push, deploy, curl, migration), at most once per 60 s per session. Also asks if there is a reusable understanding to keep. |
| **Rebound** | `PostToolUseFailure` (`Bash\|PowerShell`) | `command` | `hooks/rebound.mjs` | Only when a command fails. Asks for the real cause, whether the answer is already in the docs/source, and a different hypothesis -- not one more identical retry. |
| **Delegation** | `SubagentStop` | `command` | `hooks/delegate.mjs` | When a subagent returns. Asks whether to take its result at face value or cross-check it. |
| **Self-critique** | `Stop` | `prompt` (LLM) | inline in `hooks/hooks.json` | On every turn end. An LLM call judges whether the deliverable is finished, verified and at the right level; can return "continue". See the honest caveat in `docs/DOCTRINE.md` (it is an external judge, not a question the agent asks itself). |

Four of these seven moments almost never speak (orient only at a session boundary; intention, learn, rebound are strongly filtered). Zero skills: that is the whole point. Cortex is reflex hooks only -- it never tells the agent *how* to do a thing, it pushes the agent to find out (research, the right tool, the docs) and build its own method.

## Project memory and log (`.cortex/`)

Cortex is a reflex pipeline, but it also leaves a trace and remembers. On first use it creates a `.cortex/` folder at the project root (resolved from `CLAUDE_PROJECT_DIR`, falling back to the hook's `cwd`):

| File | What it is | Written by |
|---|---|---|
| `log.jsonl` | One structured line each time a hook actually *speaks* (timestamp, event, hook, short detail). Your visible feedback: open it to see exactly what reaction Cortex triggered, and when. | every hook, on emit |
| `memory.md` | Durable, project-specific understanding -- facts verified, decisions made, traps to avoid. **Re-injected at every session start** by Orient, so hard-won knowledge is not relearned. The agent curates it; **Learn** asks it to add a line whenever a result teaches something reusable. | the agent (Learn invites it) |
| `.gitignore` | The git policy for the folder, seeded once and **yours to edit per project**. Default: keep `memory.md` (shared, durable), ignore `log.jsonl` (local). | seeded once |
| `README.md` | Explains the folder. | seeded once |

This stays true to the doctrine -- the hook only *asks*, the model provides the content of `memory.md`. The store is **best-effort**: if the filesystem refuses, hooks behave exactly as before and still exit 0.

**Seeing it is active.** At every session start, Orient prefixes its question with a banner: `[Cortex active] N memory note(s) loaded from .cortex/memory.md.` That is the confirmation the plugin is live and how much project memory it carries into the session.

**Disabling the store.** Set `CORTEX_LOG=0` (or `off`/`false`/`no`) to turn off all file I/O and return Cortex to a pure stateless reflex plugin.

## The living guide and the command surface (v0.4)

The seven reflexes are *universal* -- the same questions for everyone. v0.4 adds a second plane: a **personal guide** Cortex learns from you, by consent, and a small surface of commands to steer it. This is the part that makes Cortex *your* reasoning, inherited, rather than a generic default.

Two artefacts join the store:

| File | What it is |
|---|---|
| `guide.md` | Your **inherited reasoning**: durable preferences about *how* the agent should work here ("always run the tests before pushing", "answer concisely"). Distinct from `memory.md`, which holds verified *facts* about the project. **Frame injects the guide on every substantive prompt and Orient at every session start**, capped so it can never flood -- so the agent actually follows your way. |
| `config.json` | Cortex settings for the project: the **working language** (Cortex tells the agent to reason and reply in it -- no need to repeat yourself each session) and the **lock** state. |

**How "a hook evolves" really works.** Claude Code cannot register or delete real hooks mid-session (verified against the official docs: no hook-management API, no guaranteed reload). So "add a hook" is reframed as **add a rule to the living guide** that the fixed reflexes already inject -- immediate, reload-free, safe, and the same lived effect: the pipeline grows and shrinks as you steer it.

**The capture loop (consent, never imposition).** When you state a durable preference about how the agent should work, Frame's nudge invites the agent to *offer* to save it -- it asks, it does not decide for you. Say yes and it becomes a guide line; say "forget that" and it is dropped. Lock the guide and Cortex stops proposing and just follows.

**The Cortex commands** -- all prefixed `cortex-` so they are easy to find and never clash with Claude Code built-ins like `/init` or `/review`. Type the short form, e.g. `/cortex-show`; the fully namespaced form `/whytcard-cortex:cortex-show` also works:

| Command | What it does |
|---|---|
| `cortex-init` | One-time setup: pick the working language and scope, seed the store. Run it once after enabling the plugin. |
| `cortex-show` | The whole pipeline in one view: language, lock state, the seven reflexes, and your numbered guide. |
| `cortex-review` | Audits the guide -- overlaps, contradictions, vague or stale rules, gaps -- and proposes sharper edits toward your "perfect" pipeline (it suggests, you approve). |
| `cortex-add` / `cortex-forget` | Edit the guide directly: add a rule, or drop one by its text or its number. |
| `cortex-lock` / `cortex-unlock` | Freeze the guide (follow it, stop learning) or open it again. |
| `cortex-goal` | A self-correction reflex: name the target stage, derive the path to it backward, and pressure-test whether the plan is actually well thought out. |

The state commands (`cortex-init`, `cortex-show`, `cortex-add`, `cortex-forget`, `cortex-lock`, `cortex-unlock`) are backed by `cortex.mjs`, a zero-dependency Node CLI you can also run by hand (`node cortex.mjs show`). `cortex-review` and `cortex-goal` are reasoning skills rather than CLI subcommands -- `cortex-review` reads `cortex.mjs status` for context and then the agent audits it, and `cortex-goal` is a pure backward-reasoning prompt. Everything honours `CORTEX_LOG=0`: disable the store and the guide layer disappears with it, leaving the pure reflexes.

> **Status: Phase 1 (the spine).** The guide is real, visible, steerable and lockable, and the capture nudge rides on Frame. Phase 2 sharpens the *automatic* "I noticed a preference -- save it?" detection and the positive/negative read of each exchange; Phase 3 treats the guide as full inherited reasoning (conflict resolution, per-context scope, a cross-project user-level guide). Designing is not migrating: the foundation ships and is tested before the smarter layers are added.

## Requirements

- **Node.js >= 18** on the PATH (tested on Node 18, 20, 22 and 24). On Windows, make sure `node` is on the system PATH and not only available through a version manager that does not export to the system PATH -- the hooks are invoked as `node "..."`.
- **Claude Code**, with the `/plugin` command available.
- **Git**, for installing from GitHub.

## Install

The repo is its own single-plugin marketplace (`.claude-plugin/marketplace.json`, `source: "./"`). In a Claude Code session, via the `/plugin` commands:

1. Add the marketplace: `/plugin marketplace add Jerome-WhytCard-dev/WhytCard-Cortex` (or the full GitHub repo URL). This fetches the plugin directly from GitHub -- no npm install, no clone needed -- and works from any machine in the world that has Node and Claude Code installed.
2. Enable the plugin: `/plugin install whytcard-cortex@whytcard-cortex`
3. Reload without restarting: `/reload-plugins`
4. Verify: `/plugin` (Installed tab) and `/hooks` (the 7 events should appear: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, SubagentStop, Stop).

From a local clone rather than GitHub, replace step 1 with `/plugin marketplace add <path-to-the-cloned-folder>`: the command accepts both an `owner/repo` and a local folder path.

The hooks load automatically on enable. No dependencies, the `.mjs` files are plain Node. Requirement: Node on the PATH (verified on Node v24). Once enabled, run **`/cortex-init`** once to choose your working language and activate the guide, then **`/cortex-show`** any time to see the live pipeline.

### Uninstall

To remove Cortex completely -- disable it first, then uninstall, then drop the marketplace:

```
/plugin disable whytcard-cortex@whytcard-cortex
/plugin uninstall whytcard-cortex@whytcard-cortex
/plugin marketplace remove whytcard-cortex
```

## Testing

### Automated (zero dependencies)

The hooks ship with a test suite that runs every hook as a real process and asserts what it emits and when it stays silent. No install needed -- it uses Node's built-in runner:

```bash
node --test        # or: npm test
```

It covers emit/silence/throttle/filter behaviour for all seven hooks, robustness to malformed input, that every manifest parses, and the `.cortex/` store (seeding, log-on-speak, the git policy, the `CORTEX_LOG=0` opt-out, and memory re-injection at session start). CI (`.github/workflows/ci.yml`) runs it on Node 18-24.

Quick one-off check of a single hook (example `intent.mjs`):

```bash
printf '%s' '{"tool_input":{"command":"git push --force origin main"}}' | node hooks/intent.mjs
```

It should emit a `hookSpecificOutput` JSON and exit 0. With `git status` instead, it should emit nothing.

### In real conditions

The point: verify that these questions actually change the quality of the reasoning, not just that they show up.

- Enable the plugin, then work normally on a real task.
- Open the transcript (Ctrl+O) to watch the hooks fire. `/hooks` lists the registered hooks by event.
- Observe: does orient make the agent inventory its tools and docs instead of improvising? Does framing orient the start of a turn better? Does intention slow down a poorly weighed grave gesture? Do "learn" after a test and "rebound" after a failure trigger a real correction? Does delegation make subagent results get cross-checked? Does Stop catch the too-early stops without becoming a nuisance?
- If a question adds nothing or annoys, that is a signal: reword it or remove it. Selectivity wins.

## Tuning and disabling

- **Disable just the self-critique (Stop)** if it is too intrusive or too costly: remove the `"Stop"` block from `hooks/hooks.json`. The other six moments stay active.
- **Stop cost, worth knowing.** The `prompt` hook fires on every turn end, including a plain "thanks" or a question asked to the user: those deliverable-free turns still pay an LLM call (which answers "let it conclude"). Over a session of many short exchanges, it adds up. Disabling the Stop block on purely conversational sessions is legitimate.
- **Stop block cap.** 8 consecutive blocks by default, too high for a guardrail. Lower it to 2 or 3 via the `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` environment variable. The anti-loop guard is also written into the prompt (do not push the same deliverable more than once or twice).
- **Sharper Stop judgment.** The Stop block has no `model` key; the Claude Code docs state that a `prompt` hook with no `model` runs on Haiku by default (fast, cheap). For a more demanding judgment, add `"model": "claude-sonnet-4-6"` (or another) to the `Stop` hook. Cost and latency rise accordingly.
- **Widen or narrow the filters.** The grave commands (intention hook) and carrier commands (learn hook) are whitelists in `hooks/intent.mjs` and `hooks/learn.mjs`, easy to extend. The learn throttle is `THROTTLE_MS` (60 s) in `hooks/learn.mjs`.
- **Disable one specific moment**: remove its event block from `hooks/hooks.json` (for example `"PreToolUse"` to turn off intention).
- **Disable everything**: `"disableAllHooks": true` in settings, or simply disable the plugin.

## Moments left unwired

Orient and delegation, once in reserve, are now wired (v0.2.0). The one moment deliberately left off is **consolidate** (PreCompact): that event does not accept `additionalContext`, so a question injected there would never reach the agent. The concern -- what must survive a compaction -- is handled instead by Orient on its `compact` source. Every other event in the ~30-event API stays unwired on purpose: each addition must earn its place by proving its question changes the reasoning, otherwise it is flood. Details in `docs/DOCTRINE.md`.

## Verification (what is proven)

Everything rests on the official Claude Code docs and on real execution of the hooks -- no assumptions:

- A zero-dependency test suite (`node --test`) covers every hook: the manifests parse, each hook emits the right JSON and exits 0, and the filters behave (e.g. `git push --force`, `rm -rf`, `dd of=/dev/...`, a remote-branch delete trigger intention; `git status` and a multiline `DELETE ... WHERE` do not; `npm test` triggers learn and an immediate second call is throttled; frame stays silent on a bare "thanks"; orient switches to its recovery question on `compact`). CI runs it on Node 18-24.
- Choices verified against the docs, not assumed: every wired event was checked to actually accept its channel (`additionalContext` for orient/frame/intention/learn/rebound/delegation; a `prompt` decision for self-critique). PreCompact was checked too -- it does *not* accept `additionalContext`, which is exactly why "consolidate" is left unwired. `prompt` hooks are available on Stop (real LLM judgment, not a blind reminder); `agent` hooks are marked experimental, so Cortex keeps `prompt`. Note: Stop *does* accept `additionalContext` -- an earlier doc claim to the contrary is corrected in `docs/DOCTRINE.md`, and the `prompt` choice stands because judging "is this at the level?" needs an LLM.

## Status

The prototype (3 moments) grew to the full action loop (5), and now to the full session (7: orient and delegation added), each addition kept strongly filtered and each channel verified against the docs. Cortex aims to be a single, autonomous plugin complete enough to replace the pile of fixed skills and instructions with a handful of reflex hooks -- but it is tested in real conditions before anything is removed. Designing is not migrating; nothing is deleted blindly.
