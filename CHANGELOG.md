# Changelog

All notable changes to WhytCard-Cortex. The format follows Keep a Changelog, the versioning follows SemVer.

## [0.3.0] - 2026-06-07

The persistent pass: Cortex stops being purely stateless and gains a project-scoped working memory, plus a visible signal that it is active. The reflexes are unchanged in spirit (questions, not orders); they now also leave a trace and re-surface what was learned.

### Added
- **Project store `.cortex/`** (`hooks/cortex-store.mjs`), best-effort and zero-dependency, written into the project root (resolved from `CLAUDE_PROJECT_DIR`, else the hook payload's `cwd`):
  - **`log.jsonl`** -- one structured line each time a hook actually *speaks* (timestamp, event, hook, a short detail). This is the visible feedback: open it to see exactly what reaction Cortex triggered, and when.
  - **`memory.md`** -- durable, project-specific understanding. The agent curates it (the Learn reflex now asks it to add a line whenever a result teaches something reusable); Orient re-reads and re-injects it at every session start, so hard-won knowledge is not relearned each time. Faithful to the doctrine: the hook only asks, the model provides the content.
  - **`.gitignore`** seeded once per project (memory kept, log ignored by default) so each project chooses its own git policy, and a **`README.md`** explaining the folder.
- **Activation banner**: Orient now prefixes its question with `[Cortex active] N memory note(s) loaded ...`, a clear confirmation that the plugin is live and how much project memory it carries into the session.
- **`CORTEX_LOG=0`** (or `off`/`false`/`no`) opts out of all file I/O, returning Cortex to a pure stateless reflex plugin.
- Tests for the store: seeding, one-line-per-speaking-hook logging, silence-writes-nothing, the git policy, the disable switch, and the memory re-injection at session start (24 tests total).

### Changed
- Every speaking hook now logs its firing (still only when it actually injects a question -- silence stays silent and unlogged).
- The Learn question gains a final line pointing the reusable understanding to `.cortex/memory.md`.
- Bumped to 0.3.0 across `plugin.json`, `marketplace.json` and `package.json`.

### Notes
- The store is **best-effort and never blocks**: if the filesystem refuses or `CORTEX_LOG=0`, hooks behave exactly as in 0.2.0 and still exit 0. The pure-reflex behaviour is preserved as the floor.

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
