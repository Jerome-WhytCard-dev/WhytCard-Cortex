---
name: Bug report
about: Report a hook that misbehaved or a command that did not work
title: "[bug] "
labels: bug
assignees: ''
---

## What happened

A clear description of the behaviour you observed.

## What you expected

What you expected Cortex to do instead.

## Which part

- [ ] Orient (SessionStart)
- [ ] Frame (UserPromptSubmit)
- [ ] Intention (PreToolUse)
- [ ] Learn (PostToolUse)
- [ ] Rebound (PostToolUseFailure)
- [ ] Delegation (SubagentStop)
- [ ] Self-critique (Stop)
- [ ] A `/whytcard-cortex` command (init / show / add / forget / lock / unlock / review / goal)
- [ ] The `.cortex/` store (memory, guide, config, log)

## Environment

- Node version (`node --version`):
- Claude Code version:
- OS:

## How to reproduce

Steps, or a minimal input that triggers it. For a hook, the JSON you piped into it helps:

```bash
printf '%s' '{"tool_input":{"command":"..."}}' | node hooks/intent.mjs
```

## Anything else

Logs from `.cortex/log.jsonl`, screenshots, or context.
