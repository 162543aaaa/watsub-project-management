import { Building2, Mail, Sparkles, Target } from "lucide-react";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getAvatarUrl } from "@/components/EmployeeAvatar";

function getInitial(name: string) {
  return (name.trim().split(/\s+/)[0]?.[0] || "?").toUpperCase();
}

export default function Organization() {
  const { companyInfo, leadershipTeam, isLoading, error } = useCompanyInfo();

  if (isLoading || !companyInfo) {
    return (
      <div className="min-h-full p-6 space-y-4">
        <div className="h-40 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 rounded-xl border border-border bg-card animate-pulse" />
          <div className="h-32 rounded-xl border border-border bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 sm:p-6 space-y-6">
      <section className="rounded-2xl border border-border p-6 sm:p-8 bg-gradient-to-br from-sky-500/15 via-cyan-500/10 to-violet-500/15">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-card/70 border border-border flex items-center justify-center overflow-hidden">
            {companyInfo.logo_url ? (
              <img src={companyInfo.logo_url} alt={companyInfo.name ?? "Organization logo"} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{companyInfo.name ?? "Organization Hub"}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {companyInfo.tagline ?? "Company profile and leadership overview"}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" /> Vision
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {companyInfo.vision ?? "No vision statement yet."}
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
              {companyInfo.mission ?? "No mission statement yet."}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Core Values</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {companyInfo.core_values.length > 0 ? (
            companyInfo.core_values.map((value) => (
              <Badge key={value} variant="secondary" className="px-3 py-1 text-xs">
                {value}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No core values configured.</p>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leadership Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
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
                  </div>
                </div>
              </div>
            ))}
          </div>

          {companyInfo.contact_email && (
            <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3.5 h-3.5" /> Contact: {companyInfo.contact_email}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
