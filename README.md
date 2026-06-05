# WhytCard-Cortex

A reasoning pipeline as hooks for Claude Code. At the boundaries of the agent cycle, Cortex asks the right question instead of dictating an answer. It replaces the pile of fixed skills and instructions with a few excellent questions, asked at the right moment, that make the agent think and let it find the best path for itself.

Questions, not orders. See `docs/DOCTRINE.md` for the rationale, `REASONING-PIPELINE.md` for the full analysis.

## What is wired (5 moments, the loop of the action cycle)

| Moment | Event | Type | File | When it speaks |
|---|---|---|---|---|
| **Frame** | `UserPromptSubmit` | `command` | `hooks/frame.mjs` | On every prompt. Injects the framing question (what is really asked? know vs. assume? stakes? minimum or remarkable?). |
| **Intention** | `PreToolUse` (`Bash\|PowerShell`) | `command` | `hooks/intent.mjs` | Only before a destructive or irreversible gesture (force-push, reset --hard, rm -rf, prod deploy, drop/truncate, publish). Silent on ordinary commands. |
| **Learn** | `PostToolUse` (`Bash\|PowerShell`) | `command` | `hooks/learn.mjs` | Only after a carrier command (test, build, lint, install, push, deploy, curl, migration), at most once per 60 s per session. |
| **Rebound** | `PostToolUseFailure` (`Bash\|PowerShell`) | `command` | `hooks/rebound.mjs` | Only when a command fails. Asks for the real cause and a different hypothesis, not one more identical retry. |
| **Self-critique** | `Stop` | `prompt` (LLM) | inline in `hooks/hooks.json` | On every turn end. An LLM call judges whether the deliverable is finished and at the right level; can return "continue". See the honest caveat in `docs/DOCTRINE.md` (it is an external judge, not a question the agent asks itself). |

Three of these five moments almost never speak (intention, learn, rebound are strongly filtered). Zero skills: that is the whole point. Cortex is reflex hooks only.

## Install

The repo is its own single-plugin marketplace (`.claude-plugin/marketplace.json`, `source: "./"`). In a Claude Code session, via the `/plugin` commands:

1. Add the marketplace: `/plugin marketplace add Jerome-WhytCard-dev/WhytCard-Cortex` (or the full GitHub repo URL).
2. Enable the plugin: `/plugin install whytcard-cortex@whytcard-cortex`
3. Reload without restarting: `/reload-plugins`
4. Verify: `/plugin` (Installed tab) and `/hooks` (the 5 events should appear: UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, Stop).

From a local clone rather than GitHub, replace step 1 with `/plugin marketplace add <path-to-the-cloned-folder>`: the command accepts both an `owner/repo` and a local folder path.

The hooks load automatically on enable. No dependencies, the `.mjs` files are plain Node. Requirement: Node on the PATH (verified on Node v24).

Rollback: `/plugin disable whytcard-cortex@whytcard-cortex`, then if needed `/plugin uninstall whytcard-cortex@whytcard-cortex` and `/plugin marketplace remove whytcard-cortex`.

## Testing in real conditions

The point: verify that these questions actually change the quality of the reasoning, not just that they show up.

- Enable the plugin, then work normally on a real task.
- Open the transcript (Ctrl+O) to watch the hooks fire. `/hooks` lists the registered hooks by event.
- Observe: does framing orient the start of a turn better? Does intention slow down a poorly weighed grave gesture? Do "learn" after a test and "rebound" after a failure trigger a real correction? Does Stop catch the too-early stops without becoming a nuisance?
- If a question adds nothing or annoys, that is a signal: reword it or remove it. Selectivity wins.

Quick out-of-session test of a hook (example `intent.mjs`):

```bash
printf '%s' '{"tool_input":{"command":"git push --force origin main"}}' | node hooks/intent.mjs
```

It should emit a `hookSpecificOutput` JSON and exit with code 0. With `git status` instead, it should emit nothing.

## Tuning and disabling

- **Disable just the self-critique (Stop)** if it is too intrusive or too costly: remove the `"Stop"` block from `hooks/hooks.json`. The other four moments stay active.
- **Stop cost, worth knowing.** The `prompt` hook fires on every turn end, including a plain "thanks" or a question asked to the user: those deliverable-free turns still pay an LLM call (which answers "let it conclude"). Over a session of many short exchanges, it adds up. Disabling the Stop block on purely conversational sessions is legitimate.
- **Stop block cap.** 8 consecutive blocks by default, too high for a guardrail. Lower it to 2 or 3 via the `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` environment variable. The anti-loop guard is also written into the prompt (do not push the same deliverable more than once or twice).
- **Sharper Stop judgment.** The Stop block has no `model` key; the Claude Code docs state that a `prompt` hook with no `model` runs on Haiku by default (fast, cheap). For a more demanding judgment, add `"model": "claude-sonnet-4-6"` (or another) to the `Stop` hook. Cost and latency rise accordingly.
- **Widen or narrow the filters.** The grave commands (intention hook) and carrier commands (learn hook) are whitelists in `hooks/intent.mjs` and `hooks/learn.mjs`, easy to extend. The learn throttle is `THROTTLE_MS` (60 s) in `hooks/learn.mjs`.
- **Disable one specific moment**: remove its event block from `hooks/hooks.json` (for example `"PreToolUse"` to turn off intention).
- **Disable everything**: `"disableAllHooks": true` in settings, or simply disable the plugin.

## Moments in reserve (unwired)

Three other moments of the cycle are ready but off, to be enabled one at a time and only once proven: orient (SessionStart, often already covered by a session-orientation mechanism), delegation (SubagentStop), consolidate (PreCompact). Details in `docs/DOCTRINE.md`. Do not wire them until the five current ones have proven themselves: each addition must earn its place, otherwise it is flood.

## Verification (what is proven)

Everything rests on the official Claude Code docs, read at build time, and on real execution of the hooks (no assumptions):

- The 3 JSON manifests parse without error; the 5 hooks emit the right JSON and exit with code 0; the filters behave as intended (tested: `git push --force` and `rm -rf` trigger intention, `git status` does not; `npm test` and `git push` trigger learn, `ls` does not, an immediate second call is throttled; a failure triggers rebound).
- Choices verified in the docs, not assumed: `prompt` hooks are available on the Stop event, which enables self-critique by a real LLM judgment (not a blind reminder). `agent` hooks there are marked experimental and discouraged in production, so Cortex keeps `prompt` (real, stable, cheaper judgment) and documents `agent` as an advanced variant. On Stop, the technical channel is the decision (continue or let conclude), not context injection: see `docs/DOCTRINE.md` for the honest caveat this imposes on the self-critique pillar.

## Status

The minimal prototype (3 moments) was extended to 5, the full loop of the action cycle, keeping each addition strongly filtered. Cortex aims to replace the pile of fixed skills and instructions with a handful of reflex hooks, but it is tested in real conditions before anything is removed. Designing is not migrating; nothing is deleted blindly.
