import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { GlobalLoadingScreen } from "@/components/LoadingScreen";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const { user, isApproved, isAdmin, signIn, resendSignupConfirmation, loading } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <GlobalLoadingScreen />;
  if (user && (isApproved || isAdmin)) return <Navigate to="/" replace />;
  if (user && !isApproved && !isAdmin) return <Navigate to="/waiting-approval" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNeedsEmailConfirm(false);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error.message);
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setNeedsEmailConfirm(true);
      }
    }
    setSubmitting(false);
  };

  const handleResend = async () => {
    if (!email.trim()) return;
    const { error } = await resendSignupConfirmation(email.trim());
    if (error) {
      setError(error.message);
      return;
    }
    setError("ส่งอีเมลยืนยันอีกครั้งแล้ว กรุณาตรวจสอบ Inbox/Spam");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo_watsub.png" alt="WatSUB" className="w-20 h-20 object-contain mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-foreground">WatSUB-Project Management</h1>
          <p className="text-sm text-muted-foreground mt-1">เข้าสู่ระบบ</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/60 p-6 space-y-4" style={{ boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.15)" }}>
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
          {needsEmailConfirm && (
            <button
              type="button"
              onClick={handleResend}
              className="w-full text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted transition-colors"
            >
              ส่งอีเมลยืนยันอีกครั้ง
            </button>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required autoComplete="email" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">รหัสผ่าน</label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" className="pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            <LogIn className="w-4 h-4 mr-2" /> {submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            ยังไม่มีบัญชี? <Link to="/signup" className="text-primary font-medium hover:underline">สมัครสมาชิก</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
