import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CaptureUpdateAction,
  Excalidraw,
  convertToExcalidrawElements,
  getSceneVersion,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, BinaryFileData, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { hasNewerLocal, mergeElements } from "@/lib/whiteboardMerge";
import pattaniSeed from "@/data/whiteboards/pattani-passport.seed.json";

// whiteboard tables are not in the generated Database types yet
const db = supabase as unknown as SupabaseClient;

const DEFAULT_SLUG = "pattani-passport";
const SEEDS: Record<string, { title: string; skeleton: unknown[] }> = {
  [DEFAULT_SLUG]: { title: "Pattani Passport Planner", skeleton: pattaniSeed },
};
const SAVE_DELAY_MS = 1200;

type Board = { id: string; slug: string; title: string; elements: ExcalidrawElement[] };
type BoardSummary = { slug: string; title: string };
type Status = "loading" | "saved" | "saving" | "error" | "missing";

const STATUS_TEXT: Record<Status, string> = {
  loading: "กำลังโหลด…",
  saved: "บันทึกแล้ว",
  saving: "กำลังบันทึก…",
  error: "บันทึกไม่สำเร็จ ลองแก้ไขอีกครั้ง",
  missing: "ไม่พบบอร์ดนี้",
};

async function loadOrSeed(slug: string): Promise<Board | null> {
  const { data, error } = await db.from("whiteboards").select("id, slug, title, elements").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (data) return data as Board;
  const seed = SEEDS[slug];
  if (!seed) return null;
  const elements = convertToExcalidrawElements(seed.skeleton as Parameters<typeof convertToExcalidrawElements>[0], {
    regenerateIds: false,
  });
  const inserted = await db.from("whiteboards").insert({ slug, title: seed.title, elements }).select("id, slug, title, elements").single();
  if (inserted.error) {
    // another teammate seeded it first
    const retry = await db.from("whiteboards").select("id, slug, title, elements").eq("slug", slug).single();
    if (retry.error) throw retry.error;
    return retry.data as Board;
  }
  return inserted.data as Board;
}

async function loadFiles(boardId: string, skip: Set<string>): Promise<BinaryFileData[]> {
  const { data, error } = await db.from("whiteboard_files").select("file_id, mime_type, data_url, created_at").eq("board_id", boardId);
  if (error) throw error;
  return (data ?? [])
    .filter((f) => !skip.has(f.file_id))
    .map((f) => ({
      id: f.file_id,
      mimeType: f.mime_type,
      dataURL: f.data_url,
      created: Date.parse(f.created_at),
    })) as BinaryFileData[];
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
  const uploadedFiles = useRef(new Set<string>());
  const saveTimer = useRef<number>();

  useEffect(() => {
    db.from("whiteboards").select("slug, title").order("title").then(({ data }) => setBoards((data ?? []) as BoardSummary[]));
  }, [board?.id]);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setBoard(null);
    loadOrSeed(slug)
      .then((b) => {
        if (!alive) return;
        if (!b) return setStatus("missing");
        remoteElements.current = b.elements;
        savedVersion.current = getSceneVersion(b.elements);
        uploadedFiles.current = new Set();
        setBoard(b);
        setStatus("saved");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!api || !board) return;
    api.updateScene({ elements: board.elements, captureUpdate: CaptureUpdateAction.NEVER });
    api.scrollToContent(undefined, { fitToContent: true });
    loadFiles(board.id, uploadedFiles.current).then((files) => {
      files.forEach((f) => uploadedFiles.current.add(f.id));
      if (files.length) api.addFiles(files);
    });
  }, [api, board]);

  const save = useCallback(async () => {
    if (!api || !board) return;
    const elements = api.getSceneElementsIncludingDeleted();
    const version = getSceneVersion(elements);
    if (version === savedVersion.current) return;
    setStatus("saving");
    const files = api.getFiles();
    const fresh = Object.values(files).filter((f) => !uploadedFiles.current.has(f.id));
    if (fresh.length) {
      const { error } = await db.from("whiteboard_files").upsert(
        fresh.map((f) => ({ board_id: board.id, file_id: f.id, mime_type: f.mimeType, data_url: f.dataURL })),
        { onConflict: "board_id,file_id", ignoreDuplicates: true },
      );
      if (error) return setStatus("error");
      fresh.forEach((f) => uploadedFiles.current.add(f.id));
    }
    const merged = mergeElements(elements, remoteElements.current);
    const { error } = await db.from("whiteboards").update({ elements: merged }).eq("id", board.id);
    if (error) return setStatus("error");
    remoteElements.current = merged;
    savedVersion.current = version;
    setStatus("saved");
  }, [api, board]);

  const onChange = useCallback(
    (_els: readonly ExcalidrawElement[], _state: unknown, _files: BinaryFiles) => {
      if (!board) return;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(save, SAVE_DELAY_MS);
    },
    [board, save],
  );

  useEffect(() => {
    if (!api || !board) return;
    const channel = db
      .channel(`whiteboard-${board.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "whiteboards", filter: `id=eq.${board.id}` }, (payload) => {
        const row = payload.new as { elements: ExcalidrawElement[]; updated_by: string | null };
        if (row.updated_by === user?.id) return;
        remoteElements.current = row.elements;
        const local = api.getSceneElementsIncludingDeleted();
        const merged = mergeElements(local, row.elements);
        api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
        if (!hasNewerLocal(local, row.elements)) savedVersion.current = getSceneVersion(merged);
        loadFiles(board.id, uploadedFiles.current).then((files) => {
          files.forEach((f) => uploadedFiles.current.add(f.id));
          if (files.length) api.addFiles(files);
        });
      })
      .subscribe();
    return () => {
      window.clearTimeout(saveTimer.current);
      void save();
      void db.removeChannel(channel);
    };
  }, [api, board, save, user?.id]);

  const createBoard = async () => {
    const title = `บอร์ดใหม่ ${new Date().toLocaleDateString("th-TH")}`;
    const newSlug = `board-${Date.now().toString(36)}`;
    const { error } = await db.from("whiteboards").insert({ slug: newSlug, title });
    if (!error) navigate(`/whiteboard/${newSlug}`);
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col gap-2">
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
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
        {status === "missing" ? (
          <p className="p-6 text-sm text-muted-foreground">ไม่พบบอร์ดนี้ เลือกบอร์ดอื่นจากรายการด้านบน</p>
        ) : (
          <Excalidraw
            key={slug}
            excalidrawAPI={setApi}
            onChange={onChange}
            langCode="th-TH"
            initialData={{ appState: { currentItemFontFamily: 6 } }}
          />
        )}
      </div>
    </div>
  );
}
