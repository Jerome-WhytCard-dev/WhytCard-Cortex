---
name: cortex-lock
description: Freeze the Cortex guide -- stop proposing changes and just follow the current pipeline.
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/cortex.mjs" lock`

Tell the user, in their working language, that Cortex is now locked: it keeps following the current guide but will no longer offer to add or change rules until they unlock it.
