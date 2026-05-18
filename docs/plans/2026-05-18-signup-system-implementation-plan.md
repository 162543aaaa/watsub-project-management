# Premium Auto-Approve Signup System Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Create a premium, responsive, auto-approved, and email-verification-bypassed signup system.

**Architecture:** Database trigger updates automatically approve new profiles. Frontend overhaul introduces modern glassmorphism, responsive split-screen layouts, transitions, and direct dashboard redirect on session detection.

**Tech Stack:** React, Tailwind CSS, Lucide icons, Supabase Auth & Database migrations, Vite.

---

### Task 1: SQL Migration for Auto-Approval

**Files:**
- Create: `supabase/migrations/20260604050000_auto_approve_new_users.sql`

**Step 1: Create the SQL migration file**
Create the migration file to update the `public.handle_new_user()` database trigger. This ensures all new registered accounts are automatically approved (`is_approved = true`) and have wildcard module access (`allowed_pages = ARRAY['*']`).

Write the following SQL to the new migration:
```sql
-- Migration to automatically approve all new signups and grant full page access.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_approved, allowed_pages)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, ''),
    true,                   -- Auto-approve immediately!
    ARRAY['*']::text[]      -- Grant access to all modules/pages!
  )
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name);

  RETURN NEW;
END;
$$;
```

**Step 2: Commit the migration**
```bash
git add supabase/migrations/20260604050000_auto_approve_new_users.sql
git commit -m "migration: auto-approve new signups and grant full access by default"
```

---

### Task 2: Overhaul the Frontend UI/UX Design (`Signup.tsx`)

**Files:**
- Modify: `src/pages/Signup.tsx`

**Step 1: Modify `src/pages/Signup.tsx` with premium UI structure**
Replace the visual layout of `src/pages/Signup.tsx` with a high-fidelity modern split-screen design.

On large screens (`lg:grid`), it will show a stunning branding and interactive visual panel on the left (Glassmorphism card, slow pulsating background glow, logo, and elegant typography), and the registration card on the right (with glassmorphism container, floating text focus effects, and smooth keyframe entry animations).

