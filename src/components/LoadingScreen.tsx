function Loader({ global = false }: { global?: boolean }) {
  return (
    <div
      className={`${global ? "bg-background" : "bg-background/90 backdrop-blur-sm"} fixed inset-0 z-50 flex items-center justify-center`}
      role="status"
      aria-live="polite"
      aria-label="กำลังโหลด"
    >
      <div className="flex flex-col items-center gap-3">
        <img src="/logo_watsub-192.webp" alt="" className="h-16 w-16 object-contain" />
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-secondary motion-reduce:animate-none" />
        </div>
        <span className="sr-only">กำลังโหลด WatSUB Studio OS</span>
      </div>
    </div>
  );
}

export default function LoadingScreen() {
  return <Loader />;
}

export function GlobalLoadingScreen() {
  return <Loader global />;
}
