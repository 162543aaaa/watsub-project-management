import { describe, it, expect } from "vitest";
import { PRESETS, detectPreset, presetLabel } from "@/lib/permissionPresets";

describe("permissionPresets", () => {
  it("detects admin_full from wildcard", () => {
    expect(detectPreset(["*"])).toBe("admin_full");
  });
  it("detects each named preset from its pages", () => {
    for (const p of PRESETS) {
      if (p.key === "admin_full") continue;
      expect(detectPreset(p.pages)).toBe(p.key);
    }
  });
  it("returns custom for unknown combinations", () => {
    expect(detectPreset(["/tasks"])).toBe("custom");
  });
  it("provides labels", () => {
    expect(presetLabel("manager")).toBe("Manager");
    expect(presetLabel("custom")).toBe("Custom");
  });
});