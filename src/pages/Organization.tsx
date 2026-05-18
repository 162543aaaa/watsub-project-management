import { useState } from "react";
import {
  Building2,
  CircleAlert,
  ExternalLink,
  Gift,
  History,
  Link2,
  Mail,
  MapPin,
  Palette,
  Pencil,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { useAuthContext } from "@/contexts/AuthContext";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { OrgAdminEditor } from "@/components/OrgAdminEditor";
import { InteractiveOrgChart } from "@/components/InteractiveOrgChart";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
} from "@/components/ui/GlassCardComponents";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FALLBACK = {
  name:     "WatSUB! Studio (วาตซับ สตูดิโอ)",
  tagline:  "A Space for Creative Connectivity",
  vision:   '"Connect. Create. Inspire." เปลี่ยนจากคนเล่าเรื่องสู่ Infrastructure จุดนัดพบระหว่างคนเก่ง ไอเดียดี และโอกาสธุรกิจ',
  mission:  "ทำหน้าที่เป็น Connector เชื่อมผู้คนเข้ากับเมือง ไอเดีย และโอกาส เพื่อสร้างระบบนิเวศสร้างสรรค์ที่จับต้องได้จริงในปัตตานี",
  history:  "WatSUB! Studio ก่อตั้งเมื่อปี 2023 ด้วยความเชื่อที่ว่าปัตตานีมีศักยภาพสร้างงาน creative ระดับสากล เราไม่ได้แค่ผลิตคอนเทนต์ — เราสร้างพื้นที่ที่คนสร้างสรรค์เติบโตได้ จาก studio เล็กๆ สู่ creative production studio ที่ครบวงจร เราคือพื้นที่ที่เชื่อมโยงผู้คน ไอเดีย และโอกาส เข้าด้วยกันผ่านงานสร้างสรรค์ที่มีความหมายและทรงพลัง",
  milestones: [
    "2023: ก่อตั้ง WatSUB! Studio",
    "2024: ขยายทีม production และ network ผู้เชี่ยวชาญ",
    "2025: วางระบบ partnership และสร้าง ecosystem คนสร้างสรรค์",
  ],
  location_label: "จังหวัดปัตตานี",
  location_map_url: "https://maps.app.goo.gl/pLauvKsc9JCAYAFv9",
  resources: [
    { label: "Employee Handbook", url: "https://drive.google.com/drive/folders/16740VA6PHLUjm6y6KnO_Un495OXHASXT?usp=drive_link" },
    { label: "Brand Assets",      url: "https://drive.google.com/drive/folders/1yNe-qPAMA6eppoJAIXfdOLJYlDo_phb5?usp=drive_link" },
  ],
  benefits: [
    "ค่าประกันสุขภาพกลุ่ม", "วันหยุดพักผ่อน 10 วันต่อปี",
    "โบนัสตามผลงาน", "ค่าอบรมพัฒนาตนเอง", "อุปกรณ์การทำงาน",
  ],
  brand_colors: {
    primary: "#D2FA00", secondary: "#F4622A", accent: "#6B3FA0",
    info: "#3EADD4",   light: "#F5F0E8",      dark: "#0D0D0D",
  },
};

const COLOR_LABELS: Record<string, string> = {
  primary: "Primary", secondary: "Secondary", accent: "Accent",
  info: "Info", light: "Light", dark: "Dark",
};

const CORE_VALUES = [
  { title: "#VIBES: CITY & LIFESTYLE",    detail: "สะท้อนความเป็นไปของพื้นที่ ผ่านมุมมองที่ร่วมสมัยและมีชีวิตชีวา" },
  { title: "#SOUL: HUMAN & IDEA",         detail: "ถ่ายทอดเรื่องราวลึกซึ้งของงานสร้างสรรค์ที่เต็มไปด้วยความรู้สึกและไอเดีย" },
  { title: "#JOINT: WORK & OPPORTUNITY",  detail: "ผสานพรมแดนความคิดสร้างสรรค์เพื่อเปิดพื้นที่ให้โอกาสทางธุรกิจใหม่ ๆ" },
];

