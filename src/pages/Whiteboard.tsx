import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import CanvasBoard from "@/components/whiteboard/CanvasBoard";
import { hasLocalChanges, mergeDocs, newId, parseCanvas, type CanvasDoc } from "@/lib/canvasDoc";
import { CANVAS_CATEGORY, CANVAS_FILE_CATEGORY, CANVAS_VERSION_CATEGORY } from "@/lib/whiteboardStorage";
import pattaniCanvas from "@/data/whiteboards/pattani-passport.canvas.json";

// Boards are JSON Canvas documents (the Obsidian Canvas format) stored as unlisted wiki_pages rows,
// which approved users can already create and edit.
const DEFAULT_SLUG = "pattani-passport";
const SEEDS: Record<string, { title: string; doc: unknown }> = {
  [DEFAULT_SLUG]: { title: "Pattani Passport Planner", doc: pattaniCanvas },
};
const SAVE_DELAY_MS = 1000;
const POLL_MS = 4000;
const rowSlug = (slug: string) => `canvas-${slug}`;
const filePrefix = (slug: string) => `canvas-file-${slug}-`;
const versionPrefix = (slug: string) => `canvas-ver-${slug}-`;
const FILE_REF = "wbfile:";
const VERSION_EVERY_MS = 10 * 60 * 1000;
const VERSIONS_KEPT = 30;

type Board = { id: string; title: string; doc: CanvasDoc; updatedAt: string };
type Status = "loading" | "saved" | "saving" | "error" | "missing";
const STATUS_TEXT: Record<Status, string> = {
  loading: "กำลังโหลด…",
  saved: "บันทึกแล้ว",
  saving: "กำลังบันทึก…",
  error: "บันทึกไม่สำเร็จ ลองแก้ไขอีกครั้ง",
  missing: "ไม่พบบอร์ดนี้",
};

const parseContent = (content: string | null) => {
  try {
    return parseCanvas(JSON.parse(content ?? "{}"));
  } catch {
    return parseCanvas({});
  }
};

async function loadOrSeed(slug: string, authorId?: string): Promise<Board | null> {
  const select = "id, title, content, updated_at";
  const toBoard = (r: { id: string; title: string; content: string | null; updated_at: string | null }): Board => ({
    id: r.id,
    title: r.title,
    doc: parseContent(r.content),
    updatedAt: r.updated_at ?? "",
  });
  const { data, error } = await supabase.from("wiki_pages").select(select).eq("slug", rowSlug(slug)).maybeSingle();
  if (error) throw error;
  if (data) return toBoard(data);
  const seed = SEEDS[slug];
  if (!seed) return null;
  const inserted = await supabase
    .from("wiki_pages")
    .insert({
      slug: rowSlug(slug),
      title: seed.title,
      category: CANVAS_CATEGORY,
      content: JSON.stringify(parseCanvas(seed.doc)),
      author_id: authorId ?? null,
      is_published: true,
    })
    .select(select)
    .single();
  if (!inserted.error) return toBoard(inserted.data);
  const retry = await supabase.from("wiki_pages").select(select).eq("slug", rowSlug(slug)).single();
  if (retry.error) throw retry.error;
  return toBoard(retry.data);
}

