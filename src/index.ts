import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  // Command to handle the actual navigation (must run outside tool execution)
  pi.registerCommand("_tree_nav", {
    description: "Internal command for tree navigation",
    handler: async (args, ctx) => {
      try {
        const params = JSON.parse(args);
        const { targetId, summary, label } = params;

        if (!targetId) {
          ctx.ui.notify("Missing targetId for navigation", "error");
          return;
        }

        // Navigate
        await ctx.navigateTree(targetId, {
          summarize: !!summary,
          customInstructions: summary,
          label: label,
        });

        ctx.ui.notify(`Switched to branch ${targetId}`, "info");
      } catch (e) {
        ctx.ui.notify(`Navigation failed: ${e instanceof Error ? e.message : String(e)}`, "error");
      }
    },
  });

  // Tool to list the session tree
  pi.registerTool({
    name: "tree_list",
    label: "List Session Tree",
    description: "List the full conversation tree structure with IDs and message snippets. Use this to find target IDs for branching.",
    parameters: Type.Object({}) as any,
    async execute(_id, _params, _signal, _onUpdate, ctx) {
      const tree = ctx.sessionManager.getTree();
      const currentLeafId = ctx.sessionManager.getLeafId();

      // Recursive formatter
      function formatNode(node: any, depth: number = 0): string {
        const indent = "  ".repeat(depth);
        // Handle both wrapper ({ entry, children }) and merged ({ ...entry, children }) patterns defensively
        const entry = node.entry || node;
        const isActive = entry.id === currentLeafId;
        
        let role = entry.type;
        let content = "";

        if (entry.type === "message" && entry.message) {
          role = entry.message.role;
          
          if (role === "user") role = "User";
          else if (role === "assistant") role = "Assistant";
          else if (role === "system") role = "System";
          else if (role === "toolResult") role = `Tool (${entry.message.toolName})`;
          else if (role === "bashExecution") {
            role = "Bash";
            const cmd = entry.message.command || "";
            const out = entry.message.output || "";
            content = `$ ${cmd} -> ${out.slice(0, 30)}`;
          } else if (role === "custom") {
             role = `Custom (${entry.message.customType})`;
             // content handled below if exists
          }
          
          const msgContent = entry.message.content;
          if (!content && msgContent) {
            if (typeof msgContent === "string") {
              content = msgContent;
            } else if (Array.isArray(msgContent)) {
              content = msgContent.map((c: any) => {
                if (c.type === "text") return c.text;
                if (c.type === "toolCall") return `[Call: ${c.name}]`;
                if (c.type === "image") return "[Image]";
                return "";
              }).join(" ");
            }
          }
        } else if (entry.type === "model_change") {
          role = "Model Change";
          content = `${entry.provider}/${entry.modelId}`;
        } else if (entry.type === "compaction") {
          role = "Compaction";
          content = entry.summary || `${entry.tokensBefore} tokens`;
        } else if (entry.type === "branch_summary") {
          role = "Branch Summary";
          content = entry.summary || `From ${entry.fromId}`;
        } else if (entry.type === "label") {
            // Labels are usually attached to entries, but if standalone:
            role = "Label";
            content = entry.label;
        }

        const snippet = content.replace(/\n/g, " ").slice(0, 60) + (content.length > 60 ? "..." : "");
        const label = ctx.sessionManager.getLabel(entry.id);
        const labelStr = label ? ` [${label}]` : "";
        const activeMarker = isActive ? " (* ACTIVE)" : "";

        let line = `${indent}- [${entry.id}] (${role})${labelStr}: "${snippet}"${activeMarker}`;
        
        const children = node.children || [];
        const childrenLines = children.map((child: any) => formatNode(child, depth + 1));
        return [line, ...childrenLines].join("\n");
      }

      const formattedTree = tree.map((node: any) => formatNode(node)).join("\n");

      return {
        content: [{ type: "text", text: formattedTree || "(Empty tree)" }],
        details: { tree }, 
      };
    },
  });

  // Tool to switch branches
  pi.registerTool({
    name: "tree_switch",
    label: "Switch Branch (Time Travel)",
    description: "Switch the conversation context to a different branch (node), effectively 'time traveling' to a previous state. Use this when the current approach fails or you want to explore an alternative path.",
    parameters: Type.Object({
      targetId: Type.String({ description: "The ID of the target message/node to switch to." }),
      summary: Type.Optional(Type.String({ description: "Summary of the abandoned branch and LESSONS LEARNED. Crucial for 'Guardrails': inject instructions like 'Approach A failed due to X, do not use library Y' to prevent repeating mistakes in the new branch." })),
      label: Type.Optional(Type.String({ description: "Optional label to assign to the target node." })),
    }) as any,
    async execute(_id, params: any, _signal, _onUpdate, _ctx) {
      // We cannot navigate directly here because it might disrupt the current turn.
      // Instead, we trigger a hidden command via sendUserMessage to run after this turn.
      
      const args = JSON.stringify({
        targetId: params.targetId,
        summary: params.summary,
        label: params.label,
      });

      // Use 'followUp' to ensure the current tool execution completes fully before navigation happens.
      await pi.sendUserMessage(`/_tree_nav ${args}`, { deliverAs: "followUp" });

      return {
        content: [{ type: "text", text: `Initiating switch to branch ${params.targetId}...` }],
        details: { targetId: params.targetId },
      };
    },
  });
  
  // Tool to label a node
  pi.registerTool({
    name: "tree_label",
    label: "Label Node",
    description: "Assign a label to a specific message node for easier reference.",
    parameters: Type.Object({
      entryId: Type.String({ description: "The ID of the node to label." }),
      label: Type.String({ description: "The label text (e.g., 'checkpoint-1', 'successful-test')." }),
    }) as any,
    async execute(_id, params: any, _signal, _onUpdate, _ctx) {
      pi.setLabel(params.entryId, params.label);
      return {
        content: [{ type: "text", text: `Label '${params.label}' assigned to node ${params.entryId}.` }],
        details: {},
      };
    },
  });
}
