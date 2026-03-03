import {
  type SessionEntry,
  type SessionManager,
} from "@mariozechner/pi-coding-agent";

// Define missing types locally as they are not exported from the main entry point
export interface SessionTreeNode {
  entry: SessionEntry;
  children: SessionTreeNode[];
  label?: string;
}

export const isInternal = (name: string) => ["context_tag", "context_log", "context_checkout"].includes(name);

export const resolveTargetId = (sm: SessionManager, target: string): string => {
  if (target.toLowerCase() === "root") {
    const tree = sm.getTree();
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
  return find(sm.getTree()) || target;
};

export const formatTokens = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return Math.round(n / 1_000) + "k";
  return n.toString();
};
