# WhytCard-Cortex, Doctrine

> A skill says "do X". Cortex asks "what do you actually know here, and so which way are you thinking?". The first freezes, the second makes you reason. Cortex does not dictate the answer, it triggers the thought that finds it. A nervous system, not a manual.

## Why Cortex exists

An agent governed by a catalog of fixed recipes (skills invoked en masse, instructions recited) does two things badly. It drowns: too many directives at once, and the right thought sinks under the noise. And it obeys without thinking: it applies the recipe instead of asking whether it is the right one here.

Expert thinking is not reciting fifty directives. It is asking THE right question at time T, and letting the answer emerge. Cortex reproduces that: a few excellent questions, asked at the right moments of the cycle, and nothing more. The rest, the agent finds on its own.

## The principle, in four points

1. **Questions, not orders.** We do not dictate the answer, we trigger the thought. Receptiveness to the question does the work, not obedience to a directive.
2. **At the moments of the cycle, not continuously.** Hooks fire at the boundaries of the agent cycle (a prompt arrives, just before a gesture, a tool just answered, the agent is about to conclude). You cannot think "between two thoughts": a real limit, owned. We wire the boundaries that matter.
3. **Fixed when the question is universal, alive when it must judge.** A question valid all the time: a `command` hook (fixed text, free, instant). A question that requires judging the real situation: a `prompt` hook (an LLM call that thinks). That is what keeps the system from being frozen.
4. **Frugal, or it suffocates.** Around thirty events exist; wiring thirty would drown thought. Cortex wires seven, and four of them almost never speak (orient only at a session boundary; intention, learn and rebound filtered on grave gestures, carrier commands, failures). The felt cost stays that of one orienting question per session, one framing question per substantive prompt, and reflexes that sleep until the precise moment that wakes them. The discipline is selectivity: the right question, once, in the right place.

## The wired moments

The minimal prototype wired three moments (frame, learn, self-critique). Cortex now spans the full session, seven moments, each on a channel verified to actually inject its question (see "The technical facts"). Of the seven, four almost never speak (orient fires only at a session boundary; intention, learn and rebound are strongly filtered), so the felt cost stays low.

| Moment | Question asked (never an order) | Type | When it speaks |
|---|---|---|---|
| **Orient** (SessionStart) | Where does this stand, what is already decided? And what tools, MCP servers, skills and official docs are available to me right now, so I use them instead of improvising? (After a compaction: what essential thread must I re-establish?) | `command` | At a session boundary (startup, resume, clear, compact). |
| **Frame** (UserPromptSubmit) | Beneath the wording, what is really asked? What do I know (verified) vs. assume -- and for the gaps, where is the ground truth (docs, code, a quick test)? What tools are available for this? What is one step ahead? Minimum or remarkable? | `command` | On every prompt, except a bare pleasantry. |
| **Intention** (PreToolUse, Bash/PowerShell) | Is this the right gesture, or the first that came to mind? What verified ground does it rest on? Is it reversible, and if I am wrong, can I go back? | `command` | Only on a destructive or hard-to-undo gesture (force-push, reset --hard, rm -rf, disk wipe, prod deploy, drop/truncate, publish). Silent otherwise. |
| **Learn** (PostToolUse, Bash/PowerShell) | This result, what does it teach me? Does it confirm or contradict what I believed? Does my plan still hold? Is there a reusable understanding to carry forward? | `command` | Only after a carrier command (test, build, lint, install, push, deploy), at most once per 60 s per session. |
| **Rebound** (PostToolUseFailure, Bash/PowerShell) | The real cause, not the symptom? Is the answer already written down where I have not looked (the full error, the docs, the source)? What next hypothesis, a different one? | `command` | Only when a command fails (rare by nature). |
| **Delegation** (SubagentStop) | What the subagent reports, do I take it at face value or cross-check it against the ground truth? Does it answer what I delegated? | `command` | When a subagent hands its result back. |
| **Self-critique** (Stop) | Is this really finished and at the intended level, or am I stopping at the first thing that works? Was it verified, or only asserted from memory? What is missing? | `prompt` | On every turn end. Judges the real state, can return "continue". |

