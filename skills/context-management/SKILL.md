---
name: context-management
description: Strategies for efficient context management using context_log, context_tag, and context_checkout. Learn when to tag, how to visualize the graph, and safe ways to squash history. Use for complex refactoring, debugging, and long conversations.
---

# Context Management

**CRITICAL: THIS SKILL MANAGES YOUR MEMORY (CONVERSATION HISTORY), NOT THE USER'S FILES.**

Your context window is a limited resource. As the conversation grows, "pollution" (noise, failed attempts, intermediate logs) degrades your reasoning.

**Use this skill to optimize your "Context Economy":**
1.  **Structure (Save Points)**: Use `context_tag` to bookmark stable states. **Untagged progress is risky.** Always tag before a major step.
2.  **Monitor (Awareness)**: Use `context_log` to check your "Usage" and "Segment Size". **Don't fly blind.** High usage degrades your reasoning.
3.  **Compress (Hygiene)**: Use `context_checkout` to squash history. **Finished tasks are noise.** Summarize them to reclaim memory.

## The Context Dashboard

Call `context_log` to see your status. It provides a **HUD** (Health Metrics) and a **Graph** (Map).

### 1. The HUD (Health)
```text
• Context Usage:    85% (108k/128k)
• Segment Size:     84 steps since last tag
```

### 2. The Graph (Map)
The log tree shows where you are and where you've been.
```text
| 1a2b3c4 (ROOT, tag: start) [USER] Start the project.
| ... (50 hidden messages) ...
| f9e8d7c (tag: task-a-done) [SUMMARY] Task A completed.
| ... (5 hidden messages) ...
* a1b2c3d (HEAD, tag: task-b-start) [AI] I have switched to Task B.
```
- **`*` (Asterisk)**: Your current location (HEAD).
- **`... (hidden)`**: Low-value steps (thinking/tools) are auto-collapsed.
- **`tag: name`**: Safe checkpoints to jump back to.
- **`[SUMMARY]`**: A compressed history node (squashed context).

## Decision Framework: When to Act?

### 1. Resource Perspective (The Dashboard)
*Check the `context_log` HUD.*

| Signal | Diagnosis | Prescription |
| :--- | :--- | :--- |
| **Usage > 50%** | **ATTENTION DECAY**: Recall fades, instruction adherence drops, and reasoning quality suffers. | **COMPRESS**: `context_checkout({ target: "task-start", message: "Consolidated progress...", tagName: "clean-up" })` |
| **Segment > 10** | **LINEAR FATIGUE**: Hard to distinguish signal from noise in long threads. | **TAG**: `context_tag({ name: "safe-point" })` |

### 2. Task Perspective (The Workflow)
*Reflect on your current progress.*

| Signal | Diagnosis | Prescription |
| :--- | :--- | :--- |
| **"I tried 3 times and failed"** | **POISONED CONTEXT**: Previous failures bias future attempts and eat up token budget. | **BACKTRACK**: `context_checkout({ target: "last-working-tag", message: "Approach A failed..." })` |
| **"I think I finished the task"** | **PENDING**: User might ask for tweaks. | **TAG ONLY**: `context_tag({ name: "feature-x-candidate" })`. **Do not squash yet.** |
| **"User starts a NEW task"** | **SAFE TO CLOSE**: Old context is now clutter. | **SQUASH**: `context_checkout({ target: "root", message: "Prev task done. Summary...", tagName: "clean-slate" })` |

## Writing Effective Checkout Messages

The `message` parameter in `context_checkout` is **MANDATORY**. It is your lifeline to your past self.
A good message preserves critical context that would otherwise be lost.

**Structure:** `[Status] + [Reason] + [Carryover Data]`

*   **Status**: What did you just finish or stop doing?
*   **Reason**: Why are you branching/moving? (e.g., "Too much noise", "Task complete", "Failed attempt")
*   **Carryover**: What specific details (IDs, file paths, user constraints) must be remembered?

**Examples:**

*   *Good (Resetting after failure)*: "Abandoning the recursive approach (infinite loop). Switching back to iterative. **Carryover**: The test case `test_retry_logic` is the one failing."
*   *Good (Cleaning up)*: "Completed authentication module. All tests passed. **Carryover**: The user ID is stored in `localStorage` under `auth_token`. Moving to Dashboard UI."
*   *Bad*: "Switching context." (Too vague - you will forget why)
*   *Bad*: "Done." (What is done? What did we learn?)

## Tools & Workflows

### 1. Build the ToC (`context_tag`)
Don't just work blindly. Tag your milestones so you (and the user) can see the structure.
- *Good*: `start` -> `plan-v1` -> `impl-v1` -> `test-pass`
- *Bad*: `start` -> (100 messages) -> `done`

### 2. View the Map (`context_log`)
Check where you are and how expensive the path is.
- Use `verbose: false` (default) to see the high-level "ToC" (Milestones).

### 3. Squash & Merge (`context_checkout`)
**This is your Garbage Collector.** Use it to delete low-value history but keep high-value insights.

> **CRITICAL REMINDER: CONTEXT IS NOT CODEBASE**
> Checking out a new context branch **DOES NOT DELETE FILES**. It only resets your *conversation memory*. Your code on disk is safe.
>
> **Safety Net (Undo Button):**
> `context_checkout` is non-destructive. If you squash too much, use `context_log` to find the old branch ID and checkout back to it.

**Scenario: Task Complete & Confirmed**
You finished Feature A. **Wait for user confirmation.**
*User*: "Looks good. Now let's work on Feature B."
*Reasoning*: Feature A details are now noise. Feature B needs a clean slate.

```javascript
// 1. Tag the raw history (just in case)
context_tag({ name: "feature-a-raw" });

// 2. Squash to Root (or previous milestone)
context_checkout({
  target: "root", // or "project-start"
  message: "Feature A completed. All tests passed. Key files created: X, Y, Z.",
  tagName: "feature-a-done"
});
```
*Result*: You are now at a clean state with just the summary of Feature A. Cost dropped from 50 msgs to 1 msg.

**Scenario: Pivot / Retry**
You tried approach A and it failed 5 times (Pollution).
*Solution*: Backtrack and summarize the failure.

```javascript
context_checkout({
  target: "task-start", // Go back to before the mess
  message: "Approach A failed due to library incompatibility. Context clean. Starting Approach B.",
  tagName: "retry-approach-b"
});
```
