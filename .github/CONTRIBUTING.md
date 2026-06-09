# Contributing to WhytCard-Cortex

Thanks for taking the time. Cortex is a small, dependency-free plugin, and it stays that way on purpose.

## How to report a bug

Open a [GitHub issue](https://github.com/Jerome-WhytCard-dev/WhytCard-Cortex/issues) with:

- your **Node version** (`node --version`),
- your **Claude Code version**,
- the **hook that misbehaved** (orient, frame, intention, learn, rebound, delegation, or the Stop self-critique),
- the **behaviour you observed vs. what you expected**.

A minimal way to reproduce helps a lot.

## How to suggest a change

Open an issue **before** sending a pull request, so we can discuss the change first.

Cortex follows one doctrine: **questions, not orders**. Every addition has to earn its place by proving that its question actually changes the quality of the reasoning. A new hook or rule that only adds noise is flood, and gets cut. Come with the case for why your change makes the agent reason better.

## How to run the tests

Zero install needed -- the suite uses Node's built-in runner:

```bash
node --test        # or: npm test
```

It runs every hook as a real process and asserts what it emits and when it stays silent. CI runs it on Node 18, 20, 22 and 24.

## Code style

- Plain **Node ESM**, **zero dependencies**.
- **Best-effort everywhere**: a hook must never throw and must always exit 0. If the filesystem or the input refuses, behave exactly as before and stay silent.
- Keep questions short, in the user's working language where the store provides it, and never tell the agent *how* to do a thing -- push it to find out.
