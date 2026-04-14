import { useMemo, useState } from "react";
import {
  Building2,
  CircleAlert,
  ExternalLink,
  Mail,
  MapPin,
  Palette,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ORG_PROFILE = {
  name: "WatSUB! Studio (วาตซับ สตูดิโอ)",
  tagline: "A Space for Creative Connectivity",
  vision:
    '"Connect. Create. Inspire." เปลี่ยนจากคนเล่าเรื่องสู่ Infrastructure จุดนัดพบระหว่างคนเก่ง ไอเดียดี และโอกาสธุรกิจ',
  mission:
    "ทำหน้าที่เป็น Connector เชื่อมผู้คนเข้ากับเมือง ไอเดีย และโอกาส เพื่อสร้างระบบนิเวศสร้างสรรค์ที่จับต้องได้จริงในปัตตานี",
  location: "จังหวัดปัตตานี",
  locationLink: "https://maps.app.goo.gl/pLauvKsc9JCAYAFv9",
  history:
    "WatSUB! Studio ก่อตั้งเมื่อปี 2023 ด้วยความเชื่อที่ว่าปัตตานีมีศักยภาพสร้างงาน creative ระดับสากล เราไม่ได้แค่ผลิตคอนเทนต์ — เราสร้างพื้นที่ที่คนสร้างสรรค์เติบโตได้ จาก studio เล็กๆ สู่ creative production studio ที่ครบวงจร เราคือพื้นที่ที่เชื่อมโยงผู้คน ไอเดีย และโอกาส เข้าด้วยกันผ่านงานสร้างสรรค์ที่มีความหมายและทรงพลัง พร้อม connect คนเก่งในพื้นที่กับ brand ที่ต้องการ storytelling ที่ authentic",
  milestones: ["2023: ก่อตั้ง WatSUB! Studio", "2024: ขยายทีม production และ network ผู้เชี่ยวชาญ", "2025: วางระบบ partnership และสร้าง ecosystem คนสร้างสรรค์"],
  leadershipAgreement: "Partnership Agreement: 8 ธันวาคม 2568",
  handbook: "https://drive.google.com/drive/folders/16740VA6PHLUjm6y6KnO_Un495OXHASXT?usp=drive_link",
  brandAssets: "https://drive.google.com/drive/folders/1yNe-qPAMA6eppoJAIXfdOLJYlDo_phb5?usp=drive_link",
  benefits: "สรุปสวัสดิการพนักงานแบบเข้าใจง่าย",
};

const BRAND_COLORS = [
  { label: "Lime Yellow", hex: "#D2FA00" },
  { label: "Orange", hex: "#F4622A" },
  { label: "Purple", hex: "#6B3FA0" },
  { label: "Blue", hex: "#3EADD4" },
  { label: "Cream", hex: "#F5F0E8" },
  { label: "Black", hex: "#0D0D0D" },
];

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

type OrgNode = {
  name: string;
  role: string;
  detail: string;
  group: "leadership" | "core" | "specialist";
};

const ORG_NODES: OrgNode[] = [
  {
    name: "ต้า (Tarmisi Wani)",
    role: "Founding Partner & Creative Lead",
    detail: "ผู้มีอำนาจตัดสินใจหลักใน Operations, การเงิน และการจัดการทีม",
    group: "leadership",
  },
  {
    name: "นครา",
    role: "Business Strategy Advisor",
    detail: "ที่ปรึกษากลยุทธ์ธุรกิจและดูแลการลงทุน",
    group: "leadership",
  },
  {
    name: "สุกรี",
    role: "Funding Strategy Advisor",
    detail: "ที่ปรึกษากลยุทธ์ธุรกิจและจัดหาแหล่งทุน",
    group: "leadership",
  },
  {
    name: "สุไมยนา หวังเบ็ญหมัด",
    role: "Content Strategist & Client Coordinator",
    detail: "รับบรีฟ วางกลยุทธ์คอนเทนต์ และเขียนสคริปต์",
    group: "core",
  },
  {
    name: "ฮาฟีซ ดอเลาะ",
    role: "Videographer & Graphic Designer",
    detail: "ถ่ายทำ ตัดต่อ และดูแลอุปกรณ์",
    group: "core",
  },
  {
    name: "Natdia Benyakat",
    role: "Director / Visual Control",
    detail: "กำกับการถ่ายทำและดูแล Mood & Tone",
    group: "specialist",
  },
  {
    name: "Faheem Yusoh",
    role: "Videographer",
    detail: "Outsource Specialist",
    group: "specialist",
  },
  {
    name: "zuhariya yato",
    role: "Outsource",
    detail: "Outsource Specialist",
    group: "specialist",
  },
];

const GROUPS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "leadership", label: "Leadership" },
  { key: "core", label: "Core Team" },
  { key: "specialist", label: "Specialist" },
] as const;

