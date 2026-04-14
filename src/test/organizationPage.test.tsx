import { render, screen } from "@testing-library/react";
import Organization from "@/pages/Organization";
import { vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({ isAdmin: false }),
}));

vi.mock("@/hooks/useCompanyInfo", () => ({
  useCompanyInfo: () => ({
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    companyInfo: {
      id: 1,
      name: "WatSUB! Studio (วาตซับ สตูดิโอ)",
      tagline: "A Space for Creative Connectivity",
      vision: "Vision text",
      mission: "Mission text",
      history: "History text",
      milestones: ["2023"],
      location: "ปัตตานี",
      location_link: "https://maps.example.com",
      leadership_agreement: "Agreement",
      handbook_url: "https://example.com/handbook",
      brand_assets_url: "https://example.com/brand",
      benefits_summary: "Benefits",
      brand_colors: [{ label: "Blue", hex: "#0000FF" }],
      core_values: ["Innovation", "Integrity"],
      logo_url: null,
      contact_email: "hello@watsub.com",
      updated_at: null,
    },
    leadershipTeam: [],
    teamSummary: [],
    orgMembers: [],
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
