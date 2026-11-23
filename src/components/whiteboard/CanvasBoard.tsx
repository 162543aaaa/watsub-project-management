import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import ReactMarkdown from "react-markdown";
import {
  PRESET_COLORS,
  newId,
  parseCanvas,
  resolveColor,
  toObsidianCanvas,
  type CanvasDoc,
  type CanvasEdge,
  type CanvasNode,
  type Side,
} from "@/lib/canvasDoc";

type View = { x: number; y: number; z: number };
type Drag =
  | { kind: "pan"; sx: number; sy: number; view: View }
  | { kind: "move"; sx: number; sy: number; start: Map<string, { x: number; y: number }> }
  | { kind: "resize"; sx: number; sy: number; id: string; w: number; h: number };

const MIN_Z = 0.1;
const MAX_Z = 3;
const OPENING_HEIGHT = 1400;
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

function autoSide(from: CanvasNode, to: CanvasNode): Side {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

const NORMAL: Record<Side, [number, number]> = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

function edgePath(e: CanvasEdge, from: CanvasNode, to: CanvasNode) {
  const fs = e.fromSide ?? autoSide(from, to);
  const ts = e.toSide ?? autoSide(to, from);
  const [x1, y1] = anchor(from, fs);
  const [x2, y2] = anchor(to, ts);
  const k = Math.max(40, Math.hypot(x2 - x1, y2 - y1) / 3);
  const c1 = [x1 + NORMAL[fs][0] * k, y1 + NORMAL[fs][1] * k];
  const c2 = [x2 + NORMAL[ts][0] * k, y2 + NORMAL[ts][1] * k];
  const mid = [(x1 + 3 * c1[0] + 3 * c2[0] + x2) / 8, (y1 + 3 * c1[1] + 3 * c2[1] + y2) / 8];
  return { d: `M${x1},${y1} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`, mid };
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

interface Props {
  doc: CanvasDoc;
  onChange: (doc: CanvasDoc) => void;
  files: Record<string, string>;
  onAddImage: (dataUrl: string, mimeType: string) => Promise<string | null>;
  boardTitle: string;
}

export default function CanvasBoard({ doc, onChange, files, onAddImage, boardTitle }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, z: 0.5 });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const opened = useRef(false);
  const docRef = useRef(doc);
  docRef.current = doc;

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const r = viewportRef.current!.getBoundingClientRect();
      return { x: (clientX - r.left - view.x) / view.z, y: (clientY - r.top - view.y) / view.z };
    },
    [view],
  );

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

  const commit = useCallback(
    (nodes: CanvasNode[], edges: CanvasEdge[] = docRef.current.edges, deleted = docRef.current.deleted ?? {}) =>
      onChange({ nodes, edges, deleted }),
    [onChange],
  );

  const patchNodes = useCallback(
    (patches: Map<string, Partial<CanvasNode>>) => {
      const now = Date.now();
      commit(docRef.current.nodes.map((n) => (patches.has(n.id) ? { ...n, ...patches.get(n.id), ts: now } : n)));
    },
    [commit],
  );

  const addNode = useCallback(
    (partial: Omit<CanvasNode, "id" | "ts" | "x" | "y"> & Partial<Pick<CanvasNode, "x" | "y">>) => {
      const el = viewportRef.current!;
      const center = toWorld(el.getBoundingClientRect().left + el.clientWidth / 2, el.getBoundingClientRect().top + el.clientHeight / 2);
      const node: CanvasNode = {
        id: newId(),
        ts: Date.now(),
        x: Math.round(partial.x ?? center.x - partial.width / 2),
        y: Math.round(partial.y ?? center.y - partial.height / 2),
        ...partial,
      } as CanvasNode;
      const nodes = node.type === "group" ? [node, ...docRef.current.nodes] : [...docRef.current.nodes, node];
      commit(nodes);
      setSelected(node.id);
      return node;
    },
    [commit, toWorld],
  );

  const removeSelected = useCallback(() => {
    if (!selected) return;
    const now = Date.now();
    const { nodes, edges, deleted = {} } = docRef.current;
    const goneEdges = edges.filter((e) => e.fromNode === selected || e.toNode === selected || e.id === selected);
    const nextDeleted = { ...deleted, [selected]: now };
    goneEdges.forEach((e) => (nextDeleted[e.id] = now));
    commit(
      nodes.filter((n) => n.id !== selected),
      edges.filter((e) => !goneEdges.includes(e)),
      nextDeleted,
    );
    setSelected(null);
  }, [commit, selected]);

  // wheel: pan; ctrl/cmd + wheel or pinch: zoom at the cursor
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
      const t = e.target as HTMLElement;
      if (editing || t.closest("input, textarea, select, [contenteditable=true]")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        removeSelected();
      }
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, selected, removeSelected]);

  const addImages = useCallback(
    async (fileList: FileList | File[], at?: { x: number; y: number }) => {
      for (const file of Array.from(fileList).filter((f) => f.type.startsWith("image/"))) {
        const dataUrl = await readDataUrl(file);
        const ref = await onAddImage(dataUrl, file.type);
        if (!ref) continue;
        const { w, h } = await imageSize(dataUrl);
        const width = Math.min(480, w);
        addNode({ type: "file", file: ref, width, height: Math.round((h / w) * width), x: at?.x, y: at?.y });
      }
    },
    [addNode, onAddImage],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editing || (e.target as HTMLElement).closest("input, textarea")) return;
      const imgs = Array.from(e.clipboardData?.files ?? []);
      if (imgs.length) {
        e.preventDefault();
        void addImages(imgs);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addImages, editing]);

  const onPointerDownBg = (e: ReactPointerEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    setSelected(null);
    setEditing(null);
    drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, view };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerDownNode = (e: ReactPointerEvent, n: CanvasNode) => {
    if (e.button !== 0 || editing === n.id) return;
    e.stopPropagation();
    setSelected(n.id);
    const start = new Map([[n.id, { x: n.x, y: n.y }]]);
    if (n.type === "group") docRef.current.nodes.filter((c) => isInside(c, n)).forEach((c) => start.set(c.id, { x: c.x, y: c.y }));
    drag.current = { kind: "move", sx: e.clientX, sy: e.clientY, start };
    // capture on the card itself, so a double-click still lands on the card
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerDownResize = (e: ReactPointerEvent, n: CanvasNode) => {
    e.stopPropagation();
    drag.current = { kind: "resize", sx: e.clientX, sy: e.clientY, id: n.id, w: n.width, h: n.height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (d.kind === "pan") return setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy });
    if (d.kind === "move") {
      const patches = new Map<string, Partial<CanvasNode>>();
      d.start.forEach((p, id) => patches.set(id, { x: Math.round(p.x + dx / view.z), y: Math.round(p.y + dy / view.z) }));
      return patchNodes(patches);
    }
    patchNodes(new Map([[d.id, { width: Math.max(80, Math.round(d.w + dx / view.z)), height: Math.max(40, Math.round(d.h + dy / view.z)) }]]));
  };

  const endDrag = () => (drag.current = null);

  const onDoubleClickBg = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const p = toWorld(e.clientX, e.clientY);
    const n = addNode({ type: "text", text: "", width: 260, height: 120, x: Math.round(p.x - 130), y: Math.round(p.y - 60) });
    setEditing(n.id);
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
      commit([...byId.values()], [...edgesById.values()]);
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

  const nodesById = new Map(doc.nodes.map((n) => [n.id, n]));
  const sel = selected ? nodesById.get(selected) : undefined;
  const groups = doc.nodes.filter((n) => n.type === "group");
  const others = doc.nodes.filter((n) => n.type !== "group");

  const renderNode = (n: CanvasNode) => {
    const color = resolveColor(n.color);
    const isSel = selected === n.id;
    const base = "absolute rounded-lg";
    const style = {
      left: n.x,
      top: n.y,
      width: n.width,
      height: n.height,
      borderColor: color ?? "hsl(var(--border))",
      background: n.type === "group" ? (color ? `${color}14` : "hsl(var(--muted) / 0.35)") : color ? `color-mix(in srgb, ${color} 12%, hsl(var(--card)))` : "hsl(var(--card))",
      boxShadow: isSel ? `0 0 0 ${2 / view.z}px hsl(var(--primary))` : undefined,
    } as const;
    return (
      <div
        key={n.id}
        className={`${base} border-2 ${n.type === "group" ? "border-dashed" : "shadow-sm"}`}
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
            <div data-scrollable className="prose prose-sm h-full max-w-none overflow-auto p-3 text-sm leading-relaxed dark:prose-invert [&_h1]:mb-1 [&_h1]:mt-0 [&_h2]:mb-1 [&_h2]:mt-0 [&_h3]:mb-1 [&_h3]:mt-0 [&_p]:my-1 [&_ul]:my-1">
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
        {isSel && (
          <div
            role="presentation"
            className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm bg-primary"
            style={{ transform: `scale(${1 / view.z})` }}
            onPointerDown={(e) => onPointerDownResize(e, n)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="relative h-full w-full">
      <div
        ref={viewportRef}
        className="h-full w-full touch-none overflow-hidden"
        style={{
          cursor: drag.current?.kind === "pan" ? "grabbing" : "grab",
          backgroundImage: "radial-gradient(hsl(var(--muted-foreground) / 0.25) 1px, transparent 1px)",
          backgroundSize: `${24 * view.z}px ${24 * view.z}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
        onPointerDown={onPointerDownBg}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClickBg}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void addImages(e.dataTransfer.files, toWorld(e.clientX, e.clientY));
        }}
      >
        <div className="pointer-events-none absolute left-0 top-0" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transformOrigin: "0 0" }}>
          <div className="pointer-events-auto">{groups.map(renderNode)}</div>
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1">
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
              const stroke = resolveColor(e.color) ?? "hsl(var(--muted-foreground))";
              return (
                <g key={e.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={2}
                    markerEnd={e.toEnd === "none" ? undefined : "url(#canvas-arrow)"}
                    markerStart={e.fromEnd === "arrow" ? "url(#canvas-arrow)" : undefined}
                  />
                  {e.label && (
                    <text x={mid[0]} y={mid[1] - 6} textAnchor="middle" fontSize={14} fill={stroke} stroke="hsl(var(--background))" strokeWidth={4} paintOrder="stroke">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="pointer-events-auto">{others.map(renderNode)}</div>
        </div>
      </div>

      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
        <button type="button" className="rounded-md px-2 py-1 text-sm hover:bg-muted" onClick={() => setEditing(addNode({ type: "text", text: "", width: 260, height: 120 }).id)}>
          + การ์ด
        </button>
        <button type="button" className="rounded-md px-2 py-1 text-sm hover:bg-muted" onClick={() => addNode({ type: "group", label: "กลุ่มใหม่", width: 600, height: 400 })}>
          + กลุ่ม
        </button>
        <label className="cursor-pointer rounded-md px-2 py-1 text-sm hover:bg-muted">
          + รูป
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files && void addImages(e.target.files)} />
        </label>
        {sel && (
          <>
            <span className="mx-1 h-5 w-px bg-border" />
            <button type="button" aria-label="ไม่มีสี" className="h-5 w-5 rounded-full border border-border bg-card" onClick={() => patchNodes(new Map([[sel.id, { color: undefined }]]))} />
            {Object.entries(PRESET_COLORS).map(([key, hex]) => (
              <button key={key} type="button" aria-label={`สี ${key}`} className="h-5 w-5 rounded-full" style={{ background: hex, outline: sel.color === key ? "2px solid hsl(var(--foreground))" : undefined }} onClick={() => patchNodes(new Map([[sel.id, { color: key }]]))} />
            ))}
            <button type="button" className="rounded-md px-2 py-1 text-sm text-destructive hover:bg-muted" onClick={removeSelected}>
              ลบ
            </button>
          </>
        )}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 text-sm shadow-sm">
        <button type="button" aria-label="ซูมออก" className="rounded-md px-2 py-1 hover:bg-muted" onClick={() => zoomBy(1 / 1.25)}>
          −
        </button>
        <span className="w-12 text-center tabular-nums">{Math.round(view.z * 100)}%</span>
        <button type="button" aria-label="ซูมเข้า" className="rounded-md px-2 py-1 hover:bg-muted" onClick={() => zoomBy(1.25)}>
          +
        </button>
        <button type="button" className="rounded-md px-2 py-1 hover:bg-muted" onClick={() => fitTo(doc.nodes)}>
          ดูทั้งหมด
        </button>
      </div>

      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 text-sm shadow-sm">
        <button type="button" className="rounded-md px-2 py-1 hover:bg-muted" onClick={() => importRef.current?.click()}>
          นำเข้า .canvas
        </button>
        <input ref={importRef} type="file" accept=".canvas,.json,application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && void importCanvas(e.target.files[0])} />
        <button type="button" className="rounded-md px-2 py-1 hover:bg-muted" onClick={exportCanvas}>
          ส่งออก .canvas
        </button>
      </div>

      <p className="pointer-events-none absolute right-3 top-3 hidden rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground md:block">
        ลากพื้นหลังเพื่อเลื่อน · Ctrl + ล้อเมาส์เพื่อซูม · ดับเบิลคลิกเพื่อเพิ่ม/แก้การ์ด
      </p>
    </div>
  );
}