export default function Whiteboard() {
  const { slug = DEFAULT_SLUG } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [board, setBoard] = useState<Board | null>(null);
  const [doc, setDoc] = useState<CanvasDoc>({ nodes: [], edges: [] });
  const [files, setFiles] = useState<Record<string, string>>({});
  const [boards, setBoards] = useState<{ slug: string; title: string }[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const docRef = useRef(doc);
  const remote = useRef<CanvasDoc>({ nodes: [], edges: [] });
  const lastSeen = useRef("");
  const dirty = useRef(false);
  const saving = useRef(false);
  const saveTimer = useRef<number>();
  const lastVersionAt = useRef(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<{ slug: string; created_at: string | null }[]>([]);
  const [restoreRequest, setRestoreRequest] = useState<{ doc: CanvasDoc; key: number } | null>(null);

  // keep the last saved state as a version before this session's edits overwrite it, then every 10 minutes
  const snapshot = useCallback(async (state: CanvasDoc) => {
    if (Date.now() - lastVersionAt.current < VERSION_EVERY_MS) return;
    lastVersionAt.current = Date.now();
    const { error } = await supabase.from("wiki_pages").insert({
      slug: `${versionPrefix(slug)}${Date.now()}`,
      title: `Whiteboard version ${new Date().toISOString()}`,
      category: CANVAS_VERSION_CATEGORY,
      content: JSON.stringify(state),
      author_id: user?.id ?? null,
      is_published: true,
    });
    if (error) return;
    const { data: old } = await supabase
      .from("wiki_pages")
      .select("id")
      .eq("category", CANVAS_VERSION_CATEGORY)
      .like("slug", `${versionPrefix(slug)}%`)
      .order("created_at", { ascending: false })
      .range(VERSIONS_KEPT, VERSIONS_KEPT + 50);
    if (old?.length) await supabase.from("wiki_pages").delete().in("id", old.map((r) => r.id));
  }, [slug, user?.id]);

  const loadVersions = useCallback(async () => {
    const { data } = await supabase
      .from("wiki_pages")
      .select("slug, created_at")
      .eq("category", CANVAS_VERSION_CATEGORY)
      .like("slug", `${versionPrefix(slug)}%`)
      .order("created_at", { ascending: false })
      .limit(VERSIONS_KEPT);
    setVersions(data ?? []);
  }, [slug]);

  const restoreVersion = async (versionSlug: string) => {
    const { data } = await supabase.from("wiki_pages").select("content").eq("slug", versionSlug).single();
    if (!data) return;
    setRestoreRequest({ doc: parseContent(data.content), key: Date.now() });
    setHistoryOpen(false);
  };

  const renameBoard = async () => {
    if (!board) return;
    const title = window.prompt("ชื่อบอร์ด", board.title)?.trim();
    if (!title || title === board.title) return;
    const { error } = await supabase.from("wiki_pages").update({ title }).eq("id", board.id);
    if (error) return setStatus("error");
    setBoard({ ...board, title });
    setBoards((list) => list.map((b) => (b.slug === slug ? { ...b, title } : b)));
  };

  const deleteBoard = async () => {
    if (!board || !window.confirm(`ลบบอร์ด "${board.title}" พร้อมรูปและประวัติทั้งหมด? กู้คืนไม่ได้`)) return;
    await supabase.from("wiki_pages").delete().like("slug", `${filePrefix(slug)}%`).eq("category", CANVAS_FILE_CATEGORY);
    await supabase.from("wiki_pages").delete().like("slug", `${versionPrefix(slug)}%`).eq("category", CANVAS_VERSION_CATEGORY);
    const { error } = await supabase.from("wiki_pages").delete().eq("id", board.id);
    if (error) return setStatus("error");
    const next = boards.find((b) => b.slug !== slug)?.slug ?? DEFAULT_SLUG;
    navigate(`/whiteboard/${next}`);
  };

  useEffect(() => {
    supabase
      .from("wiki_pages")
      .select("slug, title")
      .eq("category", CANVAS_CATEGORY)
      .order("title")
      .then(({ data }) => setBoards((data ?? []).map((b) => ({ slug: b.slug.replace(/^canvas-/, ""), title: b.title }))));
  }, [board?.id]);

  const loadFiles = useCallback(async () => {
    const { data } = await supabase
      .from("wiki_pages")
      .select("slug, content")
      .eq("category", CANVAS_FILE_CATEGORY)
      .like("slug", `${filePrefix(slug)}%`);
    const next: Record<string, string> = {};
    for (const row of data ?? []) {
      try {
        next[FILE_REF + row.slug.slice(filePrefix(slug).length)] = JSON.parse(row.content ?? "{}").dataURL;
      } catch {
        // skip a damaged image row
      }
    }
    setFiles(next);
  }, [slug]);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setBoard(null);
    loadOrSeed(slug, user?.id)
      .then((b) => {
        if (!alive) return;
        if (!b) return setStatus("missing");
        remote.current = b.doc;
        docRef.current = b.doc;
        lastSeen.current = b.updatedAt;
        lastVersionAt.current = 0;
        setRestoreRequest(null);
        setHistoryOpen(false);
        dirty.current = false;
        setDoc(b.doc);
        setBoard(b);
        setStatus("saved");
        void loadFiles();
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [slug, user?.id, loadFiles]);

  const save = useCallback(async () => {
    if (!board || saving.current || !dirty.current) return;
    saving.current = true;
    dirty.current = false;
    setStatus("saving");
    try {
      void snapshot(remote.current);
      const merged = mergeDocs(docRef.current, remote.current);
      const { data, error } = await supabase
        .from("wiki_pages")
        .update({ content: JSON.stringify(merged) })
        .eq("id", board.id)
        .select("updated_at")
        .single();
      if (error) {
        dirty.current = true;
        return setStatus("error");
      }
      remote.current = merged;
      lastSeen.current = data.updated_at ?? lastSeen.current;
      setStatus(dirty.current ? "saving" : "saved");
    } finally {
      saving.current = false;
      if (dirty.current) saveTimer.current = window.setTimeout(save, SAVE_DELAY_MS);
    }
  }, [board, snapshot]);

  const onChange = useCallback(
    (next: CanvasDoc) => {
      docRef.current = next;
      setDoc(next);
      dirty.current = true;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(save, SAVE_DELAY_MS);
    },
    [save],
  );

  useEffect(() => {
    if (!board) return;
    const poll = window.setInterval(async () => {
      if (saving.current || document.hidden) return;
      const head = await supabase.from("wiki_pages").select("updated_at").eq("id", board.id).single();
      if (head.error || !head.data.updated_at || head.data.updated_at === lastSeen.current) return;
      const full = await supabase.from("wiki_pages").select("content, updated_at").eq("id", board.id).single();
      if (full.error) return;
      const theirs = parseContent(full.data.content);
      lastSeen.current = full.data.updated_at ?? lastSeen.current;
      remote.current = theirs;
      const merged = mergeDocs(docRef.current, theirs);
      docRef.current = merged;
      setDoc(merged);
      dirty.current = hasLocalChanges(merged, theirs);
      void loadFiles();
    }, POLL_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(saveTimer.current);
      void save();
    };
  }, [board, save, loadFiles]);

  const onAddImage = useCallback(
    async (dataUrl: string, mimeType: string) => {
      const id = newId();
      const { error } = await supabase.from("wiki_pages").insert({
        slug: `${filePrefix(slug)}${id}`,
        title: `Whiteboard image ${id}`,
        category: CANVAS_FILE_CATEGORY,
        content: JSON.stringify({ mimeType, dataURL: dataUrl }),
        author_id: user?.id ?? null,
        is_published: true,
      });
      if (error) {
        setStatus("error");
        return null;
      }
      setFiles((f) => ({ ...f, [FILE_REF + id]: dataUrl }));
      return FILE_REF + id;
    },
    [slug, user?.id],
  );

  const createBoard = async () => {
    const title = `บอร์ดใหม่ ${new Date().toLocaleDateString("th-TH")}`;
    const newSlug = `board-${Date.now().toString(36)}`;
    const { error } = await supabase.from("wiki_pages").insert({
      slug: rowSlug(newSlug),
      title,
      category: CANVAS_CATEGORY,
      content: JSON.stringify({ nodes: [], edges: [] }),
      author_id: user?.id ?? null,
      is_published: true,
    });
    if (!error) navigate(`/whiteboard/${newSlug}`);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col bg-[#1c1c1e] text-neutral-100">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <label htmlFor="whiteboard-select" className="text-sm font-medium">
          บอร์ด
        </label>
        <select
          id="whiteboard-select"
          className="rounded-md border border-white/15 bg-[#2a2a2c] px-2 py-1 text-sm text-neutral-100"
          value={slug}
          onChange={(e) => navigate(`/whiteboard/${e.target.value}`)}
        >
          {!boards.some((b) => b.slug === slug) && <option value={slug}>{board?.title ?? slug}</option>}
          {boards.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.title}
            </option>
          ))}
        </select>
        <button type="button" onClick={createBoard} className="rounded-md border border-white/15 px-3 py-1 text-sm hover:bg-white/10">
          + บอร์ดใหม่
        </button>
        <span role="status" className={`text-sm ${status === "error" ? "text-red-400" : "text-neutral-400"}`}>
          {STATUS_TEXT[status]}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {historyOpen && (
          <aside className="absolute right-3 top-14 z-10 max-h-[70%] w-72 overflow-auto rounded-lg border border-white/10 bg-[#2a2a2c] p-3 shadow-lg">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold">ประวัติเวอร์ชัน</h2>
              <button type="button" aria-label="ปิด" className="rounded-md px-2 py-1 text-sm hover:bg-white/10" onClick={() => setHistoryOpen(false)}>
                ✕
              </button>
            </div>
            <p className="mb-2 text-xs text-neutral-400">บันทึกอัตโนมัติทุก 10 นาทีที่มีการแก้ เก็บไว้ {VERSIONS_KEPT} เวอร์ชันล่าสุด กู้คืนแล้วกด ↶ ย้อนได้</p>
            {versions.length === 0 && <p className="text-xs text-neutral-400">ยังไม่มีเวอร์ชันที่บันทึกไว้</p>}
            <ul className="space-y-1">
              {versions.map((v) => (
                <li key={v.slug} className="flex items-center justify-between gap-2 text-sm">
                  <span className="tabular-nums">{v.created_at ? new Date(v.created_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "-"}</span>
                  <button type="button" className="rounded-md border border-white/15 px-2 py-0.5 text-xs hover:bg-white/10" onClick={() => void restoreVersion(v.slug)}>
                    กู้คืน
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
        {status === "missing" ? (
          <p className="p-6 text-sm text-neutral-400">ไม่พบบอร์ดนี้ เลือกบอร์ดอื่นจากรายการด้านบน</p>
        ) : board ? (
          <CanvasBoard
            key={board.id}
            doc={doc}
            onChange={onChange}
            files={files}
            onAddImage={onAddImage}
            boardTitle={board.title}
            restoreRequest={restoreRequest}
            menuActions={[
              { label: "เปลี่ยนชื่อบอร์ด", onClick: renameBoard },
              {
                label: "ประวัติเวอร์ชัน",
                onClick: () => {
                  setHistoryOpen(true);
                  void loadVersions();
                },
              },
              { label: "ลบบอร์ด", onClick: deleteBoard, danger: true },
            ]}
          />
        ) : (
          <p className="p-6 text-sm text-neutral-400">{STATUS_TEXT[status]}</p>
        )}
      </div>
    </div>
  );
}
