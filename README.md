# Pi Context Management

An advanced context management extension for Pi Coding Agent that treats conversation history like a Git repository. It allows you to:
- **Save Checkpoints**: Tag stable states before risky changes.
- **Time Travel**: Revert to any previous point in history.
- **Switch Tasks**: Jump between different tasks without losing context.
- **Visualize History**: See a clear, Git-like graph of your conversation tree.

## Installation

```bash
pi install npm:pi-context
```

## How It Works

This extension introduces three powerful tools:

1.  **`context_log`**: View your history. It automatically collapses intermediate AI steps and highlights key milestones (User messages, Tags, Branch points).
2.  **`context_checkout`**: Navigate to any point in history. You can carry a **summary** of your current work with you, ensuring you don't lose context when switching tasks.
3.  **`context_tag`**: Label a specific state (e.g., "v1-stable") for easy reference.

## Example Workflow

1.  **Work on Task A**:
    - Tag it: `context_tag({ name: "task-a-done" })`
2.  **User asks for Task B**:
    - Jump to a clean state: `context_checkout({ target: "root", message: "Finished Task A. Starting Task B." })`
3.  **User asks about Task A again**:
    - Jump back: `context_checkout({ target: "task-a-done", message: "Pausing Task B. Returning to Task A." })`

## Configuration

No configuration needed. Just install and start using the tools.
