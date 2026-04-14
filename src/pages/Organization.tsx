import { useMemo, useState } from "react";
import {
  Building2,
  CircleAlert,
  ExternalLink,
  Mail,
  MapPin,
  Palette,
  Pencil,
  Save,
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
import { useAuthContext } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const FALLBACK_PROFILE = {
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

const FALLBACK_BRAND_COLORS = [
  { label: "Lime Yellow", hex: "#D2FA00" },
  { label: "Orange", hex: "#F4622A" },
  { label: "Purple", hex: "#6B3FA0" },
  { label: "Blue", hex: "#3EADD4" },
  { label: "Cream", hex: "#F5F0E8" },
  { label: "Black", hex: "#0D0D0D" },
];

const FALLBACK_CORE_VALUES = [
  "#VIBES: CITY & LIFESTYLE — สะท้อนความเป็นไปของพื้นที่ ผ่านมุมมองที่ร่วมสมัยและมีชีวิตชีวา",
  "#SOUL: HUMAN & IDEA — ถ่ายทอดเรื่องราวลึกซึ้งของงานสร้างสรรค์ที่เต็มไปด้วยความรู้สึกและไอเดีย",
  "#JOINT: WORK & OPPORTUNITY — ผสานพรมแดนความคิดสร้างสรรค์เพื่อเปิดพื้นที่ให้โอกาสทางธุรกิจใหม่ ๆ",
];

const FALLBACK_ORG_NODES = [
  {
    name: "ต้า (Tarmisi Wani)",
    role: "Founding Partner & Creative Lead",
    detail: "ผู้มีอำนาจตัดสินใจหลักใน Operations, การเงิน และการจัดการทีม",
    group_key: "leadership" as const,
  },
  {
    name: "นครา",
    role: "Business Strategy Advisor",
    detail: "ที่ปรึกษากลยุทธ์ธุรกิจและดูแลการลงทุน",
    group_key: "leadership" as const,
  },
  {
    name: "สุกรี",
    role: "Funding Strategy Advisor",
    detail: "ที่ปรึกษากลยุทธ์ธุรกิจและจัดหาแหล่งทุน",
    group_key: "leadership" as const,
  },
  {
    name: "สุไมยนา หวังเบ็ญหมัด",
    role: "Content Strategist & Client Coordinator",
    detail: "รับบรีฟ วางกลยุทธ์คอนเทนต์ และเขียนสคริปต์",
    group_key: "core" as const,
  },
  {
    name: "ฮาฟีซ ดอเลาะ",
    role: "Videographer & Graphic Designer",
    detail: "ถ่ายทำ ตัดต่อ และดูแลอุปกรณ์",
    group_key: "core" as const,
  },
  {
    name: "Natdia Benyakat",
    role: "Director / Visual Control",
    detail: "กำกับการถ่ายทำและดูแล Mood & Tone",
    group_key: "specialist" as const,
  },
  {
    name: "Faheem Yusoh",
    role: "Videographer",
    detail: "Outsource Specialist",
    group_key: "specialist" as const,
  },
  {
    name: "zuhariya yato",
    role: "Outsource",
    detail: "Outsource Specialist",
    group_key: "specialist" as const,
  },
];

const GROUPS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "leadership", label: "Leadership" },
  { key: "core", label: "Core Team" },
  { key: "specialist", label: "Specialist" },
] as const;

