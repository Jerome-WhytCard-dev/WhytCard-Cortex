---
name: cortex-unlock
description: Unfreeze the Cortex guide -- let it learn again and offer to capture new preferences.
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/cortex.mjs" unlock`

Tell the user, in their working language, that Cortex is unlocked: it will again offer (never impose) to save the durable preferences they express.
