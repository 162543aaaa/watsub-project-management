import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Search, Clock, Eye, Tag, ChevronRight } from "lucide-react";
import { useWiki, WikiPage } from "@/hooks/useWiki";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  HR: "hsl(142 76% 36% / 0.15)",
  IT: "hsl(217 91% 60% / 0.15)",
  Operations: "hsl(38 92% 50% / 0.15)",
  Finance: "hsl(280 65% 60% / 0.15)",
  General: "hsl(215 20% 45% / 0.15)",
};

const CATEGORY_TEXT: Record<string, string> = {
  HR: "hsl(142 76% 50%)",
  IT: "hsl(217 91% 70%)",
  Operations: "hsl(38 92% 60%)",
  Finance: "hsl(280 65% 70%)",
  General: "hsl(215 20% 65%)",
};

function getCategoryStyle(category: string) {
  return {
    background: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.General,
    color: CATEGORY_TEXT[category] ?? CATEGORY_TEXT.General,
  };
}

function ArticleCard({ page }: { page: WikiPage }) {
  const snippet = page.content
    ? page.content.replace(/[#*`_\[\]()>]/g, "").slice(0, 120) + "…"
    : "No content yet.";

  return (
    <Link
      to={`/wiki/${page.slug}`}
      className="block group rounded-xl border border-border bg-card hover:border-primary/40 transition-all duration-200 hover:shadow-md"
      style={{ boxShadow: "0 1px 3px hsl(0 0% 0% / 0.08)" }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug flex-1">
            {page.title}
          </h3>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors mt-0.5" />
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {snippet}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-md text-[11px] font-medium"
            style={getCategoryStyle(page.category)}
          >
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
      </div>
    </Link>
  );
}

export default function Wiki() {
  const { pages, loading } = useWiki();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(pages.map(p => p.category))].sort();

  const filtered = pages.filter(p => {
    const matchesSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.content ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, WikiPage[]>>((acc, page) => {
    if (!acc[page.category]) acc[page.category] = [];
    acc[page.category].push(page);
    return acc;
  }, {});

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsl(191 91% 37% / 0.15)" }}
          >
            <BookOpen className="w-5 h-5" style={{ color: "hsl(191 91% 55%)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Company Wiki</h1>
            <p className="text-sm text-muted-foreground">Knowledge base &amp; internal documentation</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{pages.length}</span> articles
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
                ? { ...getCategoryStyle(cat), borderColor: "transparent" }
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
        <div className="text-center py-20">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">
            {search || selectedCategory ? "No articles match your filters." : "No articles published yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, articles]) => (
            <section key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={getCategoryStyle(category)}
                >
                  {category}
                </span>
                <span className="text-xs text-muted-foreground">{articles.length} article{articles.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {articles.map(page => (
                  <ArticleCard key={page.id} page={page} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
