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
  name: z.string().min(1, "Required"),
  tagline: z.string(),
  vision: z.string(),
  mission: z.string(),
  contact_email: z.union([z.literal(""), z.string().email("Invalid email")]),
  history: z.string(),
  // Branding
  brand_primary: z.string(),
  brand_secondary: z.string(),
  brand_accent: z.string(),
  brand_info: z.string(),
  brand_light: z.string(),
  brand_dark: z.string(),
  // Location
  location_label: z.string(),
  location_map_url: z.string(),
  // Dynamic arrays (stored as objects so useFieldArray works)
  milestones: z.array(z.object({ value: z.string() })),
  benefits: z.array(z.object({ value: z.string() })),
});

type InfoForm = z.infer<typeof infoSchema>;

const memberSchema = z.object({
  name: z.string().min(1, "Required"),
  position: z.string().min(1, "Required"),
  role_type: z.enum(["leadership", "core", "specialist"]),
  parent_id: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

type MemberForm = z.infer<typeof memberSchema>;

// ─── Props ─────────────────────────────────────────────────────
interface OrgAdminEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyInfo: CompanyInfo | null;
  orgMembers: OrgMember[];
  onUpdateCompanyInfo: (payload: CompanyInfoUpdatePayload) => Promise<void>;
  onAddOrgMember: (member: Omit<OrgMember, "id">) => Promise<OrgMember>;
  onUpdateOrgMember: (id: string, member: Partial<Omit<OrgMember, "id">>) => Promise<void>;
  onDeleteOrgMember: (id: string) => Promise<void>;
  onRefetch: () => void;
}

const ROLE_LABELS: Record<OrgMember["role_type"], string> = {
  leadership: "Leadership",
  core: "Core Team",
  specialist: "Specialist",
};

const ROLE_COLORS: Record<OrgMember["role_type"], string> = {
  leadership: "bg-[#D2FA00]/30 text-[#0D0D0D] border-[#D2FA00]",
  core: "bg-[#3EADD4]/20 text-[#3EADD4]",
  specialist: "bg-[#F4622A]/20 text-[#F4622A]",
};

// ─── Colour swatch + input ─────────────────────────────────────
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded border flex-shrink-0 overflow-hidden relative">
        <div className="absolute inset-0" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label={label}
        />
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono text-xs h-8"
        placeholder="#000000"
      />
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────
export function OrgAdminEditor({
  open,
  onOpenChange,
  companyInfo,
  orgMembers,
  onUpdateCompanyInfo,
  onAddOrgMember,
  onDeleteOrgMember,
  onRefetch,
}: OrgAdminEditorProps) {
  const [saving, setSaving] = useState(false);
  const [memberSaving, setMemberSaving] = useState(false);

  // ── Info form ────────────────────────────────────────────────
  const form = useForm<InfoForm>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      name: "",
      tagline: "",
      vision: "",
      mission: "",
      contact_email: "",
      history: "",
      brand_primary: "#D2FA00",
      brand_secondary: "#F4622A",
      brand_accent: "#6B3FA0",
      brand_info: "#3EADD4",
      brand_light: "#F5F0E8",
      brand_dark: "#0D0D0D",
      location_label: "",
      location_map_url: "",
      milestones: [],
      benefits: [],
    },
  });

  const {
    fields: milestoneFields,
    append: appendMilestone,
    remove: removeMilestone,
  } = useFieldArray({ control: form.control, name: "milestones" });

  const {
    fields: benefitFields,
    append: appendBenefit,
    remove: removeBenefit,
  } = useFieldArray({ control: form.control, name: "benefits" });

  // Sync form with companyInfo data when editor opens
  useEffect(() => {
    if (!open || !companyInfo) return;
    form.reset({
      name: companyInfo.name ?? "",
      tagline: companyInfo.tagline ?? "",
      vision: companyInfo.vision ?? "",
      mission: companyInfo.mission ?? "",
      contact_email: companyInfo.contact_email ?? "",
      history: companyInfo.history ?? "",
      brand_primary: companyInfo.brand_colors?.primary ?? "#D2FA00",
      brand_secondary: companyInfo.brand_colors?.secondary ?? "#F4622A",
      brand_accent: companyInfo.brand_colors?.accent ?? "#6B3FA0",
      brand_info: companyInfo.brand_colors?.info ?? "#3EADD4",
      brand_light: companyInfo.brand_colors?.light ?? "#F5F0E8",
      brand_dark: companyInfo.brand_colors?.dark ?? "#0D0D0D",
      location_label: companyInfo.location_links?.label ?? "",
      location_map_url: companyInfo.location_links?.map_url ?? "",
      milestones: companyInfo.milestones.map((v) => ({ value: v })),
      benefits: companyInfo.benefits.map((v) => ({ value: v })),
    });
  }, [open, companyInfo, form]);

  const onSave: SubmitHandler<InfoForm> = async (data) => {
    setSaving(true);
    try {
      const payload: CompanyInfoUpdatePayload = {
        name: data.name,
        tagline: data.tagline,
        vision: data.vision,
        mission: data.mission,
        contact_email: data.contact_email || null,
        history: data.history || null,
        brand_colors: {
          primary: data.brand_primary,
          secondary: data.brand_secondary,
          accent: data.brand_accent,
          info: data.brand_info,
          light: data.brand_light,
          dark: data.brand_dark,
        },
        location_links:
          data.location_label
            ? { label: data.location_label, map_url: data.location_map_url }
            : null,
        milestones: data.milestones.map((m) => m.value).filter(Boolean),
        benefits: data.benefits.map((b) => b.value).filter(Boolean),
      };
      await onUpdateCompanyInfo(payload);
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
    defaultValues: {
      name: "",
      position: "",
      role_type: "core",
      parent_id: null,
      avatar_url: null,
    },
  });

  const onAddMember: SubmitHandler<MemberForm> = async (data) => {
    setMemberSaving(true);
    try {
      await onAddOrgMember({
        name: data.name,
        position: data.position,
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

  const parentName = (parentId: string | null) => {
    if (!parentId) return "—";
    return orgMembers.find((m) => m.id === parentId)?.name ?? "—";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>แก้ไขข้อมูลองค์กร</SheetTitle>
          <SheetDescription>
            เฉพาะ Admin เท่านั้นที่มีสิทธิ์แก้ไขข้อมูลนี้
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <Tabs defaultValue="general" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="general">ข้อมูลทั่วไป</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="content">เนื้อหา</TabsTrigger>
              <TabsTrigger value="orgchart">Org Chart</TabsTrigger>
            </TabsList>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSave)} id="org-info-form">
                {/* ── General Info ────────────────────────────── */}
                <TabsContent value="general" className="space-y-4 pb-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อองค์กร</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>อีเมลติดต่อ</FormLabel>
                        <FormControl><Input type="email" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vision</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mission</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="history"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ประวัติองค์กร</FormLabel>
                        <FormControl>
                          <Textarea rows={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* ── Branding ────────────────────────────────── */}
                <TabsContent value="branding" className="space-y-4 pb-4">
                  <p className="text-sm font-medium text-muted-foreground">Brand Colors</p>
                  <div className="space-y-2">
                    {(
                      [
                        ["brand_primary", "Primary"],
                        ["brand_secondary", "Secondary"],
                        ["brand_accent", "Accent"],
                        ["brand_info", "Info"],
                        ["brand_light", "Light"],
                        ["brand_dark", "Dark"],
                      ] as const
                    ).map(([fieldName, label]) => (
                      <FormField
                        key={fieldName}
                        control={form.control}
                        name={fieldName}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <ColorField
                                label={label}
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  <Separator />

                  <p className="text-sm font-medium text-muted-foreground">ที่ตั้ง</p>
                  <FormField
                    control={form.control}
                    name="location_label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อที่ตั้ง</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location_map_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Maps URL</FormLabel>
                        <FormControl><Input {...field} placeholder="https://maps.app.goo.gl/..." /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* ── Milestones & Benefits ────────────────────── */}
                <TabsContent value="content" className="space-y-6 pb-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Milestones</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => appendMilestone({ value: "" })}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่ม
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {milestoneFields.map((f, i) => (
                        <div key={f.id} className="flex gap-2">
                          <Input
                            {...form.register(`milestones.${i}.value`)}
                            placeholder="2025: ..."
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMilestone(i)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">สวัสดิการ</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => appendBenefit({ value: "" })}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่ม
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {benefitFields.map((f, i) => (
                        <div key={f.id} className="flex gap-2">
                          <Input
                            {...form.register(`benefits.${i}.value`)}
                            placeholder="สวัสดิการ..."
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBenefit(i)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </form>
            </Form>

            {/* ── Org Chart Members ────────────────────────────── */}
            <TabsContent value="orgchart" className="space-y-4 pb-4">
              {/* Existing members */}
              <div>
                <p className="text-sm font-medium mb-2">
                  สมาชิกปัจจุบัน ({orgMembers.length})
                </p>
                <div className="space-y-2">
                  {orgMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground">ยังไม่มีสมาชิก</p>
                  )}
                  {orgMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.position}
                          {member.parent_id && (
                            <> · รายงานต่อ {parentName(member.parent_id)}</>
                          )}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] flex-shrink-0 ${ROLE_COLORS[member.role_type as OrgMember["role_type"]] ?? ""}`}
                      >
                        {ROLE_LABELS[member.role_type as OrgMember["role_type"]] ?? member.role_type}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => void handleDeleteMember(member.id, member.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Add member form */}
              <p className="text-sm font-medium">เพิ่มสมาชิกใหม่</p>
              <Form {...memberForm}>
                <form
                  onSubmit={memberForm.handleSubmit(onAddMember)}
                  className="space-y-3"
                >
                  <FormField
                    control={memberForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อ</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={memberForm.control}
                    name="position"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ตำแหน่ง</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={memberForm.control}
                      name="role_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ประเภท</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="leadership">Leadership</SelectItem>
                              <SelectItem value="core">Core Team</SelectItem>
                              <SelectItem value="specialist">Specialist</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={memberForm.control}
                      name="parent_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>รายงานต่อ</FormLabel>
                          <Select
                            onValueChange={(v) =>
                              field.onChange(v === "none" ? null : v)
                            }
                            value={field.value ?? "none"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="ไม่มี (Root)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">ไม่มี (Root)</SelectItem>
                              {orgMembers.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={memberSaving}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {memberSaving ? "กำลังเพิ่ม..." : "เพิ่มสมาชิก"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer save button (only for non-orgchart tabs) */}
        <div className="px-6 py-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            form="org-info-form"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
