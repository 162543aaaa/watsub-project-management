export const normalizeAllowedPages = (pages: string[] | null | undefined): string[] => {
  if (!Array.isArray(pages)) return [];
  return Array.from(
    new Set(
      pages
        .map((p) => p?.trim())
        .filter((p): p is string => Boolean(p))
        .map((p) => (p === "*" || p.startsWith("/") ? p : `/${p}`)),
    ),
  );
};

export const isPageAllowed = (path: string, pages: string[] | null | undefined): boolean => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const allowed = normalizeAllowedPages(pages);

  if (allowed.includes("*")) return true;
  if (allowed.length === 0) return false;

  return allowed.some((entry) => {
    if (normalizedPath === entry) return true;
    return normalizedPath.startsWith(`${entry}/`);
  });
};

