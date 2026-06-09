# Changelog

All notable changes to WhytCard-Cortex. The format follows Keep a Changelog, the versioning follows SemVer.

## [0.5.0] - 2026-06-09

The polish-and-name pass: every command now carries a `cortex-` prefix so it is instantly recognisable and never collides with Claude Code built-ins, plus a round of repo hardening so Cortex is clean to install from GitHub for anyone, anywhere.

### Changed
- **All commands are now prefixed `cortex-`**: `cortex-init`, `cortex-show`, `cortex-add`, `cortex-forget`, `cortex-lock`, `cortex-unlock`, `cortex-review`, `cortex-goal`. The skill directories were renamed to match, since a plugin's command name comes from its directory (the frontmatter `name` is only the display label). **Breaking:** the old `/whytcard-cortex:show` form becomes `/whytcard-cortex:cortex-show` -- in practice you now type the short, collision-free `/cortex-show`. The CLI subcommands (`node cortex.mjs show`, `add`, ...) are unchanged.
- README, `docs/DOCTRINE.md` and the `.cortex/` folder seeds updated to the new command names.

### Fixed
- **Shell-injection hardening** in `cortex-add` / `cortex-forget`: the rule text is now passed inside single quotes (`'$ARGUMENTS'`), so a `$`, backtick, `"` or `;` in a preference can no longer break out of the command. (`$ARGUMENTS` is substituted textually *before* the shell runs, so the previous double-quoted form was not injection-safe.)
- **`SEED_GUIDE` declaration order** in `hooks/cortex-store.mjs`: moved up beside the other seeds (before `ensureDir`, which uses it). ESM `const` is not hoisted, so the old order was a trap for contributors -- harmless at runtime, fixed for clarity.
- Removed `"private": true` from `package.json` -- the repo is public and installable from GitHub.

### Added
- `.github/CONTRIBUTING.md` (report a bug, suggest a change, run the tests, code style).
- `.github/ISSUE_TEMPLATE/bug_report.md`.
- README: a CI badge, a `## Requirements` section (Node >= 18 with a Windows PATH note, Claude Code, Git), a dedicated `### Uninstall` section, and a note that the marketplace install fetches straight from GitHub and works from any machine.

### Notes
- No hook logic, injected question, filter or throttle was touched -- only command names, documentation, and the repo surface.
- Bumped to 0.5.0 across `plugin.json`, `marketplace.json` and `package.json`.

## [0.4.0] - 2026-06-07

The living pass: Cortex stops being only a set of universal reflexes and gains a second plane -- a **personal, consent-based guide** it learns from you and a **command surface** to see and steer it. The reflexes still ask, never order; what is new is that, with your explicit "yes", a durable preference can become a standing line Cortex injects on every prompt -- *your* reasoning, inherited, not a generic recipe. This is Phase 1 (the spine): the guide is real, visible, steerable and lockable; the automatic "I noticed you stated a preference -- save it?" capture rides on the Frame nudge and will sharpen in Phase 2.

### Added
- **The living guide `.cortex/guide.md`** (`hooks/cortex-store.mjs`): durable preferences about HOW the agent should work here, kept distinct from `memory.md` (WHAT is true). **Frame injects it on every substantive prompt and Orient at every session start**, so it actually steers, capped so it can never flood. De-duplicated on add; removable by text or by index.
- **Per-project config `.cortex/config.json`**: the **working language** (Cortex prefixes a "reason and reply in X" line, so the agent speaks your language without being told each time) and a **lock** state.
- **A `/whytcard-cortex` command surface** (skills, auto-discovered), backed by a zero-dependency CLI (`cortex.mjs`):
  - **`init`** -- one-time setup; asks the language + scope, seeds the store.
  - **`show`** -- the whole pipeline in one view: language, lock, the seven reflexes, and your numbered guide.
  - **`review`** -- audits the guide (overlaps, contradictions, vague or stale rules, gaps) and proposes sharper edits toward your "perfect" pipeline.
  - **`add` / `forget`** -- edit the guide by hand (the controllable substrate under the automatic capture).
  - **`lock` / `unlock`** -- freeze learning and just follow, or open it again.
  - **`goal`** -- a self-correction reflex: name the target, derive the path backward, pressure-test whether it is well thought out.
- **A capture nudge** woven into Frame (only when unlocked): if you state a durable preference, the agent offers -- never imposes -- to save it; if you retract one, it drops it.
- Tests for all of the above (33 total): config + guide round-trips through the CLI, de-duplication, forget-by-text and forget-by-index, lock/unlock, `status` JSON, and the guide + language actually being injected by Frame and Orient (and the nudge going silent when locked).

### Changed
- **Frame** and **Orient** now append the guide + working language to their question (best-effort; empty and unchanged when nothing is set or `CORTEX_LOG=0`).
- `.cortex/` seeds `guide.md` alongside `memory.md`; the folder README documents both, plus `config.json`.
- Bumped to 0.4.0 across `plugin.json`, `marketplace.json` and `package.json`.

### Notes
- **No "real" hooks are registered at runtime.** Verified against the official docs: Claude Code has no API to add/remove hooks mid-session and no guaranteed reload, so "adding a hook" is reframed as **adding a rule to the living guide** that the fixed reflexes inject -- immediate, reload-free, and safe. Same lived effect ("the pipeline evolves"), without dynamically writing shell hooks.
- **The doctrine tension is owned, not hidden.** Storing preferences is, literally, building a (personal, consented) set of instructions -- something "questions, not orders" pushes against. It stays faithful because Cortex only ever *asks* before saving, the content is *yours*, and `lock` plus `forget` keep you in control. See `docs/DOCTRINE.md`.
- Still **best-effort and opt-out**: `CORTEX_LOG=0` returns Cortex to the pure stateless reflex plugin, guide and config included.

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
