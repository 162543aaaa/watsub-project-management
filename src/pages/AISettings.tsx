import { useState } from "react";
import {
  Bot, Key, Shield, Zap, Eye, EyeOff, Save, Loader2, Cpu, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────
type Provider = "gemini" | "claude";

interface AIFeatures {
  aiProjectManager: boolean;
  smartTaskReassignment: boolean;
}

// ── Provider / Model config ───────────────────────────────────────────────────
const PROVIDERS: {
  id: Provider;
  name: string;
  tagline: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  accentStyle: React.CSSProperties;
  selectedBorderStyle: React.CSSProperties;
  keyPlaceholder: string;
  keyLabel: string;
  prefixLen: number;       // chars to show unmasked at start
}[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Fast & multimodal",
    Icon: Zap,
    iconClass: "text-amber-400",
    accentStyle:  { background: "hsl(45 93% 50% / 0.10)", borderColor: "hsl(45 93% 50% / 0.35)" },
    selectedBorderStyle: { borderColor: "hsl(45 93% 55%)", background: "hsl(45 93% 50% / 0.14)" },
    keyPlaceholder: "AIzaSy••••••••••••••••••••••••••••••",
    keyLabel: "Gemini API Key",
    prefixLen: 6,
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    tagline: "Intelligent & precise",
    Icon: Cpu,
    iconClass: "text-orange-400",
    accentStyle:  { background: "hsl(25 90% 55% / 0.10)", borderColor: "hsl(25 90% 55% / 0.35)" },
    selectedBorderStyle: { borderColor: "hsl(25 90% 58%)", background: "hsl(25 90% 55% / 0.14)" },
    keyPlaceholder: "sk-ant-••••••••••••••••••••••••••••",
    keyLabel: "Claude (Anthropic) API Key",
    prefixLen: 7,
  },
];

const MODELS: Record<Provider, { value: string; label: string; badge: string; description: string }[]> = {
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", badge: "Fastest",       description: "Fast, cost-efficient responses — ideal for real-time workload analysis and task recommendations." },
    { value: "gemini-1.5-pro",   label: "Gemini 1.5 Pro",   badge: "Most capable",  description: "Advanced reasoning for complex multi-step project planning and longer context scenarios." },
  ],
  claude: [
    { value: "claude-opus-4-6",    label: "Claude Opus 4.6",    badge: "Most intelligent", description: "Anthropic's most powerful model — exceptional for complex reasoning and nuanced project analysis." },
    { value: "claude-sonnet-4-6",  label: "Claude Sonnet 4.6",  badge: "Best balance",     description: "The sweet spot between intelligence and speed — great for everyday AI project management tasks." },
    { value: "claude-haiku-4-5",   label: "Claude Haiku 4.5",   badge: "Fastest",          description: "Compact and blazing-fast — best for high-frequency, lightweight AI recommendations." },
  ],
};

