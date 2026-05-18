import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (user && (isApproved || isAdmin)) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); return; }
    setSubmitting(true);
    const { data, error } = await signUp(email.trim(), password, displayName.trim());
    if (error) { setError(error.message); setSubmitting(false); return; }
    setNeedsEmailConfirm(!data.session);
    setSuccess(true);
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-4">
        <div className="w-full max-w-sm bg-card rounded-2xl border border-border/60 p-8 text-center" style={{ boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.15)" }}>
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">สมัครสำเร็จ!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {needsEmailConfirm
              ? "กรุณายืนยันอีเมลจากลิงก์ที่ส่งไปก่อน แล้วจึงเข้าสู่ระบบ"
              : "กรุณารอให้ Admin อนุมัติบัญชีของคุณก่อนเข้าสู่ระบบ"}
          </p>
          <Link to="/login"><Button variant="outline" className="w-full">กลับไปหน้าเข้าสู่ระบบ</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo_watsub.png" alt="WatSUB" className="w-20 h-20 object-contain mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-foreground">สมัครสมาชิก</h1>
          <p className="text-sm text-muted-foreground mt-1">สร้างบัญชีเพื่อเข้าใช้งาน</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border/60 p-6 space-y-4" style={{ boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.15)" }}>
          {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">ชื่อที่แสดง</label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="ชื่อของคุณ" required maxLength={100} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required autoComplete="email" />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">รหัสผ่าน</label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" required autoComplete="new-password" className="pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            <UserPlus className="w-4 h-4 mr-2" /> {submitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            มีบัญชีแล้ว? <Link to="/login" className="text-primary font-medium hover:underline">เข้าสู่ระบบ</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
