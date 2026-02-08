import type {
  ExtensionAPI,
  SessionEntry,
  SessionManager,
  SessionMessageEntry,
  BranchSummaryEntry,
  CompactionEntry,
} from "@mariozechner/pi-coding-agent";
import type {
  ToolResultMessage,
  AssistantMessage,
  ToolCall,
  TextContent,
  ImageContent,
} from "@mariozechner/pi-ai";
import { Type, type Static } from "@sinclair/typebox";

// Define missing types locally as they are not exported from the main entry point
interface SessionTreeNode {
  entry: SessionEntry;
  children: SessionTreeNode[];
  label?: string;
}

const ContextLogParams = Type.Object({
  limit: Type.Optional(Type.Number({ description: "History limit for visible entries (default: 50)." })),
  verbose: Type.Optional(Type.Boolean({ description: "If true, show ALL messages. If false (default), collapses intermediate AI steps and only shows 'milestones': User messages, Tags, Branch Points, and Summaries." })),
});

const ContextCheckoutParams = Type.Object({
  target: Type.String({ description: "Where to jump/squash to. Can be a tag name (e.g., 'task-start'), a commit ID, or 'root'. This is the base for your new branch." }),
  message: Type.String({ description: "The 'Carryover Message' for the new branch. A summary of your *current* progress/lessons that you want to bring with you to the new state. This ensures you don't lose key information when switching contexts. Good summary message: '[Status] + [Reason] + [Important Changes] + [Carryover Data]'" }),
  tagName: Type.Optional(Type.String({ description: "Optional tag name to apply to the target state immediately after checking out." })),
});

const ContextTagParams = Type.Object({
  name: Type.String({ description: "The tag/milestone name. Use meaningful names." }),
  target: Type.Optional(Type.String({ description: "The commit ID to tag. Defaults to HEAD (current state)." })),
});

const isInternal = (name: string) => ["context_log", "context_checkout", "context_tag"].includes(name);

const resolveTargetId = (sm: SessionManager, target: string): string => {
  if (target.toLowerCase() === "root") {
    const tree = sm.getTree() as unknown as SessionTreeNode[];
    return tree.length > 0 ? tree[0].entry.id : target;
  }
  if (/^[0-9a-f]{8,}$/i.test(target)) return target;
  const find = (nodes: SessionTreeNode[]): string | null => {
    for (const n of nodes) {
      if (sm.getLabel(n.entry.id) === target) return n.entry.id;
      const r = find(n.children);
      if (r) return r;
    }
    return null;
  };
  // sm.getTree() returns the SDK's SessionTreeNode[], which is structurally compatible
  return find(sm.getTree() as unknown as SessionTreeNode[]) || target;
};

