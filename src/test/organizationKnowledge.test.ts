import { describe, expect, it } from "vitest";
import {
  markdownExcerpt,
  organizationSectionPage,
  organizationWikiPages,
} from "@/lib/organizationKnowledge";
import type { WikiPage } from "@/hooks/useWiki";

const pages: WikiPage[] = [
  {
    id: "1",
    title: "Vision",
    slug: "organization-vision",
    content: "# Vision\n\n**Connect** people and ideas.",
    category: "Organization",
    author_id: null,
    is_published: true,
    view_count: 0,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-11T00:00:00Z",
  },
  {
    id: "2",
    title: "Other",
    slug: "other",
    content: "General article",
    category: "General",
    author_id: null,
    is_published: true,
    view_count: 0,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-12T00:00:00Z",
  },
];
describe("organization knowledge helpers", () => {
  it("selects only Organization wiki pages", () => {
    expect(organizationWikiPages(pages).map((page) => page.id)).toEqual(["1"]);
  });

  it("resolves standard section slugs", () => {
    expect(organizationSectionPage(pages, "vision")?.id).toBe("1");
    expect(organizationSectionPage(pages, "mission")).toBeUndefined();
  });

  it("creates readable excerpts from markdown", () => {
    expect(markdownExcerpt(pages[0].content)).toBe("Vision Connect people and ideas.");
  });
});