export default function Organization() {
  const { companyInfo, stats, isLoading, error } = useCompanyInfo();
  const [activeGroup, setActiveGroup] = useState<(typeof GROUPS)[number]["key"]>("all");

  const visibleNodes = useMemo(() => {
    if (activeGroup === "all") return ORG_NODES;
    return ORG_NODES.filter((node) => node.group === activeGroup);
  }, [activeGroup]);

  if (isLoading) {
    return (
      <div className="min-h-full p-6 space-y-4">
        <div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
          <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
          <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-4">
      {error && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>โหลดข้อมูลองค์กรไม่สำเร็จ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-[minmax(120px,auto)]">
        <Card className="lg:col-span-8 border-0 bg-gradient-to-br from-[#D2FA00]/35 via-[#F5F0E8] to-[#3EADD4]/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl text-[#0D0D0D]">
              <Building2 className="w-8 h-8" />
              {companyInfo?.name ?? ORG_PROFILE.name}
            </CardTitle>
            <CardDescription className="text-base text-[#0D0D0D]/80">
              {companyInfo?.tagline ?? ORG_PROFILE.tagline}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#0D0D0D]">
            <p>{ORG_PROFILE.history}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {ORG_PROFILE.milestones.map((milestone) => (
                <Badge key={milestone} variant="outline" className="border-[#0D0D0D]/25 bg-white/50">
                  {milestone}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-4 h-4 text-primary" /> Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="font-medium">{ORG_PROFILE.location}</p>
            <a href={ORG_PROFILE.locationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              เปิดแผนที่ <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {(companyInfo?.contact_email ?? "") && (
              <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5">
                <Mail className="w-3.5 h-3.5" /> {companyInfo?.contact_email}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription>พนักงานทั้งหมด</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> {stats.totalEmployees}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription>Core Team</CardDescription>
            <CardTitle className="text-2xl">2 คน</CardTitle>
          </CardHeader>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription>Leadership</CardDescription>
            <CardTitle className="text-2xl">3 คน</CardTitle>
          </CardHeader>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription>Specialist / Outsource</CardDescription>
            <CardTitle className="text-2xl">3 คน</CardTitle>
          </CardHeader>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" /> Vision 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{companyInfo?.vision ?? ORG_PROFILE.vision}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-primary" /> Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">{companyInfo?.mission ?? ORG_PROFILE.mission}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="w-4 h-4 text-primary" /> Brand Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {BRAND_COLORS.map((color) => (
              <div key={color.hex} className="rounded-lg border p-2 text-xs space-y-2">
                <div className="h-7 rounded" style={{ backgroundColor: color.hex }} />
                <p className="font-medium">{color.label}</p>
                <p className="text-muted-foreground">{color.hex}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Core Values (3 Pillars)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CORE_VALUES.map((value) => (
              <div key={value.title} className="rounded-lg border border-border p-3 bg-muted/20">
                <p className="text-sm font-semibold">{value.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{value.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Resources & Culture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <a className="block text-primary hover:underline" href={ORG_PROFILE.handbook} target="_blank" rel="noreferrer">
              Employee Handbook <ExternalLink className="inline w-3.5 h-3.5" />
            </a>
            <a className="block text-primary hover:underline" href={ORG_PROFILE.brandAssets} target="_blank" rel="noreferrer">
              Brand Assets <ExternalLink className="inline w-3.5 h-3.5" />
            </a>
            <p className="text-muted-foreground">{ORG_PROFILE.benefits}</p>
            <Badge variant="secondary">{ORG_PROFILE.leadershipAgreement}</Badge>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Interactive Org Chart</CardTitle>
            <CardDescription>เลือกดูโครงสร้างทีมตามหมวดเพื่อสำรวจหน้าที่ของแต่ละคน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {GROUPS.map((group) => (
                <Button
                  key={group.key}
                  type="button"
                  variant={activeGroup === group.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveGroup(group.key)}
                >
                  {group.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleNodes.map((member) => (
                <article
                  key={`${member.group}-${member.name}`}
                  className={cn(
                    "rounded-xl border p-4 transition-all hover:shadow-sm",
                    member.group === "leadership" && "bg-[#D2FA00]/20 border-[#D2FA00]/70",
                    member.group === "core" && "bg-[#3EADD4]/10 border-[#3EADD4]/40",
                    member.group === "specialist" && "bg-[#F4622A]/10 border-[#F4622A]/40",
                  )}
                >
                  <p className="text-sm text-muted-foreground capitalize">{member.group}</p>
                  <h3 className="font-semibold mt-1">{member.name}</h3>
                  <p className="text-sm mt-1">{member.role}</p>
                  <p className="text-xs text-muted-foreground mt-2">{member.detail}</p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
