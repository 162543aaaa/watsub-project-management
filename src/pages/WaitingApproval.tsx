import { useAuthContext } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import DelicateAsciiDots from "@/components/DelicateAsciiDots";

export default function WaitingApproval() {
  const { user, isApproved, isAdmin, signOut, loading, refetchProfile } = useAuthContext();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isApproved || isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <DelicateAsciiDots />
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border/60 p-8 text-center relative z-10" style={{ boxShadow: "0 10px 30px -10px hsl(var(--primary) / 0.15)" }}>
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-600 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">รอการอนุมัติ</h2>
        <p className="text-sm text-muted-foreground mb-6">
          บัญชีของคุณกำลังรอ Admin อนุมัติ<br />กรุณารอสักครู่
        </p>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={() => refetchProfile()}>
            ตรวจสอบสถานะ
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" /> ออกจากระบบ
          </Button>
        </div>
      </div>
    </div>
  );
}
