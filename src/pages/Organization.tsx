import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  MapPinIcon,
  PencilIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";
import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useWiki, type WikiPage } from "@/hooks/useWiki";
import { InteractiveOrgChart } from "@/components/InteractiveOrgChart";

const OrgAdminEditor = lazy(() => import("@/components/OrgAdminEditor").then((module) => ({ default: module.OrgAdminEditor })));
import { Button } from "@/components/ui/button";
import {
  markdownExcerpt,
  organizationSectionPage,
  organizationWikiPages,
} from "@/lib/organizationKnowledge";

const FALLBACK = {
  name: "WatSUB! Studio",
  tagline: "Connect. Create. Inspire.",
  vision: "เชื่อมผู้คน ไอเดีย และโอกาส เพื่อสร้างระบบนิเวศสร้างสรรค์ที่เติบโตไปพร้อมกับเมือง",
  mission: "ทำหน้าที่เป็น Connector ระหว่างคนสร้างสรรค์ เมือง และโอกาสทางธุรกิจผ่านงานที่มีความหมาย",
  history: "WatSUB! Studio เติบโตจาก creative production studio สู่พื้นที่เชื่อมโยงคน ความรู้ และโอกาสในปัตตานี",
};

function KnowledgeCard({
  title,
  page,
  fallback,
}: {
  title: string;
  page?: WikiPage;
  fallback: string;
}) {
  const content = page ? markdownExcerpt(page.content) : fallback;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {page ? "Source: Company Wiki" : "Source: Legacy organization profile"}
          </p>
        </div>
        {page && (
          <Link
            to={`/wiki/${page.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Open <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </Link>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground/80">{content}</p>
    </div>
  );
}
function WikiLinkCard({ page }: { page: WikiPage }) {
  return (
    <Link
      to={`/wiki/${page.slug}`}
      className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary">{page.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {markdownExcerpt(page.content, 120) || "No content yet."}
          </p>
        </div>
        <ArrowTopRightOnSquareIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary" />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Updated {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
      </p>
    </Link>
  );
}

export default function Organization() {
  const { isAdmin } = useAuthContext();
  const company = useCompanyInfo();
  const wiki = useWiki();
  const [editorOpen, setEditorOpen] = useState(false);
  const organizationPages = organizationWikiPages(wiki.pages);
  const visionPage = organizationSectionPage(wiki.pages, "vision");
  const missionPage = organizationSectionPage(wiki.pages, "mission");
  const historyPage = organizationSectionPage(wiki.pages, "history");
  const featuredIds = new Set([visionPage?.id, missionPage?.id, historyPage?.id].filter(Boolean));
  const libraryPages = organizationPages.filter((page) => !featuredIds.has(page.id));

  const info = company.companyInfo;
  const name = info?.name || FALLBACK.name;
  const tagline = info?.tagline || FALLBACK.tagline;
  const location = info?.location_links;
  const brandColors = info?.brand_colors ?? undefined;

  if (company.isLoading) {
    return (
      <div className="p-6 space-y-6 page-enter">
        <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl border border-border bg-card animate-pulse" />
          ))}
        </div>
        <div className="h-72 rounded-2xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  const stats = [
    { label: "Team members", value: company.stats.totalEmployees },
    { label: "Active", value: company.stats.activeCount },
    { label: "Leadership", value: company.stats.leadershipCount },
    { label: "Team models", value: company.stats.teamModels },
  ];

  return (
    <div className="p-6 space-y-6 page-enter">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BuildingOffice2Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Studio organization</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">{name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {location?.label && (
                <a href={location.map_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
                  <MapPinIcon className="h-3.5 w-3.5" /> {location.label}
                </a>
              )}
              {info?.contact_email && (
                <span className="inline-flex items-center gap-1.5">
                  <EnvelopeIcon className="h-3.5 w-3.5" /> {info.contact_email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/wiki?category=Organization"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium hover:bg-muted"
          >
            <BookOpenIcon className="h-4 w-4" /> Organization Wiki
          </Link>
          {isAdmin && (
            <Button onClick={() => setEditorOpen(true)} className="gap-2">
              <PencilIcon className="h-4 w-4" /> Manage structure
            </Button>
          )}
        </div>
      </div>

      {(company.error || wiki.error) && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Some organization data could not be loaded. {company.error || wiki.error}
        </div>
      )}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-3xl font-bold tracking-tight text-foreground">{item.value}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Organization knowledge</h2>
            <p className="text-sm text-muted-foreground">Vision, mission and history are sourced from the Company Wiki when available.</p>
          </div>
          <span className="hidden text-xs text-muted-foreground sm:block">{organizationPages.length} wiki articles</span>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <KnowledgeCard title="Vision" page={visionPage} fallback={info?.vision || FALLBACK.vision} />
          <KnowledgeCard title="Mission" page={missionPage} fallback={info?.mission || FALLBACK.mission} />
          <KnowledgeCard title="History" page={historyPage} fallback={info?.history || FALLBACK.history} />
        </div>
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <UsersIcon className="h-5 w-5 text-primary" /> Team structure
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Operational reporting structure from organization data.</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Edit structure
              </button>
            )}
          </div>
          <div className="p-5">
            <InteractiveOrgChart tree={company.orgTree} brandColors={brandColors} />
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Organization Wiki</h2>
              <p className="mt-1 text-xs text-muted-foreground">Culture, handbook, benefits and studio references.</p>
            </div>
            <BookOpenIcon className="h-5 w-5 text-info" />
          </div>
          <div className="mt-4 space-y-3">
            {wiki.loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))
            ) : libraryPages.length > 0 ? (
              libraryPages.slice(0, 5).map((page) => <WikiLinkCard key={page.id} page={page} />)
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No additional Organization articles yet.
              </div>
            )}
          </div>
          <Link
            to="/wiki?category=Organization"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            View all organization knowledge <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </Link>
        </aside>
      </section>

      {isAdmin && editorOpen && (
        <Suspense fallback={null}>
          <OrgAdminEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          defaultTab="orgchart"
          companyInfo={company.companyInfo}
          orgMembers={company.orgMembers}
          onUpdateCompanyInfo={company.updateCompanyInfo}
          onAddOrgMember={company.addOrgMember}
          onUpdateOrgMember={company.updateOrgMember}
          onDeleteOrgMember={company.deleteOrgMember}
          onRefetch={company.refetch}
          />
        </Suspense>
      )}
    </div>
  );
}
