# Pi Context Extension

**Git-like context management for AI agents.**

## Installation

```bash
pi install npm:pi-context
```

## Features

This extension adds the `context-management` skill with three core tools:

1.  **🔖 Structure (`context_tag`)**
`git tag` Create named milestones to structure your conversation history.

2.  **📊 Monitor (`context_log`)**
`git log` Visualize your conversation history, check token usage, and see where you are in the task tree.

3.  **⏪ Compress (`context_checkout`)**
`git checkout` Move the HEAD pointer to any tag or commit ID. Compress completed tasks into a summary to free up context window space.

## Usage

Load the skill to enable the workflow:

```bash
/skill:context-management
```
