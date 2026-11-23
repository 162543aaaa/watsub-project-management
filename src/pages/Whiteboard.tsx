import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CaptureUpdateAction,
  Excalidraw,
  FONT_FAMILY,
  convertToExcalidrawElements,
  getSceneVersion,
  newElementWith,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, BinaryFileData } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { hasNewerLocal, mergeElements } from "@/lib/whiteboardMerge";
import { WHITEBOARD_CATEGORY, WHITEBOARD_FILE_CATEGORY } from "@/lib/whiteboardStorage";
import pattaniSeed from "@/data/whiteboards/pattani-passport.seed.json";

// Boards and their images are stored as unlisted rows in wiki_pages, which approved users can already edit.
const DEFAULT_SLUG = "pattani-passport";
const SEEDS: Record<string, { title: string; skeleton: unknown[] }> = {
  [DEFAULT_SLUG]: { title: "Pattani Passport Planner", skeleton: pattaniSeed },
};
const SAVE_DELAY_MS = 1200;
const POLL_MS = 4000;
const OPENING_VIEW_HEIGHT = 1400;
const UI_OPTIONS = { canvasActions: { clearCanvas: false, loadScene: false, export: false as const } };
const CLEAN_STYLE = {
  currentItemRoughness: 0,
  currentItemFontFamily: FONT_FAMILY.Nunito,
  currentItemRoundness: "round" as const,
};

/** Seeded shapes were drawn sketchy; show every shape with clean lines. */
const cleanLines = (elements: readonly ExcalidrawElement[]) =>
  elements.map((el) => (el.roughness > 0 && el.type !== "freedraw" ? newElementWith(el, { roughness: 0 }) : el));
const boardSlug = (slug: string) => `whiteboard-${slug}`;
const filePrefix = (slug: string) => `whiteboard-file-${slug}-`;

type Board = { id: string; title: string; elements: ExcalidrawElement[]; updatedAt: string };
type BoardSummary = { slug: string; title: string };
type Status = "loading" | "saved" | "saving" | "error" | "missing";

const STATUS_TEXT: Record<Status, string> = {
  loading: "กำลังโหลด…",
  saved: "บันทึกแล้ว",
  saving: "กำลังบันทึก…",
  error: "บันทึกไม่สำเร็จ ลองแก้ไขอีกครั้ง",
  missing: "ไม่พบบอร์ดนี้",
};

const parseElements = (content: string | null): ExcalidrawElement[] => {
  try {
    return (JSON.parse(content ?? "{}").elements ?? []) as ExcalidrawElement[];
  } catch {
    return [];
  }
};

async function loadOrSeed(slug: string, authorId: string | undefined): Promise<Board | null> {
  const select = "id, title, content, updated_at";
  const toBoard = (r: { id: string; title: string; content: string | null; updated_at: string | null }): Board => ({
    id: r.id,
    title: r.title,
    elements: parseElements(r.content),
    updatedAt: r.updated_at ?? "",
  });
  const { data, error } = await supabase.from("wiki_pages").select(select).eq("slug", boardSlug(slug)).maybeSingle();
  if (error) throw error;
  if (data) return toBoard(data);
  const seed = SEEDS[slug];
  if (!seed) return null;
  const elements = convertToExcalidrawElements(seed.skeleton as Parameters<typeof convertToExcalidrawElements>[0], {
    regenerateIds: false,
  });
  const inserted = await supabase
    .from("wiki_pages")
    .insert({
      slug: boardSlug(slug),
      title: seed.title,
      category: WHITEBOARD_CATEGORY,
      content: JSON.stringify({ elements }),
      author_id: authorId ?? null,
      is_published: true,
    })
    .select(select)
    .single();
  if (!inserted.error) return toBoard(inserted.data);
  // a teammate seeded it first
  const retry = await supabase.from("wiki_pages").select(select).eq("slug", boardSlug(slug)).single();
  if (retry.error) throw retry.error;
  return toBoard(retry.data);
}

async function loadFiles(slug: string, skip: Set<string>): Promise<BinaryFileData[]> {
  const { data, error } = await supabase
    .from("wiki_pages")
    .select("slug, content, created_at")
    .eq("category", WHITEBOARD_FILE_CATEGORY)
    .like("slug", `${filePrefix(slug)}%`);
  if (error) throw error;
  const files: BinaryFileData[] = [];
  for (const row of data ?? []) {
    const id = row.slug.slice(filePrefix(slug).length);
    if (skip.has(id)) continue;
    try {
      const { mimeType, dataURL } = JSON.parse(row.content ?? "{}");
      files.push({ id, mimeType, dataURL, created: Date.parse(row.created_at ?? "") } as BinaryFileData);
    } catch {
      // skip a damaged image row
    }
  }
  return files;
}

