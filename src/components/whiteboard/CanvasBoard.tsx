import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import ReactMarkdown from "react-markdown";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  FONT_WEIGHTS,
  PRESET_COLORS,
  cloneItems,
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
  | { kind: "move"; sx: number; sy: number; start: Map<string, Point>; recorded: boolean; tapEdit: string | null }
  | { kind: "resize"; sx: number; sy: number; id: string; w: number; h: number; recorded: boolean }
  | { kind: "box"; start: Point; additive: Set<string> }
  | { kind: "connect"; from: string; side: Side }
  | { kind: "pinch"; dist: number; mid: Point; view: View }
  | { kind: "draw"; pts: Point[] };

const MIN_Z = 0.1;
const MAX_Z = 3;
const OPENING_HEIGHT = 1400;
const HISTORY_LIMIT = 100;
const SIDES: Side[] = ["top", "right", "bottom", "left"];
const clampZ = (z: number) => Math.min(MAX_Z, Math.max(MIN_Z, z));

// the board is always dark, with light cards, whatever the app theme
const BOARD = {
  bg: "#1c1c1e",
  dot: "rgb(255 255 255 / 0.09)",
  card: "#d6d6d6",
  ink: "#141414",
  group: "rgb(255 255 255 / 0.035)",
  groupBorder: "rgb(255 255 255 / 0.14)",
  label: "#f2f2f2",
  link: "#9c9c9c",
  pen: "#f47c7c",
  select: "#f0973a",
};
const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&family=Kanit:wght@300;400;500;600;700&family=Mitr:wght@300;400;500;600;700&family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap";

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

/** Right-angle route: step out of each side, then meet halfway along the leaving direction. */
function curve(x1: number, y1: number, fs: Side, x2: number, y2: number, ts: Side | null) {
  const out = 24;
  const p1 = [x1 + NORMAL[fs][0] * out, y1 + NORMAL[fs][1] * out];
  const p2 = ts ? [x2 + NORMAL[ts][0] * out, y2 + NORMAL[ts][1] * out] : [x2, y2];
  const vertical = fs === "top" || fs === "bottom";
  const m = vertical ? (p1[1] + p2[1]) / 2 : (p1[0] + p2[0]) / 2;
  const bend = vertical ? [[p1[0], m], [p2[0], m]] : [[m, p1[1]], [m, p2[1]]];
  const pts = [[x1, y1], p1, ...bend, p2, [x2, y2]];
  const mid = [(bend[0][0] + bend[1][0]) / 2, (bend[0][1] + bend[1][1]) / 2];
  return { d: `M${pts.map((p) => p.join(",")).join(" L")}`, mid };
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
  /** board-level actions shown in the ⋯ menu (rename, history, delete) */
  menuActions?: { label: string; onClick: () => void; danger?: boolean }[];
}

