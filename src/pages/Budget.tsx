import { ExternalLink, Wallet, TrendingUp, ArrowUpRight } from "lucide-react";

const BUDGET_URL = "https://watsub-cashflow2026.lovable.app/";

export default function Budget() {
  return (
    <div className="p-6 page-enter">
      <div className="mb-6 animate-stagger-1">
        <h1 className="text-2xl font-bold">Budget</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Cash flow and financial management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-stagger-2">
        {[
          { label: "Total Budget 2026", value: "฿ —", icon: Wallet, color: "bg-gradient-primary" },
          { label: "Total Spent", value: "฿ —", icon: TrendingUp, color: "bg-gradient-warning" },
          { label: "Remaining", value: "฿ —", icon: ArrowUpRight, color: "bg-gradient-success" },
        ].map(card => (
          <div key={card.label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color} mb-4`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-xl font-bold text-foreground">{card.value}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden animate-stagger-3" style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="p-6 border-b border-border bg-muted/20">
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
        <div className="relative" style={{ height: "calc(100vh - 320px)", minHeight: 400 }}>
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
