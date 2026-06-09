---
name: cortex-add
description: Add a durable preference (a rule about HOW you should work) to the Cortex guide.
argument-hint: <rule text>
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Saving this preference to the Cortex guide:

!`node "${CLAUDE_PLUGIN_ROOT}/cortex.mjs" add '$ARGUMENTS'`

Confirm to the user, in their working language, that the rule is now part of their inherited guide and will be followed from now on. If the result says the store is unavailable, tell them to run the `cortex-init` command first (or check that `CORTEX_LOG` is not turned off).
