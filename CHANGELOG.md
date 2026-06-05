# Changelog

All notable changes to WhytCard-Cortex. The format follows Keep a Changelog, the versioning follows SemVer.

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
