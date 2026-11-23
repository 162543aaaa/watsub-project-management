import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import ReactMarkdown from "react-markdown";
import {
  PRESET_COLORS,
  newId,
  parseCanvas,
  resolveColor,
  restoreDoc,
  toObsidianCanvas,
  type CanvasDoc,
  type CanvasEdge,
  type CanvasNode,
  type Side,
} from "@/lib/canvasDoc";

type View = { x: number; y: number; z: number };
type Point = { x: number; y: number };
type Drag =
  | { kind: "pan"; sx: number; sy: number; view: View }
  | { kind: "move"; sx: number; sy: number; start: Map<string, Point>; recorded: boolean }
  | { kind: "resize"; sx: number; sy: number; id: string; w: number; h: number; recorded: boolean }
  | { kind: "box"; start: Point; additive: Set<string> }
  | { kind: "connect"; from: string; side: Side }
  | { kind: "pinch"; dist: number; mid: Point; view: View };

const MIN_Z = 0.1;
const MAX_Z = 3;
const OPENING_HEIGHT = 1400;
const HISTORY_LIMIT = 100;
const SIDES: Side[] = ["top", "right", "bottom", "left"];
const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z));

function bounds(nodes: CanvasNode[]) {
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  return { minX, minY, w: maxX - minX, h: maxY - minY };
}

function anchor(n: CanvasNode, side: Side): [number, number] {
  if (side === "top") return [n.x + n.width / 2, n.y];
  if (side === "bottom") return [n.x + n.width / 2, n.y + n.height];
  if (side === "left") return [n.x, n.y + n.height / 2];
  return [n.x + n.width, n.y + n.height / 2];
}

function sideToward(from: CanvasNode, p: Point): Side {
  const dx = p.x - (from.x + from.width / 2);
  const dy = p.y - (from.y + from.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}
const center = (n: CanvasNode): Point => ({ x: n.x + n.width / 2, y: n.y + n.height / 2 });

const NORMAL: Record<Side, [number, number]> = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

function curve(x1: number, y1: number, fs: Side, x2: number, y2: number, ts: Side | null) {
  const k = Math.max(40, Math.hypot(x2 - x1, y2 - y1) / 3);
  const c1 = [x1 + NORMAL[fs][0] * k, y1 + NORMAL[fs][1] * k];
  const c2 = ts ? [x2 + NORMAL[ts][0] * k, y2 + NORMAL[ts][1] * k] : [x2, y2];
  const mid = [(x1 + 3 * c1[0] + 3 * c2[0] + x2) / 8, (y1 + 3 * c1[1] + 3 * c2[1] + y2) / 8];
  return { d: `M${x1},${y1} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`, mid };
}

function edgePath(e: CanvasEdge, from: CanvasNode, to: CanvasNode) {
  const fs = e.fromSide ?? sideToward(from, center(to));
  const ts = e.toSide ?? sideToward(to, center(from));
  const [x1, y1] = anchor(from, fs);
  const [x2, y2] = anchor(to, ts);
  return curve(x1, y1, fs, x2, y2, ts);
}

const isInside = (n: CanvasNode, g: CanvasNode) =>
  n.id !== g.id && n.x >= g.x && n.y >= g.y && n.x + n.width <= g.x + g.width && n.y + n.height <= g.y + g.height;

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

const imageSize = (src: string) =>
  new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 400, h: 300 });
    img.src = src;
  });

const isTyping = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.("input, textarea, select, [contenteditable=true]");

interface Props {
  doc: CanvasDoc;
  onChange: (doc: CanvasDoc) => void;
  files: Record<string, string>;
  onAddImage: (dataUrl: string, mimeType: string) => Promise<string | null>;
  boardTitle: string;
  /** a version picked from history, applied as an undoable edit */
  restoreRequest?: { doc: CanvasDoc; key: number } | null;
}

