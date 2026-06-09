---
name: cortex-goal
description: Reason backward from a target -- name the stage to reach, derive the path to it, and pressure-test whether the plan is actually well thought out.
argument-hint: <the goal / stage to reach>
---

# Cortex - goal

The user wants to reach this goal: **$ARGUMENTS**

Before doing the work, reason it through out loud, in their working language:

1. **The target, precisely.** What does "done" actually look like -- what observable state proves the goal is reached? If it is fuzzy, sharpen it first.
2. **Work backward.** From that end state, what must be true just before it? And before that? Trace the chain back to where you stand now, so the path is *derived*, not guessed.
3. **Pressure-test the plan.** Is this the right path, or the first that came to mind? What does it assume that you have not verified -- go to the docs, the real code, a quick test? What could go wrong, and where would it break first?
4. **The next concrete step**, and how you will know it worked.

Then proceed -- but only once the path holds up. The safe minimum is the floor, never the ceiling.
