# Pi Context Extension

Git-like time travel and context optimization for AI agents.

This extension transforms the abstract concept of "Context Window Management" into a concrete economic system for AI agents, allowing them to:
1.  **Structure**: Bookmark stable states (Tags).
2.  **Monitor**: Visualize their memory usage (Log).
3.  **Compress**: Squash history to free up tokens (Checkout).

## Installation

Add the package to your `pi` configuration or install globally:

```bash
pi install npm:pi-context
```

## Usage

This extension provides the `context-management` skill. Load it to enable the workflow:

```bash
/skill:context-management
```

### 1. Monitor Context (`context_log`)

Visualize your conversation history and current token usage.

- **HUD**: Shows usage percentage (e.g., `85% (108k/128k)`) and segment size (risk).
- **Graph**: Shows a Git-like tree of conversation turns.
    - **User Messages**: Automatically treated as milestones.
    - **Tags**: Explicit bookmarks.
    - **Hidden**: Low-value intermediate steps (thinking/tools) are collapsed by default.

### 2. Save Checkpoints (`context_tag`)

Create named tags for stable states. Think of these as "Save Games" or "Git Tags".

```javascript
// Mark a stable point
context_tag({ name: "feature-a-done" })
```

### 3. Time Travel & Squash (`context_checkout`)

Move the HEAD pointer to any tag or commit ID. Use this to:
- **Undo**: Go back to a previous state if you mess up.
- **Squash**: Consolidate history into a summary message at a new root.

```javascript
// Undo: Go back to 'start' tag
context_checkout({ 
  target: "start",
  message: "Backtracking to start. Approach A failed due to recursion limit." 
})

// Squash: Go to 'root' but keep a summary of work done
context_checkout({ 
  target: "root", 
  message: "Completed Feature A. Summary: 1. Created file X. 2. Updated tests.",
  tagName: "clean-slate" 
})
```

## The "Context Economy"

Your context window is limited capital.
- **Assets**: Tagged, stable code.
- **Liabilities**: Long, untagged thinking chains.
- **Bankruptcy**: Running out of tokens mid-task.

**Strategy:**
1.  **Audit**: Check `context_log` frequently.
2.  **Liquidate**: Use `context_checkout` to "cash out" finished tasks into summaries.
3.  **Invest**: Use freed tokens for the next complex task.

## License

MIT