export default function CanvasBoard({ doc, onChange, files, onAddImage, boardTitle, restoreRequest }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.5 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [box, setBox] = useState<{ a: Point; b: Point } | null>(null);
  const [linkEnd, setLinkEnd] = useState<Point | null>(null);
  const drag = useRef<Drag | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const past = useRef<CanvasDoc[]>([]);
  const future = useRef<CanvasDoc[]>([]);
  const opened = useRef(false);
  const docRef = useRef(doc);
  docRef.current = doc;
  const viewRef = useRef(view);
  viewRef.current = view;

  const toWorld = useCallback((clientX: number, clientY: number): Point => {
    const r = viewportRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (clientX - r.left - v.x) / v.z, y: (clientY - r.top - v.y) / v.z };
  }, []);

  const fitTo = useCallback((nodes: CanvasNode[]) => {
    const el = viewportRef.current;
    if (!el || !nodes.length) return;
    const b = bounds(nodes);
    const pad = 40;
    const z = clampZ(Math.min((el.clientWidth - pad * 2) / b.w, (el.clientHeight - pad * 2) / b.h));
    setView({ z, x: (el.clientWidth - b.w * z) / 2 - b.minX * z, y: pad - b.minY * z });
  }, []);

  // open once per board: fit the board's width and start at its top, so tall boards stay readable
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (opened.current || !el || !doc.nodes.length) return;
    opened.current = true;
    const b = bounds(doc.nodes);
    const pad = 40;
    const z = clampZ(Math.min(1, (el.clientWidth - pad * 2) / b.w, (el.clientHeight - pad * 2) / Math.min(b.h, OPENING_HEIGHT)));
    setView({ z, x: (el.clientWidth - b.w * z) / 2 - b.minX * z, y: pad - b.minY * z });
  }, [doc.nodes]);

  // ── history ────────────────────────────────────────────────────────────────
  const record = useCallback(() => {
    past.current.push(docRef.current);
    if (past.current.length > HISTORY_LIMIT) past.current.shift();
    future.current = [];
  }, []);

  const apply = useCallback(
    (next: CanvasDoc, withHistory = true) => {
      if (withHistory) record();
      docRef.current = next;
      onChange(next);
    },
    [onChange, record],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(docRef.current);
    const next = restoreDoc(prev, docRef.current);
    docRef.current = next;
    onChange(next);
    setSelected(new Set());
  }, [onChange]);

  const redo = useCallback(() => {
    const nextTarget = future.current.pop();
    if (!nextTarget) return;
    past.current.push(docRef.current);
    const next = restoreDoc(nextTarget, docRef.current);
    docRef.current = next;
    onChange(next);
    setSelected(new Set());
  }, [onChange]);

  useEffect(() => {
    if (restoreRequest) apply(restoreDoc(restoreRequest.doc, docRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreRequest?.key]);

  // ── edits ──────────────────────────────────────────────────────────────────
  const patchNodes = useCallback(
    (patches: Map<string, Partial<CanvasNode>>, withHistory = true) => {
      const now = Date.now();
      const d = docRef.current;
      apply({ ...d, nodes: d.nodes.map((n) => (patches.has(n.id) ? { ...n, ...patches.get(n.id), ts: now } : n)) }, withHistory);
    },
    [apply],
  );

  const patchEdges = useCallback(
    (ids: Set<string>, patch: Partial<CanvasEdge>) => {
      const now = Date.now();
      const d = docRef.current;
      apply({ ...d, edges: d.edges.map((e) => (ids.has(e.id) ? { ...e, ...patch, ts: now } : e)) });
    },
    [apply],
  );

  const addNode = useCallback(
    (partial: Omit<CanvasNode, "id" | "ts" | "x" | "y"> & Partial<Pick<CanvasNode, "x" | "y">>) => {
      const el = viewportRef.current!;
      const r = el.getBoundingClientRect();
      const c = toWorld(r.left + el.clientWidth / 2, r.top + el.clientHeight / 2);
      const node = {
        id: newId(),
        ts: Date.now(),
        ...partial,
        x: Math.round(partial.x ?? c.x - partial.width / 2),
        y: Math.round(partial.y ?? c.y - partial.height / 2),
      } as CanvasNode;
      const d = docRef.current;
      apply({ ...d, nodes: node.type === "group" ? [node, ...d.nodes] : [...d.nodes, node] });
      setSelected(new Set([node.id]));
      return node;
    },
    [apply, toWorld],
  );

  const removeSelected = useCallback(() => {
    if (!selected.size) return;
    const now = Date.now();
    const { nodes, edges, deleted = {} } = docRef.current;
    const goneEdges = edges.filter((e) => selected.has(e.id) || selected.has(e.fromNode) || selected.has(e.toNode));
    const nextDeleted = { ...deleted };
    selected.forEach((id) => (nextDeleted[id] = now));
    goneEdges.forEach((e) => (nextDeleted[e.id] = now));
    apply({ nodes: nodes.filter((n) => !selected.has(n.id)), edges: edges.filter((e) => !goneEdges.includes(e)), deleted: nextDeleted });
    setSelected(new Set());
  }, [apply, selected]);

  const setColor = (color: string | undefined) => {
    const nodeIds = new Map<string, Partial<CanvasNode>>();
    const edgeIds = new Set<string>();
    selected.forEach((id) => (docRef.current.nodes.some((n) => n.id === id) ? nodeIds.set(id, { color }) : edgeIds.add(id)));
    if (nodeIds.size) patchNodes(nodeIds);
    if (edgeIds.size) patchEdges(edgeIds, { color });
  };

  // ── wheel, keys, paste ─────────────────────────────────────────────────────
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest("[data-scrollable]") && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setView((v) => {
        if (e.ctrlKey || e.metaKey) {
          const r = el.getBoundingClientRect();
          const cx = e.clientX - r.left;
          const cy = e.clientY - r.top;
          const z = clampZ(v.z * Math.exp(-e.deltaY * 0.0025));
          return { z, x: cx - ((cx - v.x) * z) / v.z, y: cy - ((cy - v.y) * z) / v.z };
        }
        return { ...v, x: v.x - e.deltaX, y: v.y - e.deltaY };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected(new Set(docRef.current.nodes.map((n) => n.id)));
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected.size) {
        e.preventDefault();
        removeSelected();
      } else if (e.key === "Escape") setSelected(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, selected, removeSelected, undo, redo]);

  const addImages = useCallback(
    async (fileList: FileList | File[], at?: Point) => {
      const images = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
      // several images go in a grid (dropped: from the drop point; picked or pasted: right of the board)
      const many = images.length > 1;
      const b = docRef.current.nodes.length ? bounds(docRef.current.nodes) : { minX: 0, minY: 0, w: 0, h: 0 };
      const origin = at ?? (many ? { x: b.minX + b.w + 160, y: b.minY } : undefined);
      const COLS = 4;
      const CELL = 480;
      const GAP = 40;
      let rowTop = origin?.y ?? 0;
      let rowHeight = 0;
      for (const [i, file] of images.entries()) {
        const dataUrl = await readDataUrl(file);
        const ref = await onAddImage(dataUrl, file.type);
        if (!ref) continue;
        const { w, h } = await imageSize(dataUrl);
        const width = Math.min(CELL, w);
        const height = Math.round((h / w) * width);
        if (i > 0 && i % COLS === 0) {
          rowTop += rowHeight + GAP;
          rowHeight = 0;
        }
        rowHeight = Math.max(rowHeight, height);
        const pos = origin ? { x: origin.x + (i % COLS) * (CELL + GAP), y: rowTop } : {};
        addNode({ type: "file", file: ref, width, height, ...pos });
      }
    },
    [addNode, onAddImage],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editing || isTyping(e.target)) return;
      const imgs = Array.from(e.clipboardData?.files ?? []);
      if (imgs.length) {
        e.preventDefault();
        void addImages(imgs);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImages, editing]);

  // ── pointers ───────────────────────────────────────────────────────────────
  const startPinchIfTwo = () => {
    if (pointers.current.size !== 2) return false;
    const [a, b] = [...pointers.current.values()];
    drag.current = { kind: "pinch", dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, view: viewRef.current };
    setBox(null);
    setLinkEnd(null);
    return true;
  };

  const onPointerDownCapture = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (startPinchIfTwo()) e.stopPropagation();
  };

  const onPointerDownBg = (e: ReactPointerEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget || drag.current?.kind === "pinch") return;
    setEditing(null);
    if (e.shiftKey) {
      const p = toWorld(e.clientX, e.clientY);
      drag.current = { kind: "box", start: p, additive: new Set(selected) };
      setBox({ a: p, b: p });
    } else {
      setSelected(new Set());
      drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, view };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerDownNode = (e: ReactPointerEvent, n: CanvasNode) => {
    if (e.button !== 0 || editing === n.id || drag.current?.kind === "pinch") return;
    e.stopPropagation();
    if (e.shiftKey && n.type === "group") {
      // boards are mostly groups: Shift+drag inside one draws a selection box, as on empty space
      const p = toWorld(e.clientX, e.clientY);
      drag.current = { kind: "box", start: p, additive: new Set(selected) };
      setBox({ a: p, b: p });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    let sel = selected;
    if (e.shiftKey) {
      sel = new Set(selected);
      if (sel.has(n.id)) sel.delete(n.id);
      else sel.add(n.id);
    } else if (!selected.has(n.id)) sel = new Set([n.id]);
    setSelected(sel);
    const start = new Map<string, Point>();
    const nodes = docRef.current.nodes;
    nodes.filter((x) => sel.has(x.id)).forEach((x) => {
      start.set(x.id, { x: x.x, y: x.y });
      if (x.type === "group") nodes.filter((c) => isInside(c, x)).forEach((c) => start.set(c.id, { x: c.x, y: c.y }));
    });
    drag.current = { kind: "move", sx: e.clientX, sy: e.clientY, start, recorded: false };
    // capture on the card itself, so a double-click still lands on the card
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerDownResize = (e: ReactPointerEvent, n: CanvasNode) => {
    e.stopPropagation();
    drag.current = { kind: "resize", sx: e.clientX, sy: e.clientY, id: n.id, w: n.width, h: n.height, recorded: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerDownHandle = (e: ReactPointerEvent, n: CanvasNode, side: Side) => {
    e.stopPropagation();
    drag.current = { kind: "connect", from: n.id, side };
    setLinkEnd(toWorld(e.clientX, e.clientY));
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pinch") {
      if (pointers.current.size < 2) return;
      const [a, b] = [...pointers.current.values()];
      const r = viewportRef.current!.getBoundingClientRect();
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = clampZ(d.view.z * (Math.hypot(a.x - b.x, a.y - b.y) / d.dist));
      const ox = d.mid.x - r.left;
      const oy = d.mid.y - r.top;
      return setView({ z, x: ox - ((ox - d.view.x) * z) / d.view.z + (mid.x - d.mid.x), y: oy - ((oy - d.view.y) * z) / d.view.z + (mid.y - d.mid.y) });
    }
    if (d.kind === "pan") return setView({ ...d.view, x: d.view.x + e.clientX - d.sx, y: d.view.y + e.clientY - d.sy });
    if (d.kind === "box") {
      const b = toWorld(e.clientX, e.clientY);
      setBox({ a: d.start, b });
      const x1 = Math.min(d.start.x, b.x);
      const y1 = Math.min(d.start.y, b.y);
      const x2 = Math.max(d.start.x, b.x);
      const y2 = Math.max(d.start.y, b.y);
      const hit = docRef.current.nodes.filter((n) => n.x >= x1 && n.y >= y1 && n.x + n.width <= x2 && n.y + n.height <= y2).map((n) => n.id);
      return setSelected(new Set([...d.additive, ...hit]));
    }
    if (d.kind === "connect") return setLinkEnd(toWorld(e.clientX, e.clientY));
    const dx = (e.clientX - d.sx) / view.z;
    const dy = (e.clientY - d.sy) / view.z;
    if (Math.abs(dx) + Math.abs(dy) < 1) return;
    const first = !d.recorded;
    d.recorded = true;
    if (d.kind === "move") {
      const patches = new Map<string, Partial<CanvasNode>>();
      d.start.forEach((p, id) => patches.set(id, { x: Math.round(p.x + dx), y: Math.round(p.y + dy) }));
      return patchNodes(patches, first);
    }
    patchNodes(new Map([[d.id, { width: Math.max(80, Math.round(d.w + dx)), height: Math.max(40, Math.round(d.h + dy)) }]]), first);
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (d?.kind === "connect") {
      const p = toWorld(e.clientX, e.clientY);
      const target = [...docRef.current.nodes].reverse().find(
        (n) => n.type !== "group" && n.id !== d.from && p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height,
      ) ?? docRef.current.nodes.find((n) => n.type === "group" && n.id !== d.from && p.x >= n.x && p.x <= n.x + n.width && p.y >= n.y && p.y <= n.y + n.height);
      if (target) {
        const from = docRef.current.nodes.find((n) => n.id === d.from)!;
        const edge: CanvasEdge = { id: newId(), ts: Date.now(), fromNode: d.from, fromSide: d.side, toNode: target.id, toSide: sideToward(target, center(from)), toEnd: "arrow" };
        apply({ ...docRef.current, edges: [...docRef.current.edges, edge] });
        setSelected(new Set([edge.id]));
      }
      setLinkEnd(null);
    }
    if (d?.kind === "box") setBox(null);
    drag.current = pointers.current.size === 1 && d?.kind === "pinch" ? null : pointers.current.size ? d : null;
  };

  const onDoubleClickBg = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const p = toWorld(e.clientX, e.clientY);
    setEditing(addNode({ type: "text", text: "", width: 260, height: 120, x: Math.round(p.x - 130), y: Math.round(p.y - 60) }).id);
  };

  const zoomBy = (factor: number) => {
    const el = viewportRef.current!;
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;
    setView((v) => {
      const z = clampZ(v.z * factor);
      return { z, x: cx - ((cx - v.x) * z) / v.z, y: cy - ((cy - v.y) * z) / v.z };
    });
  };

  const importCanvas = async (file: File) => {
    try {
      const incoming = parseCanvas(JSON.parse(await file.text()));
      const now = Date.now();
      const byId = new Map(docRef.current.nodes.map((n) => [n.id, n]));
      incoming.nodes.forEach((n) => byId.set(n.id, { ...n, ts: now }));
      const edgesById = new Map(docRef.current.edges.map((x) => [x.id, x]));
      incoming.edges.forEach((x) => edgesById.set(x.id, { ...x, ts: now }));
      apply({ ...docRef.current, nodes: [...byId.values()], edges: [...edgesById.values()] });
    } catch {
      window.alert("ไฟล์นี้ไม่ใช่ .canvas ที่อ่านได้");
    }
  };

  const exportCanvas = () => {
    const blob = new Blob([JSON.stringify(toObsidianCanvas(docRef.current), null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${boardTitle || "whiteboard"}.canvas`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  const nodesById = new Map(doc.nodes.map((n) => [n.id, n]));
  const groups = doc.nodes.filter((n) => n.type === "group");
  const others = doc.nodes.filter((n) => n.type !== "group");
  const single = selected.size === 1 ? [...selected][0] : null;
  const singleNode = single ? nodesById.get(single) : undefined;
  const linking = drag.current?.kind === "connect" ? drag.current : null;
  const linkFrom = linking ? nodesById.get(linking.from) : undefined;
  const handle = 12 / view.z;

  const renderNode = (n: CanvasNode) => {
    const color = resolveColor(n.color);
    const isSel = selected.has(n.id);
    const style = {
      left: n.x,
      top: n.y,
      width: n.width,
      height: n.height,
      borderColor: color ?? "hsl(var(--border))",
      background:
        n.type === "group"
          ? color
            ? `${color}14`
            : "hsl(var(--muted) / 0.35)"
          : color
            ? `color-mix(in srgb, ${color} 12%, hsl(var(--card)))`
            : "hsl(var(--card))",
      boxShadow: isSel ? `0 0 0 ${2 / view.z}px hsl(var(--primary))` : undefined,
    } as const;
    return (
      <div
        key={n.id}
        className={`absolute rounded-lg border-2 ${n.type === "group" ? "border-dashed" : "shadow-sm"}`}
        style={style}
        onPointerDown={(e) => onPointerDownNode(e, n)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (n.type === "text") setEditing(n.id);
          if (n.type === "group") {
            // like Obsidian: double-click inside a group adds a card there
            const p = toWorld(e.clientX, e.clientY);
            setEditing(addNode({ type: "text", text: "", width: 260, height: 120, x: Math.round(p.x - 130), y: Math.round(p.y - 60) }).id);
          }
        }}
      >
        {n.type === "group" && (
          <div
            title="ดับเบิลคลิกเพื่อเปลี่ยนชื่อกลุ่ม"
            className="absolute left-0 whitespace-nowrap rounded-md px-2 py-0.5 text-base font-semibold"
            style={{ top: -34, background: color ?? "hsl(var(--muted))", color: color ? "#fff" : undefined }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              const label = window.prompt("ชื่อกลุ่ม", n.label ?? "");
              if (label != null) patchNodes(new Map([[n.id, { label }]]));
            }}
          >
            {n.label || "กลุ่ม"}
          </div>
        )}
        {n.type === "text" &&
          (editing === n.id ? (
            <textarea
              autoFocus
              defaultValue={n.text ?? ""}
              aria-label="แก้ไขการ์ด"
              className="h-full w-full resize-none rounded-lg bg-background p-3 text-sm leading-relaxed outline-none"
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={(e) => {
                if (e.target.value !== (n.text ?? "")) patchNodes(new Map([[n.id, { text: e.target.value }]]));
                setEditing(null);
              }}
              onKeyDown={(e) => e.key === "Escape" && (e.currentTarget as HTMLTextAreaElement).blur()}
            />
          ) : (
            <div
              data-scrollable
              className="prose prose-sm h-full max-w-none overflow-auto p-3 text-sm leading-relaxed dark:prose-invert [&_h1]:mb-1 [&_h1]:mt-0 [&_h2]:mb-1 [&_h2]:mt-0 [&_h3]:mb-1 [&_h3]:mt-0 [&_p]:my-1 [&_ul]:my-1"
            >
              <ReactMarkdown>{n.text || "*ดับเบิลคลิกเพื่อพิมพ์*"}</ReactMarkdown>
            </div>
          ))}
        {n.type === "file" &&
          (n.file && files[n.file] ? (
            <img src={files[n.file]} alt="" draggable={false} className="h-full w-full rounded-lg object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">{n.file}</div>
          ))}
        {n.type === "link" && (
          <a href={n.url} target="_blank" rel="noreferrer noopener" className="block h-full overflow-hidden p-3 text-sm text-primary underline" onPointerDown={(e) => e.stopPropagation()}>
            {n.url}
          </a>
        )}
        {single === n.id && (
          <>
            {SIDES.map((side) => {
              const [ax, ay] = anchor({ ...n, x: 0, y: 0 }, side);
              return (
                <div
                  key={side}
                  role="presentation"
                  title="ลากไปการ์ดอื่นเพื่อเชื่อมเส้น"
                  className="absolute cursor-crosshair rounded-full border-2 border-primary bg-background"
                  style={{ left: ax - handle / 2, top: ay - handle / 2, width: handle, height: handle }}
                  onPointerDown={(e) => onPointerDownHandle(e, n, side)}
                />
              );
            })}
            <div
              role="presentation"
              className="absolute cursor-nwse-resize rounded-sm bg-primary"
              style={{ right: -handle / 2, bottom: -handle / 2, width: handle, height: handle }}
              onPointerDown={(e) => onPointerDownResize(e, n)}
            />
          </>
        )}
      </div>
    );
  };

  const btn = "rounded-md px-2 py-1 text-sm hover:bg-muted disabled:opacity-40";

  return (
    <div className="relative h-full w-full">
      <div
        ref={viewportRef}
        className="h-full w-full touch-none select-none overflow-hidden"
        style={{
          cursor: drag.current?.kind === "pan" ? "grabbing" : "grab",
          backgroundImage: "radial-gradient(hsl(var(--muted-foreground) / 0.25) 1px, transparent 1px)",
          backgroundSize: `${24 * view.z}px ${24 * view.z}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onPointerDownCapture={onPointerDownCapture}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClickBg}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void addImages(e.dataTransfer.files, toWorld(e.clientX, e.clientY));
        }}
      >
        <div className="pointer-events-none absolute left-0 top-0" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transformOrigin: "0 0" }}>
          <div className="pointer-events-auto">{groups.map(renderNode)}</div>
          <svg className="absolute left-0 top-0 overflow-visible" width="1" height="1">
            <defs>
              <marker id="canvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill="context-stroke" />
              </marker>
            </defs>
            {doc.edges.map((e) => {
              const from = nodesById.get(e.fromNode);
              const to = nodesById.get(e.toNode);
              if (!from || !to) return null;
              const { d, mid } = edgePath(e, from, to);
              const isSel = selected.has(e.id);
              const stroke = isSel ? "hsl(var(--primary))" : (resolveColor(e.color) ?? "hsl(var(--muted-foreground))");
              return (
                <g key={e.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16 / view.z}
                    className="pointer-events-auto cursor-pointer"
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      setSelected(ev.shiftKey ? new Set([...selected, e.id]) : new Set([e.id]));
                    }}
                    onDoubleClick={(ev) => {
                      ev.stopPropagation();
                      const label = window.prompt("ป้ายบนเส้น", e.label ?? "");
                      if (label != null) patchEdges(new Set([e.id]), { label: label || undefined });
                    }}
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={isSel ? 3 : 2}
                    className="pointer-events-none"
                    markerEnd={e.toEnd === "none" ? undefined : "url(#canvas-arrow)"}
                    markerStart={e.fromEnd === "arrow" ? "url(#canvas-arrow)" : undefined}
                  />
                  {e.label && (
                    <text x={mid[0]} y={mid[1] - 6} textAnchor="middle" fontSize={14} fill={stroke} stroke="hsl(var(--background))" strokeWidth={4} paintOrder="stroke" className="pointer-events-none">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
            {linking && linkFrom && linkEnd && (() => {
              const [x1, y1] = anchor(linkFrom, linking.side);
              return <path d={curve(x1, y1, linking.side, linkEnd.x, linkEnd.y, null).d} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#canvas-arrow)" />;
            })()}
            {box && (
              <rect
                x={Math.min(box.a.x, box.b.x)}
                y={Math.min(box.a.y, box.b.y)}
                width={Math.abs(box.a.x - box.b.x)}
                height={Math.abs(box.a.y - box.b.y)}
                fill="hsl(var(--primary) / 0.08)"
                stroke="hsl(var(--primary))"
                strokeWidth={1 / view.z}
                strokeDasharray={`${4 / view.z} ${4 / view.z}`}
              />
            )}
          </svg>
          <div className="pointer-events-auto">{others.map(renderNode)}</div>
        </div>
      </div>

      <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
        <button type="button" className={btn} onClick={undo} disabled={!past.current.length} title="ย้อนกลับ (Ctrl+Z)">
          ↶
        </button>
        <button type="button" className={btn} onClick={redo} disabled={!future.current.length} title="ทำซ้ำ (Ctrl+Y)">
          ↷
        </button>
        <span className="mx-1 h-5 w-px bg-border" />
        <button type="button" className={btn} onClick={() => setEditing(addNode({ type: "text", text: "", width: 260, height: 120 }).id)}>
          + การ์ด
        </button>
        <button type="button" className={btn} onClick={() => addNode({ type: "group", label: "กลุ่มใหม่", width: 600, height: 400 })}>
          + กลุ่ม
        </button>
        <label className={`cursor-pointer ${btn}`}>
          + รูป
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && void addImages(e.target.files)} />
        </label>
        {selected.size > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <span className="px-1 text-xs text-muted-foreground">เลือก {selected.size}</span>
            <button type="button" aria-label="ไม่มีสี" className="h-5 w-5 rounded-full border border-border bg-card" onClick={() => setColor(undefined)} />
            {Object.entries(PRESET_COLORS).map(([key, hex]) => (
              <button
                key={key}
                type="button"
                aria-label={`สี ${key}`}
                className="h-5 w-5 rounded-full"
                style={{ background: hex, outline: singleNode?.color === key ? "2px solid hsl(var(--foreground))" : undefined }}
                onClick={() => setColor(key)}
              />
            ))}
            <button type="button" className={`${btn} text-destructive`} onClick={removeSelected}>
              ลบ
            </button>
          </>
        )}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 text-sm shadow-sm">
        <button type="button" aria-label="ซูมออก" className={btn} onClick={() => zoomBy(1 / 1.25)}>
          −
        </button>
        <span className="w-12 text-center tabular-nums">{Math.round(view.z * 100)}%</span>
        <button type="button" aria-label="ซูมเข้า" className={btn} onClick={() => zoomBy(1.25)}>
          +
        </button>
        <button type="button" className={btn} onClick={() => fitTo(doc.nodes)}>
          ดูทั้งหมด
        </button>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 text-sm shadow-sm">
        <button type="button" className={btn} onClick={() => importRef.current?.click()}>
          นำเข้า .canvas
        </button>
        <input ref={importRef} type="file" accept=".canvas,.json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && void importCanvas(e.target.files[0])} />
        <button type="button" className={btn} onClick={exportCanvas}>
          ส่งออก .canvas
        </button>
      </div>

      <p className="pointer-events-none absolute right-3 top-3 hidden max-w-sm rounded-md bg-background/80 px-2 py-1 text-right text-xs text-muted-foreground lg:block">
        ลากพื้นหลัง = เลื่อน · Shift+ลาก = เลือกหลายการ์ด · Ctrl+ล้อเมาส์ = ซูม · ดับเบิลคลิก = เพิ่ม/แก้การ์ด · ลากจุดข้างการ์ด = เชื่อมเส้น · ดับเบิลคลิกเส้น = ใส่ป้าย
      </p>
    </div>
  );
}
