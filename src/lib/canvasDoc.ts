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
  /** text styling; extra fields that Obsidian keeps but ignores */
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  /** drawn as a shape or a pen stroke instead of a card; Obsidian shows these as plain cards */
  shape?: "ellipse" | "diamond" | "triangle" | "pen";
  /** pen stroke points as flat x,y pairs scaled to 0..1000 of the node box */
  path?: number[];
  /** locked items can't be moved, resized or deleted until unlocked */
  locked?: boolean;
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

// solid card fills that keep dark text readable
export const PRESET_COLORS: Record<string, string> = {
  "1": "#f47c7c",
  "2": "#f0973a",
  "3": "#f2cc5b",
  "4": "#6fd07f",
  "5": "#5aaaf2",
  "6": "#a99ff0",
};

export const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "ค่าเริ่มต้น", value: "" },
  { label: "Sarabun", value: "Sarabun" },
  { label: "Prompt", value: "Prompt" },
  { label: "Kanit", value: "Kanit" },
  { label: "Mitr", value: "Mitr" },
  { label: "IBM Plex Sans Thai", value: "IBM Plex Sans Thai" },
];
export const FONT_SIZES = [12, 14, 16, 18, 24, 32, 48];
export const FONT_WEIGHTS: { label: string; value: number }[] = [
  { label: "บาง", value: 300 },
  { label: "ปกติ", value: 400 },
  { label: "กลาง", value: 500 },
  { label: "หนา", value: 600 },
  { label: "หนามาก", value: 700 },
];

export const resolveColor = (color?: string) => (color ? (PRESET_COLORS[color] ?? color) : undefined);

/** Copies of `nodes` (and the edges between them) with new ids, shifted by `offset`; groups stay first. */
export function cloneItems(nodes: CanvasNode[], edges: CanvasEdge[], offset: number, now = Date.now()) {
  const ids = new Map(nodes.map((n) => [n.id, newId()]));
  const copies = nodes
    .map((n) => ({ ...n, id: ids.get(n.id)!, x: n.x + offset, y: n.y + offset, ts: now }))
    .sort((a, b) => Number(b.type === "group") - Number(a.type === "group"));
  const links = edges
    .filter((e) => ids.has(e.fromNode) && ids.has(e.toNode))
    .map((e) => ({ ...e, id: newId(), fromNode: ids.get(e.fromNode)!, toNode: ids.get(e.toNode)!, ts: now }));
  return { nodes: copies, edges: links };
}

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

const sameItem = (a: Stamped, b: Stamped) => {
  const { ts: _a, ...ra } = a;
  const { ts: _b, ...rb } = b;
  return JSON.stringify(ra) === JSON.stringify(rb);
};

/**
 * Turn the board back into `target` (an undo step or a saved version) as a fresh edit:
 * items that differ get a new timestamp and items not in `target` are marked deleted,
 * so the restore wins over older copies on teammates' screens.
 */
export function restoreDoc(target: CanvasDoc, current: CanvasDoc, now = Date.now()): CanvasDoc {
  const restamp = <T extends Stamped>(items: T[], currentItems: T[]) => {
    const mine = new Map(currentItems.map((i) => [i.id, i]));
    return items.map((i) => {
      const cur = mine.get(i.id);
      return cur && sameItem(cur, i) ? cur : { ...i, ts: now };
    });
  };
  const keep = new Set([...target.nodes, ...target.edges].map((i) => i.id));
  const deleted = { ...current.deleted };
  for (const i of [...current.nodes, ...current.edges]) if (!keep.has(i.id)) deleted[i.id] = now;
  return { nodes: restamp(target.nodes, current.nodes), edges: restamp(target.edges, current.edges), deleted };
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
