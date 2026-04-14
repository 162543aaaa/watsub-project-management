import {
  Building2,
  Mail,
  Sparkles,
  Target,
  Users,
  BriefcaseBusiness,
  ShieldCheck,
  CircleAlert,
} from "lucide-react";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAvatarUrl } from "@/components/EmployeeAvatar";

function getInitial(name: string) {
  return (name.trim().split(/\s+/)[0]?.[0] || "?").toUpperCase();
}

export default function Organization() {
  const { companyInfo, leadershipTeam, teamSummary, stats, isLoading, error } = useCompanyInfo();

  if (isLoading) {
    return (
      <div className="min-h-full p-6 space-y-4">
        <div className="h-44 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 rounded-xl border border-border bg-card animate-pulse" />
          <div className="h-28 rounded-xl border border-border bg-card animate-pulse" />
          <div className="h-28 rounded-xl border border-border bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      <section className="rounded-2xl border border-border p-6 sm:p-8 bg-gradient-to-br from-sky-500/15 via-cyan-500/10 to-violet-500/15">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-card/70 border border-border flex items-center justify-center overflow-hidden">
              {companyInfo?.logo_url ? (
                <img src={companyInfo.logo_url} alt={companyInfo.name ?? "Organization logo"} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{companyInfo?.name ?? "Organization Hub"}</h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {companyInfo?.tagline ?? "People, culture, and strategic direction in one place"}
              </p>
            </div>
          </div>

          {companyInfo?.contact_email && (
            <Badge variant="secondary" className="w-fit gap-1.5 px-3 py-1.5">
              <Mail className="w-3.5 h-3.5" /> {companyInfo.contact_email}
            </Badge>
          )}
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>โหลดข้อมูลองค์กรไม่สำเร็จ</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>จำนวนพนักงานทั้งหมด</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> {stats.totalEmployees}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>พนักงานที่ Active</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> {stats.activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ทีมผู้นำ</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <BriefcaseBusiness className="w-5 h-5 text-primary" /> {stats.leadershipCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รูปแบบการจ้างงาน</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> {stats.teamModels}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full md:w-[460px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="values">Values</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-4 h-4 text-primary" /> Vision
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {companyInfo?.vision ?? "No vision statement configured yet."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-primary" /> Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {companyInfo?.mission ?? "No mission statement configured yet."}
                </p>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workforce Mix</CardTitle>
              <CardDescription>ภาพรวมสัดส่วนประเภททีมที่กำลังทำงานอยู่</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamSummary.length > 0 ? (
                teamSummary.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <p className="font-medium text-foreground capitalize">{item.label}</p>
                      <p className="text-muted-foreground">
                        {item.total} คน ({item.percentage}%)
                      </p>
                    </div>
                    <Progress value={item.percentage} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No employee data available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="people">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leadership Team</CardTitle>
              <CardDescription>ผู้ดูแลและหัวหน้าทีมหลักขององค์กร</CardDescription>
            </CardHeader>
            <CardContent>
              {leadershipTeam.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {leadershipTeam.map((member) => (
                    <div key={member.id} className="rounded-xl border border-border p-3 bg-card/40">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={getAvatarUrl(member.avatar) ?? undefined} alt={member.name} />
                          <AvatarFallback>{getInitial(member.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.position || "Team Member"}</p>
                          <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No leadership members found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="values">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Core Values</CardTitle>
              <CardDescription>หลักการที่ใช้ในการทำงานและการตัดสินใจของทีม</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {companyInfo?.core_values?.length ? (
                  companyInfo.core_values.map((value) => (
                    <Badge key={value} variant="secondary" className="px-3 py-1.5 text-xs">
                      {value}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No core values configured.</p>
                )}
              </div>

              <Separator />
              <p className="text-sm text-muted-foreground">
                อัปเดตล่าสุด: {companyInfo?.updated_at ? new Date(companyInfo.updated_at).toLocaleString() : "-"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
