export default function RouteLoadingFallback() {
  return (
    <div className="px-4 py-5 sm:px-6" role="status" aria-live="polite" aria-label="กำลังโหลดหน้า">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-muted/70 motion-reduce:animate-none" />
          <div className="h-28 animate-pulse rounded-2xl bg-muted/70 motion-reduce:animate-none" />
          <div className="h-28 animate-pulse rounded-2xl bg-muted/70 motion-reduce:animate-none" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-muted/50 motion-reduce:animate-none" />
        <span className="sr-only">กำลังโหลดเนื้อหาหน้า</span>
      </div>
    </div>
  );
}