const DEFAULT_MODEL: Record<Provider, string> = {
  gemini: "gemini-2.0-flash",
  claude: "claude-sonnet-4-6",
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AISettings() {
  const [provider, setProvider]   = useState<Provider>("gemini");
  const [keys, setKeys]           = useState<Record<Provider, string>>({ gemini: "", claude: "" });
  const [showKey, setShowKey]     = useState(false);
  const [savedMasks, setSavedMasks] = useState<Partial<Record<Provider, string>>>({});
  const [selectedModel, setSelectedModel] = useState<Record<Provider, string>>(DEFAULT_MODEL);
  const [features, setFeatures]   = useState<AIFeatures>({ aiProjectManager: true, smartTaskReassignment: true });
  const [saving, setSaving]       = useState(false);

  const currentKey   = keys[provider];
  const currentMask  = savedMasks[provider];
  const currentModel = selectedModel[provider];
  const providerCfg  = PROVIDERS.find((p) => p.id === provider)!;
  const modelList    = MODELS[provider];
  const modelInfo    = modelList.find((m) => m.value === currentModel) ?? modelList[0];

  // Switch provider — reset show-key toggle
  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setShowKey(false);
  };

  // Mask helper: show first `prefixLen` chars + bullets + last 4
  const maskKey = (raw: string, prefixLen: number) => {
    const prefix = raw.slice(0, prefixLen);
    const suffix = raw.slice(-4);
    return `${prefix}${"•".repeat(10)}${suffix}`;
  };

  // Direct fetch helper — bypasses supabase-js error swallowing on non-2xx
  const invokeEdgeFunction = async (payload: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token ?? ""}`,
        "apikey": anonKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    return res.json();
  };

  const handleSaveKey = async () => {
    if (!currentKey.trim()) return;
    setSaving(true);
    try {
      await invokeEdgeFunction({
        action: "save-ai-settings",
        provider,
        apiKey: currentKey,
        selectedModel: currentModel,
        features,
      });

      // Persist key in sessionStorage so AIChatbot can use it this session
      sessionStorage.setItem(`ai_key_${provider}`, currentKey);
      sessionStorage.setItem(`ai_model_${provider}`, currentModel);
      setSavedMasks((prev) => ({ ...prev, [provider]: maskKey(currentKey, providerCfg.prefixLen) }));
      setKeys((prev) => ({ ...prev, [provider]: "" }));
      toast({ title: `${providerCfg.name} API key saved successfully.` });
    } catch (e) {
      toast({ title: "Failed to save key", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await invokeEdgeFunction({
        action: "save-ai-settings",
        provider,
        apiKey: currentKey,
        selectedModel: currentModel,
        features,
      });

      if (currentKey.trim()) {
        sessionStorage.setItem(`ai_key_${provider}`, currentKey);
        sessionStorage.setItem(`ai_model_${provider}`, currentModel);
        setSavedMasks((prev) => ({ ...prev, [provider]: maskKey(currentKey, providerCfg.prefixLen) }));
        setKeys((prev) => ({ ...prev, [provider]: "" }));
      }
      sessionStorage.setItem(`ai_features`, JSON.stringify(features));
      toast({ title: "AI settings saved successfully." });
    } catch (e) {
      toast({ title: "Failed to save settings", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 page-enter">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8 animate-stagger-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(191 91% 37% / 0.15)" }}>
          <Bot className="w-5 h-5" style={{ color: "hsl(191 91% 55%)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your Bring Your Own Key (BYOK) AI provider and preferences
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">

        {/* ── Section 1: Provider Selection ────────────────────────────── */}
        <Card className="border-border/60 animate-stagger-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">AI Provider</CardTitle>
            </div>
            <CardDescription>
              Choose which AI provider to configure. Each provider uses its own API key and model set.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map((p) => {
                const isActive   = provider === p.id;
                const hasSavedKey = !!savedMasks[p.id];
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderChange(p.id)}
                    className="relative text-left rounded-xl border p-4 transition-all duration-200 hover:scale-[1.01] focus:outline-none"
                    style={isActive ? p.selectedBorderStyle : { borderColor: "hsl(222 47% 20%)" }}
                  >
                    {/* Active checkmark */}
                    {isActive && (
                      <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-emerald-400" />
                    )}
                    {/* Saved-key dot */}
                    {hasSavedKey && !isActive && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center border"
                        style={isActive ? p.selectedBorderStyle : p.accentStyle}>
                        <p.Icon className={`w-4 h-4 ${p.iconClass}`} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold leading-tight">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">{p.tagline}</div>
                      </div>
                    </div>
                    {hasSavedKey && (
                      <div className="flex items-center gap-1 mt-1">
                        <Key className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-medium">Key saved</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: API Key Management ────────────────────────────── */}
        <Card className="border-border/60 animate-stagger-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">API Key — {providerCfg.name}</CardTitle>
            </div>
            <CardDescription>
              Enter your {providerCfg.name} API key to enable AI-powered features in this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Masked active key */}
            {currentMask && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
                <Key className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-mono text-muted-foreground tracking-wide">{currentMask}</span>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Active
                </span>
              </div>
            )}

            {/* Key input */}
            <div className="space-y-2">
              <Label htmlFor="api-key">
                {currentMask ? `Replace ${providerCfg.keyLabel}` : providerCfg.keyLabel}
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  placeholder={providerCfg.keyPlaceholder}
                  value={currentKey}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [provider]: e.target.value }))}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Quick hint for where to get the key */}
              <p className="text-[11px] text-muted-foreground">
                {provider === "gemini"
                  ? "Get your key at Google AI Studio → aistudio.google.com"
                  : "Get your key at Anthropic Console → console.anthropic.com"}
              </p>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border"
              style={{ background: "hsl(222 47% 9% / 0.6)", borderColor: "hsl(222 47% 22%)" }}>
              <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Keys are <strong className="text-foreground">securely encrypted</strong> in the
                Supabase Vault and are <strong className="text-foreground">never exposed to the client</strong>.
                Transmitted over HTTPS and stored with AES-256 encryption at rest.
              </p>
            </div>

            <Button onClick={handleSaveKey} disabled={saving || !currentKey.trim()} className="w-full sm:w-auto">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Key</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Section 3: Model Selection ────────────────────────────────── */}
        <Card className="border-border/60 animate-stagger-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Model Selection — {providerCfg.name}</CardTitle>
            </div>
            <CardDescription>
              Choose the default model for {providerCfg.name} AI features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="model-select">Default Model</Label>
              <Select
                value={currentModel}
                onValueChange={(val) =>
                  setSelectedModel((prev) => ({ ...prev, [provider]: val }))
                }
              >
                <SelectTrigger id="model-select" className="w-full sm:w-80">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {modelList.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        <providerCfg.Icon className={`w-3.5 h-3.5 flex-shrink-0 ${providerCfg.iconClass}`} />
                        <span>{m.label}</span>
                        <span className="text-[11px] text-muted-foreground ml-1">· {m.badge}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Dynamic description */}
            <p className="text-xs text-muted-foreground leading-relaxed">{modelInfo.description}</p>
          </CardContent>
        </Card>

        {/* ── Section 4: Feature Toggles ────────────────────────────────── */}
        <Card className="border-border/60 animate-stagger-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Feature Toggles</CardTitle>
            </div>
            <CardDescription>
              Enable or disable individual AI-powered features for this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="feature-ai-pm" className="text-sm font-medium cursor-pointer">
                  AI Project Manager
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically analyzes team workload and generates actionable recommendations on the AI Insights page.
                </p>
              </div>
              <Switch
                id="feature-ai-pm"
                checked={features.aiProjectManager}
                onCheckedChange={(checked) => setFeatures((p) => ({ ...p, aiProjectManager: checked }))}
              />
            </div>

            <div className="h-px bg-border/40" />

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="feature-reassign" className="text-sm font-medium cursor-pointer">
                  Smart Task Reassignment
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Suggests reassigning tasks from overloaded team members to employees with available capacity.
                </p>
              </div>
              <Switch
                id="feature-reassign"
                checked={features.smartTaskReassignment}
                onCheckedChange={(checked) => setFeatures((p) => ({ ...p, smartTaskReassignment: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Save All ──────────────────────────────────────────────────── */}
        <div className="flex justify-end pb-6 animate-stagger-2">
          <Button onClick={handleSaveAll} disabled={saving} size="lg">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save All Settings</>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
