# High-Fidelity Organization Profile Brand Redesign Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Create a high-fidelity, brand-aligned Organization Profile page using custom Stamp, Polaroid, and Bracket frames, and a pitch-dark glowing canvas.

**Architecture:** We will set a full-dark background (`#0c0d12`) with multiple blurred gradient neon glows in `src/pages/Organization.tsx`. The 3 Content Pillars will be rendered with custom-styled framing using the uploaded assets `/frame_stamp.png`, `/frame_polaroid.png`, and `/frame_bracket.png`.

**Tech Stack:** React, Tailwind CSS, Lucide icons, Vite.

---

### Task 1: Overhaul Frontend Page Styling & Layout

**Files:**
- Modify: `src/pages/Organization.tsx`

**Step 1: Replace layout and add custom brand styling**
Overhaul `src/pages/Organization.tsx` to use the premium dark theme with colorful glowing ambient backdrops, the new custom stacked `WatSUB!` logo, and the Stamp, Polaroid, and Bracket frame containers for `#VIBES`, `#SOUL`, and `#JOINT` pillars.

Replace the `return (...)` block and surrounding styling in `src/pages/Organization.tsx` with:
```tsx
  return (
    <div className="min-h-full bg-[#0c0d12] text-white font-sans relative overflow-hidden pb-12">
      {/* Ambient Neon Glows */}
      <div className="absolute top-[5%] left-[5%] w-[40vw] h-[40vw] bg-[#D2FA00]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[5%] w-[35vw] h-[35vw] bg-[#F4622A]/8 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[10%] w-[30vw] h-[30vw] bg-[#6B3FA0]/8 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[15%] w-[30vw] h-[30vw] bg-[#3EADD4]/8 rounded-full blur-[90px] pointer-events-none" />

      {/* Error banner */}
      {error && (
        <div className="p-4 relative z-10">
          <Alert variant="destructive" className="bg-destructive/90 text-white border-none">
            <CircleAlert className="h-4 w-4" />
            <AlertTitle>โหลดข้อมูลไม่สำเร็จ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HERO  —  dark bg, lime accent, brand logo
          ══════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden z-10 px-5 sm:px-8 pt-8 pb-10 border-b border-white/5">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-6 mb-8">
          <div className="space-y-4 max-w-3xl">
            {/* Custom Brand Header Row */}
            <div className="flex items-center gap-4">
              <img 
                src="/logo_watsub_stacked.png" 
                alt="WatSUB!" 
                className="h-16 w-auto object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] transform hover:scale-105 transition-transform duration-300"
              />
              <div className="h-10 w-[2px] bg-white/10" />
              <div>
                <span className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-[#D2FA00] uppercase block mb-0.5">
                  Organization Profile
                </span>
                <h2 className="text-sm sm:text-base font-black tracking-[0.15em] text-white/90 uppercase">
                  CONNECT. CREATE. INSPIRE.
                </h2>
              </div>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight mt-2 flex items-center gap-3">
                {name}
              </h1>
              <p className="text-white/60 text-base mt-1.5 font-medium">{tagline}</p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {locationLabel && (
                <a
                  href={locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs
                             bg-white/5 hover:bg-white/12 text-white/80 transition-colors border border-white/10 shadow-lg"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#F4622A]" />
                  {locationLabel}
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
              )}
              {companyInfo?.contact_email && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs
                                 bg-white/5 text-white/80 border border-white/10 shadow-lg">
                  <Mail className="w-3.5 h-3.5 text-[#3EADD4]" />
                  {companyInfo.contact_email}
                </span>
              )}
            </div>
          </div>

          {isAdmin && (
            <Button
              onClick={() => openEditor("general")}
              className="flex-shrink-0 font-bold text-black px-6 py-5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-[#D2FA00]/20"
              style={{ backgroundColor: brandColors.primary }}
            >
              <Pencil className="w-4 h-4 mr-2" />
              แก้ไของค์กร
            </Button>
          )}
        </div>

        {/* Stats row with premium glass styling */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "พนักงานทั้งหมด",  value: stats.totalEmployees,  hex: brandColors.primary   },
            { label: "Active Members",   value: stats.activeCount,     hex: brandColors.info      },
            { label: "Leadership",       value: stats.leadershipCount, hex: brandColors.accent    },
            { label: "ประเภทพนักงาน",   value: stats.teamModels,      hex: brandColors.secondary },
          ].map(({ label, value, hex }) => (
            <div
              key={label}
              className="rounded-2xl p-5 backdrop-blur-md border border-white/10 shadow-xl transition-all duration-300 hover:border-white/20"
              style={{ 
                backgroundColor: `${hex}10`,
                boxShadow: `inset 0 0 12px ${hex}05`
              }}
            >
              <p className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: hex }}>
                {value}
              </p>
              <p className="text-xs text-white/50 font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Brand color bar */}
      <div className="flex h-[4px] relative z-10 shadow-md">
        {Object.values(brandColors).map((hex, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: hex }} />
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN BENTO CONTENT
          ══════════════════════════════════════════════════════ */}
      <div className="p-4 sm:p-6 space-y-6 relative z-10 max-w-7xl mx-auto">

        {/* ── Vision + Mission ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GlassCard
            className="lg:col-span-7 relative group border-t-2 bg-slate-950/60"
            style={{ borderTopColor: brandColors.primary }}
          >
            {isAdmin && <EditHint onClick={() => openEditor("general")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base text-white">
                <Target className="w-4 h-4 text-[#D2FA00]" />
                Vision 2026
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-white/80 leading-relaxed font-medium">{vision}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard
            className="lg:col-span-5 relative group border-t-2 bg-slate-950/60"
            style={{ borderTopColor: brandColors.info }}
          >
            {isAdmin && <EditHint onClick={() => openEditor("general")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base text-white">
                <Sparkles className="w-4 h-4 text-[#3EADD4]" />
                Mission
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <p className="text-sm text-white/80 leading-relaxed font-medium">{mission}</p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* ── History + Milestones ──────────────────────────── */}
        <GlassCard
          className="relative group bg-slate-950/50"
        >
          {isAdmin && <EditHint onClick={() => openEditor("general")} />}
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2 text-base text-white">
              <History className="w-4 h-4 text-[#3EADD4]" />
              ประวัติองค์กร
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-white/80 font-medium">{history}</p>
            {/* Milestone timeline */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-4 border-t border-white/5">
              {milestones.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-1 text-xs text-white/90"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: Object.values(brandColors)[idx % 5] }} />
                  <span className="font-semibold">{m}</span>
                </div>
              ))}
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* ── Core Values (3 Pillars Custom Frames) + Brand Colors ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Core Values with High-Fidelity Custom Brand Frames */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#D2FA00]" />
              Core Values — 3 Pillars
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* #VIBES - Stamp Frame */}
              <div 
                className="relative h-64 p-6 flex flex-col justify-end overflow-hidden group shadow-lg hover:scale-[1.02] transition-transform duration-300 rounded-2xl"
                style={{
                  backgroundImage: "url('/frame_stamp.png')",
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                <div className="relative z-10 space-y-1.5">
                  <h4 className="text-base font-extrabold text-[#D2FA00] tracking-wider uppercase">
                    {CORE_VALUES[0].title.split(':')[0]}
                  </h4>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest block">
                    {CORE_VALUES[0].title.split(':')[1]}
                  </p>
                  <p className="text-xs text-white/90 leading-relaxed font-semibold">
                    {CORE_VALUES[0].detail}
                  </p>
                </div>
              </div>

              {/* #SOUL - Polaroid Frame */}
              <div 
                className="relative h-64 p-5 flex flex-col justify-between overflow-hidden group shadow-xl hover:scale-[1.02] transition-transform duration-300 rounded-lg transform rotate-1 hover:rotate-0"
                style={{
                  backgroundImage: "url('/frame_polaroid.png')",
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {/* Polaroid photo placeholder */}
                <div className="h-[70%] bg-gradient-to-br from-slate-900 to-indigo-950 border border-black/10 rounded flex items-center justify-center overflow-hidden">
                  <div className="absolute w-24 h-24 bg-[#6B3FA0]/20 rounded-full blur-2xl animate-pulse" />
                  <span className="text-2xl font-black text-white/20 select-none">#SOUL</span>
                </div>
                <div className="relative z-10 pt-2 pb-3 px-1 text-center">
                  <h4 className="text-[11px] font-extrabold text-[#0D0D0D] tracking-wide uppercase">
                    {CORE_VALUES[1].title}
                  </h4>
                  <p className="text-[9px] text-[#0D0D0D]/70 font-bold leading-tight mt-1">
                    {CORE_VALUES[1].detail}
                  </p>
                </div>
              </div>

              {/* #JOINT - Bracket Frame */}
              <div 
                className="relative h-64 p-6 flex flex-col justify-end overflow-hidden group shadow-lg hover:scale-[1.02] transition-transform duration-300 rounded-2xl"
                style={{
                  backgroundImage: "url('/frame_bracket.png')",
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                <div className="relative z-10 space-y-1.5">
                  <h4 className="text-base font-extrabold text-[#F4622A] tracking-wider uppercase">
                    {CORE_VALUES[2].title.split(':')[0]}
                  </h4>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest block">
                    {CORE_VALUES[2].title.split(':')[1]}
                  </p>
                  <p className="text-xs text-white/90 leading-relaxed font-semibold">
                    {CORE_VALUES[2].detail}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Colors palette box */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#3EADD4]" />
              Brand Colors
            </h3>
            <GlassCard className="relative group bg-slate-950/60 p-5 h-[272px] flex flex-col justify-between">
              {isAdmin && <EditHint onClick={() => openEditor("branding")} />}
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(brandColors).map(([key, hex]) => (
                  <div key={key} className="space-y-1.5">
                    <div
                      className="h-12 rounded-xl shadow-md border border-white/10 transition-transform duration-300 hover:scale-105"
                      style={{ 
                        backgroundColor: hex,
                        boxShadow: `0 4px 10px ${hex}20`
                      }}
                    />
                    <p className="text-[10px] font-bold text-white/80">{COLOR_LABELS[key] ?? key}</p>
                    <p className="text-[9px] text-white/40 font-mono tracking-tight">{hex}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ── Benefits + Resources ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GlassCard className="lg:col-span-8 relative group bg-slate-950/60">
            {isAdmin && <EditHint onClick={() => openEditor("content")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base text-white">
                <Gift className="w-4 h-4 text-[#D2FA00]" />
                สวัสดิการพนักงาน
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="flex flex-wrap gap-2.5">
                {benefits.map((b) => (
                  <Badge
                    key={b}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-white/90 border border-white/15 hover:bg-white/10 transition-colors"
                  >
                    {b}
                  </Badge>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>

          <GlassCard className="lg:col-span-4 relative group bg-slate-950/60">
            {isAdmin && <EditHint onClick={() => openEditor("content")} />}
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2 text-base text-white">
                <Link2 className="w-4 h-4 text-[#3EADD4]" />
                Resources & Location
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3 text-sm font-medium">
              {locationLabel && (
                <a
                  href={locationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[#F4622A]" />
                  <span className="hover:underline">{locationLabel}</span>
                </a>
              )}
              {resources.map((r) => (
                <a
                  key={r.label}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-[#3EADD4]" />
                  <span className="hover:underline">{r.label}</span>
                </a>
              ))}
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* ── Interactive Org Chart ─────────────────────────── */}
        <GlassCard className="bg-slate-950/60 border border-white/10">
          <GlassCardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <GlassCardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5 text-[#D2FA00]" />
                  Interactive Org Chart
                </GlassCardTitle>
                <GlassCardDescription className="mt-1 text-white/50 font-medium">
                  คลิกที่ node เพื่อย่อ / ขยายสาขาของทีม
                </GlassCardDescription>
              </div>
              {isAdmin && (
                <Button
                  onClick={() => openEditor("org")}
                  variant="outline"
                  className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  จัดการทีม
                </Button>
              )}
            </div>
          </GlassCardHeader>
          <GlassCardContent>
            <InteractiveOrgChart tree={orgTree} brandColors={brandColors} />
          </GlassCardContent>
        </GlassCard>

      </div>

      {/* Admin sheet editor */}
      <OrgAdminEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        defaultTab={editorTab}
        companyInfo={companyInfo}
        orgMembers={orgMembers}
        onUpdateInfo={updateCompanyInfo}
        onAddMember={addOrgMember}
        onUpdateMember={updateOrgMember}
        onDeleteMember={deleteOrgMember}
      />
    </div>
  );
```

**Step 2: Commit**
```bash
git add src/pages/Organization.tsx
git commit -m "feat: overhaul Organization Profile UI to 100% brand-aligned custom dark theme with frames"
```

---

### Task 2: Validate Compilation & Production Build

**Step 1: Check TypeScript Compilation**
Verify there are no TypeScript build or compile errors.
Run: `npx tsc --noEmit`
Expected: PASS (No errors)

**Step 2: Run Production Build**
Verify Vite builds the entire bundle into production-ready output successfully.
Run: `npm run build`
Expected: PASS (Success)

**Step 3: Run Vitest Unit Tests**
Verify all unit tests continue to pass perfectly.
Run: `npm run test`
Expected: PASS (39 tests passed)

**Step 4: Commit**
```bash
git add src/pages/Organization.tsx
git commit -m "test: verify build and tests pass for organization profile redesign"
```
