import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import CanvasBoard from "@/components/whiteboard/CanvasBoard";
import { hasLocalChanges, mergeDocs, newId, parseCanvas, type CanvasDoc } from "@/lib/canvasDoc";
import { CANVAS_CATEGORY, CANVAS_FILE_CATEGORY } from "@/lib/whiteboardStorage";
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
const FILE_REF = "wbfile:";

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
  }, [board]);

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
    <div className="flex h-[calc(100dvh-4rem)] flex-col gap-2 px-3 pb-3 pt-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="whiteboard-select" className="text-sm font-medium">
          บอร์ด
        </label>
        <select
          id="whiteboard-select"
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
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
        <button type="button" onClick={createBoard} className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted">
          + บอร์ดใหม่
        </button>
        <span role="status" className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {STATUS_TEXT[status]}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-background">
        {status === "missing" ? (
          <p className="p-6 text-sm text-muted-foreground">ไม่พบบอร์ดนี้ เลือกบอร์ดอื่นจากรายการด้านบน</p>
        ) : board ? (
          <CanvasBoard key={board.id} doc={doc} onChange={onChange} files={files} onAddImage={onAddImage} boardTitle={board.title} />
        ) : (
          <p className="p-6 text-sm text-muted-foreground">{STATUS_TEXT[status]}</p>
        )}
      </div>
    </div>
  );
}
