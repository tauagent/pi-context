# Pi Context: Agentic Context Management for the Pi

A Git-like context management tool that allows AI agents to proactively manage their context.

Inspired by kimi-cli d-mail, implementing lossless time travel on the Pi session tree.

For the design philosophy, see the [blog post](https://blog.xlab.app/p/51d26495/)
 ([中文版本](https://blog.xlab.app/p/6a966aeb/)).

## Installation

```bash
pi install npm:pi-context
```

## Usage

### For Humans

Run the command to enable ACM (**A**gentic **C**ontext **M**anagement) for the current session.

```bash
/acm
```

View detailed context window usage and token distribution with a visual dashboard. (like `claude code /context`)

```bash
/context
```

![](img/context.png)

### For Agents

This extension adds the `context-management` skill with three core tools:

1.  **🔖 Structure (`context_tag`)**
`git tag` Create named milestones to structure your conversation history.

2.  **📊 Monitor (`context_log`)**
`git log` Visualize your conversation history, check token usage, and see where you are in the task tree.

3.  **⏪ Compress (`context_checkout`)**
`git checkout` Move the HEAD pointer to any tag or commit ID. Compress completed tasks into a summary to free up context window space.