The "frame" pillar fuses into a single question the forces that usually pull apart: **rigor** (do you know, or do you assume? prove before asserting), **research** (for what you only assume, go to the ground truth -- the official docs, the real code, a quick test), **tool-awareness** (use the right tool that is actually available, don't reinvent it by hand), **anticipation** (look one step ahead: what will this require, what could go wrong), and **ambition** (the minimum that works, or the remarkable?). One question that carries them all, not five reminders stacked. Frugality in action.

This is how Cortex means to replace skills rather than join them. A skill exists because the agent might not know how to do a thing well, so it spells out the steps. Cortex never spells out steps; it pushes the agent to run the journey itself -- research, comprehension, where to look, which available tool to reach for -- and so to build its own method on the spot. Questions that make the agent capable, not recipes that make it dependent.

## An honest caveat about the "self-critique" pillar

The wired moments are not all of the same nature, and it must be said plainly. Orient, frame, intention, learn, rebound and delegation inject a real question into context: the agent reads it and answers it in its own reasoning, faithful to the principle "the hook asks the question, the model answers it".

"Self-critique" at Stop works differently, and for a precise reason. A Stop hook *can* inject context (the official docs confirm `Stop` and `SubagentStop` accept `hookSpecificOutput.additionalContext`), but a fixed, blind question is no use at the very end: deciding "is this finished and at the level?" requires actually judging the turn, which a `command` script cannot do. So the Stop pillar is a `prompt` hook -- a real LLM judgment -- rendered by a third-party model beside the agent, not by the agent on itself. When the verdict is "let it conclude" (the most frequent case), nothing reaches the agent: the pillar then acts as a guardrail against stopping too early, and against the claim left unverified. When the verdict is "continue", the returned reason is phrased as an open question, to restart thought rather than dictate the next step.

Naming it this way is staying honest: an external judge-reflex at conclusion time has real value, but it is a different mechanism from the six other moments, which are questions the agent answers itself.

> Correction kept visible, not quietly erased. An earlier version of this doctrine claimed `additionalContext` was *not* read on Stop, and inferred a `command` hook would always block and be unusable there. That was wrong on the fact (the docs say Stop does accept `additionalContext`). The conclusion -- use a `prompt` hook for Stop -- happens to be right anyway, but for the reason above (judgment needs an LLM), not the one first given. Practising the doctrine's own rule: prove against the source, and own the correction.

## Moments left unwired, and why

- **Consolidate** (PreCompact). The natural question here is "of all this context, what must survive forgetting, what is only noise?". But `PreCompact` does *not* accept `additionalContext` (verified: it supports only `decision: "block"`), so a question injected there would never reach the agent -- it would be a dead hook. Rather than ship one, Cortex carries the concern through **Orient on the `compact` source**, which fires right after a compaction and *does* inject context, asking the agent to re-establish the essential thread. The moment moved to where the channel works.
- **Everything else** (the rest of the ~30 events: PostToolBatch, PermissionRequest, TaskCompleted, FileChanged, and so on). Real, but unwired on purpose. Each addition risks flood; a moment earns its place only by proving, in real use, that its question changes the quality of the reasoning. The bar is "is this question worth interrupting for?", not "does this event exist?".

## Why hooks, and not a dedicated MCP server

The tempting next step is a custom MCP server exposing a "reason harder" or "plan the research" tool. Cortex deliberately does not do this, and the reason is the whole thesis. An MCP tool is *agent-invoked*: it works only if the agent decides to call it -- which is exactly the failure mode of skills (the agent has to know it should reach for the recipe, and often doesn't). A hook is a *reflex*: it fires by itself at the boundary of the cycle, whether or not the agent thought to ask. For "make the agent think at the right moment", the reflex wins; an opt-in tool would just be a skill wearing an MCP costume.

When a question genuinely needs to adapt to the live situation rather than be fixed text, the answer is not a separate server either -- it is the hook types Claude Code already provides: `prompt` (one LLM call, used here for Stop) and `agent` (multi-turn, experimental). They run inside the hook mechanism, keep the reflex property, and add no dependency. That is the dynamic-thinking upgrade path, kept native.

## The honest trade-offs

- **The hook does not think for you.** It asks the question; it is the main model that must answer it in its reasoning. Effectiveness depends on receptiveness to the question. So: few questions, but excellent.
- **Latency and cost.** An LLM hook on every tool would make the agent slow and expensive. Cortex reserves the LLM for the single stop judgment and keeps `command` (free, instant) everywhere else. To own plainly: that judgment fires on every turn end, including a purely conversational exchange (a hello, a question to the user), which then pays an LLM call just to confirm there is nothing to finish. Over a session of many short exchanges, the cost adds up; disabling the Stop block on those sessions is legitimate.
- **Flood lurks.** Seven hooks each reciting ten lines, and thought drowns. The questions are short; orient speaks only at a session boundary; intention, learn and rebound are strongly filtered (they speak only at a precise moment); learn is throttled; self-critique is calibrated to let conclude when in doubt; frame now steps aside for a bare pleasantry. Owned watch point: frame still injects on every *substantive* prompt (its nature is universal), so watch it in real testing, and if the repeated injection wears thin, lighten it.
- **"Neural" is a metaphor, not a technical reality.** Concretely: injections of questions at the boundaries of the cycle, and a judgment computed by an LLM at conclusion time. The metaphor holds (stimulus, then reflex of thought) as long as you do not ask of it more than the hooks allow.

## The technical facts, verified (official Claude Code docs)

Everything rests on facts confirmed in the docs, read at build time, and on real execution of the hooks.

- **PostToolUse and PostToolUseFailure can inject context** via `hookSpecificOutput.additionalContext`. Confirmed; the "learn" and "rebound" pillars rest on it.
- **SessionStart can inject context** via `additionalContext` (the docs even show a worked example loading branch/issue context), and it carries a `source` matcher: `startup`, `resume`, `clear`, `compact`. The "orient" pillar rests on it, and reads `source` to switch to a re-orientation question after a compaction.
- **SubagentStop can inject context.** The docs state `Stop` and `SubagentStop` accept `hookSpecificOutput.additionalContext`. The "delegation" pillar rests on it, returning no decision field so it can never force a continuation -- it only offers the cross-check question.
- **PreCompact cannot inject context.** It supports only `decision: "block"` (and the standard output fields), not `additionalContext`. A "consolidate" question injected there would never reach the agent, so that moment is *not* wired; the concern is handled by Orient on the `compact` source instead.
- **PostToolUseFailure cannot block** (the tool already failed): it is therefore necessarily a non-blocking question, which is exactly right. Its input schema is undocumented (how the error is exposed is not specified), so "rebound" asks a universal question and reads no assumed error field.
- **PreToolUse can inject context** and it is proven in production. "Intention" is a non-blocking `command`, filtered to grave gestures only. The heavier variant exists (a `prompt`/`agent` hook that would judge and could hold back), documented but unwired, so as not to pay an LLM call before every command.
- **The `prompt`/`agent` hook types are available on Stop** (the docs show an example), not only on tool events. That is what enables self-critique by a real judgment, rather than a blind reminder.
- **Stop can return "continue", and Stop *does* accept `additionalContext`.** A `command` hook continues via `{"decision":"block","reason":"..."}`; a `prompt`/`agent` hook via `{"ok":false,"reason":"..."}`. The docs are explicit that `Stop` and `SubagentStop` also accept `hookSpecificOutput.additionalContext`. So the choice of a `prompt` hook for Stop is **not** because a `command` could not inject there -- it could -- but because the self-critique question demands a real judgment ("is this at the level?"), which only an LLM can make. (This corrects an earlier version of the doctrine; see the caveat section above.)
- **`agent` hooks are marked experimental and discouraged in production** by the docs. So Cortex keeps `prompt` for Stop: it judges for real (an LLM call), stays stable, and costs less than a multi-turn agent. `agent` stays documented as an advanced variant, to enable knowingly.
- **Block cap:** 8 consecutive blocks by default (configurable). Eight forced continuations is a lot for a guardrail: better to lower it to 2 or 3 (the `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` variable). And since a `prompt` hook is stateless, the anti-loop guard is written into the prompt itself (spot a continuation already issued on the same deliverable in the transcript, and do not insist).

## How Cortex composes with the existing setup

Cortex is a standalone plugin, in its own folder, with zero dependencies and a test suite of its own. It touches no global instruction and removes nothing. Where a pile of fixed skills and instructions is already in place, Cortex replaces it only once it has proven it carries the same demands (rigor, research, tool-use, anticipation and ambition) on its own, better, and without the flood. Designing is not migrating. You build the replacement alongside, test it in real conditions, and only when proven do you remove the old. Nothing is deleted blindly.

## The living guide -- personalising the reflexes (v0.4)

The seven reflexes are *universal*: the same questions for everyone. v0.4 adds a second plane that the first did not have -- a **personal guide**, learned from the user, that Cortex injects alongside the universal questions. This is a real evolution of the doctrine, and it must be stated as plainly as the rest.

**The tension, named.** "Questions, not orders" pushes against a catalogue of standing instructions; that is the whole reason Cortex exists. A guide of "always X / never Y" is, literally, such a catalogue. So why add it? Because there is a difference between *imposed* recipes and *inherited* ones. A skill dictates a generic method the agent did not choose. The guide holds the **user's own durable preferences**, and Cortex earns each line by **asking first** -- the capture is itself a question ("you stated a preference; shall I keep it?"), never an automatic write. The content is the user's; the consent is explicit; the line can be dropped (`cortex-forget`) or the whole guide frozen (`cortex-lock`) at any time. The doctrine's rule holds at the meta-level: *Cortex still only asks; the user still provides the answer.* What is inherited is not Cortex's opinion of good work, but the user's.

**Why a guide of data, not new hooks.** The tempting reading of "make the pipeline evolve" is to generate real hooks at runtime. Verified against the official docs, Claude Code does not support this: no API to register or remove hooks mid-session, no guaranteed config reload, and writing shell hooks dynamically has no trust guardrail. So Cortex does not. "Adding a hook" is reframed as **adding a rule to a guide file** that the already-wired reflexes (Frame, Orient) inject -- exactly the mechanism `memory.md` already used, generalised. The effect the user feels ("the pipeline grew a reflex") is identical; the implementation stays reload-free, safe, and inside proven channels. Choosing the robust mechanism over the literal one, and proving it against the source, is the doctrine applied to itself.

**Guide vs memory.** Two artefacts, two jobs, kept distinct: `memory.md` is WHAT is true (facts the agent verified -- decisions, traps); `guide.md` is HOW to work (the user's preferences). One recalls knowledge, the other steers behaviour. Conflating them would blur both.

**Frugality still rules.** The guide injects on every substantive prompt (via Frame) and at session start (via Orient), capped so it can never flood, and the capture nudge falls silent the moment the guide is locked. The discipline is unchanged: the smallest set of sharp rules beats a long one. `cortex-review` exists precisely to push the guide *down* toward fewer, truer lines -- the "perfect" pipeline is small.

**Honest status.** This is Phase 1: the substrate (guide, language, lock, the command surface) is built and tested; the *automatic* detection of a stated preference rides on a Frame nudge and is deliberately the least mature part, to be sharpened only once it proves it does not flood. Designing is not migrating -- here as everywhere in Cortex.

## The single principle

> Few questions, but excellent, at the right moment. We do not dictate the right thought, we trigger it. And the safe minimum stays the floor, never the ceiling.
