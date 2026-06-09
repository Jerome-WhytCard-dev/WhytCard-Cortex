---
name: cortex-init
description: Set up Cortex for this project -- pick the working language and scope, then seed the store. Run once after enabling the plugin.
disable-model-invocation: true
allowed-tools: Bash(node:*), AskUserQuestion
---

# Cortex - initialize

Set Cortex up for this user and project. The plugin ships a CLI at `${CLAUDE_PLUGIN_ROOT}/cortex.mjs`.

1. Determine the **working language** (the language Cortex and your replies will use). If `$ARGUMENTS` already names one, use it. Otherwise ask with `AskUserQuestion` (offer a few likely languages plus Other).
2. Determine the **scope**: `project` (default -- the guide lives in this repo's `.cortex/`). Mention that a cross-project, user-level guide is on the roadmap but not active yet.
3. Apply it with the Bash tool, substituting the real chosen language:

   `node "${CLAUDE_PLUGIN_ROOT}/cortex.mjs" init --lang="<language>" --scope=project`

   If `${CLAUDE_PLUGIN_ROOT}` is not set in your shell, find `cortex.mjs` at the root of the `whytcard-cortex` plugin directory and call it the same way.
4. Confirm, in the chosen language, that Cortex is active and listening: from now on it follows their inherited guide, replies in their language, and will OFFER (never impose) to save durable preferences they express. Point them to the `cortex-show` command to see the pipeline, and `cortex-lock` to freeze it.

After this, never ask these setup questions again -- the config is persisted in `.cortex/config.json`.
