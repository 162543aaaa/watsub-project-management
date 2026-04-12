import { useState } from "react";
import { Bot, Key, Shield, Zap, Eye, EyeOff, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AIFeatures {
  aiProjectManager: boolean;
  smartTaskReassignment: boolean;
}

export default function AISettings() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savedKeyMask, setSavedKeyMask] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
  const [features, setFeatures] = useState<AIFeatures>({
    aiProjectManager: true,
    smartTaskReassignment: true,
  });
  const [saving, setSaving] = useState(false);

  const handleSaveSettings = async (requireKey = false) => {
    if (requireKey && !apiKey.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("admin-users", {
        body: { action: "save-ai-settings", apiKey, selectedModel, features },
      });
      if (error) throw new Error(error.message);

      if (apiKey.trim()) {
        // Show masked version: first 6 chars + bullets + last 4 chars
        const prefix = apiKey.slice(0, 6);
        const suffix = apiKey.slice(-4);
        setSavedKeyMask(`${prefix}${"•".repeat(10)}${suffix}`);
        setApiKey("");
      }
      toast({ title: "AI settings saved successfully." });
    } catch (e) {
      toast({
        title: "Failed to save settings",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 page-enter">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8 animate-stagger-1">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "hsl(191 91% 37% / 0.15)" }}
        >
          <Bot className="w-5 h-5" style={{ color: "hsl(191 91% 55%)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your Bring Your Own Key (BYOK) AI preferences
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* ── Section 1: API Key Management ─────────────────────────────── */}
        <Card className="border-border/60 animate-stagger-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">API Key Management</CardTitle>
            </div>
            <CardDescription>
              Connect your Gemini API key to power AI features in this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Masked current key */}
            {savedKeyMask && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
                <Key className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-mono text-muted-foreground tracking-wide">
                  {savedKeyMask}
                </span>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Active
                </span>
              </div>
            )}

            {/* Key input */}
            <div className="space-y-2">
              <Label htmlFor="api-key">
                {savedKeyMask ? "Replace Gemini API Key" : "New Gemini API Key"}
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="AIzaSy••••••••••••••••••••••••••••••••"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Security note */}
            <div
              className="flex items-start gap-2.5 p-3 rounded-lg border"
              style={{
                background: "hsl(222 47% 9% / 0.6)",
                borderColor: "hsl(222 47% 22%)",
              }}
            >
              <Shield className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Keys are{" "}
                <strong className="text-foreground">securely encrypted</strong> in
                the Supabase Vault and are{" "}
                <strong className="text-foreground">
                  never exposed to the client
                </strong>
                . Your key is transmitted over HTTPS and stored using AES-256
                encryption at rest.
              </p>
            </div>

            <Button
              onClick={() => handleSaveSettings(true)}
              disabled={saving || !apiKey.trim()}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Key
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ── Section 2: Model Selection ─────────────────────────────────── */}
        <Card className="border-border/60 animate-stagger-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Model Selection</CardTitle>
            </div>
            <CardDescription>
              Choose the default Gemini model used across all AI-powered features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="model-select">Default AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model-select" className="w-full sm:w-72">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.0-flash">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>Gemini 2.0 Flash</span>
                      <span className="text-[11px] text-muted-foreground ml-1">
                        · Fastest
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="gemini-1.5-pro">
                    <div className="flex items-center gap-2">
                      <Bot className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span>Gemini 1.5 Pro</span>
                      <span className="text-[11px] text-muted-foreground ml-1">
                        · Most capable
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedModel === "gemini-2.0-flash"
                ? "Gemini 2.0 Flash delivers fast, cost-efficient responses — ideal for real-time workload analysis and task recommendations."
                : "Gemini 1.5 Pro offers advanced reasoning for complex multi-step project planning and longer context scenarios."}
            </p>
          </CardContent>
        </Card>

        {/* ── Section 3: Feature Toggles ─────────────────────────────────── */}
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
            {/* AI Project Manager */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5 flex-1">
                <Label
                  htmlFor="feature-ai-pm"
                  className="text-sm font-medium cursor-pointer"
                >
                  AI Project Manager
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically analyzes team workload and generates actionable
                  recommendations on the AI Insights page.
                </p>
              </div>
              <Switch
                id="feature-ai-pm"
                checked={features.aiProjectManager}
                onCheckedChange={(checked) =>
                  setFeatures((prev) => ({ ...prev, aiProjectManager: checked }))
                }
              />
            </div>

            <div className="h-px bg-border/40" />

            {/* Smart Task Reassignment */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5 flex-1">
                <Label
                  htmlFor="feature-reassign"
                  className="text-sm font-medium cursor-pointer"
                >
                  Smart Task Reassignment
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Suggests reassigning tasks from overloaded team members to
                  employees with available capacity.
                </p>
              </div>
              <Switch
                id="feature-reassign"
                checked={features.smartTaskReassignment}
                onCheckedChange={(checked) =>
                  setFeatures((prev) => ({
                    ...prev,
                    smartTaskReassignment: checked,
                  }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Save All Settings ──────────────────────────────────────────── */}
        <div className="flex justify-end pb-6 animate-stagger-2">
          <Button
            onClick={() => handleSaveSettings(false)}
            disabled={saving}
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
