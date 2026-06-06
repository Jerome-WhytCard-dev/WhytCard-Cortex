# Changelog

All notable changes to WhytCard-Cortex. The format follows Keep a Changelog, the versioning follows SemVer.

## [0.2.0] - 2026-06-06

The autonomous pass: the pipeline now spans the full session, pushes a real research / tool-use / anticipation reflex, and is self-verified by a test suite. The goal is a single plugin complete enough to stand in for a pile of skills and instructions.

### Added
- **Orient** moment (`SessionStart`, `hooks/orient.mjs`): at a session boundary, asks where the work stands and -- above all -- what tools, MCP servers, skills and official docs are available right now, so the agent uses them instead of improvising. On the `compact` source it switches to a re-orientation question (what essential thread to re-establish), carrying the "memory across forgetting" concern through a channel that actually injects context.
- **Delegation** moment (`SubagentStop`, `hooks/delegate.mjs`): on a subagent's return, asks whether to take the result at face value or cross-check it against the ground truth.
- **Research / tool-use / anticipation** woven into the existing questions: Frame now pushes "go to the ground truth (docs, code, a quick test) for what you only assume", "use the tools actually available", and "look one step ahead"; Learn asks "is there a reusable understanding to carry forward?"; Rebound asks "is the answer already written down where you have not looked (the full error, the docs, the source)?".
- **Self-verification**: a zero-dependency test suite (`test/hooks.test.mjs`, run with `node --test` / `npm test`) asserting every hook's emit / silence / throttle / filter behaviour, plus a GitHub Actions CI workflow across Node 18-24.
- New grave gestures caught by Intention: `dd of=/dev/*`, `mkfs`, `shred`, `find ... -delete`, `truncate -s 0`, remote-branch deletion (`git push origin :branch`, `--delete`), `git stash clear/drop`, raw-device redirects.

### Changed
- Frame steps aside for a bare pleasantry ("thanks", "ok", "merci"...) instead of injecting on literally every prompt, removing the one unfiltered flood risk.
- The Stop self-critique prompt now also flags a deliverable that rests on an unverified assumption an available means (a test, the docs, a tool) should have checked.
- Bumped to 0.2.0 across `plugin.json` and `marketplace.json`.

### Fixed
- **Documentation correctness**: earlier docs claimed `additionalContext` is *not* read on `Stop`. The official docs say the opposite ("Stop and SubagentStop also accept `hookSpecificOutput.additionalContext`"). The honest caveat about the Stop pillar is rewritten: it stays an external LLM judge (the right call, because judging "is this at the level?" needs an LLM), but the false justification is removed.
- Intention no longer false-positives on a multiline `DELETE ... WHERE` (the lookahead now spans newlines).

### Notes
- **PreCompact stays unwired, deliberately.** It does *not* support `additionalContext` (only `decision: "block"`), so a question injected there would never reach the agent. The consolidate concern is handled instead by Orient on the `compact` source.
- **No dedicated MCP server.** MCP tools are agent-invoked, which reintroduces the very "the agent must know to call it" problem that skills have; reflex hooks fire automatically at the right moment, which is the point. The built-in `prompt`/`agent` hook types remain the path for dynamic, situation-aware questions. See `docs/DOCTRINE.md`.

## [0.1.0] - 2026-06-05

First public prototype.

### Added
- Reasoning pipeline as hooks: five wired moments (frame, intention, learn, rebound, self-critique) that form the full loop of an action cycle.
- Four `command` hooks (`frame.mjs`, `intent.mjs`, `learn.mjs`, `rebound.mjs`) and one `prompt` hook (self-critique on Stop), all proven by real execution.
- Anti-flood filtering: command whitelists (grave gestures, carrier commands) and a per-session throttle on learning.
- Doctrine (`docs/DOCTRINE.md`) and an install, test and tuning guide (`README.md`).

### Notes
- The `prompt` and `agent` hook types are available on the Stop event (verified against the official Claude Code docs).
- The self-critique hook uses `prompt` (stable LLM judgment), not `agent` (marked experimental by the docs).
- Three moments stay in reserve, unwired (orient, delegation, consolidate): each addition must earn its place.
