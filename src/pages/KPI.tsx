import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Award, ChevronDown, Check, Clock, AlertCircle } from "lucide-react";
import EmployeeAvatar from "@/components/EmployeeAvatar";

type KPIStatus = "รอกรอก" | "รอ review" | "อนุมัติแล้ว";
type KPIItem = { label: string; target: number; actual: number; evidence: string };
type EmployeeKPI = {
  id: string;
  name: string;
  role: string;
  score: number;
  level: string;
  levelColor: string;
  borderColor: string;
  items: KPIItem[];
  status: KPIStatus;
};

const initialKPIData: EmployeeKPI[] = [
  {
    id: "ta",
    name: "ต้า",
    role: "Lead Executive · 60% Partner",
    score: 4.6,
    level: "ดีเยี่ยม",
    levelColor: "amber",
    borderColor: "hsl(38 92% 50%)",
    items: [
      { label: "Revenue Growth", target: 5.0, actual: 5.0, evidence: "" },
      { label: "Client Satisfaction", target: 5.0, actual: 4.8, evidence: "" },
      { label: "Community Events", target: 4.0, actual: 4.0, evidence: "" },
      { label: "Team Development", target: 4.5, actual: 4.5, evidence: "" },
    ],
    status: "อนุมัติแล้ว",
  },
  {
    id: "hafeez",
    name: "ฮาฟีซ ดอเลาะ",
    role: "Editor",
    score: 4.4,
    level: "ดีมาก",
    levelColor: "green",
    borderColor: "hsl(162 72% 40%)",
    items: [
      { label: "Subtitle Quality", target: 5.0, actual: 4.8, evidence: "" },
      { label: "On-time Delivery", target: 4.5, actual: 4.5, evidence: "" },
      { label: "AI Tools Usage", target: 4.0, actual: 4.0, evidence: "" },
      { label: "Output Volume", target: 4.5, actual: 4.2, evidence: "" },
    ],
    status: "อนุมัติแล้ว",
  },
  {
    id: "sumayna",
    name: "สุไมยนา หวังเบ็ญหมัด",
    role: "Content Writer",
    score: 4.1,
    level: "ดี",
    levelColor: "blue",
    borderColor: "hsl(221 83% 53%)",
    items: [
      { label: "Script Quality", target: 4.5, actual: 4.5, evidence: "" },
      { label: "Post Frequency", target: 4.0, actual: 3.8, evidence: "" },
      { label: "Engagement Rate", target: 4.0, actual: 4.2, evidence: "" },
      { label: "Community Output", target: 4.0, actual: 3.9, evidence: "" },
    ],
    status: "อนุมัติแล้ว",
  },
];

const levelBadgeStyle = (levelColor: string): { bg: string; color: string } => {
  if (levelColor === "amber") return { bg: "hsl(38 92% 50% / 0.15)", color: "hsl(38 92% 45%)" };
  if (levelColor === "green") return { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 40%)" };
  return { bg: "hsl(221 83% 53% / 0.12)", color: "hsl(221 83% 53%)" };
};

const statusBadgeStyle = (status: KPIStatus): { bg: string; color: string } => {
  if (status === "รอกรอก") return { bg: "hsl(0 0% 60% / 0.12)", color: "hsl(0 0% 50%)" };
  if (status === "รอ review") return { bg: "hsl(38 92% 50% / 0.12)", color: "hsl(38 92% 50%)" };
  return { bg: "hsl(142 71% 45% / 0.12)", color: "hsl(142 71% 45%)" };
};

interface KPICardProps {
  emp: EmployeeKPI;
  empIndex: number;
  isAdmin: boolean;
  onUpdateItem: (empId: string, itemIdx: number, field: keyof KPIItem, value: string | number) => void;
  onSubmit: (empId: string) => void;
  onApprove: (empId: string) => void;
  onReject: (empId: string) => void;
}