// 24px stroke icons for the toolbar
const ICONS = {
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  redo: "m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3",
  card: "M4 5h16v14H4zM12 9v6M9 12h6",
  group: "M3 3h4M3 3v4M21 3h-4M21 3v4M3 21h4M3 21v-4M21 21h-4M21 21v-4M8 8h8v8H8z",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15 9.5a1 1 0 1 0 0-.01",
  many: "M4 4h7v7H4zM13 13h7v7h-7zM14 6.5l2 2 4-4M5 16.5l2 2 4-4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  minus: "M5 12h14",
  plus: "M12 5v14M5 12h14",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  shape: "M7 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8M14 14h7v7h-7zM17 3l4 7h-8z",
  pen: "M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16zM14 7l3 3",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  collapse: "M15 6l-6 6 6 6",
  tools: "M4 6h16M4 12h16M4 18h16",
};
function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function CanvasBoard({ doc, onChange, files, onAddImage, boardTitle, restoreRequest, menuActions = [] }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.5 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [box, setBox] = useState<{ a: Point; b: Point } | null>(null);
  const [linkEnd, setLinkEnd] = useState<Point | null>(null);
  const [manyMode, setManyMode] = useState(false);
  const [pen, setPen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(() => localStorage.getItem("canvas-tools") !== "0");
  useEffect(() => localStorage.setItem("canvas-tools", toolsOpen ? "1" : "0"), [toolsOpen]);
  const [stroke, setStroke] = useState<Point[] | null>(null);
  const [shapeMenu, setShapeMenu] = useState(false);
  const clip = useRef<{ nodes: CanvasNode[]; edges: CanvasEdge[]; pasted: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // finger or pen as the main pointer (iPad, phone): bigger targets, tap-to-edit, long-press to add
  const [coarse] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches);
  const pressTimer = useRef<number>();
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
    const fit = Math.min(1, (el.clientWidth - pad * 2) / b.w, (el.clientHeight - pad * 2) / Math.min(b.h, OPENING_HEIGHT));
    // on a narrow screen (iPad portrait) fitting the whole width makes text unreadable: keep it legible and start at the left
    const z = clampZ(Math.max(fit, 0.4));
    const x = fit < 0.4 ? pad - b.minX * z : (el.clientWidth - b.w * z) / 2 - b.minX * z;
    setView({ z, x, y: pad - b.minY * z });
  }, [doc.nodes]);

  // typing at 40% zoom gives unreadable text: bring the card being edited to 100%, centred
  useEffect(() => {
    const el = viewportRef.current;
    const n = editing ? docRef.current.nodes.find((x) => x.id === editing) : undefined;
    if (!el || !n || viewRef.current.z >= 0.9) return;
    setView({ z: 1, x: Math.round(el.clientWidth / 2 - (n.x + n.width / 2)), y: Math.round(el.clientHeight / 3 - n.y) });
  }, [editing]);

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

  const copySelected = useCallback(() => {
    const nodes = docRef.current.nodes.filter((n) => selected.has(n.id));
    if (nodes.length) clip.current = { nodes, edges: docRef.current.edges, pasted: 0 };
    return nodes.length > 0;
  }, [selected]);

  const pasteClip = useCallback(() => {
    const c = clip.current;
    if (!c) return;
    c.pasted += 1;
    const out = cloneItems(c.nodes, c.edges, 40 * c.pasted);
    const d = docRef.current;
    const groups = out.nodes.filter((n) => n.type === "group");
    apply({ ...d, nodes: [...groups, ...d.nodes, ...out.nodes.filter((n) => n.type !== "group")], edges: [...d.edges, ...out.edges] });
    setSelected(new Set(out.nodes.map((n) => n.id)));
  }, [apply]);

  const duplicate = () => {
    if (copySelected()) pasteClip();
  };

  const setColor = (color: string | undefined) => {
    const nodeIds = new Map<string, Partial<CanvasNode>>();
    const edgeIds = new Set<string>();
    selected.forEach((id) => (docRef.current.nodes.some((n) => n.id === id) ? nodeIds.set(id, { color }) : edgeIds.add(id)));
    if (nodeIds.size) patchNodes(nodeIds);
    if (edgeIds.size) patchEdges(edgeIds, { color });
  };

  /** font, size or weight for every selected card and group label */
  const setText = (patch: Pick<Partial<CanvasNode>, "fontFamily" | "fontSize" | "fontWeight">) => {
    const ids = new Map<string, Partial<CanvasNode>>();
    docRef.current.nodes.forEach((n) => selected.has(n.id) && (n.type === "text" || n.type === "group") && ids.set(n.id, patch));
    if (ids.size) patchNodes(ids);
  };

  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_CSS}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_CSS;
    document.head.appendChild(link);
  }, []);

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
      } else if (mod && e.key.toLowerCase() === "c") {
        copySelected();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (copySelected()) pasteClip();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected.size) {
        e.preventDefault();
        removeSelected();
      } else if (e.key === "Escape") {
        setSelected(new Set());
        setPen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, selected, removeSelected, undo, redo, copySelected, pasteClip]);

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
      } else if (clip.current) {
        e.preventDefault();
        pasteClip();
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImages, editing, pasteClip]);

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

  const onPointerDownDraw = (e: ReactPointerEvent) => {
    if (e.button !== 0 || drag.current?.kind === "pinch") return;
    const p = toWorld(e.clientX, e.clientY);
    drag.current = { kind: "draw", pts: [p] };
    setStroke([p]);
    setSelected(new Set());
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerDownBg = (e: ReactPointerEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget || drag.current?.kind === "pinch") return;
    setEditing(null);
    setMenuOpen(false);
    setShapeMenu(false);
    if (e.shiftKey || manyMode) {
      const p = toWorld(e.clientX, e.clientY);
      drag.current = { kind: "box", start: p, additive: new Set(selected) };
      setBox({ a: p, b: p });
    } else {
      setSelected(new Set());
      drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, view };
      if (e.pointerType !== "mouse") {
        // long-press on empty space adds a card, since a finger has no double-click
        const at = toWorld(e.clientX, e.clientY);
        window.clearTimeout(pressTimer.current);
        pressTimer.current = window.setTimeout(() => {
          const d = drag.current;
          if (d?.kind !== "pan" || Math.abs(viewRef.current.x - d.view.x) + Math.abs(viewRef.current.y - d.view.y) > 10) return;
          drag.current = null;
          setEditing(addNode({ type: "text", text: "", width: 260, height: 120, x: Math.round(at.x - 130), y: Math.round(at.y - 60) }).id);
        }, 550);
      }
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerDownNode = (e: ReactPointerEvent, n: CanvasNode) => {
    if (e.button !== 0 || editing === n.id || drag.current?.kind === "pinch") return;
    e.stopPropagation();
    setMenuOpen(false);
    setShapeMenu(false);
    const multi = e.shiftKey || manyMode;
    if (multi && n.type === "group") {
      // boards are mostly groups: Shift+drag inside one draws a selection box, as on empty space
      const p = toWorld(e.clientX, e.clientY);
      drag.current = { kind: "box", start: p, additive: new Set(selected) };
      setBox({ a: p, b: p });
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    let sel = selected;
    // on touch, tapping a card that is already the only selection opens it for editing
    const tapEdit = e.pointerType !== "mouse" && !multi && n.type === "text" && selected.size === 1 && selected.has(n.id) ? n.id : null;
    if (multi) {
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
    drag.current = { kind: "move", sx: e.clientX, sy: e.clientY, start, recorded: false, tapEdit };
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
    if (d.kind === "draw") {
      const p = toWorld(e.clientX, e.clientY);
      const last = d.pts[d.pts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) * view.z < 2) return;
      d.pts.push(p);
      return setStroke([...d.pts]);
    }
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
    const min = docRef.current.nodes.find((n) => n.id === d.id)?.shape ? 16 : 0;
    patchNodes(new Map([[d.id, { width: Math.max(min || 80, Math.round(d.w + dx)), height: Math.max(min || 40, Math.round(d.h + dy)) }]]), first);
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
    if (d?.kind === "draw") {
      setStroke(null);
      if (d.pts.length > 1) {
        const xs = d.pts.map((q) => q.x);
        const ys = d.pts.map((q) => q.y);
        const pad = 4;
        const x = Math.min(...xs) - pad;
        const y = Math.min(...ys) - pad;
        const width = Math.max(16, Math.max(...xs) + pad - x);
        const height = Math.max(16, Math.max(...ys) + pad - y);
        const path = d.pts.flatMap((q) => [Math.round(((q.x - x) / width) * 1000), Math.round(((q.y - y) / height) * 1000)]);
        addNode({ type: "text", text: "", shape: "pen", path, x, y, width: Math.round(width), height: Math.round(height) });
        setSelected(new Set());
      }
    }
    if (d?.kind === "move" && !d.recorded && d.tapEdit) setEditing(d.tapEdit);
    window.clearTimeout(pressTimer.current);
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
  const hasTextSelected = doc.nodes.some((n) => selected.has(n.id) && (n.type === "text" || n.type === "group"));
  const linking = drag.current?.kind === "connect" ? drag.current : null;
  const linkFrom = linking ? nodesById.get(linking.from) : undefined;
  const handle = (coarse ? 26 : 12) / view.z;

  const renderNode = (n: CanvasNode) => {
    const color = resolveColor(n.color);
    const isSel = selected.has(n.id);
    const isGroup = n.type === "group";
    const shape = n.type === "text" ? n.shape : undefined;
    const style = {
      left: n.x,
      top: n.y,
      width: n.width,
      height: n.height,
      borderColor: isGroup ? (color ?? BOARD.groupBorder) : "transparent",
      background: isGroup ? (color ? `${color}1f` : BOARD.group) : n.type === "file" || shape ? "transparent" : (color ?? BOARD.card),
      color: BOARD.ink,
      boxShadow: isSel ? `0 0 0 ${2 / view.z}px ${BOARD.select}` : isGroup || n.type === "file" || shape ? undefined : "0 1px 2px rgb(0 0 0 / 0.35)",
    } as const;
    const textStyle = {
      fontFamily: n.fontFamily ? `"${n.fontFamily}", var(--font-sans), sans-serif` : undefined,
      fontSize: n.fontSize,
      fontWeight: n.fontWeight,
    };
    return (
      <div
        key={n.id}
        className={`absolute rounded-md ${isGroup ? "border" : "border-0"}`}
        style={style}
        onPointerDown={(e) => onPointerDownNode(e, n)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (n.type === "text" && shape !== "pen") setEditing(n.id);
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
            style={{ top: -34, background: color ?? "transparent", color: color ? BOARD.ink : BOARD.label, ...textStyle }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              const label = window.prompt("ชื่อกลุ่ม", n.label ?? "");
              if (label != null) patchNodes(new Map([[n.id, { label }]]));
            }}
          >
            {n.label || "กลุ่ม"}
          </div>
        )}
        {shape && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
            {shape === "pen" ? (
              <polyline
                points={(n.path ?? []).join(" ")}
                fill="none"
                stroke={color ?? BOARD.pen}
                strokeWidth={4 * view.z}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <path
                d={shape === "ellipse" ? "M0 500a500 500 0 1 0 1000 0a500 500 0 1 0-1000 0" : shape === "diamond" ? "M500 0L1000 500L500 1000L0 500z" : "M500 0L1000 1000H0z"}
                fill={color ?? BOARD.card}
              />
            )}
          </svg>
        )}
        {n.type === "text" &&
          shape !== "pen" &&
          (editing === n.id ? (
            <textarea
              autoFocus
              defaultValue={n.text ?? ""}
              aria-label="แก้ไขการ์ด"
              className="h-full w-full resize-none rounded-md bg-white p-3 text-sm leading-relaxed text-neutral-900 outline-none"
              style={textStyle}
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
              style={{ ...textStyle, color: BOARD.ink, ...(shape && { padding: shape === "triangle" ? "45% 22% 6%" : shape === "diamond" ? "22%" : "15%" }) }}
              className={`relative prose prose-sm h-full max-w-none overflow-auto p-3 ${shape ? "flex flex-col items-center justify-center text-center" : ""} text-sm leading-relaxed text-neutral-900 prose-headings:text-neutral-900 prose-strong:text-neutral-900 prose-li:marker:text-neutral-700 [&_h1]:mb-1 [&_h1]:mt-0 [&_h2]:mb-1 [&_h2]:mt-0 [&_h3]:mb-1 [&_h3]:mt-0 [&_p]:my-1 [&_ul]:my-1`}
            >
              <ReactMarkdown>{n.text || (shape ? "" : "*ดับเบิลคลิกเพื่อพิมพ์*")}</ReactMarkdown>
            </div>
          ))}
        {n.type === "file" &&
          (n.file && files[n.file] ? (
            <img src={files[n.file]} alt="" draggable={false} className="h-full w-full rounded-lg object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-xs" style={{ color: BOARD.label }}>{n.file}</div>
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
                  className="absolute cursor-crosshair rounded-full border-2 bg-white"
                  style={{ left: ax - handle / 2, top: ay - handle / 2, width: handle, height: handle, borderColor: BOARD.select }}
                  onPointerDown={(e) => onPointerDownHandle(e, n, side)}
                />
              );
            })}
            <div
              role="presentation"
              className="absolute cursor-nwse-resize rounded-sm"
              style={{ right: -handle / 2, bottom: -handle / 2, width: handle, height: handle, background: BOARD.select }}
              onPointerDown={(e) => onPointerDownResize(e, n)}
            />
          </>
        )}
      </div>
    );
  };

  const btn = `inline-flex items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-40 ${coarse ? "min-h-10 min-w-10 px-3 py-2 text-base" : "px-2 py-1 text-sm"}`;

  return (
    <div className="relative h-full w-full">
      <div
        ref={viewportRef}
        className="h-full w-full touch-none select-none overflow-hidden"
        style={{
          cursor: drag.current?.kind === "pan" ? "grabbing" : "grab",
          background: BOARD.bg,
          backgroundImage: `radial-gradient(${BOARD.dot} 1px, transparent 1px)`,
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
              const stroke = isSel ? BOARD.select : (resolveColor(e.color) ?? BOARD.link);
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
                    <text x={mid[0]} y={mid[1] - 6} textAnchor="middle" fontSize={14} fill={BOARD.label} stroke={BOARD.bg} strokeWidth={4} paintOrder="stroke" className="pointer-events-none">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
            {linking && linkFrom && linkEnd && (() => {
              const [x1, y1] = anchor(linkFrom, linking.side);
              return <path d={curve(x1, y1, linking.side, linkEnd.x, linkEnd.y, null).d} fill="none" stroke={BOARD.select} strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#canvas-arrow)" />;
            })()}
            {stroke && stroke.length > 1 && (
              <polyline points={stroke.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke={BOARD.pen} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {box && (
              <rect
                x={Math.min(box.a.x, box.b.x)}
                y={Math.min(box.a.y, box.b.y)}
                width={Math.abs(box.a.x - box.b.x)}
                height={Math.abs(box.a.y - box.b.y)}
                fill="rgb(240 151 58 / 0.1)"
                stroke={BOARD.select}
                strokeWidth={1 / view.z}
                strokeDasharray={`${4 / view.z} ${4 / view.z}`}
              />
            )}
          </svg>
          <div className="pointer-events-auto">{others.map(renderNode)}</div>
        </div>
        {pen && <div className="absolute inset-0" style={{ cursor: "crosshair" }} onPointerDown={onPointerDownDraw} />}
      </div>

      <div className="absolute left-3 top-3 flex flex-col items-center gap-1 rounded-lg border border-white/10 bg-[#2a2a2c] text-neutral-100 p-1 shadow-sm">
        <button
          type="button"
          className={btn}
          aria-expanded={toolsOpen}
          onClick={() => {
            setToolsOpen((o) => !o);
            setMenuOpen(false);
            setShapeMenu(false);
          }}
          title={toolsOpen ? "ซ่อนเครื่องมือ" : "แสดงเครื่องมือ"}
          aria-label={toolsOpen ? "ซ่อนเครื่องมือ" : "แสดงเครื่องมือ"}
        >
          <Icon name={toolsOpen ? "collapse" : "tools"} />
        </button>
        {toolsOpen && (
          <>
            <span className="my-0.5 h-px w-5 bg-white/15" />
            <button type="button" className={btn} onClick={undo} disabled={!past.current.length} title="ย้อนกลับ (Ctrl+Z)" aria-label="ย้อนกลับ">
              <Icon name="undo" />
            </button>
            <button type="button" className={btn} onClick={redo} disabled={!future.current.length} title="ทำซ้ำ (Ctrl+Y)" aria-label="ทำซ้ำ">
              <Icon name="redo" />
            </button>
            <span className="my-0.5 h-px w-5 bg-white/15" />
            <button type="button" className={btn} onClick={() => setEditing(addNode({ type: "text", text: "", width: 260, height: 120 }).id)} title="เพิ่มการ์ด" aria-label="เพิ่มการ์ด">
              <Icon name="card" />
            </button>
            <button type="button" className={btn} onClick={() => addNode({ type: "group", label: "กลุ่มใหม่", width: 600, height: 400 })} title="เพิ่มกลุ่ม" aria-label="เพิ่มกลุ่ม">
              <Icon name="group" />
            </button>
            <div className="relative">
              <button type="button" className={btn} title="เพิ่มรูปทรง" aria-label="เพิ่มรูปทรง" aria-expanded={shapeMenu} onClick={() => setShapeMenu((o) => !o)}>
                <Icon name="shape" />
              </button>
              {shapeMenu && (
                <div className="absolute left-full top-0 z-10 ml-2 flex flex-col rounded-lg border border-white/10 bg-[#2a2a2c] p-1 text-neutral-100 shadow-lg">
                  {([["ellipse", "วงกลม"], ["diamond", "ข้าวหลามตัด"], ["triangle", "สามเหลี่ยม"]] as const).map(([shape, label]) => (
                    <button
                      key={shape}
                      type="button"
                      className={`${btn} justify-start whitespace-nowrap`}
                      onClick={() => {
                        setShapeMenu(false);
                        addNode({ type: "text", text: "", shape, width: 200, height: 200 });
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className={`${btn} ${pen ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              aria-pressed={pen}
              onClick={() => setPen((v) => !v)}
              title="ปากกา: วาดเส้นอิสระ (กดอีกครั้งหรือ Esc เพื่อเลิก) ใช้สองนิ้วซูมได้"
              aria-label="ปากกา"
            >
              <Icon name="pen" />
            </button>
            <label className={`cursor-pointer ${btn}`} title="เพิ่มรูป" aria-label="เพิ่มรูป">
              <Icon name="image" />
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && void addImages(e.target.files)} />
            </label>
            <button
              type="button"
              className={`${btn} ${manyMode ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
              aria-pressed={manyMode}
              onClick={() => setManyMode((m) => !m)}
              title="เลือกหลายอัน: แตะการ์ดทีละใบ หรือลากพื้นที่ว่างเพื่อตีกรอบ (เหมือนกด Shift)"
              aria-label="เลือกหลายอัน"
            >
              <Icon name="many" />
            </button>
            <div className="relative">
              <button type="button" className={btn} aria-label="เมนูบอร์ด" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} title="เมนูบอร์ด">
                <Icon name="more" />
              </button>
              {menuOpen && (
                <div className="absolute left-full top-0 z-10 ml-2 flex w-64 flex-col rounded-lg border border-white/10 bg-[#2a2a2c] p-1 text-neutral-100 shadow-lg">
                  {[
                    ...menuActions.filter((a) => !a.danger),
                    { label: "นำเข้า .canvas", onClick: () => importRef.current?.click() },
                    { label: "ส่งออก .canvas", onClick: exportCanvas },
                    ...menuActions.filter((a) => a.danger),
                  ].map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      className={`${btn} justify-start text-left ${"danger" in a && a.danger ? "text-destructive" : ""}`}
                      onClick={() => {
                        setMenuOpen(false);
                        a.onClick();
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                  <p className="border-t border-white/10 px-2 pt-2 text-xs leading-relaxed text-neutral-400">
                    {coarse
                      ? "แตะการ์ดอีกครั้งเพื่อแก้ไข · กดค้างที่พื้นที่ว่างเพื่อเพิ่มการ์ด · ลากจุดข้างการ์ดเพื่อเชื่อม · สองนิ้วซูม"
                      : "ดับเบิลคลิกเพื่อเพิ่ม/แก้ไข · ลากจุดข้างการ์ดเพื่อเชื่อม · Shift เลือกหลายอัน · Ctrl+Z ย้อน · Ctrl+ล้อเมาส์ซูม"}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="absolute left-[4.5rem] top-3 flex max-w-[calc(100%-6rem)] flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#2a2a2c] text-neutral-100 p-1 shadow-sm">
            <span className="px-1 text-xs text-neutral-400">เลือก {selected.size}</span>
            <button type="button" aria-label="ไม่มีสี" className="h-5 w-5 rounded-full border border-white/30 bg-[#d6d6d6]" onClick={() => setColor(undefined)} />
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
            {hasTextSelected && (
              <>
                <span className="mx-1 h-5 w-px bg-white/15" />
                <select
                  aria-label="ฟอนต์"
                  className="rounded-md border border-white/15 bg-[#1c1c1e] px-1 text-neutral-100 py-0.5 text-sm"
                  value={singleNode?.fontFamily ?? ""}
                  onChange={(e) => setText({ fontFamily: e.target.value || undefined })}
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.label} value={f.value} style={{ fontFamily: f.value || undefined }}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="ขนาดตัวอักษร"
                  className="rounded-md border border-white/15 bg-[#1c1c1e] px-1 text-neutral-100 py-0.5 text-sm tabular-nums"
                  value={singleNode?.fontSize ?? ""}
                  onChange={(e) => setText({ fontSize: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">ขนาด</option>
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}px
                    </option>
                  ))}
                </select>
                <select
                  aria-label="ความหนาตัวอักษร"
                  className="rounded-md border border-white/15 bg-[#1c1c1e] px-1 text-neutral-100 py-0.5 text-sm"
                  value={singleNode?.fontWeight ?? ""}
                  onChange={(e) => setText({ fontWeight: e.target.value ? Number(e.target.value) : undefined })}
                >
                  <option value="">ความหนา</option>
                  {FONT_WEIGHTS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.label}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button type="button" className={btn} onClick={duplicate} title="ทำซ้ำที่เลือก (Ctrl+D) · คัดลอก/วาง Ctrl+C / Ctrl+V" aria-label="ทำซ้ำที่เลือก">
              <Icon name="copy" />
            </button>
            <button type="button" className={`${btn} text-destructive`} onClick={removeSelected} title="ลบที่เลือก (Delete)" aria-label="ลบที่เลือก">
              <Icon name="trash" />
            </button>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-white/10 bg-[#2a2a2c] text-neutral-100 p-1 text-sm shadow-sm">
        <button type="button" aria-label="ซูมออก" className={btn} onClick={() => zoomBy(1 / 1.25)} title="ซูมออก">
          <Icon name="minus" />
        </button>
        <span className="w-12 text-center tabular-nums">{Math.round(view.z * 100)}%</span>
        <button type="button" aria-label="ซูมเข้า" className={btn} onClick={() => zoomBy(1.25)} title="ซูมเข้า">
          <Icon name="plus" />
        </button>
        <button type="button" className={btn} onClick={() => fitTo(doc.nodes)} title="ดูทั้งหมด" aria-label="ดูทั้งหมด">
          <Icon name="fit" />
        </button>
      </div>

      <input ref={importRef} type="file" accept=".canvas,.json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && void importCanvas(e.target.files[0])} />
    </div>
  );
}
