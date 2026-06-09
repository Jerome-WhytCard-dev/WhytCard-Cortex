---
name: cortex-review
description: Analyse the current Cortex pipeline and guide, and suggest how to converge toward a sharper, conflict-free set of rules.
allowed-tools: Bash(node:*)
---

The current Cortex state (JSON):

!`node "${CLAUDE_PLUGIN_ROOT}/cortex.mjs" status`

Audit it for the user, in their working language. Look for:
- rules that overlap or duplicate each other (propose a merge),
- rules that contradict one another (surface the conflict, ask which one wins),
- rules that are vague or not actionable (propose a sharper wording),
- rules that look stale or one-off (ask whether to drop them),
- gaps -- preferences they keep voicing in practice but never saved.

Propose concrete edits as `cortex-add` / `cortex-forget` commands; do NOT apply them without the user's go-ahead. Keep it short and honest: fewer, sharper rules beat a long list. The goal is the user's "perfect" pipeline, not a big one.