function KPICard({ emp, empIndex, isAdmin, onUpdateItem, onSubmit, onApprove, onReject }: KPICardProps) {
  const scoreColor =
    emp.score >= 4.5
      ? "hsl(38 92% 50%)"
      : emp.score >= 4.0
      ? "hsl(142 71% 40%)"
      : "hsl(221 83% 53%)";

  const lvlStyle = levelBadgeStyle(emp.levelColor);
  const stStyle = statusBadgeStyle(emp.status);

  const canEdit = (isAdmin || emp.id !== "ta") && emp.status !== "อนุมัติแล้ว";

  return (
    <div
      className="bg-card rounded-2xl border border-border/50 flex flex-col overflow-hidden"
      style={{ borderTop: `3px solid ${emp.borderColor}` }}
    >
      {/* Header */}
      <div className="p-5 pb-3 flex items-start gap-3">
        <EmployeeAvatar name={emp.name} size="md" index={empIndex} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{emp.name}</p>
          <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-2xl font-bold leading-none" style={{ color: scoreColor }}>
            {emp.score.toFixed(1)}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: lvlStyle.bg, color: lvlStyle.color }}
          >
            {emp.level}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <div className="px-5 pb-3">
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: stStyle.bg, color: stStyle.color }}
        >
          {emp.status === "รอกรอก" && <AlertCircle size={11} />}
          {emp.status === "รอ review" && <Clock size={11} />}
          {emp.status === "อนุมัติแล้ว" && <Check size={11} />}
          {emp.status}
        </span>
      </div>

      {/* KPI items */}
      <div className="px-5 flex flex-col gap-3 flex-1">
        {emp.items.map((item, idx) => {
          const barColor =
            item.actual >= 4.0
              ? "hsl(142 71% 40%)"
              : item.actual >= 3.5
              ? "hsl(186 80% 45%)"
              : "hsl(38 92% 50%)";
          const barPct = Math.min((item.actual / 5.0) * 100, 100);

          return (
            <div key={idx} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{item.label}</span>
                <span className="text-muted-foreground">เป้า {item.target.toFixed(1)}</span>
              </div>
              {canEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={item.actual}
                    onChange={(e) =>
                      onUpdateItem(emp.id, idx, "actual", parseFloat(e.target.value) || 0)
                    }
                    className="w-16 text-xs border border-border/60 rounded px-1.5 py-0.5 bg-background text-foreground"
                  />
                  <input
                    type="text"
                    placeholder="evidence…"
                    value={item.evidence}
                    onChange={(e) => onUpdateItem(emp.id, idx, "evidence", e.target.value)}
                    className="flex-1 text-xs border border-border/60 rounded px-1.5 py-0.5 bg-background text-foreground"
                  />
                </div>
              ) : (
                <span className="text-sm font-semibold" style={{ color: barColor }}>
                  {item.actual.toFixed(1)}
                  {item.evidence && (
                    <span className="text-muted-foreground font-normal text-xs ml-2">{item.evidence}</span>
                  )}
                </span>
              )}
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%`, background: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 mt-3">
        {!isAdmin && emp.id !== "ta" && emp.status === "รอกรอก" && (
          <button
            onClick={() => onSubmit(emp.id)}
            className="w-full text-xs font-medium py-1.5 rounded-lg bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 transition-colors"
          >
            ส่งให้ต้า review →
          </button>
        )}
        {isAdmin && emp.status === "รอ review" && (
          <div className="flex gap-2">
            <button
              onClick={() => onReject(emp.id)}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              ส่งกลับแก้
            </button>
            <button
              onClick={() => onApprove(emp.id)}
              className="flex-1 text-xs font-medium py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
            >
              อนุมัติ ✓
            </button>
          </div>
        )}
        {emp.status === "อนุมัติแล้ว" && (
          <p className="flex items-center gap-1 text-xs text-green-600 font-medium justify-center">
            <Check size={13} />
            อนุมัติแล้ว
          </p>
        )}
      </div>
    </div>
  );
}

export default function KPI() {
  const [quarter, setQuarter] = useState("Q1/2569 (ม.ค. – มี.ค.)");
  const [showQuarterDropdown, setShowQuarterDropdown] = useState(false);
  const [kpiData, setKpiData] = useState<EmployeeKPI[]>(initialKPIData);
  const { isAdmin } = useAuthContext();

  const avg = (kpiData.reduce((s, e) => s + e.score, 0) / kpiData.length).toFixed(1);
  const submitted = kpiData.filter((e) => e.status !== "รอกรอก").length;
  const topPerformer = [...kpiData].sort((a, b) => b.score - a.score)[0];

  const updateItem = (
    empId: string,
    itemIdx: number,
    field: keyof KPIItem,
    value: string | number
  ) => {
    setKpiData((prev) =>
      prev.map((emp) =>
        emp.id !== empId
          ? emp
          : {
              ...emp,
              items: emp.items.map((item, i) =>
                i !== itemIdx ? item : { ...item, [field]: value }
              ),
            }
      )
    );
  };

  const submitForReview = (empId: string) => {
    setKpiData((prev) =>
      prev.map((emp) => (emp.id !== empId ? emp : { ...emp, status: "รอ review" }))
    );
  };

  const approveKPI = (empId: string) => {
    setKpiData((prev) =>
      prev.map((emp) => (emp.id !== empId ? emp : { ...emp, status: "อนุมัติแล้ว" }))
    );
  };

  const rejectKPI = (empId: string) => {
    setKpiData((prev) =>
      prev.map((emp) => (emp.id !== empId ? emp : { ...emp, status: "รอกรอก" }))
    );
  };

  const quarters = ["Q1/2569 (ม.ค. – มี.ค.)", "Q2/2569 (เม.ย. – มิ.ย.)"];

  return (
    <div className="p-4 sm:p-6 page-enter">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 animate-stagger-1">
        <div className="flex items-center gap-2">
          <Award size={20} className="text-amber-500" />
          <h1 className="text-lg font-bold">KPI รายไตรมาส</h1>
        </div>

        {/* Quarter selector */}
        <div className="relative">
          <button
            onClick={() => setShowQuarterDropdown((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors"
          >
            {quarter}
            <ChevronDown size={14} className={`transition-transform ${showQuarterDropdown ? "rotate-180" : ""}`} />
          </button>
          {showQuarterDropdown && (
            <div className="absolute right-0 mt-1 w-56 rounded-xl border border-border/60 bg-card shadow-lg z-20 overflow-hidden">
              {quarters.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuarter(q);
                    setShowQuarterDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/30 transition-colors"
                >
                  {q}
                  {q === quarter && <Check size={13} className="text-teal-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 animate-stagger-2">
        {/* Team Average */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 flex-shrink-0">
            <Award size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Team Average</p>
            <p className="text-xl font-bold text-green-600">{avg}<span className="text-sm font-normal text-muted-foreground">/5.0</span></p>
          </div>
        </div>

        {/* All Submitted */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-500/10 flex-shrink-0">
            <Check size={18} className="text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">All Submitted</p>
            <p className="text-xl font-bold text-teal-600">
              {submitted}<span className="text-sm font-normal text-muted-foreground">/{kpiData.length}</span>
            </p>
          </div>
        </div>

        {/* Top Performer */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 flex-shrink-0">
            <Award size={18} className="text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Top Performer</p>
            <p className="text-sm font-bold text-amber-500 truncate">{topPerformer.name}</p>
            <p className="text-xs text-muted-foreground">{topPerformer.score.toFixed(1)} / 5.0</p>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-stagger-3">
        {kpiData.map((emp, idx) => (
          <KPICard
            key={emp.id}
            emp={emp}
            empIndex={idx}
            isAdmin={isAdmin}
            onUpdateItem={updateItem}
            onSubmit={submitForReview}
            onApprove={approveKPI}
            onReject={rejectKPI}
          />
        ))}
      </div>

      {/* Grading legend */}
      <p className="mt-6 text-xs text-muted-foreground text-center animate-stagger-4">
        เกณฑ์ผ่าน: Staff ≥ 3.5 · Lead ≥ 4.0
      </p>
    </div>
  );
}
