import { supabase } from "@/integrations/supabase/client";

function getAvatarUrl(avatar?: string | null): string | null {
  if (!avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  const { data } = supabase.storage.from("employee-assets").getPublicUrl(avatar);
  return data?.publicUrl || null;
}

function getInitial(name: string) {
  return (name.trim().split(/\s+/)[0]?.[0] || "").toUpperCase();
}

const defaultGradients = [
  "from-cyan-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-green-500",
];

interface EmployeeAvatarProps {
  name: string;
  avatar?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  index?: number;
  className?: string;
}

const sizeMap = {
  xs: { cls: "w-5 h-5", text: "text-[8px]" },
  sm: { cls: "w-7 h-7", text: "text-[10px]" },
  md: { cls: "w-8 h-8", text: "text-xs" },
  lg: { cls: "w-10 h-10", text: "text-sm" },
};

export default function EmployeeAvatar({ name, avatar, size = "sm", index = 0, className = "" }: EmployeeAvatarProps) {
  const url = getAvatarUrl(avatar);
  const s = sizeMap[size];
  const grad = defaultGradients[index % defaultGradients.length];

  if (url) {
    return <img src={url} alt="" className={`${s.cls} rounded-full object-cover flex-shrink-0 ${className}`} />;
  }
  return (
    <div className={`${s.cls} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white ${s.text} font-bold flex-shrink-0 ${className}`}>
      {getInitial(name)}
    </div>
  );
}

export { getAvatarUrl };
