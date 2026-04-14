import { useEffect, useState } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Save, Trash2, X } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { CompanyInfo, CompanyInfoUpdatePayload, OrgMember } from "@/hooks/useCompanyInfo";

// ─── Zod schemas ───────────────────────────────────────────────
const infoSchema = z.object({
  // General
  name:          z.string().min(1, "Required"),
  tagline:       z.string(),
  vision:        z.string(),
  mission:       z.string(),
  contact_email: z.union([z.literal(""), z.string().email("Invalid email")]),
  history:       z.string(),
  // Location (branding tab)
  location_label:   z.string(),
  location_map_url: z.string(),
  // Brand colors
  brand_primary:   z.string(),
  brand_secondary: z.string(),
  brand_accent:    z.string(),
  brand_info:      z.string(),
  brand_light:     z.string(),
  brand_dark:      z.string(),
  // Dynamic arrays
  milestones: z.array(z.object({ value: z.string() })),
  benefits:   z.array(z.object({ value: z.string() })),
  resources:  z.array(z.object({ label: z.string(), url: z.string() })),
});
type InfoForm = z.infer<typeof infoSchema>;

const memberSchema = z.object({
  name:      z.string().min(1, "Required"),
  position:  z.string().min(1, "Required"),
  role_type: z.enum(["leadership", "core", "specialist"]),
  parent_id: z.string().nullable(),
  avatar_url: z.string().nullable(),
});
type MemberForm = z.infer<typeof memberSchema>;

// ─── Props ─────────────────────────────────────────────────────
interface OrgAdminEditorProps {
  open:            boolean;
  onOpenChange:    (open: boolean) => void;
  defaultTab?:     string;
  companyInfo:     CompanyInfo | null;
  orgMembers:      OrgMember[];
  onUpdateCompanyInfo: (payload: CompanyInfoUpdatePayload) => Promise<void>;
  onAddOrgMember:      (member: Omit<OrgMember, "id">) => Promise<OrgMember>;
  onUpdateOrgMember:   (id: string, member: Partial<Omit<OrgMember, "id">>) => Promise<void>;
  onDeleteOrgMember:   (id: string) => Promise<void>;
  onRefetch: () => void;
}

const ROLE_LABELS: Record<OrgMember["role_type"], string> = {
  leadership: "Leadership", core: "Core Team", specialist: "Specialist",
};
const ROLE_BADGE: Record<OrgMember["role_type"], string> = {
  leadership: "bg-[#D2FA00]/25 text-[#0D0D0D] border-[#D2FA00]/60",
  core:       "bg-[#3EADD4]/15 text-[#3EADD4] border-[#3EADD4]/40",
  specialist: "bg-[#F4622A]/15 text-[#F4622A] border-[#F4622A]/40",
};

