import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { UserPlus, Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import DelicateAsciiDots from "@/components/DelicateAsciiDots";

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
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <DelicateAsciiDots />
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
      <DelicateAsciiDots />
      {/* Background Animated Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-3xl animate-pulse duration-[10000ms] -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-500/15 rounded-full blur-3xl animate-pulse duration-[8000ms] -z-10" />

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
          <p className="text-slate-300 text-base max-w-md leading-relaxed">
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

        <div className="relative z-10 text-xs text-slate-550">
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
