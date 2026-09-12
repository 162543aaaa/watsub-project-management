import type { WikiPage } from "@/hooks/useWiki";

export const ORGANIZATION_CATEGORY = "Organization";

export const ORGANIZATION_SECTION_SLUGS = {
  vision: "organization-vision",
  mission: "organization-mission",
  history: "organization-history",
  culture: "organization-culture",
  benefits: "organization-benefits",
  resources: "organization-resources",
} as const;

export type OrganizationSectionKey = keyof typeof ORGANIZATION_SECTION_SLUGS;

export function organizationWikiPages(pages: WikiPage[]): WikiPage[] {
  return pages
    .filter((page) => page.category === ORGANIZATION_CATEGORY)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function organizationSectionPage(
  pages: WikiPage[],
  section: OrganizationSectionKey,
): WikiPage | undefined {
  const slug = ORGANIZATION_SECTION_SLUGS[section];
  return pages.find((page) => page.slug === slug && page.category === ORGANIZATION_CATEGORY);
}
export function markdownExcerpt(content: string | null | undefined, maxLength = 220): string {
  if (!content) return "";
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}â€¦`;
}

