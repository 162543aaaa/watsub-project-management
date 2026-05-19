import { ArrowTopRightOnSquareIcon, BuildingOffice2Icon, ClockIcon, EnvelopeIcon, ExclamationCircleIcon, FlagIcon, GiftIcon, LinkIcon, MapPinIcon, PaintBrushIcon, PencilIcon, SparklesIcon, UsersIcon } from '@heroicons/react/24/solid';
import { useState } from "react";
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
      <PencilIcon className="w-3.5 h-3.5 text-muted-foreground" />
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
    <div className="min-h-full bg-[#0c0d12] text-white font-sans relative overflow-hidden pb-12">
      {/* Ambient Neon Glows */}
      <div className="absolute top-[5%] left-[5%] w-[40vw] h-[40vw] bg-[#D2FA00]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[5%] w-[35vw] h-[35vw] bg-[#F4622A]/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[30vw] h-[30vw] bg-[#6B3FA0]/8 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-[30vw] h-[30vw] bg-[#3EADD4]/8 rounded-full blur-[90px] pointer-events-none" />

      {/* Error banner */}
      {error && (
        <div className="p-4 relative z-10">
          <Alert variant="destructive" className="bg-destructive/90 text-white border-none">
            <ExclamationCircleIcon className="h-4 w-4" />
            <AlertTitle>โหลดข้อมูลไม่สำเร็จ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HERO  —  dark bg, lime accent, brand logo
          ══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden z-10 px-5 sm:px-8 pt-8 pb-10 border-b border-white/5">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-8">
          <div className="space-y-4 max-w-3xl">
            {/* Custom Brand Header Row */}
            <div className="flex items-center gap-4">
              <img 
                src="/logo_watsub_stacked.png" 
                alt="WatSUB!" 
                className="h-16 w-auto object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-300"
              />
              <div className="h-10 w-[2px] bg-white/10" />
              <div>
                <span className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-[#D2FA00] uppercase block mb-0.5">
                  Organization Profile
                </span>
                <h2 className="text-sm sm:text-base font-black tracking-[0.15em] text-white/90 uppercase">
                  CONNECT. CREATE. INSPIRE.
                </h2>
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mt-2 flex items-center gap-3">
                {name}
              </h1>
              <p className="text-white/60 text-base mt-1.5 font-medium">{tagline}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {locationLabel && (
                <a
                  href={locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs
                             bg-white/5 hover:bg-white/12 text-white/80 transition-colors border border-white/10 shadow-lg"
                >
                  <MapPinIcon className="w-3.5 h-3.5 text-[#F4622A]" />
                  {locationLabel}
                  <ArrowTopRightOnSquareIcon className="w-3 h-3 opacity-50" />
                </a>
              )}
              {companyInfo?.contact_email && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs
                                 bg-white/5 text-white/80 border border-white/10 shadow-lg">
                  <EnvelopeIcon className="w-3.5 h-3.5 text-[#3EADD4]" />
                  {companyInfo.contact_email}
                </span>
              )}
            </div>
          </div>

          {isAdmin && (
            <Button
              onClick={() => openEditor("general")}
              className="flex-shrink-0 font-bold text-black px-6 py-5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-[#D2FA00]/20 border-none"
              style={{ backgroundColor: brandColors.primary }}
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              แก้ไของค์กร
            </Button>
          )}
        </div>

        {/* Stats row with premium glass styling */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "พนักงานทั้งหมด",  value: stats.totalEmployees,  hex: brandColors.primary   },
            { label: "Active Members",   value: stats.activeCount,     hex: brandColors.info      },
            { label: "Leadership",       value: stats.leadershipCount, hex: brandColors.accent    },
            { label: "ประเภทพนักงาน",   value: stats.teamModels,      hex: brandColors.secondary },
          ].map(({ label, value, hex }) => (
            <div
              key={label}
              className="rounded-2xl p-5 backdrop-blur-md border border-white/10 shadow-xl transition-all duration-300 hover:border-white/20"
              style={{ 
                backgroundColor: `${hex}10`,
                boxShadow: `inset 0 0 12px ${hex}05`
              }}
            >
              <p className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: hex }}>
                {value}
              </p>
              <p className="text-xs text-white/50 font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Brand color bar */}
      <div className="flex h-[4px] relative z-10 shadow-md">
        {Object.values(brandColors).map((hex, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN BENTO CONTENT
          ══════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-6 space-y-6 relative z-10 max-w-7xl mx-auto">

        {/* ── Vision + Mission ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GlassCard
            className="lg:col-span-7 relative group border-t-2 bg-slate-950/60"
            style={{ borderTopColor: brandColors.primary }}
          >
            {isAdmin && <EditHint onClick={() => openEditor("general")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base text-white">
                <FlagIcon className="w-4 h-4 text-[#D2FA00]" />
                Vision 2026
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-white/80 leading-relaxed font-medium">{vision}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard
            className="lg:col-span-5 relative group border-t-2 bg-slate-950/60"
            style={{ borderTopColor: brandColors.info }}
          >
            {isAdmin && <EditHint onClick={() => openEditor("general")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base text-white">
                <SparklesIcon className="w-4 h-4 text-[#3EADD4]" />
                Mission
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-white/80 leading-relaxed font-medium">{mission}</p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* ── ClockIcon + Milestones ──────────────────────────── */}
        <GlassCard
          className="relative group bg-slate-950/50"
        >
          {isAdmin && <EditHint onClick={() => openEditor("general")} />}
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2 text-base text-white">
              <ClockIcon className="w-4 h-4 text-[#3EADD4]" />
              ประวัติองค์กร
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-white/80 font-medium">{history}</p>
            {/* Milestone timeline */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 border-t border-white/5">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1 text-xs text-white/90"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: Object.values(brandColors)[idx % 5] }} />
                  <span className="font-semibold">{m}</span>
                </div>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* ── Core Values (3 Pillars Custom Frames) + Brand Colors ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Core Values with High-Fidelity Custom Brand Frames */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
              <PaintBrushIcon className="w-5 h-5 text-[#D2FA00]" />
              Core Values — 3 Pillars
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* #VIBES - Stamp Frame */}
              <div 
                className="relative h-64 p-6 flex flex-col justify-end overflow-hidden group shadow-lg hover:scale-[1.02] transition-transform duration-300 rounded-2xl"
                style={{
                  backgroundImage: "url('/frame_stamp.png')",
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                <div className="relative z-10 space-y-1.5">
                  <h4 className="text-base font-extrabold text-[#D2FA00] tracking-wider uppercase">
                    {CORE_VALUES[0].title.split(':')[0]}
                  </h4>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest block">
                    {CORE_VALUES[0].title.split(':')[1]}
                  </p>
                  <p className="text-xs text-white/90 leading-relaxed font-semibold">
                    {CORE_VALUES[0].detail}
                  </p>
                </div>
              </div>

              {/* #SOUL - Polaroid Frame */}
              <div 
                className="relative h-64 p-5 flex flex-col justify-between overflow-hidden group shadow-xl hover:scale-[1.02] transition-transform duration-300 rounded-lg transform rotate-1 hover:rotate-0"
                style={{
                  backgroundImage: "url('/frame_polaroid.png')",
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Polaroid photo placeholder */}
                <div className="h-[70%] bg-gradient-to-br from-slate-900 to-indigo-950 border border-black/10 rounded flex items-center justify-center overflow-hidden">
                  <div className="absolute w-24 h-24 bg-[#6B3FA0]/20 rounded-full blur-2xl animate-pulse" />
                  <span className="text-2xl font-black text-white/20 select-none">#SOUL</span>
                </div>
                <div className="relative z-10 pt-2 pb-3 px-1 text-center">
                  <h4 className="text-[11px] font-extrabold text-[#0D0D0D] tracking-wide uppercase">
                    {CORE_VALUES[1].title}
                  </h4>
                  <p className="text-[9px] text-[#0D0D0D]/70 font-bold leading-tight mt-1">
                    {CORE_VALUES[1].detail}
                  </p>
                </div>
              </div>

              {/* #JOINT - Bracket Frame */}
              <div 
                className="relative h-64 p-6 flex flex-col justify-end overflow-hidden group shadow-lg hover:scale-[1.02] transition-transform duration-300 rounded-2xl"
                style={{
                  backgroundImage: "url('/frame_bracket.png')",
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                <div className="relative z-10 space-y-1.5">
                  <h4 className="text-base font-extrabold text-[#F4622A] tracking-wider uppercase">
                    {CORE_VALUES[2].title.split(':')[0]}
                  </h4>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest block">
                    {CORE_VALUES[2].title.split(':')[1]}
                  </p>
                  <p className="text-xs text-white/90 leading-relaxed font-semibold">
                    {CORE_VALUES[2].detail}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Colors palette box */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
              <PaintBrushIcon className="w-5 h-5 text-[#3EADD4]" />
              Brand Colors
            </h3>
            <GlassCard className="relative group bg-slate-950/60 p-5 h-[272px] flex flex-col justify-between">
              {isAdmin && <EditHint onClick={() => openEditor("branding")} />}
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(brandColors).map(([key, hex]) => (
                  <div key={key} className="space-y-1.5">
                    <div
                      className="h-12 rounded-xl shadow-md border border-white/10 transition-transform duration-300 hover:scale-105"
                      style={{ 
                        backgroundColor: hex,
                        boxShadow: `0 4px 10px ${hex}20`
                      }}
                    />
                    <p className="text-[10px] font-bold text-white/80">{COLOR_LABELS[key] ?? key}</p>
                    <p className="text-[9px] text-white/40 font-mono tracking-tight">{hex}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ── Benefits + Resources ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GlassCard className="lg:col-span-8 relative group bg-slate-950/60">
            {isAdmin && <EditHint onClick={() => openEditor("content")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base text-white">
                <GiftIcon className="w-4 h-4 text-[#D2FA00]" />
                สวัสดิการพนักงาน
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="flex flex-wrap gap-2.5">
                {benefits.map((b) => (
                  <Badge
                    key={b}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-white/90 border border-white/15 hover:bg-white/10 transition-colors"
                  >
                    {b}
                  </Badge>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="lg:col-span-4 relative group bg-slate-950/60">
            {isAdmin && <EditHint onClick={() => openEditor("content")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base text-white">
                <LinkIcon className="w-4 h-4 text-[#3EADD4]" />
                Resources & Location
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3 text-sm font-medium">
              {locationLabel && (
                <a
                  href={locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <MapPinIcon className="w-4 h-4 text-[#F4622A]" />
                  <span className="hover:underline">{locationLabel}</span>
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
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 flex-shrink-0" />
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
                  <UsersIcon className="w-5 h-5 text-primary" />
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
                  <PencilIcon className="w-3.5 h-3.5 mr-1.5" />
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
