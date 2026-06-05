# WhytCard-Cortex, Doctrine

> A skill says "do X". Cortex asks "what do you actually know here, and so which way are you thinking?". The first freezes, the second makes you reason. Cortex does not dictate the answer, it triggers the thought that finds it. A nervous system, not a manual.

## Why Cortex exists

An agent governed by a catalog of fixed recipes (skills invoked en masse, instructions recited) does two things badly. It drowns: too many directives at once, and the right thought sinks under the noise. And it obeys without thinking: it applies the recipe instead of asking whether it is the right one here.

Expert thinking is not reciting fifty directives. It is asking THE right question at time T, and letting the answer emerge. Cortex reproduces that: a few excellent questions, asked at the right moments of the cycle, and nothing more. The rest, the agent finds on its own.

## The principle, in four points

1. **Questions, not orders.** We do not dictate the answer, we trigger the thought. Receptiveness to the question does the work, not obedience to a directive.
2. **At the moments of the cycle, not continuously.** Hooks fire at the boundaries of the agent cycle (a prompt arrives, just before a gesture, a tool just answered, the agent is about to conclude). You cannot think "between two thoughts": a real limit, owned. We wire the boundaries that matter.
3. **Fixed when the question is universal, alive when it must judge.** A question valid all the time: a `command` hook (fixed text, free, instant). A question that requires judging the real situation: a `prompt` hook (an LLM call that thinks). That is what keeps the system from being frozen.
4. **Frugal, or it suffocates.** Thirty events exist; wiring thirty would drown thought. Cortex wires five, and three of them almost never speak (filtered on grave gestures, carrier commands, failures). The felt cost stays that of two regular questions and three reflexes that sleep until the precise moment that wakes them. The discipline is selectivity: the right question, once, in the right place.

## The wired moments

The minimal prototype wired three moments (frame, learn, self-critique). Cortex completes them with two reflexes of the action cycle, intention and rebound, both strongly filtered to stay rare. Five moments in all, forming the full loop of an action: frame (before), intention (before a grave gesture), learn (after a success), rebound (after a failure), self-critique (at the end).

| Moment | Question asked (never an order) | Type | When it speaks |
|---|---|---|---|
| **Frame** (UserPromptSubmit) | Beneath the wording, what is really asked? What do I know (verified) vs. what do I assume? Is the stake reversible, visible, risky? Where to think: verify, search, act? Minimum or remarkable? | `command` | On every prompt (universal question, free). |
| **Intention** (PreToolUse, Bash/PowerShell) | Is this the right gesture, or the first that came to mind? What verified ground does it rest on? Is it reversible, and if I am wrong, can I go back? | `command` | Only on a destructive or hard-to-undo gesture (force-push, reset --hard, rm -rf, prod deploy, drop/truncate, publish). Silent otherwise. |
| **Learn** (PostToolUse, Bash/PowerShell) | This result, what does it teach me? Does it confirm or contradict what I believed? Does my plan still hold? | `command` | Only after a carrier command (test, build, lint, install, push, deploy), at most once per 60 s per session. |
| **Rebound** (PostToolUseFailure, Bash/PowerShell) | The real cause, not the symptom? What next hypothesis, a different one, rather than rerunning the same thing? | `command` | Only when a command fails (rare by nature). |
| **Self-critique** (Stop) | Is this really finished and at the intended level, or am I stopping at the first thing that works? What is missing? | `prompt` | On every turn end. Judges the real state, can return "continue". |

The "frame" pillar fuses into a single question two forces that usually pull apart: rigor (do you know, or do you assume? prove before asserting) and ambition (the minimum that works, or the remarkable?). A question that carries both, not two reminders stacked. Frugality in action.

## An honest caveat about the "self-critique" pillar

The wired moments are not all of the same nature, and it must be said plainly. Frame, intention, learn and rebound inject a real question into context: the agent reads it and answers it in its own reasoning, faithful to the principle "the hook asks the question, the model answers it".

"Self-critique" at Stop works differently. The technical channel of a Stop hook is not context injection (`additionalContext` is not read there), it is a decision: let conclude, or continue with a reason. The judgment "is this at the level?" is therefore rendered by a third-party LLM, beside the agent, not by the agent on itself. When the verdict is "let conclude" (the most frequent case), nothing reaches the agent: this pillar then acts as a guardrail against stopping too early, not as a question the agent asks itself. It is an owned exception to principle 1, imposed by what hooks allow, not an oversight. When the verdict is "continue", the returned reason is phrased as an open question, to restart thought rather than dictate the next step.

