---
name: cortex-forget
description: Remove a rule from the Cortex guide, by matching text or by its number.
argument-hint: <text | index>
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

Removing the matching rule from the Cortex guide:

!`node "${CLAUDE_PLUGIN_ROOT}/cortex.mjs" forget '$ARGUMENTS'`

Confirm, in the user's working language, what was removed (or that nothing matched). If they meant a different rule, suggest running the `cortex-show` command to see the numbered list, then `cortex-forget <number>`.
