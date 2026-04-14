import { render, screen } from "@testing-library/react";
import Organization from "@/pages/Organization";
import { vi } from "vitest";

vi.mock("@/hooks/useCompanyInfo", () => ({
  useCompanyInfo: () => ({
    isLoading: false,
    error: null,
    companyInfo: {
      id: 1,
      name: "WatSUB! Studio (วาตซับ สตูดิโอ)",
      tagline: "A Space for Creative Connectivity",
      vision: "Vision text",
      mission: "Mission text",
      core_values: ["Innovation", "Integrity"],
      logo_url: null,
      contact_email: "hello@watsub.com",
      updated_at: null,
    },
    leadershipTeam: [],
    teamSummary: [],
    stats: {
      totalEmployees: 8,
      activeCount: 8,
      leadershipCount: 3,
      teamModels: 3,
    },
  }),
}));

describe("Organization page", () => {
  it("renders company profile sections", () => {
    render(<Organization />);

    expect(screen.getByText("WatSUB! Studio (วาตซับ สตูดิโอ)")).toBeInTheDocument();
    expect(screen.getByText("Vision 2026")).toBeInTheDocument();
    expect(screen.getByText("Mission")).toBeInTheDocument();
    expect(screen.getByText("Interactive Org Chart")).toBeInTheDocument();
    expect(screen.getByText("Brand Colors")).toBeInTheDocument();
  });
});
