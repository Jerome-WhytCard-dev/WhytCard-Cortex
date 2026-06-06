# WhytCard-Cortex, a reasoning pipeline as hooks

> Goal: replace the flood of skills and fixed instructions with ONE system. Not a cookbook that says what to do, but a set of hooks that, at the right moments, ask the right question to make the agent think and let it find the best path itself. A nervous system, not a manual.

## 1. The principle

- **Questions, not orders.** A skill says "do X". A reflection hook asks "what do you actually know here, and so which way are you thinking?". The first freezes, the second makes you reason. We do not dictate the answer, we trigger the thought that finds it.
- **At the moments of the cycle, not continuously.** Hooks fire only at the boundaries of the agent cycle (session start, prompt, before and after each tool, stop attempt, compaction...). We reproduce a human cognitive cycle on those boundaries. You cannot think "between two thoughts": a real limit, owned.
- **Fixed when the question is universal, alive when it must adapt.** A `command` hook (fixed text, fast, free) for questions valid all the time. A `prompt` or `agent` hook (an LLM call that analyzes the situation) when the right question depends on context. That is what keeps the system from being frozen.
- **Frugal, or it suffocates.** Thirty events exist; wiring all thirty would drown thought under noise. We choose the moments that matter, and we target with a matcher (do not reflect after a trivial Read). Human thinking is not reciting fifty directives, it is asking THE right question at time T.

## 2. The facts (verified, official Claude Code docs)

