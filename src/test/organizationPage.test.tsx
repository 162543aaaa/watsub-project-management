import { render, screen } from "@testing-library/react";
import Organization from "@/pages/Organization";
import { vi } from "vitest";

// ─── Mock useAuth ──────────────────────────────────────────────
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    isAdmin: false,
    user: null,
    session: null,
    profile: null,
    roles: [],
    loading: false,
    isApproved: true,
    canAccessPage: () => true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    refetchProfile: vi.fn(),
  }),
}));

// ─── Mock useAuthContext (Organization page consumes it) ───────
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({
    isAdmin: false,
    user: null,
    session: null,
    profile: null,
    roles: [],
    loading: false,
    isApproved: true,
    canAccessPage: () => true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    refetchProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ─── Mock useCompanyInfo (full new schema) ─────────────────────
vi.mock("@/hooks/useCompanyInfo", () => ({
  useCompanyInfo: () => ({
    isLoading: false,
    error: null,
    companyInfo: {
      id: 1,
      name: "WatSUB! Studio (วาตซับ สตูดิโอ)",
      tagline: "A Space for Creative Connectivity",
      vision: "Vision text mock",
      mission: "Mission text mock",
      core_values: [
        "#VIBES: CITY & LIFESTYLE",
        "#SOUL: HUMAN & IDEA",
        "#JOINT: WORK & OPPORTUNITY",
      ],
      logo_url: null,
      contact_email: "hello@watsub.com",
      updated_at: null,
      history: "ประวัติ WatSUB! Studio ตั้งแต่ปี 2023",
      milestones: ["2023: ก่อตั้ง", "2024: ขยายทีม", "2025: ecosystem"],
      location_links: {
        label: "จังหวัดปัตตานี",
        map_url: "https://maps.app.goo.gl/example",
      },
      resources: [
        { label: "Employee Handbook", url: "https://drive.google.com/example1" },
        { label: "Brand Assets",      url: "https://drive.google.com/example2" },
      ],
      benefits: ["ค่าประกันสุขภาพ", "วันหยุดพักผ่อน 10 วัน", "โบนัสตามผลงาน"],
      brand_colors: {
        primary:   "#D2FA00",
        secondary: "#F4622A",
        accent:    "#6B3FA0",
        info:      "#3EADD4",
        light:     "#F5F0E8",
        dark:      "#0D0D0D",
      },
    },
    orgTree: [
      {
        id: "00000000-0000-0000-0001-000000000001",
        name: "ต้า (Tarmisi Wani)",
        position: "Founding Partner & Creative Lead",
        role_type: "leadership",
        parent_id: null,
        avatar_url: null,
        children: [
          {
            id: "00000000-0000-0000-0002-000000000004",
            name: "ฮาฟีซ ดอเลาะ",
            position: "Videographer & Graphic Designer",
            role_type: "core",
            parent_id: "00000000-0000-0000-0001-000000000001",
            avatar_url: null,
            children: [],
          },
        ],
      },
    ],
    orgMembers: [
      {
        id: "00000000-0000-0000-0001-000000000001",
        name: "ต้า (Tarmisi Wani)",
        position: "Founding Partner & Creative Lead",
        role_type: "leadership",
        parent_id: null,
        avatar_url: null,
      },
    ],
    leadershipTeam: [],
    teamSummary: [],
    stats: {
      totalEmployees: 8,
      activeCount: 8,
      leadershipCount: 3,
      teamModels: 3,
    },
    updateCompanyInfo:  vi.fn(),
    addOrgMember:       vi.fn(),
    updateOrgMember:    vi.fn(),
    deleteOrgMember:    vi.fn(),
    refetch:            vi.fn(),
  }),
}));

// ─── Tests ─────────────────────────────────────────────────────
describe("Organization page", () => {
  it("renders company name in hero", () => {
    render(<Organization />);
    expect(
      screen.getByText("WatSUB! Studio (วาตซับ สตูดิโอ)"),
    ).toBeInTheDocument();
  });

  it("renders Vision and Mission sections", () => {
    render(<Organization />);
    expect(screen.getByText("Vision 2026")).toBeInTheDocument();
    expect(screen.getByText("Mission")).toBeInTheDocument();
  });

  it("renders Interactive Org Chart section", () => {
    render(<Organization />);
    expect(screen.getByText("Interactive Org Chart")).toBeInTheDocument();
  });

  it("renders Brand Colors section", () => {
    render(<Organization />);
    expect(screen.getByText("Brand Colors")).toBeInTheDocument();
  });

  it("renders milestones from DB data", () => {
    render(<Organization />);
    expect(screen.getByText("2023: ก่อตั้ง")).toBeInTheDocument();
  });

  it("renders benefits from DB data", () => {
    render(<Organization />);
    expect(screen.getByText("ค่าประกันสุขภาพ")).toBeInTheDocument();
  });

  it("renders Core Values pillars", () => {
    render(<Organization />);
    expect(screen.getByText("Core Values — 3 Pillars")).toBeInTheDocument();
  });

  it("renders สวัสดิการพนักงาน section", () => {
    render(<Organization />);
    expect(screen.getByText("สวัสดิการพนักงาน")).toBeInTheDocument();
  });

  it("does NOT render admin edit button for non-admin user", () => {
    render(<Organization />);
    expect(screen.queryByText("แก้ไของค์กร")).not.toBeInTheDocument();
  });

  it("renders location as a link in Resources section", () => {
    render(<Organization />);
    expect(screen.getAllByText("จังหวัดปัตตานี").length).toBeGreaterThan(0);
  });
});
