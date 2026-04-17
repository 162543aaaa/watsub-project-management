import { useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  BookOpen, Search, Clock, Eye, Tag, ChevronRight,
  Plus, X, Save, RefreshCw, AlertTriangle, Pencil, Trash2
} from "lucide-react";
import { useWiki, WikiPage } from "@/hooks/useWiki";
import { useAuthContext } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

// ─── Category helpers ────────────────────────────────────────────────────────

const CATEGORIES = ["General", "HR", "IT", "Operations", "Finance"];

const CATEGORY_BG: Record<string, string> = {
  HR:         "hsl(142 76% 36% / 0.15)",
  IT:         "hsl(217 91% 60% / 0.15)",
  Operations: "hsl(38 92% 50% / 0.15)",
  Finance:    "hsl(280 65% 60% / 0.15)",
  General:    "hsl(215 20% 45% / 0.15)",
};
const CATEGORY_TEXT: Record<string, string> = {
  HR:         "hsl(142 76% 50%)",
  IT:         "hsl(217 91% 70%)",
  Operations: "hsl(38 92% 60%)",
  Finance:    "hsl(280 65% 70%)",
  General:    "hsl(215 20% 65%)",
};

function catStyle(cat: string) {
  return {
    background: CATEGORY_BG[cat] ?? CATEGORY_BG.General,
    color:      CATEGORY_TEXT[cat] ?? CATEGORY_TEXT.General,
  };
}

function toSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── Article Card ────────────────────────────────────────────────────────────