- **30 hook events.** Source: code.claude.com/docs/en/hooks.md and hooks-guide.md.
- **Can inject context** (`additionalContext`): SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, PostToolBatch, SubagentStart, Stop.
- **Can bend the course**: UserPromptSubmit (can rewrite the prompt), PreToolUse (can modify a tool's input, or block), Stop (can return "continue", capped at 8).
- **Five natures of hook**: `command` (script, fixed text), `http`, `mcp_tool`, and above all `prompt` (1 LLM call, returns ok+reason) and `agent` (multi-turn LLM, up to 50 tool turns). The last two are what make dynamic reflection possible.
- **Hard limits**: no hook fires mid-reasoning (only at boundaries); no hook-to-hook chaining; a hook asks the question, it does not reason in the main model's place; LLM hooks cost latency (UserPromptSubmit capped at 30s, agent at 60s).

## 3. The moments, by cognitive phase

An expert facing a task goes through a cycle. Here are the events that fall at each phase (the "load-bearing" moments in bold are the ones the pipeline wires first):

| Phase of thought | Hook event(s) | Why this moment |
|---|---|---|
| Orient | **SessionStart**, InstructionsLoaded, CwdChanged | We arrive: where am I, what has already been decided? |
| Understand and frame | **UserPromptSubmit**, UserPromptExpansion | The request lands: what is really asked, what is at stake, where to think from? |
| Intention before the gesture | **PreToolUse**, PermissionRequest | Just before acting: is this the right gesture, have I justified it? |
| Learn from the action | **PostToolUse**, **PostToolUseFailure**, PostToolBatch | Just after: what does this teach me, what does it change? |
| Delegate and recover | SubagentStart, **SubagentStop** | I hand off a part: what, why, what to do with it on return? |
| Self-critique | **Stop**, StopFailure | I am about to conclude: is it really done and at the level? |
| Consolidate memory | **PreCompact**, SessionEnd | Before forgetting: what is essential to keep? |
| Track progress | TaskCreated, **TaskCompleted** | A step closes: is it really accomplished? |

## 4. The pipeline (the question at each moment)

Each entry: the moment, the **question** asked (never an order), and the recommended hook nature.

1. **Orient, SessionStart** (`command`)
   "Before touching anything: where does this work stand, what has already been settled that I must respect, and what has changed since last time?"

2. **Frame, UserPromptSubmit** (`command` for universal questions; optional light `prompt` to classify the stakes)
   "Beneath the wording, what is really asked? What do I know versus what do I assume? Is the stake reversible, visible, risky? And so where to think first: verify, search, or act? What level are we aiming for, the minimum or the remarkable?" This is the hook that orients the whole turn.

3. **Intention, PreToolUse** (`command` targeted by matcher; `prompt`/`agent` for heavy gestures: push, deletion, deployment)
   "Is this gesture the right one, or the first that came to mind? What verified ground does it rest on? Is it reversible?" On a grave action, the `agent` hook can judge and, if needed, hold back.

4. **Learn, PostToolUse** (light `command`, targeted: not after a trivial Read)
   "What does this result teach me? Does it confirm or contradict what I believed? Does my plan still hold?" This is where thought loops back; the most neglected and most precious moment.

5. **Rebound from failure, PostToolUseFailure** (`command`, or `prompt` to analyze a critical failure)
   "What is the real cause, not the symptom? What does this failure reveal? What is the next hypothesis, rather than retrying the same thing?"

6. **Delegation, SubagentStop** (`command`)
   "What the subagent reports, do I take it at face value or cross-check it? What do I do with it now?"

7. **Self-critique, Stop** (`agent` recommended: it can judge the real state; otherwise `command`)
   "Is this really finished and at the intended level, or am I stopping at the first thing that works? What is missing? Am I stopping too early out of laziness, or going in circles out of stubbornness?" Can return "continue" (cap 8), to be reserved for pushing toward the level, not for blocking.

8. **Consolidate, PreCompact** (`command`)
   "Of all this context, what is essential and must survive forgetting? What is only noise?"

## 5. What it replaces

- The **flood of skills** (fixed recipes invoked en masse) disappears: right thinking emerges from questions, not from a catalog. We go from a dozen-odd skills to a handful of reflection hooks.
- What can **stay** as a skill: a rare, deep expertise, too heavy to fit in a hook question, invoked occasionally. The exception, not the rule.
- The **safety guardrails** (proof, anti-hallucination, hygiene) do not vanish: they become questions in the pipeline ("what verified ground does what you assert rest on?") instead of recited rules.

## 6. The honest trade-offs

- **The hook does not think for me.** It asks the question; it is the main model that must answer it in its reasoning. Effectiveness depends on my receptiveness to the question. So: few questions, but excellent, at the right moment.
- **Latency and cost.** A `prompt`/`agent` hook on every tool would make the agent slow and expensive. We reserve the LLM for the high-stakes moments (framing, stop judgment, critical failure) and keep `command` (free, instant) everywhere else.
- **Flood lurks.** Three or four stacked hooks each reciting ten lines, and thought drowns. The discipline of the system is selectivity: the right question, once, in the right place.
- **"Neural" is a useful metaphor, not a technical reality.** Concretely: injections of questions at the boundaries of the cycle, some computed by an LLM. The metaphor holds (stimulus then reflex of thought) as long as you do not ask of it more than the hooks allow.

## 7. Proposed next step

Designing is not migrating. We build Cortex in parallel, we test it in real conditions (do these questions really change the quality of the reasoning?), and only when it is proven do we remove the old (the skills and instructions it replaces). We delete nothing as long as the replacement has not proven itself.

> Note on the shipped version. This document is the analysis of the target; the shipped plugin (v0.2.0) wires seven of these moments -- orient, frame, intention, learn, rebound, delegation, self-critique -- each on a channel verified against the official docs. Choices settled at build time, with the docs to back them: self-critique (Stop) is a `prompt` hook, not the `agent` of section 4.7 (the docs mark `agent` experimental); intention (PreToolUse) is a `command` filtered to grave gestures, not a `prompt`/`agent`, to avoid an LLM call before every command. Two points were corrected after checking the source. First, the self-critique pillar: contrary to an earlier claim, Stop *does* accept `additionalContext` -- but a `prompt` hook is still the right call, because judging "is this at the level?" needs an LLM, not a fixed reminder. Second, consolidate (PreCompact, section 4.8) is **not** wired: PreCompact does not accept `additionalContext`, so a question there would never reach the agent; the concern moved to orient on the `compact` source instead. The shipped questions also fold in a research / tool-use / anticipation reflex (for what you only assume, go to the docs or the real code; reach for the tools actually available; look one step ahead) -- the heart of how Cortex pushes the agent to build its own method rather than be told how. Details in `docs/DOCTRINE.md`, `README.md` and `CHANGELOG.md`.