// ─── Hover-pencil helper for admin sections ────────────────────
function EditHint({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute top-3 right-3 z-10",
        "opacity-0 group-hover:opacity-100 transition-opacity",
        "p-1.5 rounded-lg bg-background/80 hover:bg-muted border border-border shadow-sm",
        className,
      )}
      title="แก้ไข"
    >
      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function Organization() {
  const { isAdmin } = useAuthContext();
  const {
    companyInfo, orgTree, orgMembers, stats, isLoading, error,
    updateCompanyInfo, addOrgMember, updateOrgMember, deleteOrgMember, refetch,
  } = useCompanyInfo();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab,  setEditorTab]  = useState("general");

  const openEditor = (tab: string) => { setEditorTab(tab); setEditorOpen(true); };

  // Resolve: DB first, fallback second
  const name          = companyInfo?.name           ?? FALLBACK.name;
  const tagline       = companyInfo?.tagline         ?? FALLBACK.tagline;
  const vision        = companyInfo?.vision          ?? FALLBACK.vision;
  const mission       = companyInfo?.mission         ?? FALLBACK.mission;
  const history       = companyInfo?.history         ?? FALLBACK.history;
  const milestones    = companyInfo?.milestones?.length  ? companyInfo.milestones  : FALLBACK.milestones;
  const locationLabel = companyInfo?.location_links?.label   ?? FALLBACK.location_label;
  const locationUrl   = companyInfo?.location_links?.map_url ?? FALLBACK.location_map_url;
  const resources     = companyInfo?.resources?.length ? companyInfo.resources : FALLBACK.resources;
  const benefits      = companyInfo?.benefits?.length  ? companyInfo.benefits  : FALLBACK.benefits;
  const brandColors   = companyInfo?.brand_colors ?? FALLBACK.brand_colors;

  // ── Loading ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-full">
        <div className="h-64 bg-muted animate-pulse" />
        <div className="p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">

      {/* ── Error banner ─────────────────────────────────────── */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>โหลดข้อมูลไม่สำเร็จ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HERO  —  dark bg, lime accent
          ══════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden"
        style={{ backgroundColor: brandColors.dark }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 60% 60% at 0% 100%, ${brandColors.primary}18 0%, transparent 70%),
              radial-gradient(ellipse 50% 50% at 100% 0%,  ${brandColors.info}14   0%, transparent 60%)
            `,
          }}
        />

        <div className="relative px-5 sm:px-8 py-10 sm:py-14">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <Building2
                  className="w-5 h-5"
                  style={{ color: `${brandColors.primary}99` }}
                />
                <span
                  className="text-xs font-semibold tracking-[0.18em] uppercase"
                  style={{ color: `${brandColors.primary}80` }}
                >
                  Organization Profile
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                {name}
              </h1>
              <p className="text-white/55 text-base">{tagline}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {locationLabel && (
                  <a
                    href={locationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                               bg-white/8 hover:bg-white/14 text-white/70 transition-colors border border-white/10"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {locationLabel}
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                )}
                {companyInfo?.contact_email && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs
                                   bg-white/8 text-white/70 border border-white/10">
                    <Mail className="w-3.5 h-3.5" />
                    {companyInfo.contact_email}
                  </span>
                )}
              </div>
            </div>

            {isAdmin && (
              <Button
                onClick={() => openEditor("general")}
                className="flex-shrink-0 font-semibold text-black"
                style={{ backgroundColor: brandColors.primary }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                แก้ไของค์กร
              </Button>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "พนักงานทั้งหมด",  value: stats.totalEmployees,  hex: brandColors.primary   },
              { label: "Active Members",   value: stats.activeCount,     hex: brandColors.info      },
              { label: "Leadership",       value: stats.leadershipCount, hex: brandColors.accent    },
              { label: "ประเภทพนักงาน",   value: stats.teamModels,      hex: brandColors.secondary },
            ].map(({ label, value, hex }) => (
              <div
                key={label}
                className="rounded-2xl p-4 backdrop-blur-sm border border-white/8"
                style={{ backgroundColor: `${hex}12` }}
              >
                <p className="text-2xl sm:text-3xl font-black" style={{ color: hex }}>
                  {value}
                </p>
                <p className="text-xs text-white/45 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brand color bar */}
      <div className="flex h-[5px]">
        {Object.values(brandColors).map((hex, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN BENTO CONTENT
          ══════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-6 space-y-4">

        {/* ── Vision + Mission ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <GlassCard
            className="lg:col-span-7 relative group border-l-4"
            style={{ borderLeftColor: brandColors.primary }}
          >
            {isAdmin && <EditHint onClick={() => openEditor("general")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base">
                <Target className="w-4 h-4" style={{ color: brandColors.primary }} />
                Vision 2026
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{vision}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard
            className="lg:col-span-5 relative group border-l-4"
            style={{ borderLeftColor: brandColors.info }}
          >
            {isAdmin && <EditHint onClick={() => openEditor("general")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4" style={{ color: brandColors.info }} />
                Mission
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{mission}</p>
            </GlassCardContent>

          </GlassCard>
        </div>

        {/* ── History + Milestones ──────────────────────────── */}
        <GlassCard
          className="relative group"
          style={{
            background: `linear-gradient(135deg, ${brandColors.light} 0%, white 100%)`,
          }}
        >
          {isAdmin && <EditHint onClick={() => openEditor("general")} />}
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-primary" />
              ประวัติองค์กร
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground/80">{history}</p>
            {/* Milestone timeline */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 border-t border-border/50">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: brandColors.primary }}
                  />
                  <span>{m}</span>
                  {i < milestones.length - 1 && (
                    <span className="text-muted-foreground ml-1">→</span>
                  )}
                </div>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* ── Core Values + Brand Colors ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <GlassCard className="lg:col-span-5">
            <GlassCardHeader>
              <GlassCardTitle className="text-base">Core Values — 3 Pillars</GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3">
              {CORE_VALUES.map((v, i) => {
                const accent = [brandColors.primary, brandColors.info, brandColors.secondary][i];
                return (
                  <div
                    key={v.title}
                    className="rounded-xl border p-3"
                    style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
                  >
                    <p className="text-sm font-semibold">{v.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{v.detail}</p>
                  </div>
                );
              })}
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="lg:col-span-7 relative group">
            {isAdmin && <EditHint onClick={() => openEditor("branding")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base">
                <Palette className="w-4 h-4 text-primary" />
                Brand Colors
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(brandColors).map(([key, hex]) => (
                  <div key={key} className="space-y-1.5">
                    <div
                      className="h-14 rounded-xl shadow-sm ring-1 ring-black/5"
                      style={{ backgroundColor: hex }}
                    />
                    <p className="text-xs font-medium">{COLOR_LABELS[key] ?? key}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{hex}</p>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* ── Benefits + Resources ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <GlassCard className="lg:col-span-8 relative group">
            {isAdmin && <EditHint onClick={() => openEditor("content")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base">
                <Gift className="w-4 h-4 text-primary" />
                สวัสดิการพนักงาน
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="flex flex-wrap gap-2">
                {benefits.map((b) => (
                  <Badge
                    key={b}
                    variant="outline"
                    className="px-3 py-1.5 text-xs font-medium"
                    style={{
                      borderColor: `${brandColors.primary}70`,
                      backgroundColor: `${brandColors.primary}10`,
                      color: brandColors.dark,
                    }}
                  >
                    {b}
                  </Badge>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="lg:col-span-4 relative group">
            {isAdmin && <EditHint onClick={() => openEditor("content")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base">
                <Link2 className="w-4 h-4 text-primary" />
                Resources & Location
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-2.5 text-sm">
              {locationLabel && (
                <a
                  href={locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
                  <span className="hover:underline">{locationLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto flex-shrink-0 opacity-50" />
                </a>
              )}
              {resources.map((r) => (
                <a
                  key={r.url}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  <span className="hover:underline">{r.label}</span>
                </a>
              ))}
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* ── Interactive Org Chart ─────────────────────────── */}
        <GlassCard>
          <GlassCardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <GlassCardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Interactive Org Chart
                </GlassCardTitle>
                <GlassCardDescription className="mt-1">
                  คลิกที่ node เพื่อย่อ / ขยายสาขาของทีม
                </GlassCardDescription>
              </div>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditor("orgchart")}
                  className="flex-shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  จัดการสมาชิก
                </Button>
              )}
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <InteractiveOrgChart tree={orgTree} brandColors={brandColors} />
          </GlassCardContent>
        </GlassCard>

      </div>

      {/* ── Editor sheet (admin only) ──────────────────────── */}
      {isAdmin && (
        <OrgAdminEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          defaultTab={editorTab}
          companyInfo={companyInfo}
          orgMembers={orgMembers}
          onUpdateCompanyInfo={updateCompanyInfo}
          onAddOrgMember={addOrgMember}
          onUpdateOrgMember={updateOrgMember}
          onDeleteOrgMember={deleteOrgMember}
          onRefetch={refetch}
        />
      )}
    </div>
  );
}
