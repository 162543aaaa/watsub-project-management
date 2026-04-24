import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  category: string;
  author_id: string | null;
  is_published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  // joined
  author_name?: string;
}

export function useWiki() {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("wiki_pages")
      .select("*")
      .eq("is_published", true)
      .order("category", { ascending: true })
      .order("title", { ascending: true });

    if (fetchError) {
      console.error("wiki_pages fetch error:", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const raw = (data ?? []) as WikiPage[];

    // Batch-fetch author display names
    const authorIds = [...new Set(raw.map(p => p.author_id).filter(Boolean))] as string[];
    let nameMap: Record<string, string> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", authorIds);
      for (const p of profiles ?? []) {
        nameMap[p.user_id] = p.display_name;
      }
    }

    setPages(raw.map(p => ({
      ...p,
      author_name: p.author_id ? (nameMap[p.author_id] ?? "Unknown") : undefined,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchPages(); }, []);

  const getPageBySlug = async (slug: string): Promise<WikiPage | null> => {
    const { data, error: slugError } = await supabase
      .from("wiki_pages")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (slugError || !data) return null;

    // Increment view count (fire-and-forget — non-critical)
    supabase
      .from("wiki_pages")
      .update({ view_count: (data.view_count ?? 0) + 1 })
      .eq("id", data.id)
      .then(({ error }) => {
        if (error) console.warn("view_count update failed:", error.message);
      });

    // Fetch author name
    let author_name: string | undefined;
    if ((data as WikiPage).author_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", (data as WikiPage).author_id!)
        .single();
      author_name = prof?.display_name;
    }

    return { ...(data as WikiPage), author_name };
  };

  const createPage = async (page: Omit<WikiPage, "id" | "created_at" | "updated_at" | "view_count" | "author_name">) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: createError } = await supabase
      .from("wiki_pages")
      .insert({ ...page, author_id: user?.id ?? null, view_count: 0 })
      .select()
      .single();
    if (createError) {
      toast({ title: "Error creating article", description: createError.message, variant: "destructive" });
      return null;
    }
    toast({ title: "สร้างบทความสำเร็จ!" });
    await fetchPages();
    return data as WikiPage;
  };

  const updatePage = async (id: string, updates: Partial<Omit<WikiPage, "id" | "created_at">>) => {
    const { data, error: updateError } = await supabase
      .from("wiki_pages")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (updateError) {
      toast({ title: "Error", description: updateError.message, variant: "destructive" });
      return false;
    }
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...(data as WikiPage) } : p));
    toast({ title: "อัปเดตบทความสำเร็จ!" });
    return true;
  };

  const deletePage = async (id: string) => {
    const { error: delError } = await supabase.from("wiki_pages").delete().eq("id", id);
    if (delError) {
      toast({ title: "Error", description: delError.message, variant: "destructive" });
      return;
    }
    setPages(prev => prev.filter(p => p.id !== id));
    toast({ title: "ลบบทความสำเร็จ!" });
  };

  return { pages, loading, error, fetchPages, getPageBySlug, createPage, updatePage, deletePage };
}
