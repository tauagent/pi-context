# Pi Context: The "Git for Conversations" Agent

## Developer Guide (`DEV.md`)

This project implements a context management extension for the Pi Coding Agent. It is built on a simple premise: **Treat conversation history like a Git repository.**

### Core Philosophy

1.  **Immutable History**: Every message (User or AI) is a node in a Merkle-like tree (Session Tree).
2.  **Navigation > Deletion**: Instead of "clearing" context, we simply move the HEAD pointer to a different node.
3.  **Context Carryover**: When switching branches, we don't want to start blank. We support "Squash & Merge" semantics to compress a branch's knowledge into a single summary message injected into the new branch.

### Tool Design

The tools map directly to Git concepts to leverage the LLM's existing training on version control:

| Tool | Git Analog | Function |
| :--- | :--- | :--- |
| `context_log` | `git log --graph` | Visualizes the tree. By default, it **collapses** intermediate AI steps and only shows "Milestones" (User msgs, Tags, Branch points). |
| `context_checkout` | `git checkout -b` | Moves HEAD. Supports a `message` param to create a "Merge Commit" (Summary) at the destination. |
| `context_tag` | `git tag` | Labels a specific node for easy reference. |

### Technical Implementation

- **`context_log`**:
  - Implements a custom tree walker (`walk`) to linearize the session tree.
  - **Smart Filtering**: The `isInteresting` function identifies nodes that must be shown (User messages, Tags, Branch tips). All other nodes are folded into `... (N hidden messages) ...` to save context window.
  - **Visuals**: Uses ASCII art (`*`, `|`, `•`) to distinguish HEAD, history, and User messages.

- **`context_checkout`**:
  - Resolves targets via Regex (ID) or Label lookup.
  - Uses `sm.branchWithSummary(targetId, message)` to create a new branch starting with a summary.
  - Supports `tagName` to immediately label the new leaf node.

- **`context_tag`**:
  - Simple wrapper around `pi.setLabel`.

### Future Improvements
- **Auto-Tagging**: Heuristics to automatically label significant "Aha!" moments.
- **Diff View**: A tool to show the textual diff between two conversation branches.