const formatTokens = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return n.toString();
};

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "context_log",
    label: "Context Log",
    description: "Show the entire history structure (status, message, tags, milestones). Analogous to 'git log --graph --oneline --decorate'",
    parameters: ContextLogParams,
    async execute(_id, params: Static<typeof ContextLogParams>, _signal, _onUpdate, ctx) {
      const sm = ctx.sessionManager as SessionManager;
      const tree = sm.getTree() as unknown as SessionTreeNode[];
      const currentLeafId = sm.getLeafId();
      const verbose = params.verbose ?? false;
      const limit = params.limit ?? 50;

      const parents = new Map<string, string>();
      const entryMap = new Map<string, SessionEntry>();
      const childrenMap = new Map<string, SessionEntry[]>();

      const walk = (nodes: SessionTreeNode[], pId?: string) => {
        for (const n of nodes) {
          entryMap.set(n.entry.id, n.entry);
          if (pId) {
            parents.set(n.entry.id, pId);
            const siblings = childrenMap.get(pId) || [];
            siblings.push(n.entry);
            childrenMap.set(pId, siblings);
          }
          walk(n.children, n.entry.id);
        }
      };
      walk(tree);

      const getMsgContent = (entry: SessionEntry): string => {
        if (entry.type === "branch_summary" || entry.type === "compaction") {
          const e = entry as BranchSummaryEntry | CompactionEntry;
          return e.summary || "[No summary provided]";
        }
        if (entry.type === "label") {
          return `tag: ${entry.label}`;
        }

        if (entry.type === "message") {
          const msg = entry.message;

          if (msg.role === "toolResult") {
            const tr = msg as ToolResultMessage;
            if (!verbose && isInternal(tr.toolName)) return "";

            const extractText = (content: (TextContent | ImageContent)[]): string => {
              return content
                .map((p) => (p.type === "text" ? p.text : ""))
                .join(" ")
                .trim();
            };

            let resText = extractText(tr.content);
            const details = tr.details as Record<string, unknown> | undefined;
            if ((tr.toolName === "read" || tr.toolName === "edit") && details && "path" in details && typeof details.path === "string") {
              resText = `${details.path}: ${resText}`;
            }
            return `(${tr.toolName}) ${resText}`;
          }

          if (msg.role === "bashExecution") {
            return `[Bash] ${msg.command}`;
          }

          if (msg.role === "user" || msg.role === "assistant") {
            let text = "";
            if (typeof msg.content === "string") {
              text = msg.content;
            } else if (Array.isArray(msg.content)) {
              text = msg.content
                .map((p: any) => {
                  if (typeof p === "object" && p !== null && "text" in p) return (p as TextContent).text;
                  return "";
                })
                .join(" ")
                .trim();
            }

            let toolCallsText = "";
            if (msg.role === "assistant") {
              const am = msg as AssistantMessage;
              const toolCalls = am.content.filter((c): c is ToolCall => c.type === "toolCall");

              toolCallsText = toolCalls
                .filter((tc) => verbose || !isInternal(tc.name))
                .map((tc) => `call: ${tc.name}(${JSON.stringify(tc.arguments)})`)
                .join("; ");
            }

            return [text, toolCallsText].filter(Boolean).join(" ");
          }
        }
        return "";
      };

      const backboneIds: string[] = [];
      let currId: string | undefined = currentLeafId ?? undefined;
      while (currId) {
        backboneIds.unshift(currId);
        currId = parents.get(currId);
      }

      const sequence: SessionEntry[] = [];
      backboneIds.forEach((id) => {
        const entry = entryMap.get(id);
        if (!entry) return;
        sequence.push(entry);
        const children = childrenMap.get(id) || [];
        children.forEach((child) => {
          if ((child.type === "branch_summary" || child.type === "compaction") && !backboneIds.includes(child.id)) {
            sequence.push(child);
          }
        });
      });

      const isInteresting = (entry: SessionEntry): boolean => {
        // 1. HEAD and Root
        if (entry.id === currentLeafId) return true;
        if (!parents.has(entry.id)) return true;

        // 2. Explicit Tags (Labels) - Only show the TAGGED node, not the label node itself
        if (sm.getLabel(entry.id)) return true;
        if (entry.type === 'label') return false; // Hide label nodes, they are redundant

        // 3. Structural Milestones (Summaries, Forks)
        if (entry.type === 'branch_summary' || entry.type === 'compaction') return true;
        if ((childrenMap.get(entry.id)?.length ?? 0) > 1) return true;

        // 4. Natural Milestones (User Messages) - This is the key auto-tagging mechanism
        if (entry.type === 'message' && (entry.message as any).role === 'user') return true;

        return false;
      };

      const visibleSequenceIds = new Set<string>();
      sequence.forEach(e => {
        if (verbose || isInteresting(e)) {
          visibleSequenceIds.add(e.id);
        }
      });

      let visibleEntries = sequence.filter(e => visibleSequenceIds.has(e.id));
      if (visibleEntries.length > limit) {
        const allowedIds = new Set(visibleEntries.slice(-limit).map(e => e.id));
        visibleSequenceIds.clear();
        allowedIds.forEach(id => visibleSequenceIds.add(id));
      }

      const lines: string[] = [];
      let hiddenCount = 0;

      sequence.forEach((entry) => {
        if (!visibleSequenceIds.has(entry.id)) {
          hiddenCount++;
          return;
        }

        if (hiddenCount > 0) {
          lines.push(`  :  ... (${hiddenCount} hidden messages) ...`);
          hiddenCount = 0;
        }

        const isHead = entry.id === currentLeafId;
        const label = sm.getLabel(entry.id);
        const content = getMsgContent(entry).replace(/\s+/g, " ");

        let role = entry.type.toUpperCase();
        if (entry.type === "message") {
          const m = entry.message;
          role =
            m.role === "assistant"
              ? "AI"
              : m.role === "user"
                ? "USER"
                : m.role === "bashExecution"
                  ? "BASH"
                  : "TOOL";
        } else if (entry.type === "branch_summary" || entry.type === "compaction") {
          role = "SUMMARY";
        }

        const id = entry.id.slice(0, 8);
        const isRoot = !parents.has(entry.id);
        const meta = [isRoot ? "ROOT" : null, isHead ? "HEAD" : null, label ? `tag: ${label}` : null].filter(Boolean).join(", ");

        const body = content.length > 100 ? content.slice(0, 100) + "..." : content;

        const marker = isHead ? "*" : (role === "USER" ? "•" : "|");

        lines.push(`${marker} ${id}${meta ? ` (${meta})` : ""} [${role}] ${body}`);
      });

      if (hiddenCount > 0) {
        lines.push(`  :  ... (${hiddenCount} hidden messages) ...`);
      }

      // --- Context Dashboard (HUD) ---
      const totalNodes = entryMap.size;
      const currentDepth = backboneIds.length;

      const usage = await ctx.getContextUsage();
      let usageStr = "Unknown";
      if (usage) {
        usageStr = `${usage.percent.toFixed(1)}% (${formatTokens(usage.tokens)}/${formatTokens(usage.contextWindow)})`;
      }

      // Find the distance to the nearest tag
      let stepsSinceTag = 0;
      let nearestTagName = "None";
      for (let i = backboneIds.length - 1; i >= 0; i--) {
        const id = backboneIds[i];
        const label = sm.getLabel(id);
        if (label) {
          nearestTagName = label;
          break;
        }
        stepsSinceTag++;
      }

      const hud = [
        `[Context Dashboard]`,
        `• Context Usage:    ${usageStr}`,
        `• Segment Size:     ${stepsSinceTag} steps since last tag '${nearestTagName}'`,
        `---------------------------------------------------`
      ].join("\n");

      return { content: [{ type: "text", text: hud + "\n" + (lines.join("\n") || "(Root Path Only)") }], details: {} };
    },
  });

  pi.registerTool({
    name: "context_checkout",
    label: "Context Checkout",
    description: "Navigate to ANY point in the conversation history. This checkout only resets *conversation history*, NOT disk files. ALWAYS provide a detailed 'message' to bridge context.",
    parameters: ContextCheckoutParams,
    async execute(_id, params: Static<typeof ContextCheckoutParams>, _signal, _onUpdate, ctx) {
      const sm = ctx.sessionManager as SessionManager;
      const tid = resolveTargetId(sm, params.target);
      
      const currentLeaf = sm.getLeafId();
      if (currentLeaf === tid) {
        return { content: [{ type: "text", text: `Already at target ${tid.slice(0, 7)}` }], details: {} };
      }
      
      const currentLabel = currentLeaf ? sm.getLabel(currentLeaf) : undefined;
      const origin = currentLabel ? `tag: ${currentLabel}` : (currentLeaf ? currentLeaf.slice(0, 8) : "unknown");

      const enrichedMessage = `${params.message} (branched from ${origin})`;
      await sm.branchWithSummary(tid, enrichedMessage);

      // Fix: Label the NEW leaf (the summary node or the checkout target), not necessarily the old target ID.
      // This ensures 'tagName' acts like naming the NEW branch tip.
      const newLeaf = sm.getLeafId();
      if (params.tagName && newLeaf) pi.setLabel(newLeaf, params.tagName);

      return { content: [{ type: "text", text: `Checked out ${tid.slice(0, 7)}` }], details: {} };
    },
  });

  pi.registerTool({
    name: "context_tag",
    label: "Context Tag",
    description: "Creates a 'Save Point' (Bookmark) in the history. Use this before trying risky changes or when a feature is stable. 'Untagged progress is risky'.",
    parameters: ContextTagParams,
    async execute(_id, params: Static<typeof ContextTagParams>, _signal, _onUpdate, ctx) {
      const sm = ctx.sessionManager as SessionManager;
      const id = params.target ? resolveTargetId(sm, params.target) : (sm.getLeafId() ?? "");
      pi.setLabel(id, params.name);
      return { content: [{ type: "text", text: `Created tag '${params.name}' at ${id.slice(0, 7)}` }], details: {} };
    },
  });
}
