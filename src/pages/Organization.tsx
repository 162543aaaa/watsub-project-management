import {
  BookOpenIcon,
  BuildingOffice2Icon,
  ClockIcon,
  EnvelopeIcon,
  FolderOpenIcon,
  MapPinIcon,
  PhoneIcon,
  RectangleStackIcon,
  SwatchIcon,
  UsersIcon,
} from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import {
  brandPalette,
  brandVoice,
  contentPillars,
  deliveryCountdown,
  digitalOperatingSystem,
  driveArchitecture,
  groundRules,
  operatingRhythm,
  organizationProfile,
  projectFolderStandard,
  studioDna,
  teamLayers,
} from "@/data/organizationVault";

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
function ContactItem({ icon: Icon, children }: { icon: typeof MapPinIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export default function Organization() {
  return (
    <div className="page-enter space-y-8 p-4 sm:p-6 lg:space-y-10">
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)] lg:p-9">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-readable">
              <BuildingOffice2Icon className="h-4 w-4" /> Studio Organization
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
              {organizationProfile.name}
            </h1>
            <p className="mt-3 text-lg font-semibold text-foreground/80">{organizationProfile.tagline}</p>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              {organizationProfile.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
              <ContactItem icon={MapPinIcon}>{organizationProfile.location}</ContactItem>
              <ContactItem icon={EnvelopeIcon}>{organizationProfile.email}</ContactItem>
              <ContactItem icon={PhoneIcon}>{organizationProfile.phone}</ContactItem>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              <Link
                to="/wiki?category=Organization"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <BookOpenIcon className="h-4 w-4" /> Open Organization Wiki
              </Link>
              <span className="inline-flex items-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground">
                {organizationProfile.slogan}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Why WatSUB exists</p>
            <p className="mt-4 text-xl font-bold leading-snug text-foreground sm:text-2xl">
              “เราคือ CONNECTOR ที่อยู่ตรงกลาง เพื่อทำให้เกิดการเปลี่ยนแปลง”
            </p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{organizationProfile.purpose}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Metric value={organizationProfile.founded} label="Founded" />
              <Metric value="Pattani" label="Home base" />
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Studio DNA"
          title="Connect. Create. Inspire."
          description="แกนคิดหลักที่กำหนดทั้งงานครีเอทีฟ การทำงานกับเมือง และวิธีที่ WatSUB สร้างโอกาสร่วมกับคนอื่น"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {studioDna.map((item, index) => (
            <article key={item.key} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold tabular-nums text-muted-foreground">0{index + 1}</span>
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              </div>
              <h3 className="mt-8 text-2xl font-black tracking-tight text-foreground">{item.key}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          eyebrow="Content Architecture"
          title="Three pillars, one creative ecosystem"
          description="โครงสร้างคอนเทนต์ปี 2026 แยกหน้าที่ชัดเจนตั้งแต่การสร้างการรับรู้ ไปจนถึงเรื่องเล่าเชิงลึกและโอกาสทางธุรกิจ"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {contentPillars.map((pillar) => (
            <article key={pillar.key} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <p className="text-sm font-black text-primary-readable">{pillar.key}</p>
              <h3 className="mt-2 text-xl font-bold text-foreground">{pillar.title}</h3>
              <p className="mt-2 text-sm font-medium text-foreground/75">{pillar.promise}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {pillar.series.map((series) => (
                  <span key={series} className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {series}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Team Structure"
          title="A small core with an expandable specialist network"
          description="โครงสร้างทีมตาม Knowledge Vault แบ่งบทบาทเป็น Leadership & Strategic Advisory, Core Operations และ Specialist Network เพื่อให้ทีมเล็กเคลื่อนตัวได้เร็วและขยายกำลังตามโปรเจกต์"
        />
        <div className="grid gap-4 xl:grid-cols-3">
          {teamLayers.map((layer, layerIndex) => (
            <article key={layer.title} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-readable">
                  <UsersIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Layer {layerIndex + 1}</p>
                  <h3 className="text-sm font-bold text-foreground">{layer.title}</h3>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {layer.members.map((member) => (
                  <div key={member.name} className="border-l-2 border-border pl-3">
                    <p className="text-sm font-semibold text-foreground">{member.name}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{member.role}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-x-6 gap-y-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="order-1">
          <SectionHeading eyebrow="Operating Rhythm" title="How the studio moves through a working day" />
        </div>
        <div className="order-3 xl:order-2">
          <SectionHeading eyebrow="Delivery Discipline" title="Deadline countdown" />
        </div>
        <div className="order-2 h-full rounded-2xl border border-border bg-card p-5 sm:p-6 xl:order-3">
          <div className="space-y-0">
            {operatingRhythm.map((item, index) => (
              <div key={item.step} className="grid grid-cols-[72px_minmax(0,1fr)] gap-4">
                <div className="relative pb-6 text-xs font-black text-primary-readable">
                  {item.step}
                  {index < operatingRhythm.length - 1 && <span className="absolute left-0 top-6 h-[calc(100%-1.1rem)] w-px bg-border" />}
                </div>
                <div className="pb-6">
                  <h3 className="text-sm font-bold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="order-4 h-full rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="space-y-3">
            {deliveryCountdown.map((item) => (
              <div key={item.day} className="grid grid-cols-[54px_minmax(0,1fr)] gap-3 rounded-xl bg-muted/30 p-3">
                <span className="text-sm font-black text-primary-readable">{item.day}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{item.action}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Ground Rules"
          title="Five rules that keep the studio moving"
          description="หลักปฏิบัติจาก Daily Flow SOP ที่ช่วยลดคอขวดและทำให้การตัดสินใจหน้างานเร็วขึ้น"
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {groundRules.map((rule, index) => (
            <div key={rule} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-black text-primary-readable">0{index + 1}</p>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{rule}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Brand System"
          title="RAW / BOLD / WARM / LOCAL"
          description="Visual identity และน้ำเสียงที่ใช้เป็นมาตรฐานร่วมกันของสตูดิโอในปี 2026"
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <SwatchIcon className="h-5 w-5 text-primary-readable" />
              <h3 className="text-sm font-bold text-foreground">Brand palette</h3>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {brandPalette.map((color) => (
                <div key={color.hex} className="rounded-xl border border-border p-3">
                  <div className="h-16 rounded-lg border border-black/10" style={{ backgroundColor: color.hex }} />
                  <p className="mt-3 text-sm font-bold text-foreground">{color.name}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{color.hex}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{color.role}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="text-sm font-bold text-foreground">Tone of voice</h3>
            <div className="mt-5 space-y-4">
              {brandVoice.map((item) => (
                <div key={item.key} className="grid grid-cols-[72px_minmax(0,1fr)] gap-3">
                  <span className="text-xs font-black text-primary-readable">{item.key}</span>
                  <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Knowledge Infrastructure"
          title="Files, systems and reusable knowledge"
          description="WatSUB วางโครงสร้างไฟล์และระบบดิจิทัลให้ความรู้เดินทางต่อได้จากคนหนึ่งไปอีกคนหนึ่ง โดยไม่ต้องเริ่มใหม่ทุกครั้ง"
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <FolderOpenIcon className="h-5 w-5 text-primary-readable" />
              <h3 className="text-sm font-bold text-foreground">Drive architecture</h3>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {driveArchitecture.map((item) => (
                <div key={item.key} className="rounded-xl bg-muted/30 p-3">
                  <p className="text-xs font-black text-foreground">{item.key}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <RectangleStackIcon className="h-5 w-5 text-primary-readable" />
              <h3 className="text-sm font-bold text-foreground">Project folder standard</h3>
            </div>
            <div className="mt-5 space-y-3">
              {projectFolderStandard.map((item) => (
                <div key={item.key} className="border-l-2 border-primary/40 pl-3">
                  <p className="font-mono text-xs font-bold text-foreground">{item.key}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
      <section className="space-y-4">
        <SectionHeading eyebrow="Digital Operating System" title="The studio runs on one connected system" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {digitalOperatingSystem.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-readable">
                <ClockIcon className="h-4 w-4" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}