Naming it this way is staying honest about what the system actually does. An external judge-reflex at conclusion time has value (it catches the laziness of stopping early), but it is not the same mechanism as the four other moments.

## Moments in reserve (unwired)

Three moments stay ready but off, to be enabled one at a time and only once proven:

- **Orient** (SessionStart, `command`): "where does this work stand, what has already been settled, what has changed?" Often already covered by a session-orientation mechanism; not to be duplicated blindly.
- **Delegation** (SubagentStop, `command`): "what the subagent reports, do I take it at face value or cross-check it?"
- **Consolidate** (PreCompact, `command`): "of all this context, what must survive forgetting, what is only noise?"

We do not wire them until the five current ones have proven themselves. Adding a moment risks flood: each addition must earn its place.

## The honest trade-offs

- **The hook does not think for you.** It asks the question; it is the main model that must answer it in its reasoning. Effectiveness depends on receptiveness to the question. So: few questions, but excellent.
- **Latency and cost.** An LLM hook on every tool would make the agent slow and expensive. Cortex reserves the LLM for the single stop judgment and keeps `command` (free, instant) everywhere else. To own plainly: that judgment fires on every turn end, including a purely conversational exchange (a hello, a question to the user), which then pays an LLM call just to confirm there is nothing to finish. Over a session of many short exchanges, the cost adds up; disabling the Stop block on those sessions is legitimate.
- **Flood lurks.** Five hooks each reciting ten lines, and thought drowns. The questions are short; intention, learn and rebound are strongly filtered (they speak only at a precise moment); learn is throttled; self-critique is calibrated to let conclude when in doubt. Owned watch point: "frame" injects on every prompt without a filter (its nature is universal), so watch it in real testing, and if the repeated injection wears thin or annoys, lighten it.
- **"Neural" is a metaphor, not a technical reality.** Concretely: injections of questions at the boundaries of the cycle, and a judgment computed by an LLM at conclusion time. The metaphor holds (stimulus, then reflex of thought) as long as you do not ask of it more than the hooks allow.

## The technical facts, verified (official Claude Code docs)

Everything rests on facts confirmed in the docs, read at build time, and on real execution of the hooks.

- **PostToolUse and PostToolUseFailure can inject context** via `hookSpecificOutput.additionalContext`. Confirmed; the "learn" and "rebound" pillars rest on it.
- **PostToolUseFailure cannot block** (the tool already failed): it is therefore necessarily a non-blocking question, which is exactly right. Its input schema is undocumented (how the error is exposed is not specified), so "rebound" asks a universal question and reads no assumed error field.
- **PreToolUse can inject context** and it is proven in production. "Intention" is a non-blocking `command`, filtered to grave gestures only. The heavier variant exists (a `prompt`/`agent` hook that would judge and could hold back), documented but unwired, so as not to pay an LLM call before every command.
- **The `prompt`/`agent` hook types are available on Stop** (the docs show an example), not only on tool events. That is what enables self-critique by a real judgment, rather than a blind reminder.
- **Stop can return "continue".** A `command` hook does so via `{"decision":"block","reason":"..."}`; a `prompt`/`agent` hook via `{"ok":false,"reason":"..."}`. `additionalContext` is **not** read on Stop: the channel is the decision. A blind `command` would therefore be unusable there (it would always block), hence the choice of a `prompt` that judges.
- **`agent` hooks are marked experimental and discouraged in production** by the docs. So Cortex keeps `prompt` for Stop: it judges for real (an LLM call), stays stable, and costs less than a multi-turn agent. `agent` stays documented as an advanced variant, to enable knowingly.
- **Block cap:** 8 consecutive blocks by default (configurable). Eight forced continuations is a lot for a guardrail: better to lower it to 2 or 3 (the `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` variable). And since a `prompt` hook is stateless, the anti-loop guard is written into the prompt itself (spot a continuation already issued on the same deliverable in the transcript, and do not insist).

## How Cortex composes with the existing setup

Cortex is a standalone plugin, in its own folder. It touches no global instruction and removes nothing. Where a pile of fixed skills and instructions is already in place, Cortex replaces it only once it has proven it carries the same demands (rigor and ambition) on its own, better, and without the flood. Designing is not migrating. You build the replacement alongside, test it in real conditions, and only when proven do you remove the old. Nothing is deleted blindly.

## The single principle

> Few questions, but excellent, at the right moment. We do not dictate the right thought, we trigger it. And the safe minimum stays the floor, never the ceiling.