export default function Organization() {
  const { companyInfo, orgMembers, stats, isLoading, error, refetch } = useCompanyInfo();
  const { isAdmin } = useAuthContext();
  const [activeGroup, setActiveGroup] = useState<(typeof GROUPS)[number]["key"]>("all");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayProfile = {
    name: companyInfo?.name ?? FALLBACK_PROFILE.name,
    tagline: companyInfo?.tagline ?? FALLBACK_PROFILE.tagline,
    vision: companyInfo?.vision ?? FALLBACK_PROFILE.vision,
    mission: companyInfo?.mission ?? FALLBACK_PROFILE.mission,
    history: companyInfo?.history ?? FALLBACK_PROFILE.history,
    milestones: companyInfo?.milestones?.length ? companyInfo.milestones : FALLBACK_PROFILE.milestones,
    location: companyInfo?.location ?? FALLBACK_PROFILE.location,
    locationLink: companyInfo?.location_link ?? FALLBACK_PROFILE.locationLink,
    handbook: companyInfo?.handbook_url ?? FALLBACK_PROFILE.handbook,
    brandAssets: companyInfo?.brand_assets_url ?? FALLBACK_PROFILE.brandAssets,
    benefits: companyInfo?.benefits_summary ?? FALLBACK_PROFILE.benefits,
    leadershipAgreement: companyInfo?.leadership_agreement ?? FALLBACK_PROFILE.leadershipAgreement,
    contactEmail: companyInfo?.contact_email,
  };

  const chartNodes = orgMembers.length > 0 ? orgMembers : FALLBACK_ORG_NODES;
  const brandColors = companyInfo?.brand_colors?.length ? companyInfo.brand_colors : FALLBACK_BRAND_COLORS;
  const coreValues = companyInfo?.core_values?.length ? companyInfo.core_values : FALLBACK_CORE_VALUES;

  const [form, setForm] = useState({
    name: displayProfile.name,
    tagline: displayProfile.tagline,
    vision: displayProfile.vision,
    mission: displayProfile.mission,
    history: displayProfile.history,
    location: displayProfile.location,
    locationLink: displayProfile.locationLink,
    leadershipAgreement: displayProfile.leadershipAgreement,
    handbook: displayProfile.handbook,
    brandAssets: displayProfile.brandAssets,
    benefits: displayProfile.benefits,
    contactEmail: displayProfile.contactEmail ?? "",
    milestonesText: displayProfile.milestones.join("\n"),
    coreValuesText: coreValues.join("\n"),
    colorsText: brandColors.map((color) => `${color.label}|${color.hex}`).join("\n"),
    orgMembersText: chartNodes.map((member) => `${member.group_key}|${member.name}|${member.role}|${member.detail}`).join("\n"),
  });

  const visibleNodes = useMemo(() => {
    if (activeGroup === "all") return chartNodes;
    return chartNodes.filter((node) => node.group_key === activeGroup);
  }, [activeGroup, chartNodes]);

  const resetForm = () => {
    setForm({
      name: displayProfile.name,
      tagline: displayProfile.tagline,
      vision: displayProfile.vision,
      mission: displayProfile.mission,
      history: displayProfile.history,
      location: displayProfile.location,
      locationLink: displayProfile.locationLink,
      leadershipAgreement: displayProfile.leadershipAgreement,
      handbook: displayProfile.handbook,
      brandAssets: displayProfile.brandAssets,
      benefits: displayProfile.benefits,
      contactEmail: displayProfile.contactEmail ?? "",
      milestonesText: displayProfile.milestones.join("\n"),
      coreValuesText: coreValues.join("\n"),
      colorsText: brandColors.map((color) => `${color.label}|${color.hex}`).join("\n"),
      orgMembersText: chartNodes.map((member) => `${member.group_key}|${member.name}|${member.role}|${member.detail}`).join("\n"),
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const milestones = form.milestonesText.split("\n").map((v) => v.trim()).filter(Boolean);
      const coreValuesParsed = form.coreValuesText.split("\n").map((v) => v.trim()).filter(Boolean);

      const parsedColors = form.colorsText
        .split("\n")
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
          const [label = "", hex = ""] = row.split("|").map((item) => item.trim());
          return { label, hex };
        })
        .filter((value) => value.label && value.hex);

      const parsedOrgMembers = form.orgMembersText
        .split("\n")
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row, idx) => {
          const [group_key, name, role, detail] = row.split("|").map((item) => item.trim());
          if (!["leadership", "core", "specialist"].includes(group_key) || !name || !role) return null;
          return {
            group_key,
            name,
            role,
            detail: detail ?? "",
            sort_order: idx,
          };
        })
        .filter(Boolean) as Array<{ group_key: string; name: string; role: string; detail: string; sort_order: number }>;

      const { error: updateError } = await supabase
        .from("company_info")
        .update({
          name: form.name,
          tagline: form.tagline,
          vision: form.vision,
          mission: form.mission,
          history: form.history,
          milestones,
          location: form.location,
          location_link: form.locationLink,
          leadership_agreement: form.leadershipAgreement,
          handbook_url: form.handbook,
          brand_assets_url: form.brandAssets,
          benefits_summary: form.benefits,
          contact_email: form.contactEmail,
          core_values: coreValuesParsed,
          brand_colors: parsedColors,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (updateError) throw updateError;

      const { error: deleteError } = await supabase.from("organization_chart_members").delete().neq("id", "");
      if (deleteError) throw deleteError;

      if (parsedOrgMembers.length > 0) {
        const { error: insertError } = await supabase.from("organization_chart_members").insert(parsedOrgMembers);
        if (insertError) throw insertError;
      }

      toast({ title: "บันทึกข้อมูล Organization แล้ว" });
      setEditing(false);
      await refetch();
    } catch (err) {
      toast({
        title: "บันทึกไม่สำเร็จ",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full p-6 space-y-4">
        <div className="h-56 rounded-2xl border border-border bg-card animate-pulse" />
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

      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Organization Admin Editor</CardTitle>
              <CardDescription>ปรับข้อมูลทั้งหมดได้จากหน้านี้ (รองรับการเพิ่มข้อมูลในอนาคต)</CardDescription>
            </div>
            {!editing ? (
              <Button onClick={() => { resetForm(); setEditing(true); }} size="sm" className="gap-1.5">
                <Pencil className="w-4 h-4" /> แก้ไข
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  ยกเลิก
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                  <Save className="w-4 h-4" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
            )}
          </CardHeader>
          {editing && (
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ชื่อองค์กร" />
              <Input value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} placeholder="Tagline" />
              <Input value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} placeholder="Contact email" />
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location" />
              <Input value={form.locationLink} onChange={(e) => setForm((f) => ({ ...f, locationLink: e.target.value }))} placeholder="Location URL" />
              <Input value={form.leadershipAgreement} onChange={(e) => setForm((f) => ({ ...f, leadershipAgreement: e.target.value }))} placeholder="Leadership agreement" />
              <Input value={form.handbook} onChange={(e) => setForm((f) => ({ ...f, handbook: e.target.value }))} placeholder="Employee handbook URL" />
              <Input value={form.brandAssets} onChange={(e) => setForm((f) => ({ ...f, brandAssets: e.target.value }))} placeholder="Brand assets URL" />
              <Textarea value={form.vision} onChange={(e) => setForm((f) => ({ ...f, vision: e.target.value }))} placeholder="Vision" className="lg:col-span-2" />
              <Textarea value={form.mission} onChange={(e) => setForm((f) => ({ ...f, mission: e.target.value }))} placeholder="Mission" className="lg:col-span-2" />
              <Textarea value={form.history} onChange={(e) => setForm((f) => ({ ...f, history: e.target.value }))} placeholder="History" className="lg:col-span-2" />
              <Textarea value={form.benefits} onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))} placeholder="Benefits summary" className="lg:col-span-2" />
              <Textarea value={form.milestonesText} onChange={(e) => setForm((f) => ({ ...f, milestonesText: e.target.value }))} placeholder="Milestones (1 บรรทัดต่อ 1 รายการ)" className="lg:col-span-2" />
              <Textarea value={form.coreValuesText} onChange={(e) => setForm((f) => ({ ...f, coreValuesText: e.target.value }))} placeholder="Core values (1 บรรทัดต่อ 1 รายการ)" className="lg:col-span-2" />
              <Textarea value={form.colorsText} onChange={(e) => setForm((f) => ({ ...f, colorsText: e.target.value }))} placeholder="Brand colors format: Label|#HEX" className="lg:col-span-2" />
              <Textarea value={form.orgMembersText} onChange={(e) => setForm((f) => ({ ...f, orgMembersText: e.target.value }))} placeholder="Org members format: group|name|role|detail" className="lg:col-span-2 min-h-40" />
            </CardContent>
          )}
        </Card>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-[minmax(120px,auto)]">
        <Card className="lg:col-span-8 border-0 bg-gradient-to-br from-[#D2FA00]/35 via-[#F5F0E8] to-[#3EADD4]/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl sm:text-3xl text-[#0D0D0D]">
              <Building2 className="w-8 h-8" />
              {displayProfile.name}
            </CardTitle>
            <CardDescription className="text-base text-[#0D0D0D]/80">{displayProfile.tagline}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#0D0D0D]">
            <p>{displayProfile.history}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {displayProfile.milestones.map((milestone) => (
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
            <p className="font-medium">{displayProfile.location}</p>
            <a href={displayProfile.locationLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              เปิดแผนที่ <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {(displayProfile.contactEmail ?? "") && (
              <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5">
                <Mail className="w-3.5 h-3.5" /> {displayProfile.contactEmail}
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

        <Card className="lg:col-span-3"><CardHeader className="pb-2"><CardDescription>Core Team</CardDescription><CardTitle className="text-2xl">{chartNodes.filter((m) => m.group_key === "core").length} คน</CardTitle></CardHeader></Card>
        <Card className="lg:col-span-3"><CardHeader className="pb-2"><CardDescription>Leadership</CardDescription><CardTitle className="text-2xl">{chartNodes.filter((m) => m.group_key === "leadership").length} คน</CardTitle></CardHeader></Card>
        <Card className="lg:col-span-3"><CardHeader className="pb-2"><CardDescription>Specialist / Outsource</CardDescription><CardTitle className="text-2xl">{chartNodes.filter((m) => m.group_key === "specialist").length} คน</CardTitle></CardHeader></Card>

        <Card className="lg:col-span-6"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="w-4 h-4 text-primary" /> Vision 2026</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground leading-relaxed">{displayProfile.vision}</p></CardContent></Card>
        <Card className="lg:col-span-6"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="w-4 h-4 text-primary" /> Mission</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground leading-relaxed">{displayProfile.mission}</p></CardContent></Card>

        <Card className="lg:col-span-4">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="w-4 h-4 text-primary" /> Brand Colors</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {brandColors.map((color) => (
              <div key={color.hex + color.label} className="rounded-lg border p-2 text-xs space-y-2">
                <div className="h-7 rounded" style={{ backgroundColor: color.hex }} />
                <p className="font-medium">{color.label}</p>
                <p className="text-muted-foreground">{color.hex}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4"><CardHeader><CardTitle className="text-base">Core Values</CardTitle></CardHeader><CardContent className="space-y-3">{coreValues.map((value) => (<div key={value} className="rounded-lg border border-border p-3 bg-muted/20"><p className="text-sm">{value}</p></div>))}</CardContent></Card>

        <Card className="lg:col-span-4">
          <CardHeader><CardTitle className="text-base">Resources & Culture</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <a className="block text-primary hover:underline" href={displayProfile.handbook} target="_blank" rel="noreferrer">Employee Handbook <ExternalLink className="inline w-3.5 h-3.5" /></a>
            <a className="block text-primary hover:underline" href={displayProfile.brandAssets} target="_blank" rel="noreferrer">Brand Assets <ExternalLink className="inline w-3.5 h-3.5" /></a>
            <p className="text-muted-foreground">{displayProfile.benefits}</p>
            <Badge variant="secondary">{displayProfile.leadershipAgreement}</Badge>
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
                <Button key={group.key} type="button" variant={activeGroup === group.key ? "default" : "outline"} size="sm" onClick={() => setActiveGroup(group.key)}>
                  {group.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {visibleNodes.map((member) => (
                <article
                  key={`${member.group_key}-${member.name}`}
                  className={cn(
                    "rounded-xl border p-4 transition-all hover:shadow-sm",
                    member.group_key === "leadership" && "bg-[#D2FA00]/20 border-[#D2FA00]/70",
                    member.group_key === "core" && "bg-[#3EADD4]/10 border-[#3EADD4]/40",
                    member.group_key === "specialist" && "bg-[#F4622A]/10 border-[#F4622A]/40",
                  )}
                >
                  <p className="text-sm text-muted-foreground capitalize">{member.group_key}</p>
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
