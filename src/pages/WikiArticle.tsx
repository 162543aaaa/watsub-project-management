import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Clock, Eye, User, Tag, Pencil, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useWiki, WikiPage } from "@/hooks/useWiki";
import { useAuthContext } from "@/contexts/AuthContext";
import { format } from "date-fns";

const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  HR:         { bg: "hsl(142 76% 36% / 0.15)", text: "hsl(142 76% 50%)" },
  IT:         { bg: "hsl(217 91% 60% / 0.15)", text: "hsl(217 91% 70%)" },
  Operations: { bg: "hsl(38 92% 50% / 0.15)",  text: "hsl(38 92% 60%)"  },
  Finance:    { bg: "hsl(280 65% 60% / 0.15)", text: "hsl(280 65% 70%)" },
  General:    { bg: "hsl(215 20% 45% / 0.15)", text: "hsl(215 20% 65%)" },
};

function getCatStyle(cat: string) {
  return CATEGORY_STYLE[cat] ?? CATEGORY_STYLE.General;
}

export default function WikiArticle() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getPageBySlug, deletePage } = useWiki();
  const { isAdmin } = useAuthContext();
  const [page, setPage] = useState<WikiPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    getPageBySlug(slug).then(p => {
      if (!p) setNotFound(true);
      else setPage(p);
      setLoading(false);
    });
  }, [slug]);

  const handleDelete = async () => {
    if (!page) return;
    if (!window.confirm(`ลบบทความ "${page.title}" ใช่ไหม?`)) return;
    await deletePage(page.id);
    navigate("/wiki");
  };

  if (loading) {
    return (
      <div className="min-h-full p-6 max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-32" />
        <div className="h-8 bg-muted rounded w-2/3 mt-6" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="space-y-2 mt-8">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-3 bg-muted rounded" style={{ width: `${65 + (i % 4) * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-full p-6 flex flex-col items-center justify-center text-center gap-4">
        <BookOpen className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <h2 className="text-lg font-semibold mb-1">Article Not Found</h2>
          <p className="text-sm text-muted-foreground">
            ไม่พบบทความ "{slug}" หรืออาจถูกซ่อนไว้
          </p>
        </div>
        <Link
          to="/wiki"
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> กลับไป Wiki
        </Link>
      </div>
    );
  }

  const cs = getCatStyle(page.category);

  return (
    <div className="min-h-full p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back + Admin actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/wiki"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Wiki
          </Link>
          {isAdmin && (
            <div className="flex gap-2">
              <Link
                to="/wiki"
                state={{ edit: page }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                onClick={() => {
                  // navigate to wiki and open edit modal — handled via state would need extra work
                  // simpler: just navigate back to wiki with edit query
                  navigate("/wiki", { state: { editId: page.id } });
                }}
              >
                <Pencil className="w-3 h-3" /> Edit
              </Link>
              <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Article header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-2.5 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1"
              style={{ background: cs.bg, color: cs.text }}
            >
              <Tag className="w-3 h-3" /> {page.category}
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-4 leading-tight">{page.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pb-5 border-b border-border">
            {page.author_name && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> {page.author_name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Updated {format(new Date(page.updated_at), "d MMM yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> {page.view_count} views
            </span>
          </div>
        </div>

        {/* Article body */}
        <article className="prose prose-invert prose-sm max-w-none
          prose-headings:font-bold prose-headings:text-foreground
          prose-p:text-foreground/80 prose-p:leading-relaxed
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
          prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl
          prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
          prose-hr:border-border
          prose-strong:text-foreground
          prose-li:text-foreground/80
          prose-table:text-sm
          prose-th:border prose-th:border-border prose-th:p-2 prose-th:text-left
          prose-td:border prose-td:border-border prose-td:p-2
          prose-img:rounded-xl prose-img:border prose-img:border-border
        ">
          {page.content ? (
            <ReactMarkdown>{page.content}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">บทความนี้ยังไม่มีเนื้อหา</p>
          )}
        </article>
      </div>
    </div>
  );
}