Code to replace/use:
```typescript
import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { UserPlus, Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Signup() {
  const { user, isApproved, isAdmin, signUp, loading } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && (isApproved || isAdmin)) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await signUp(email.trim(), password, displayName.trim());
      if (signUpError) {
        setError(signUpError.message);
        setSubmitting(false);
        return;
      }
      
      const sessionActive = !!data.session;
      setNeedsEmailConfirm(!sessionActive);
      setSuccess(true);
      
      if (sessionActive) {
        toast.success("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!", {
          description: "กำลังพาคุณไปยังหน้าแดชบอร์ด...",
          duration: 3000,
        });
      } else {
        toast.success("สมัครสมาชิกสำเร็จ!", {
          description: "กรุณาตรวจสอบกล่องจดหมายเพื่อยืนยันอีเมล",
          duration: 4000,
        });
      }
    } catch (err: any) {
      setError(err?.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/10 to-background p-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse duration-[8000ms]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse duration-[6000ms]" />

        <div className="w-full max-w-md bg-card/60 backdrop-blur-xl rounded-2xl border border-border/80 p-8 text-center shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">สมัครสมาชิกสำเร็จ!</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {needsEmailConfirm
              ? "ระบบได้ส่งลิงก์ยืนยันตัวตนไปยังอีเมลของคุณเรียบร้อยแล้ว กรุณายืนยันก่อนเข้าใช้งาน"
              : "ยินดีต้อนรับ! บัญชีของคุณได้รับการอนุมัติอัตโนมัติแล้ว กำลังนำท่านเข้าสู่ระบบ..."}
          </p>
          <Link to="/login" className="block w-full">
            <Button className="w-full group">
              เข้าสู่ระบบ <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-background relative overflow-hidden font-sans">
      {/* Background Animated Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-3xl animate-pulse duration-[10000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/15 rounded-full blur-3xl animate-pulse duration-[8000ms]" />

      {/* Left Column: Premium Branding Panel */}
      <div className="hidden lg:flex lg:col-span-5 relative bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-12 flex-col justify-between overflow-hidden border-r border-border/10">
        {/* Visual Gradients */}
        <div className="absolute top-1/4 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse duration-[7000ms]" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse duration-[9000ms]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo_watsub.png" alt="WatSUB Logo" className="w-10 h-10 object-contain filter drop-shadow-md" />
          <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-primary">WatSUB</span>
        </div>

        <div className="relative z-10 my-auto space-y-6">
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            ยกระดับการจัดการโปรเจกต์ของคุณให้ <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-400 to-primary">ทรงพลัง และพรีเมียม</span>
          </h2>
          <p className="text-slate-350 text-base max-w-md leading-relaxed">
            ระบบบริหารจัดการงาน โครงการ และทรัพยากรบุคคลแบบครบวงจร ที่มาพร้อมอินเทอร์เฟซระดับสูง ดีไซน์ล้ำสมัย และระบบอัตโนมัติอัจฉริยะ
          </p>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">✓</div>
              <span>ลงทะเบียนแล้วเข้าใช้งานระบบได้ทันที 100%</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">✓</div>
              <span>ไม่ต้องรอ Admin อนุมัติสิทธิ์การเข้าใช้งาน</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">✓</div>
              <span>อินเทอร์เฟซพรีเมียม ตอบสนองรวดเร็ว ปลอดภัย</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} WatSUB Project Management. All rights reserved.
        </div>
      </div>

      {/* Right Column: Form Panel */}
      <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {/* Header */}
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-4">
              <img src="/logo_watsub.png" alt="WatSUB" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">สมัครสมาชิก</h1>
            <p className="text-sm text-muted-foreground mt-2">สร้างบัญชีผู้ใช้ใหม่และเริ่มต้นจัดการงานของคุณได้ทันที</p>
          </div>

          {/* Form Card */}
          <div className="bg-card/40 backdrop-blur-xl border border-border/80 rounded-2xl p-8 shadow-2xl transition-all duration-300 hover:shadow-primary/5 hover:border-border">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 animate-in fade-in duration-200">
                  {error}
                </div>
              )}

              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground block">ชื่อที่แสดง</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <User className="w-4 h-4" />
                  </span>
                  <Input 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)} 
                    placeholder="สมชาย ใจดี" 
                    required 
                    maxLength={100}
                    className="pl-10 h-11 bg-background/50 border-border/80 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground block">อีเมล</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail className="w-4 h-4" />
                  </span>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="name@company.com" 
                    required 
                    autoComplete="email"
                    className="pl-10 h-11 bg-background/50 border-border/80 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground block">รหัสผ่าน</label>
                <div className="relative group">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="w-4 h-4" />
                  </span>
                  <Input 
                    type={showPw ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร" 
                    required 
                    autoComplete="new-password" 
                    className="pl-10 pr-10 h-11 bg-background/50 border-border/80 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPw(!showPw)} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" 
                    aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl font-medium mt-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-background border-t-transparent" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span>สมัครสมาชิก</span>
                  </div>
                )}
              </Button>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  มีบัญชีอยู่แล้ว?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline transition-all">
                    เข้าสู่ระบบ
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit the changes**
```bash
git add src/pages/Signup.tsx
git commit -m "feat: redesign signup page to premium split-screen layout with animations"
```

---

### Task 3: Add Routing Redirect Tests

**Files:**
- Create: `src/test/signupRedirect.test.tsx`

**Step 1: Write the routing redirect unit test**
Create a new test file to verify that a logged in and approved user is blocked from viewing `/signup` and redirected, whereas non-logged-in users can view it properly.

Create file `src/test/signupRedirect.test.tsx` with:
```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Signup from "../pages/Signup";
import { useAuthContext } from "../contexts/AuthContext";

// Mock the Auth Context
vi.mock("../contexts/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

describe("Signup Redirect Flow", () => {
  it("renders the signup form when there is no user", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isApproved: false,
      isAdmin: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      resendSignupConfirmation: vi.fn(),
      signOut: vi.fn(),
      loading: false,
      session: null,
      profile: null,
      roles: [],
      canAccessPage: vi.fn(),
      refetchProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    // Verify form renders
    expect(screen.getAllByText("สมัครสมาชิก").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("สมชาย ใจดี")).toBeInTheDocument();
  });

  it("shows spinner when loading and no user is present", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isApproved: false,
      isAdmin: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      resendSignupConfirmation: vi.fn(),
      signOut: vi.fn(),
      loading: true,
      session: null,
      profile: null,
      roles: [],
      canAccessPage: vi.fn(),
      refetchProfile: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
```

**Step 2: Run tests to verify they pass**
Run: `npm run test`
Expected: ALL tests pass, including the new `signupRedirect.test.tsx`.

**Step 3: Commit**
```bash
git add src/test/signupRedirect.test.tsx
git commit -m "test: add unit tests for signup routing and loading spinner states"
```

---

### Task 4: Local Application Verification

**Step 1: Run the dev server**
Run: `npm run dev`
Expected: Server starts successfully without any compilation errors.

**Step 2: Preview the Signup page visually**
Open the browser, navigate to the `/signup` route, and ensure the split-screen design, Glassmorphism gradients, responsive collapsing on mobile viewports, eye password toggles, and form submission transitions perform flawlessly and beautifully.
