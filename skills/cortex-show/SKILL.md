---
name: cortex-show
description: Show the current Cortex pipeline -- working language, lock state, the always-on reflexes, and your inherited guide rules.
allowed-tools: Bash(node:*)
---

The current Cortex pipeline for this project:

!`node "${CLAUDE_PLUGIN_ROOT}/cortex.mjs" show`

Relay this to the user briefly, in their working language. If the guide is empty or the language is unset, suggest running the `cortex-init` command first. Do not invent rules that are not shown above.
