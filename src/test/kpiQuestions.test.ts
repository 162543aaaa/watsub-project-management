import { describe, expect, it } from "vitest";
import {
  KPI_QUESTIONS,
  canSeePeerIdentity,
  getEligiblePeerReviewers,
  getSelfEvaluationType,
  resolveRoleKey,
} from "@/config/kpiQuestions";
import { TEAM_ROSTER } from "@/config/teamRoster";

describe("kpiQuestions helpers", () => {
  const employees = [
    { id: "ta", name: "TARMISI WANI" },
    { id: "hf", name: "ฮาฟีซ ดอเลาะ" },
    { id: "sy", name: "สุไมยนา หวังเบ็ญหมัด" },
    { id: "x", name: "Someone Else" },
  ];

  it("resolves roles from english/thai names", () => {
    expect(resolveRoleKey("TARMISI WANI")).toBe("ta");
    expect(resolveRoleKey("ฮาฟีซ ดอเลาะ")).toBe("hafeez");
    expect(resolveRoleKey("สุไมยนา หวังเบ็ญหมัด")).toBe("sumayna");
    expect(resolveRoleKey("Unknown")).toBe("default");
  });

  it("resolves outsource role from member metadata when name aliases are unavailable", () => {
    expect(resolveRoleKey({
      name: "Faheem Yusoh",
      role: "employee",
      type: "fulltime",
      position: "Outsource",
    })).toBe("outsource");
  });

  it("maps TA self evaluation to supervisor key", () => {
    expect(getSelfEvaluationType("ta")).toBe("supervisor");
    expect(getSelfEvaluationType("hafeez")).toBe("self");
  });

  it("enforces peer matrix for main roles", () => {
    const taPeers = getEligiblePeerReviewers(employees[0], employees).map((e) => e.id);
    const hfPeers = getEligiblePeerReviewers(employees[1], employees).map((e) => e.id);
    const syPeers = getEligiblePeerReviewers(employees[2], employees).map((e) => e.id);

    expect(taPeers).toEqual(["hf", "sy"]);
    expect(hfPeers).toEqual(["ta", "sy"]);
    expect(syPeers).toEqual(["ta", "hf"]);
  });

  it("allows peer identity visibility only for privileged roles", () => {
    expect(canSeePeerIdentity({ role: "admin" })).toBe(true);
    expect(canSeePeerIdentity({ role: "director" })).toBe(true);
    expect(canSeePeerIdentity({ role: "supervisor" })).toBe(true);
    expect(canSeePeerIdentity({ role: "employee" })).toBe(false);
  });

  it("contains TA supervisor self-reflection form", () => {
    expect(KPI_QUESTIONS.ta.supervisor.uiLabel).toBe("Self-Reflection");
    expect(KPI_QUESTIONS.ta.supervisor.sections.length).toBeGreaterThan(0);
  });

  it("uses canonical team roster names", () => {
    expect(TEAM_ROSTER.map((m) => m.name)).toEqual([
      "TARMISI WANI",
      "สุไมยนา หวังเบ็ญหมัด",
      "ฮาฟีซ ดอเลาะ",
      "Faheem Yusoh",
      "zuhariya yato",
      "Natdia Benyakat",
    ]);
  });
});
