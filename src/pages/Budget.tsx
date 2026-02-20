import { ExternalLink } from "lucide-react";

const BUDGET_URL = "https://watsub-cashflow2026.lovable.app/";

export default function Budget() {
  return (
    <div className="p-6 page-enter">
      <div className="mb-6 animate-stagger-1">
        <h1 className="text-2xl font-bold">Budget</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Cash flow and financial management</p>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden animate-stagger-2" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="p-5 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-foreground">Cash Flow 2026</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Powered by WATSUB Cashflow</p>
            </div>
            <a href={BUDGET_URL} target="_blank" rel="noopener noreferrer"
              className="btn-primary flex items-center gap-2">
              <ExternalLink className="w-4 h-4" /> Open Full View
            </a>
          </div>
        </div>
        <div className="relative" style={{ height: "calc(100vh - 220px)", minHeight: 400 }}>
          <iframe
            src={BUDGET_URL}
            title="Budget - WATSUB Cashflow"
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
