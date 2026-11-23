// JSON Canvas (https://jsoncanvas.org) documents, the format Obsidian Canvas uses.
// Each node and edge carries `ts` (ms of its last change) so concurrent edits merge per item.

export type Side = "top" | "right" | "bottom" | "left";

interface Stamped {
  id: string;
  ts?: number;
}

export interface CanvasNode extends Stamped {
  type: "text" | "file" | "link" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  url?: string;
  label?: string;
}

export interface CanvasEdge extends Stamped {
  fromNode: string;
  toNode: string;
  fromSide?: Side;
  toSide?: Side;
  fromEnd?: "none" | "arrow";
  toEnd?: "none" | "arrow";
  color?: string;
  label?: string;
}

export interface CanvasDoc {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /** id -> ms it was deleted, so a deletion wins over older copies elsewhere */
  deleted?: Record<string, number>;
}

export const PRESET_COLORS: Record<string, string> = {
  "1": "#e03131",
  "2": "#f08c00",
  "3": "#e8b400",
  "4": "#2f9e44",
  "5": "#1098ad",
  "6": "#7048e8",
};

export const resolveColor = (color?: string) => (color ? (PRESET_COLORS[color] ?? color) : undefined);

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

function mergeList<T extends Stamped>(a: readonly T[], b: readonly T[], deleted: Record<string, number>): T[] {
  const byId = new Map<string, T>();
  for (const item of [...a, ...b]) {
    const seen = byId.get(item.id);
    if (!seen || (item.ts ?? 0) > (seen.ts ?? 0)) byId.set(item.id, item);
  }
  return [...byId.values()].filter((item) => !(item.id in deleted) || deleted[item.id] < (item.ts ?? 0));
}

/** Merge two copies of a board: newest copy of each item wins, deletions win over older edits. */
export function mergeDocs(local: CanvasDoc, remote: CanvasDoc): CanvasDoc {
  const deleted: Record<string, number> = { ...remote.deleted };
  for (const [id, ts] of Object.entries(local.deleted ?? {})) deleted[id] = Math.max(ts, deleted[id] ?? 0);
  const nodes = mergeList(local.nodes, remote.nodes, deleted);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = mergeList(local.edges, remote.edges, deleted).filter((e) => nodeIds.has(e.fromNode) && nodeIds.has(e.toNode));
  return { nodes, edges, deleted };
}

/** True when `local` holds a change that `remote` lacks. */
export function hasLocalChanges(local: CanvasDoc, remote: CanvasDoc): boolean {
  const stamp = (doc: CanvasDoc) => new Map([...doc.nodes, ...doc.edges].map((i) => [i.id, i.ts ?? 0]));
  const theirs = stamp(remote);
  for (const [id, ts] of stamp(local)) if ((theirs.get(id) ?? -1) < ts) return true;
  return Object.entries(local.deleted ?? {}).some(([id, ts]) => (remote.deleted?.[id] ?? 0) < ts);
}

/** Read an Obsidian .canvas file (or a stored board) into a CanvasDoc, dropping anything malformed. */
export function parseCanvas(raw: unknown): CanvasDoc {
  const obj = (raw ?? {}) as Partial<CanvasDoc>;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const nodes = (Array.isArray(obj.nodes) ? obj.nodes : []).filter(
    (n): n is CanvasNode =>
      !!n && typeof n.id === "string" && ["text", "file", "link", "group"].includes(n.type) &&
      num(n.x) && num(n.y) && num(n.width) && num(n.height),
  );
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (Array.isArray(obj.edges) ? obj.edges : []).filter(
    (e): e is CanvasEdge => !!e && typeof e.id === "string" && ids.has(e.fromNode) && ids.has(e.toNode),
  );
  const deleted = obj.deleted && typeof obj.deleted === "object" ? obj.deleted : {};
  return { nodes, edges, deleted };
}

/** Strip the merge bookkeeping so the file opens cleanly in Obsidian. */
export function toObsidianCanvas(doc: CanvasDoc) {
  const strip = <T extends Stamped>({ ts: _ts, ...rest }: T) => rest;
  return { nodes: doc.nodes.map(strip), edges: doc.edges.map(strip) };
}