function ArticleCard({
  page,
  onEdit,
  onDelete,
  canManage,
}: {
  page: WikiPage;
  onEdit: (p: WikiPage) => void;
  onDelete: (p: WikiPage) => void;
  canManage: boolean;
}) {
  const snippet = page.content
    ? page.content.replace(/[#*`_[\]()>]/g, "").slice(0, 120) + "…"
    : "No content yet.";

  return (
    <div
      className="group rounded-xl border border-border bg-card hover:border-primary/40 transition-all duration-200 hover:shadow-md relative"
      style={{ boxShadow: "0 1px 3px hsl(0 0% 0% / 0.08)" }}
    >
      {canManage && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={e => { e.preventDefault(); onEdit(page); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            title="Edit"
          >
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={e => { e.preventDefault(); onDelete(page); }}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      )}
      <Link to={`/wiki/${page.slug}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-2 pr-14">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
            {page.title}
          </h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors mt-0.5" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {snippet}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={catStyle(page.category)}>
            {page.category}
          </span>
          {page.author_name && (
            <span className="text-[11px] text-muted-foreground">by {page.author_name}</span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
            <Eye className="w-3 h-3" /> {page.view_count}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
          </span>
        </div>
      </Link>
    </div>
  );
}

// ─── Create / Edit Modal ─────────────────────────────────────────────────────

interface ArticleForm {
  title: string;
  slug: string;
  content: string;
  category: string;
  is_published: boolean;
}

function ArticleModal({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: WikiPage | null;
  onSave: (form: ArticleForm) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ArticleForm>({
    title:        initial?.title        ?? "",
    slug:         initial?.slug         ?? "",
    content:      initial?.content      ?? "",
    category:     initial?.category     ?? "General",
    is_published: initial?.is_published ?? true,
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));

  const handleTitle = (v: string) => {
    setForm(f => ({
      ...f,
      title: v,
      slug: slugTouched ? f.slug : toSlug(v),
    }));
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "hsl(222 47% 9% / 0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-2xl bg-card rounded-2xl border border-border flex flex-col"
        style={{ maxHeight: "90vh", boxShadow: "var(--shadow-lg)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border shrink-0">
          <h3 className="text-base font-bold">{initial ? "Edit Article" : "New Article"}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Title *</label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
              value={form.title}
              onChange={e => handleTitle(e.target.value)}
              placeholder="Article title..."
              autoFocus
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Slug (URL) *
            </label>
            <input
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary/30 outline-none"
              value={form.slug}
              onChange={e => { setSlugTouched(true); setForm(f => ({ ...f, slug: e.target.value })); }}
              placeholder="url-friendly-slug"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              ใช้สำหรับ URL: /wiki/<span className="text-primary">{form.slug || "slug"}</span>
            </p>
          </div>

          {/* Category & Published */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Category</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Status</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                value={form.is_published ? "published" : "draft"}
                onChange={e => setForm(f => ({ ...f, is_published: e.target.value === "published" }))}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Content (Markdown)
            </label>
            <textarea
              rows={12}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary/30 outline-none resize-y"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder={"# Heading\n\nWrite your article content here using **Markdown**...\n\n- Bullet point\n- Another point\n\n```code block```"}
            />
            <p className="text-[11px] text-muted-foreground mt-1">รองรับ Markdown: **bold**, *italic*, # หัวข้อ, - รายการ, ```code```</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-4 border-t border-border shrink-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.title.trim() || !form.slug.trim()}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : initial ? "Save Changes" : "Create Article"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const SQL_SETUP = `-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.wiki_pages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text,
  category text DEFAULT 'General',
  author_id uuid REFERENCES public.profiles(user_id),
  is_published boolean DEFAULT true,
  view_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-update timestamp
CREATE OR REPLACE TRIGGER handle_wiki_updated_at
  BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Allow authenticated users to read published pages
ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published wiki pages"
  ON public.wiki_pages FOR SELECT USING (is_published = true);
CREATE POLICY "Authenticated users can insert wiki pages"
  ON public.wiki_pages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authors and admins can update wiki pages"
  ON public.wiki_pages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authors and admins can delete wiki pages"
  ON public.wiki_pages FOR DELETE TO authenticated USING (true);`;

export default function Wiki() {
  const { pages, loading, error, fetchPages, createPage, updatePage, deletePage } = useWiki();
  const { isAdmin } = useAuthContext();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<WikiPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WikiPage | null>(null);

  const categories = [...new Set(pages.map(p => p.category))].sort();

  const filtered = pages.filter(p => {
    const matchSearch = !search
      || p.title.toLowerCase().includes(search.toLowerCase())
      || (p.content ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const grouped = filtered.reduce<Record<string, WikiPage[]>>((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {});

  const handleSave = async (form: ArticleForm) => {
    setSaving(true);
    if (editTarget) {
      await updatePage(editTarget.id, form);
    } else {
      await createPage({ ...form, author_id: null });
    }
    setSaving(false);
    setShowModal(false);
    setEditTarget(null);
  };

  const handleEdit = (page: WikiPage) => {
    setEditTarget(page);
    setShowModal(true);
  };

  const handleDelete = async (page: WikiPage) => {
    if (!window.confirm(`ลบบทความ "${page.title}" ใช่ไหม?`)) return;
    await deletePage(page.id);
  };

  const openCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  // ── Table missing error state ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-full p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "hsl(0 84% 60% / 0.15)" }}>
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Company Wiki</h1>
            <p className="text-sm text-destructive">ไม่สามารถโหลดข้อมูลได้</p>
          </div>
        </div>

        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
          <p className="text-sm font-semibold text-destructive">Error: {error}</p>
          <p className="text-sm text-muted-foreground">
            ตาราง <code className="bg-muted px-1.5 py-0.5 rounded text-xs">wiki_pages</code> อาจยังไม่ได้สร้างในฐานข้อมูล
            กรุณารัน SQL ด้านล่างใน <strong>Supabase → SQL Editor</strong> ก่อน
          </p>
          <button
            onClick={() => setShowSQL(!showSQL)}
            className="text-xs font-medium text-primary underline"
          >
            {showSQL ? "ซ่อน SQL" : "แสดง SQL สำหรับสร้างตาราง"}
          </button>
          {showSQL && (
            <pre className="text-[11px] bg-muted rounded-xl p-4 overflow-x-auto text-muted-foreground leading-relaxed border border-border">
              {SQL_SETUP}
            </pre>
          )}
          <button
            onClick={fetchPages}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm hover:bg-muted transition-colors mt-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  // ── Normal state ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(191 91% 37% / 0.15)" }}>
            <BookOpen className="w-5 h-5" style={{ color: "hsl(191 91% 55%)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Company Wiki</h1>
            <p className="text-sm text-muted-foreground">Knowledge base &amp; internal documentation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            <span className="font-medium text-foreground">{pages.length}</span> articles
          </span>
          <button
            onClick={fetchPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium btn-primary"
          >
            <Plus className="w-4 h-4" /> New Article
          </button>
        </div>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all"
            placeholder="Search articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCategory(null)}
            className="px-3 py-2 rounded-xl border text-xs font-medium transition-all"
            style={!selectedCategory
              ? { background: "hsl(191 91% 37% / 0.15)", color: "hsl(191 91% 55%)", borderColor: "hsl(191 91% 37% / 0.4)" }
              : { borderColor: "hsl(222 47% 20%)", color: "hsl(215 20% 55%)" }}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className="px-3 py-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5"
              style={selectedCategory === cat
                ? { ...catStyle(cat), borderColor: "transparent" }
                : { borderColor: "hsl(222 47% 20%)", color: "hsl(215 20% 55%)" }}
            >
              <Tag className="w-3 h-3" /> {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/20" />
          <div>
            <p className="text-muted-foreground text-sm font-medium">
              {search || selectedCategory ? "ไม่พบบทความที่ตรงกับเงื่อนไข" : "ยังไม่มีบทความ"}
            </p>
            {!search && !selectedCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                กด <strong>New Article</strong> เพื่อเพิ่มบทความแรก
              </p>
            )}
          </div>
          {!search && !selectedCategory && (
            <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium">
              <Plus className="w-4 h-4" /> สร้างบทความแรก
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, articles]) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={catStyle(category)}>
                  {category}
                </span>
                <span className="text-xs text-muted-foreground">
                  {articles.length} article{articles.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {articles.map(page => (
                  <ArticleCard
                    key={page.id}
                    page={page}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    canManage={isAdmin}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <ArticleModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