export default function Whiteboard() {
  const { slug = DEFAULT_SLUG } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const savedVersion = useRef(-1);
  const remoteElements = useRef<readonly ExcalidrawElement[]>([]);
  const lastSeen = useRef("");
  const uploadedFiles = useRef(new Set<string>());
  const saveTimer = useRef<number>();
  const saving = useRef(false);

  useEffect(() => {
    supabase
      .from("wiki_pages")
      .select("slug, title")
      .eq("category", WHITEBOARD_CATEGORY)
      .order("title")
      .then(({ data }) =>
        setBoards((data ?? []).map((b) => ({ slug: b.slug.replace(/^whiteboard-/, ""), title: b.title }))),
      );
  }, [board?.id]);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setBoard(null);
    loadOrSeed(slug, user?.id)
      .then((b) => {
        if (!alive) return;
        if (!b) return setStatus("missing");
        remoteElements.current = b.elements;
        savedVersion.current = getSceneVersion(b.elements);
        lastSeen.current = b.updatedAt;
        uploadedFiles.current = new Set();
        setBoard(b);
        setStatus("saved");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [slug, user?.id]);

  const pullFiles = useCallback(async () => {
    if (!api) return;
    const files = await loadFiles(slug, uploadedFiles.current);
    files.forEach((f) => uploadedFiles.current.add(f.id));
    if (files.length) api.addFiles(files);
  }, [api, slug]);

  useEffect(() => {
    if (!api || !board) return;
    const elements = cleanLines(board.elements);
    api.updateScene({ elements, captureUpdate: CaptureUpdateAction.NEVER });
    // open on the top of the board at a readable zoom instead of fitting the whole (tall) board
    const visible = elements.filter((el) => !el.isDeleted);
    const top = Math.min(...visible.map((el) => el.y));
    const opening = visible.filter((el) => el.y <= top + OPENING_VIEW_HEIGHT);
    if (opening.length) api.scrollToContent(opening, { fitToViewport: true, viewportZoomFactor: 0.95 });
    void pullFiles();
  }, [api, board, pullFiles]);

  const save = useCallback(async () => {
    if (!api || !board || saving.current) return;
    const elements = api.getSceneElementsIncludingDeleted();
    const version = getSceneVersion(elements);
    if (version === savedVersion.current) return;
    saving.current = true;
    setStatus("saving");
    try {
      const fresh = Object.values(api.getFiles()).filter((f) => !uploadedFiles.current.has(f.id));
      if (fresh.length) {
        const { error } = await supabase.from("wiki_pages").upsert(
          fresh.map((f) => ({
            slug: `${filePrefix(slug)}${f.id}`,
            title: `Whiteboard image ${f.id}`,
            category: WHITEBOARD_FILE_CATEGORY,
            content: JSON.stringify({ mimeType: f.mimeType, dataURL: f.dataURL }),
            author_id: user?.id ?? null,
            is_published: true,
          })),
          { onConflict: "slug", ignoreDuplicates: true },
        );
        if (error) return setStatus("error");
        fresh.forEach((f) => uploadedFiles.current.add(f.id));
      }
      const merged = mergeElements(elements, remoteElements.current);
      const { data, error } = await supabase
        .from("wiki_pages")
        .update({ content: JSON.stringify({ elements: merged }) })
        .eq("id", board.id)
        .select("updated_at")
        .single();
      if (error) return setStatus("error");
      remoteElements.current = merged;
      savedVersion.current = version;
      lastSeen.current = data.updated_at ?? lastSeen.current;
      setStatus("saved");
    } finally {
      saving.current = false;
    }
  }, [api, board, slug, user?.id]);

  const onChange = useCallback(() => {
    if (!board) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(save, SAVE_DELAY_MS);
  }, [board, save]);

  useEffect(() => {
    if (!api || !board) return;
    const poll = window.setInterval(async () => {
      if (saving.current || document.hidden) return;
      const head = await supabase.from("wiki_pages").select("updated_at").eq("id", board.id).single();
      if (head.error || !head.data.updated_at || head.data.updated_at === lastSeen.current) return;
      const full = await supabase.from("wiki_pages").select("content, updated_at").eq("id", board.id).single();
      if (full.error) return;
      const theirs = parseElements(full.data.content);
      lastSeen.current = full.data.updated_at ?? lastSeen.current;
      remoteElements.current = theirs;
      const local = api.getSceneElementsIncludingDeleted();
      const merged = mergeElements(local, theirs);
      api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
      if (!hasNewerLocal(local, theirs)) savedVersion.current = getSceneVersion(merged);
      void pullFiles();
    }, POLL_MS);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(saveTimer.current);
      void save();
    };
  }, [api, board, save, pullFiles]);

  const addNote = () => {
    if (!api) return;
    const { scrollX, scrollY, zoom, width, height } = api.getAppState();
    const w = 240;
    const h = 160;
    const [note, label] = convertToExcalidrawElements([
      {
        type: "rectangle",
        x: -scrollX + width / 2 / zoom.value - w / 2,
        y: -scrollY + height / 2 / zoom.value - h / 2,
        width: w,
        height: h,
        backgroundColor: "#fff3bf",
        fillStyle: "solid",
        strokeColor: "#e0a800",
        roughness: 0,
        roundness: { type: 3 },
        label: { text: "พิมพ์ข้อความ", fontSize: 18, fontFamily: FONT_FAMILY.Nunito },
      },
    ]);
    api.updateScene({
      elements: [...api.getSceneElementsIncludingDeleted(), note, label],
      appState: { selectedElementIds: { [note.id]: true } },
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
  };

  const createBoard = async () => {
    const title = `บอร์ดใหม่ ${new Date().toLocaleDateString("th-TH")}`;
    const newSlug = `board-${Date.now().toString(36)}`;
    const { error } = await supabase.from("wiki_pages").insert({
      slug: boardSlug(newSlug),
      title,
      category: WHITEBOARD_CATEGORY,
      content: JSON.stringify({ elements: [] }),
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
        <button
          type="button"
          onClick={addNote}
          disabled={!board}
          className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          + โน้ต
        </button>
        <span role="status" className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {STATUS_TEXT[status]}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
        {status === "missing" ? (
          <p className="p-6 text-sm text-muted-foreground">ไม่พบบอร์ดนี้ เลือกบอร์ดอื่นจากรายการด้านบน</p>
        ) : (
          <Excalidraw
            key={slug}
            excalidrawAPI={setApi}
            onChange={onChange}
            langCode="th-TH"
            UIOptions={UI_OPTIONS}
            initialData={{ appState: CLEAN_STYLE }}
          />
        )}
      </div>
    </div>
  );
}
