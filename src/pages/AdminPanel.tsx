import { ArrowPathIcon, CheckIcon, ChevronDownIcon, PencilIcon, ShieldCheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { autoSyncToGoogleSheets } from "@/utils/googleSheetsSync";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { Profile, UserRole } from "@/hooks/useAuth";
import { useSyncData } from "@/hooks/useSyncData";
import { PRESETS, detectPreset, presetLabel, type PermissionPreset } from "@/lib/permissionPresets";
import { normalizeAllowedPages } from "@/lib/pageAccess";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const ALL_PAGES = [
  { path: "/", label: "Dashboard" },
  { path: "/my-work", label: "My Work" },
  { path: "/tasks", label: "Tasks" },
  { path: "/projects", label: "Projects" },
  { path: "/customers", label: "Customers" },
  { path: "/calendar", label: "Calendar" },
  { path: "/okrs", label: "OKRs" },
  { path: "/team", label: "Team" },
  { path: "/workload", label: "Team Workload" },
  { path: "/manager", label: "Manager Dashboard" },
  { path: "/organization", label: "Organization Hub" },
  { path: "/wiki", label: "Wiki" },
  { path: "/meetings", label: "Meetings" },
  { path: "/onsite-work", label: "On-site Work" },
  { path: "/leave", label: "Leave" },
  { path: "/budget", label: "Budget" },
  { path: "/kpi/overview", label: "KPI Overview" },
  { path: "/kpi/evaluate", label: "KPI Evaluate" },
  { path: "/kpi/report", label: "KPI Report" },
  { path: "/reports", label: "Reports" },
  { path: "/notifications", label: "Notifications" },
  { path: "/import", label: "Import" },
];


interface UserInfo {
  profile: Profile;
  roles: UserRole[];
  email: string;
}

export default function AdminPanel() {
  const { isAdmin, loading: authLoading } = useAuthContext();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserInfo | null>(null);
  const { isSyncing, handleSyncAll } = useSyncData();

  const handleDeleteUser = async (userId: string, purge = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: purge ? "purge-user" : "delete-user", user_id: userId },
      });
      if (error) {
        console.error("Supabase function delete-user error:", error);
        toast({ title: "เกิดข้อผิดพลาดในการระงับ/เก็บข้อมูลผู้ใช้", description: error.message, variant: "destructive" });
      } else if (data?.error) {
        console.error("Supabase function delete-user data error:", data.error);
        toast({ title: "เกิดข้อผิดพลาดในการระงับ/เก็บข้อมูลผู้ใช้", description: data.error, variant: "destructive" });
      } else {
        toast({ title: purge ? "ลบบัญชีผู้ใช้ออกจากระบบสำเร็จ!" : "เก็บถาวรและระงับสิทธิ์การใช้งานผู้ใช้สำเร็จ!" });
        fetchUsers();
      }
    } catch (err) {
      console.error("handleDeleteUser catch block error:", err);
      toast({ title: "เกิดข้อผิดพลาด", description: String(err), variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [{ data: profiles, error: profError }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: true }),
        supabase.from("user_roles").select("*"),
      ]);

      if (profError) {
        console.error("profiles error:", profError);
        toast({ title: "Error loading users", description: profError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const usersData: UserInfo[] = (profiles ?? [])
        .filter(p => !(p as any).is_archived)
        .map(p => ({
          profile: p as unknown as Profile,
          roles: ((roles ?? []) as UserRole[]).filter(r => r.user_id === p.user_id),
          email: "",
        }));

      setUsers(usersData);
    } catch (err) {
      console.error("fetchUsers error:", err);
      toast({ title: "Unexpected error", description: String(err), variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  if (authLoading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleApprove = async (userId: string, approve: boolean) => {
    const current = users.find((u) => u.profile.user_id === userId)?.profile;
    const sanitizedPages = normalizeAllowedPages(current?.allowed_pages);
    const nextAllowedPages = approve
      ? (sanitizedPages.length > 0 ? sanitizedPages : ["*"])
      : sanitizedPages;

    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: approve, allowed_pages: nextAllowedPages })
      .eq("user_id", userId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: approve ? "อนุมัติสำเร็จ!" : "ระงับสำเร็จ" });
    fetchUsers();
  };

  const handleToggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (currentlyAdmin) {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      void autoSyncToGoogleSheets("user_roles", { id: userId }, "delete");
    } else {
      // Add admin role (upsert by trying insert first)
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (error && !error.message.includes("duplicate")) {
        toast({ title: "Error", description: error.message, variant: "destructive" }); return;
      }
    }
    toast({ title: currentlyAdmin ? "ถอดสิทธิ์ Admin แล้ว" : "เพิ่มสิทธิ์ Admin แล้ว" });
    fetchUsers();
  };

  const handleTogglePage = async (userId: string, currentPages: string[], pagePath: string) => {
    let newPages: string[];
    if (currentPages.includes("*")) {
      newPages = ALL_PAGES.map(p => p.path).filter(p => p !== pagePath);
    } else if (currentPages.includes(pagePath)) {
      newPages = currentPages.filter(p => p !== pagePath);
    } else {
      newPages = [...currentPages, pagePath];
    }
    const previousPages = currentPages;
    setUsers(prev => prev.map(u =>
      u.profile.user_id === userId
        ? { ...u, profile: { ...u.profile, allowed_pages: newPages } }
        : u
    ));
    const { error } = await supabase
      .from("profiles")
      .update({ allowed_pages: newPages })
      .eq("user_id", userId);
    if (error) {
      setUsers(prev => prev.map(u =>
        u.profile.user_id === userId
          ? { ...u, profile: { ...u.profile, allowed_pages: previousPages } }
          : u
      ));
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    }
  };

  const handleSetAllPages = async (userId: string) => {
    const previousPages = users.find(u => u.profile.user_id === userId)?.profile.allowed_pages || [];
    setUsers(prev => prev.map(u =>
      u.profile.user_id === userId
        ? { ...u, profile: { ...u.profile, allowed_pages: ["*"] } }
        : u
    ));
    const { error } = await supabase
      .from("profiles")
      .update({ allowed_pages: ["*"] })
      .eq("user_id", userId);
    if (error) {
      setUsers(prev => prev.map(u =>
        u.profile.user_id === userId
          ? { ...u, profile: { ...u.profile, allowed_pages: previousPages } }
          : u
      ));
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "เปิดทุกหน้าแล้ว" });
  };

  const applyPreset = async (userId: string, key: PermissionPreset) => {
    const def = PRESETS.find((p) => p.key === key);
    if (!def) return;
    const previous = users.find((u) => u.profile.user_id === userId)?.profile.allowed_pages || [];
    setUsers((prev) => prev.map((u) =>
      u.profile.user_id === userId
        ? { ...u, profile: { ...u.profile, allowed_pages: def.pages } }
        : u,
    ));
    const { error } = await supabase
      .from("profiles")
      .update({ allowed_pages: def.pages })
      .eq("user_id", userId);
    if (error) {
      setUsers((prev) => prev.map((u) =>
        u.profile.user_id === userId
          ? { ...u, profile: { ...u.profile, allowed_pages: previous } }
          : u,
      ));
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `ตั้ง preset: ${def.label}` });
  };

  const pendingUsers = users.filter(u => !u.profile.is_approved);
  const approvedUsers = users.filter(u => u.profile.is_approved);

  return (
    <div className="p-4 md:p-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">จัดการผู้ใช้และสิทธิ์การเข้าถึง</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-1.5">
            <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleSyncAll} disabled={isSyncing}>
            {isSyncing ? "กำลัง Sync All Data..." : "Sync All Data"}
          </Button>
        </div>
      </div>

      {/* Pending Users */}
      {pendingUsers.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            รอการอนุมัติ ({pendingUsers.length})
          </h2>
          <div className="space-y-2">
            {pendingUsers.map(u => (
              <div key={u.profile.user_id} className="bg-card rounded-xl border border-border/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.profile.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(u.profile.created_at).toLocaleDateString("th")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(u.profile.user_id, true)} className="gap-1">
                    <CheckIcon className="w-3.5 h-3.5" /> อนุมัติ
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleApprove(u.profile.user_id, false)} className="gap-1">
                    <XMarkIcon className="w-3.5 h-3.5" /> ปฏิเสธ
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDeleteUser(u)}
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                    title="ลบสมาชิกออกโดยถาวร"
                  >
                    <TrashIcon className="w-3.5 h-3.5" /> ลบออก
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Users */}
      <h2 className="text-base font-semibold mb-3">
        สมาชิกทั้งหมด ({approvedUsers.length})
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : approvedUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          ยังไม่มีสมาชิกที่ได้รับการอนุมัติ
        </div>
      ) : (
        <div className="space-y-2">
          {approvedUsers.map(u => {
            const userIsAdmin = u.roles.some(r => r.role === "admin");
            const expanded = expandedUser === u.profile.user_id;
            const pages = normalizeAllowedPages(u.profile.allowed_pages);
            return (
              <div key={u.profile.user_id} className="bg-card rounded-xl border border-border/60 overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{u.profile.display_name}</p>
                      {userIsAdmin && (
                        <span className="text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-md">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {pages.includes("*") ? "เข้าถึงทุกหน้า" : `${pages.length} หน้า`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={userIsAdmin ? "destructive" : "secondary"}
                      onClick={() => handleToggleAdmin(u.profile.user_id, userIsAdmin)}
                      className="gap-1 text-xs"
                    >
                      <PencilIcon className="w-3.5 h-3.5" /> {userIsAdmin ? "ถอด Admin" : "ตั้ง Admin"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedUser(expanded ? null : u.profile.user_id)}
                      className="gap-1 text-xs"
                    >
                      <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} /> สิทธิ์หน้า
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApprove(u.profile.user_id, false)}
                      className="text-xs text-destructive hover:bg-destructive/5"
                    >
                      ระงับ
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteUser(u)}
                      className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                    >
                      <TrashIcon className="w-3.5 h-3.5" /> ลบออก
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border/40 p-4 bg-muted/30">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <p className="text-xs font-medium text-muted-foreground">
                        หน้าที่เข้าถึงได้ · Preset:{" "}
                        <span className="font-semibold text-foreground">
                          {presetLabel(detectPreset(pages))}
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <select
                          className="text-xs rounded-lg border border-border bg-background px-2 py-1"
                          value={detectPreset(pages)}
                          onChange={(e) => {
                            const v = e.target.value as PermissionPreset;
                            if (v !== "custom") applyPreset(u.profile.user_id, v);
                          }}
                        >
                          <option value="custom">— Custom —</option>
                          {PRESETS.map((p) => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                          ))}
                        </select>
                        <Button size="sm" variant="ghost" className="text-xs"
                          onClick={() => handleSetAllPages(u.profile.user_id)}>
                          เปิดทุกหน้า
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {ALL_PAGES.map(page => {
                        const active = pages.includes("*") || pages.includes(page.path);
                        return (
                          <button
                            key={page.path}
                            onClick={() => handleTogglePage(u.profile.user_id, pages, page.path)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ease-out active:scale-95 ${
                              active
                                ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                                : "bg-muted/50 border-border/40 text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {page.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!confirmDeleteUser}
        onOpenChange={(open) => { if (!open) setConfirmDeleteUser(null); }}
        onConfirm={() => {
          if (!confirmDeleteUser) return;
          handleDeleteUser(confirmDeleteUser.profile.user_id);
          setConfirmDeleteUser(null);
        }}
        title="ยืนยันการเก็บถาวรและระงับสิทธิ์ผู้ใช้"
        description={`คุณแน่ใจหรือไม่ว่าต้องการเก็บถาวรและระงับสิทธิ์การใช้งานผู้ใช้ "${confirmDeleteUser?.profile.display_name}"? บัญชีนี้จะถูกระงับสิทธิ์เข้าใช้งานและข้อมูลจะถูกเก็บถาวรในระบบ`}
      />
    </div>
  );
}
