import { render, screen } from "@testing-library/react";
import Organization from "@/pages/Organization";
import { vi } from "vitest";

vi.mock("@/hooks/useCompanyInfo", () => ({
  useCompanyInfo: () => ({
    isLoading: false,
    error: null,
    companyInfo: {
      id: 1,
      name: "Watsub",
      tagline: "Empowering project management",
      vision: "Vision text",
      mission: "Mission text",
      core_values: ["Innovation", "Integrity"],
      logo_url: null,
      contact_email: "hello@watsub.com",
      updated_at: null,
    },
    leadershipTeam: [
      {
        id: "1",
        name: "Jane Admin",
        position: "CEO",
        avatar: null,
        role: "admin",
        type: "fulltime",
      },
    ],
  }),
}));

describe("Organization page", () => {
  it("renders company profile sections", () => {
    render(<Organization />);

    expect(screen.getByText("Watsub")).toBeInTheDocument();
    expect(screen.getByText("Vision")).toBeInTheDocument();
    expect(screen.getByText("Mission")).toBeInTheDocument();
    expect(screen.getByText("Innovation")).toBeInTheDocument();
    expect(screen.getByText("Jane Admin")).toBeInTheDocument();
  });
});
