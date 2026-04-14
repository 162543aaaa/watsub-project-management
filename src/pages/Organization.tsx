import { useState } from "react";
import {
  Building2,
  CircleAlert,
  ExternalLink,
  Gift,
  History,
  Mail,
  MapPin,
  Palette,
  Pencil,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { OrgAdminEditor } from "@/components/OrgAdminEditor";
import { InteractiveOrgChart } from "@/components/InteractiveOrgChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// ─── Fallback static data ──────────────────────────────────────
const FALLBACK = {
  name: "WatSUB! Studio (วาตซับ สตูดิโอ)",
  tagline: "A Space for Creative Connectivity",
  vision:
    '"Connect. Create. Inspire." เปลี่ยนจากคนเล่าเรื่องสู่ Infrastructure จุดนัดพบระหว่างคนเก่ง ไอเดียดี และโอกาสธุรกิจ',
  mission:
    "ทำหน้าที่เป็น Connector เชื่อมผู้คนเข้ากับเมือง ไอเดีย และโอกาส เพื่อสร้างระบบนิเวศสร้างสรรค์ที่จับต้องได้จริงในปัตตานี",
  history:
    "WatSUB! Studio ก่อตั้งเมื่อปี 2023 ด้วยความเชื่อที่ว่าปัตตานีมีศักยภาพสร้างงาน creative ระดับสากล เราไม่ได้แค่ผลิตคอนเทนต์ — เราสร้างพื้นที่ที่คนสร้างสรรค์เติบโตได้ จาก studio เล็กๆ สู่ creative production studio ที่ครบวงจร เราคือพื้นที่ที่เชื่อมโยงผู้คน ไอเดีย และโอกาส เข้าด้วยกันผ่านงานสร้างสรรค์ที่มีความหมายและทรงพลัง",
  milestones: [
    "2023: ก่อตั้ง WatSUB! Studio",
    "2024: ขยายทีม production และ network ผู้เชี่ยวชาญ",
    "2025: วางระบบ partnership และสร้าง ecosystem คนสร้างสรรค์",
  ],
  location_label: "จังหวัดปัตตานี",
  location_map_url: "https://maps.app.goo.gl/pLauvKsc9JCAYAFv9",
  resources: [
    {
      label: "Employee Handbook",
      url: "https://drive.google.com/drive/folders/16740VA6PHLUjm6y6KnO_Un495OXHASXT?usp=drive_link",
    },
    {
      label: "Brand Assets",
      url: "https://drive.google.com/drive/folders/1yNe-qPAMA6eppoJAIXfdOLJYlDo_phb5?usp=drive_link",
    },
  ],
  benefits: [
    "ค่าประกันสุขภาพกลุ่ม",
    "วันหยุดพักผ่อน 10 วันต่อปี",
    "โบนัสตามผลงาน",
    "ค่าอบรมพัฒนาตนเอง",
    "อุปกรณ์การทำงาน",
  ],
  brand_colors: {
    primary: "#D2FA00",
    secondary: "#F4622A",
    accent: "#6B3FA0",
    info: "#3EADD4",
    light: "#F5F0E8",
    dark: "#0D0D0D",
  },
};

const BRAND_COLOR_LABELS: Record<string, string> = {
  primary: "Primary",
  secondary: "Secondary",
  accent: "Accent",
  info: "Info",
  light: "Light",
  dark: "Dark",
};

const CORE_VALUES = [
  {
    title: "#VIBES: CITY & LIFESTYLE",
    detail: "สะท้อนความเป็นไปของพื้นที่ ผ่านมุมมองที่ร่วมสมัยและมีชีวิตชีวา",
  },
  {
    title: "#SOUL: HUMAN & IDEA",
    detail: "ถ่ายทอดเรื่องราวลึกซึ้งของงานสร้างสรรค์ที่เต็มไปด้วยความรู้สึกและไอเดีย",
  },
  {
    title: "#JOINT: WORK & OPPORTUNITY",
    detail: "ผสานพรมแดนความคิดสร้างสรรค์เพื่อเปิดพื้นที่ให้โอกาสทางธุรกิจใหม่ ๆ",
  },
];

// ─── Page component ────────────────────────────────────────────
export default function Organization() {
  const { isAdmin } = useAuth();
  const {
    companyInfo,
    orgTree,
    orgMembers,
    stats,
    isLoading,
    error,
    updateCompanyInfo,
    addOrgMember,
    updateOrgMember,
    deleteOrgMember,
    refetch,
  } = useCompanyInfo();

  const [editorOpen, setEditorOpen] = useState(false);

  // Resolve data: DB first, fallback second
  const name = companyInfo?.name ?? FALLBACK.name;
  const tagline = companyInfo?.tagline ?? FALLBACK.tagline;
  const vision = companyInfo?.vision ?? FALLBACK.vision;
  const mission = companyInfo?.mission ?? FALLBACK.mission;
  const history = companyInfo?.history ?? FALLBACK.history;
  const milestones =
    companyInfo?.milestones?.length ? companyInfo.milestones : FALLBACK.milestones;
  const locationLabel =
    companyInfo?.location_links?.label ?? FALLBACK.location_label;
  const locationUrl =
    companyInfo?.location_links?.map_url ?? FALLBACK.location_map_url;
  const resources =
    companyInfo?.resources?.length ? companyInfo.resources : FALLBACK.resources;
  const benefits =
    companyInfo?.benefits?.length ? companyInfo.benefits : FALLBACK.benefits;
  const brandColors = companyInfo?.brand_colors ?? FALLBACK.brand_colors;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-full p-6 space-y-4">
        <div className="h-10 w-48 rounded-xl bg-muted animate-pulse" />
        <div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl border border-border bg-card animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tagline}</p>
        </div>
        {isAdmin && (
          <>
            <Button
              onClick={() => setEditorOpen(true)}
              className="flex-shrink-0"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Organization
            </Button>
            <OrgAdminEditor
              open={editorOpen}
              onOpenChange={setEditorOpen}
              companyInfo={companyInfo}
              orgMembers={orgMembers}
              onUpdateCompanyInfo={updateCompanyInfo}
              onAddOrgMember={addOrgMember}
              onUpdateOrgMember={updateOrgMember}
              onDeleteOrgMember={deleteOrgMember}
              onRefetch={refetch}
            />
          </>
        )}
      </div>

      {/* ── Error ───────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>โหลดข้อมูลองค์กรไม่สำเร็จ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ══════════════════════════════════════════════════════
          BENTO BOX LAYOUT  (12-column CSS Grid)
          ══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-[minmax(100px,auto)]">

        {/* ── Hero: Company name + history + milestones ─────── */}
        <Card
          className="lg:col-span-8 border-0 shadow-md"
          style={{
            background: `linear-gradient(135deg, ${brandColors.primary}33 0%, ${brandColors.light} 50%, ${brandColors.info}25 100%)`,
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl text-[#0D0D0D]">
              <Building2 className="w-8 h-8 flex-shrink-0" />
              {name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#0D0D0D]">
            <div className="flex items-start gap-2">
              <History className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" />
              <p className="leading-relaxed">{history}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {milestones.map((m) => (
                <Badge
                  key={m}
                  variant="outline"
                  className="border-[#0D0D0D]/25 bg-white/50 text-xs"
                >
                  {m}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Location ─────────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-primary" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{locationLabel}</p>
            <a
              href={locationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              เปิดแผนที่ <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {companyInfo?.contact_email && (
              <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5">
                <Mail className="w-3.5 h-3.5" />
                {companyInfo.contact_email}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* ── Stat boxes ───────────────────────────────────── */}
        {[
          { label: "พนักงานทั้งหมด", value: stats.totalEmployees, icon: <Users className="w-5 h-5 text-primary" /> },
          { label: "Active Members", value: stats.activeCount, icon: <Star className="w-5 h-5 text-primary" /> },
          { label: "Leadership", value: stats.leadershipCount, icon: <Target className="w-5 h-5 text-primary" /> },
          { label: "ประเภทพนักงาน", value: stats.teamModels, icon: <Sparkles className="w-5 h-5 text-primary" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label} className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {icon}
                {value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}

        {/* ── Vision ───────────────────────────────────────── */}
        <Card
          className="lg:col-span-6 border-l-4"
          style={{ borderLeftColor: brandColors.primary }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" />
              Vision 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {vision}
            </p>
          </CardContent>
        </Card>

        {/* ── Mission ──────────────────────────────────────── */}
        <Card
          className="lg:col-span-6 border-l-4"
          style={{ borderLeftColor: brandColors.info }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {mission}
            </p>
          </CardContent>
        </Card>

        {/* ── Brand Colors ─────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-4 h-4 text-primary" />
              Brand Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {Object.entries(brandColors).map(([key, hex]) => (
              <div
                key={key}
                className="rounded-lg border p-2 text-xs space-y-1.5 overflow-hidden"
              >
                <div
                  className="h-7 rounded-md"
                  style={{ backgroundColor: hex }}
                />
                <p className="font-medium capitalize">
                  {BRAND_COLOR_LABELS[key] ?? key}
                </p>
                <p className="text-muted-foreground font-mono">{hex}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Core Values ──────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Core Values (3 Pillars)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CORE_VALUES.map((value) => (
              <div
                key={value.title}
                className="rounded-lg border border-border p-3 bg-muted/20"
              >
                <p className="text-sm font-semibold">{value.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {value.detail}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Resources ────────────────────────────────────── */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Resources & Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {resources.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                {r.label}
              </a>
            ))}
          </CardContent>
        </Card>

        {/* ── Milestones (full width strip) ────────────────── */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4 text-primary" />
              Milestones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span
                  className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: brandColors.primary }}
                />
                {m}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ── Benefits ─────────────────────────────────────── */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="w-4 h-4 text-primary" />
              สวัสดิการพนักงาน
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {benefits.map((b) => (
              <Badge
                key={b}
                variant="secondary"
                className="text-xs px-3 py-1"
                style={{ borderLeft: `3px solid ${brandColors.secondary}` }}
              >
                {b}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* ══════════════════════════════════════════════════════
          INTERACTIVE ORG CHART
          ══════════════════════════════════════════════════════ */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Interactive Org Chart
            </CardTitle>
            <CardDescription>
              คลิกที่ node เพื่อย่อ / ขยายสาขาของทีม
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InteractiveOrgChart tree={orgTree} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