// ─── Color picker field ────────────────────────────────────────
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg border flex-shrink-0 overflow-hidden relative shadow-sm">
        <div className="absolute inset-0" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" aria-label={label} />
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs h-8 flex-1" placeholder="#000000" />
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────
export function OrgAdminEditor({
  open, onOpenChange, defaultTab = "general",
  companyInfo, orgMembers,
  onUpdateCompanyInfo, onAddOrgMember, onDeleteOrgMember, onRefetch,
}: OrgAdminEditorProps) {
  const [saving,       setSaving]       = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);
  const [activeTab,    setActiveTab]    = useState(defaultTab);

  // Sync tab when caller changes it (e.g. per-section edit buttons)
  useEffect(() => { setActiveTab(defaultTab); }, [defaultTab]);

  // ── Info form ────────────────────────────────────────────────
  const form = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      name: "", tagline: "", vision: "", mission: "", contact_email: "", history: "",
      location_label: "", location_map_url: "",
      brand_primary: "#D2FA00", brand_secondary: "#F4622A", brand_accent: "#6B3FA0",
      brand_info:    "#3EADD4", brand_light:     "#F5F0E8", brand_dark:   "#0D0D0D",
      milestones: [], benefits: [], resources: [],
    },
  });

  const { fields: msFields,  append: msAppend,  remove: msRemove  } = useFieldArray({ control: form.control, name: "milestones" });
  const { fields: bnFields,  append: bnAppend,  remove: bnRemove  } = useFieldArray({ control: form.control, name: "benefits"   });
  const { fields: resFields, append: resAppend, remove: resRemove } = useFieldArray({ control: form.control, name: "resources"  });

  // Populate when editor opens
  useEffect(() => {
    if (!open || !companyInfo) return;
    form.reset({
      name:          companyInfo.name          ?? "",
      tagline:       companyInfo.tagline        ?? "",
      vision:        companyInfo.vision         ?? "",
      mission:       companyInfo.mission        ?? "",
      contact_email: companyInfo.contact_email  ?? "",
      history:       companyInfo.history        ?? "",
      location_label:   companyInfo.location_links?.label   ?? "",
      location_map_url: companyInfo.location_links?.map_url ?? "",
      brand_primary:   companyInfo.brand_colors?.primary   ?? "#D2FA00",
      brand_secondary: companyInfo.brand_colors?.secondary ?? "#F4622A",
      brand_accent:    companyInfo.brand_colors?.accent    ?? "#6B3FA0",
      brand_info:      companyInfo.brand_colors?.info      ?? "#3EADD4",
      brand_light:     companyInfo.brand_colors?.light     ?? "#F5F0E8",
      brand_dark:      companyInfo.brand_colors?.dark      ?? "#0D0D0D",
      milestones: companyInfo.milestones.map((v) => ({ value: v })),
      benefits:   companyInfo.benefits.map((v)   => ({ value: v })),
      resources:  companyInfo.resources.map((r)  => ({ label: r.label, url: r.url })),
    });
  }, [open, companyInfo, form]);

  const onSave: SubmitHandler<InfoForm> = async (data) => {
    setSaving(true);
    try {
      await onUpdateCompanyInfo({
        name:          data.name,
        tagline:       data.tagline,
        vision:        data.vision,
        mission:       data.mission,
        contact_email: data.contact_email || null,
        history:       data.history || null,
        location_links: data.location_label
          ? { label: data.location_label, map_url: data.location_map_url }
          : null,
        brand_colors: {
          primary:   data.brand_primary,
          secondary: data.brand_secondary,
          accent:    data.brand_accent,
          info:      data.brand_info,
          light:     data.brand_light,
          dark:      data.brand_dark,
        },
        milestones: data.milestones.map((m) => m.value).filter(Boolean),
        benefits:   data.benefits.map((b)   => b.value).filter(Boolean),
        resources:  data.resources
          .filter((r) => r.label || r.url)
          .map((r) => ({ label: r.label, url: r.url })),
      });
      onRefetch();
      toast.success("บันทึกข้อมูลองค์กรสำเร็จ");
      onOpenChange(false);
    } catch (err) {
      toast.error(`บันทึกไม่สำเร็จ: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Member form ──────────────────────────────────────────────
  const memberForm = useForm<MemberForm>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", position: "", role_type: "core", parent_id: null, avatar_url: null },
  });

  const onAddMember: SubmitHandler<MemberForm> = async (data) => {
    setMemberSaving(true);
    try {
      await onAddOrgMember({
        name:      data.name,
        position:  data.position,
        role_type: data.role_type,
        parent_id: data.parent_id || null,
        avatar_url: data.avatar_url || null,
      });
      onRefetch();
      memberForm.reset();
      toast.success("เพิ่มสมาชิกสำเร็จ");
    } catch (err) {
      toast.error(`เพิ่มไม่สำเร็จ: ${String(err)}`);
    } finally {
      setMemberSaving(false);
    }
  };

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`ลบ "${name}" ออกจาก Org Chart?`)) return;
    try {
      await onDeleteOrgMember(id);
      onRefetch();
      toast.success(`ลบ "${name}" สำเร็จ`);
    } catch (err) {
      toast.error(`ลบไม่สำเร็จ: ${String(err)}`);
    }
  };

  const parentName = (pid: string | null) =>
    pid ? (orgMembers.find((m) => m.id === pid)?.name ?? "—") : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-5 pb-2 border-b">
          <SheetTitle>แก้ไของค์กร</SheetTitle>
          <SheetDescription>เฉพาะ Admin เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลนี้</SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid grid-cols-4 mx-6 mt-3 flex-shrink-0">
            <TabsTrigger value="general">ทั่วไป</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="content">เนื้อหา</TabsTrigger>
            <TabsTrigger value="orgchart">Org Chart</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6 pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} id="org-info-form">

                {/* ══ General Info ══════════════════════════════ */}
                <TabsContent value="general" className="space-y-4 pb-6 mt-0">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อองค์กร</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tagline" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tagline</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contact_email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>อีเมลติดต่อ</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vision" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vision</FormLabel>
                      <FormControl><Textarea rows={3} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mission" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mission</FormLabel>
                      <FormControl><Textarea rows={3} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="history" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ประวัติองค์กร</FormLabel>
                      <FormControl><Textarea rows={5} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </TabsContent>

                {/* ══ Branding ══════════════════════════════════ */}
                <TabsContent value="branding" className="space-y-5 pb-6 mt-0">
                  <div>
                    <p className="text-sm font-semibold mb-3">Brand Colors</p>
                    <div className="space-y-2">
                      {([
                        ["brand_primary",   "Primary"],
                        ["brand_secondary", "Secondary"],
                        ["brand_accent",    "Accent"],
                        ["brand_info",      "Info"],
                        ["brand_light",     "Light"],
                        ["brand_dark",      "Dark"],
                      ] as const).map(([fieldName, label]) => (
                        <FormField key={fieldName} control={form.control} name={fieldName}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <ColorField label={label} value={field.value} onChange={field.onChange} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-semibold mb-3">ที่ตั้ง</p>
                    <div className="space-y-3">
                      <FormField control={form.control} name="location_label" render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อที่ตั้ง</FormLabel>
                          <FormControl><Input {...field} placeholder="จังหวัดปัตตานี" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="location_map_url" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Google Maps URL</FormLabel>
                          <FormControl><Input {...field} placeholder="https://maps.app.goo.gl/..." /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </TabsContent>

                {/* ══ Content ═══════════════════════════════════ */}
                <TabsContent value="content" className="space-y-6 pb-6 mt-0">
                  {/* Milestones */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">Milestones</p>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => msAppend({ value: "" })}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่ม
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {msFields.map((f, i) => (
                        <div key={f.id} className="flex gap-2">
                          <Input {...form.register(`milestones.${i}.value`)} placeholder="2025: ..." />
                          <Button type="button" variant="ghost" size="icon" onClick={() => msRemove(i)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {msFields.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่มี milestone</p>}
                    </div>
                  </div>

                  <Separator />

                  {/* Benefits */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">สวัสดิการพนักงาน</p>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => bnAppend({ value: "" })}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่ม
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {bnFields.map((f, i) => (
                        <div key={f.id} className="flex gap-2">
                          <Input {...form.register(`benefits.${i}.value`)} placeholder="สวัสดิการ..." />
                          <Button type="button" variant="ghost" size="icon" onClick={() => bnRemove(i)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {bnFields.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่มีสวัสดิการ</p>}
                    </div>
                  </div>

                  <Separator />

                  {/* Resources */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">Resources & Links</p>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => resAppend({ label: "", url: "" })}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่ม
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {resFields.map((f, i) => (
                        <div key={f.id} className="grid grid-cols-[1fr_1.5fr_auto] gap-2 items-center">
                          <Input {...form.register(`resources.${i}.label`)} placeholder="ชื่อ link" />
                          <Input {...form.register(`resources.${i}.url`)}   placeholder="https://..." />
                          <Button type="button" variant="ghost" size="icon" onClick={() => resRemove(i)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {resFields.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่มี resource</p>}
                    </div>
                  </div>
                </TabsContent>

              </form>
            </Form>

            {/* ══ Org Chart Members ══════════════════════════ */}
            <TabsContent value="orgchart" className="space-y-4 pb-6 mt-0">
              {/* Member list */}
              <div>
                <p className="text-sm font-semibold mb-2">สมาชิกปัจจุบัน ({orgMembers.length} คน)</p>
                <div className="space-y-1.5">
                  {orgMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground">ยังไม่มีสมาชิก — กด "Apply Migration" ใน Supabase ก่อน</p>
                  )}
                  {orgMembers.map((m) => (
                    <div key={m.id}
                      className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.position}
                          {m.parent_id && <> · รายงานต่อ {parentName(m.parent_id)}</>}
                        </p>
                      </div>
                      <Badge variant="outline"
                        className={`text-[10px] flex-shrink-0 ${ROLE_BADGE[m.role_type as OrgMember["role_type"]] ?? ""}`}>
                        {ROLE_LABELS[m.role_type as OrgMember["role_type"]] ?? m.role_type}
                      </Badge>
                      <Button type="button" variant="ghost" size="icon"
                        className="text-destructive hover:text-destructive flex-shrink-0 w-8 h-8"
                        onClick={() => void handleDeleteMember(m.id, m.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Add member form */}
              <p className="text-sm font-semibold">เพิ่มสมาชิกใหม่</p>
              <Form {...memberForm}>
                <form onSubmit={memberForm.handleSubmit(onAddMember)} className="space-y-3">
                  <FormField control={memberForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อ</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={memberForm.control} name="position" render={({ field }) => (
                    <FormItem>
                      <FormLabel>ตำแหน่ง</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={memberForm.control} name="role_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>ประเภท</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="leadership">Leadership</SelectItem>
                            <SelectItem value="core">Core Team</SelectItem>
                            <SelectItem value="specialist">Specialist</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={memberForm.control} name="parent_id" render={({ field }) => (
                      <FormItem>
                        <FormLabel>รายงานต่อ</FormLabel>
                        <Select
                          onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                          value={field.value ?? "none"}
                        >
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="ไม่มี (Root)" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">ไม่มี (Root)</SelectItem>
                            {orgMembers.map((m) => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" size="sm" variant="outline" disabled={memberSaving} className="w-full">
                    <Plus className="w-4 h-4 mr-1" />
                    {memberSaving ? "กำลังเพิ่ม..." : "เพิ่มสมาชิก"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </ScrollArea>

          {/* Footer — only for non-orgchart tabs */}
          {activeTab !== "orgchart" && (
            <div className="px-6 py-4 border-t flex justify-end gap-2 flex-shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
              <Button type="submit" form="org-info-form" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
