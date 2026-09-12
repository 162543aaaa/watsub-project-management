import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import Organization from "@/pages/Organization";

const wikiPages = [
  {
    id: "wiki-vision",
    title: "Organization Vision",
    slug: "organization-vision",
    content: "# Vision\n\nWiki vision is the primary source.",
    category: "Organization",
    author_id: null,
    is_published: true,
    view_count: 3,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-10T00:00:00Z",
  },
  {
    id: "wiki-culture",
    title: "Studio Culture",
    slug: "organization-culture",
    content: "How WatSUB works together.",
    category: "Organization",
    author_id: null,
    is_published: true,
    view_count: 2,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-09T00:00:00Z",
  },
];
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => ({ isAdmin: false }),
}));

vi.mock("@/hooks/useWiki", () => ({
  useWiki: () => ({
    pages: wikiPages,
    loading: false,
    error: null,
  }),
}));

vi.mock("@/hooks/useCompanyInfo", () => ({
  useCompanyInfo: () => ({
    isLoading: false,
    error: null,
    companyInfo: {
      id: 1,
      name: "WatSUB! Studio (วาตซับ สตูดิโอ)",
      tagline: "A Space for Creative Connectivity",
      vision: "Legacy vision should be replaced by wiki.",
      mission: "Legacy mission fallback.",
      history: "Legacy history fallback.",
      contact_email: "hello@watsub.com",
      location_links: { label: "จังหวัดปัตตานี", map_url: "https://maps.example" },
      brand_colors: null,
    },
    orgTree: [],
    orgMembers: [],
    stats: { totalEmployees: 8, activeCount: 7, leadershipCount: 2, teamModels: 3 },
    updateCompanyInfo: vi.fn(),
    addOrgMember: vi.fn(),
    updateOrgMember: vi.fn(),
    deleteOrgMember: vi.fn(),
    refetch: vi.fn(),
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Organization />
    </MemoryRouter>,
  );
}

describe("Organization page", () => {
  it("uses the shared application visual structure", () => {
    renderPage();
    expect(screen.getByText("Studio organization")).toBeInTheDocument();
    expect(screen.getByText("Organization knowledge")).toBeInTheDocument();
    expect(screen.getByText("Team structure")).toBeInTheDocument();
  });

  it("renders company identity and operational stats", () => {
    renderPage();
    expect(screen.getByText("WatSUB! Studio (วาตซับ สตูดิโอ)")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
  it("prefers Organization wiki content over legacy profile text", () => {
    renderPage();
    expect(screen.getByText(/Wiki vision is the primary source/)).toBeInTheDocument();
    expect(screen.queryByText(/Legacy vision should be replaced/)).not.toBeInTheDocument();
  });

  it("falls back to legacy company info when a wiki section is missing", () => {
    renderPage();
    expect(screen.getByText("Legacy mission fallback.")).toBeInTheDocument();
    expect(screen.getByText("Legacy history fallback.")).toBeInTheDocument();
  });

  it("shows additional Organization wiki articles", () => {
    renderPage();
    expect(screen.getByText("Studio Culture")).toBeInTheDocument();
    expect(screen.getByText(/How WatSUB works together/)).toBeInTheDocument();
  });

  it("links to the filtered Organization wiki", () => {
    renderPage();
    const links = screen.getAllByRole("link", { name: /Organization Wiki|View all organization knowledge/i });
    expect(links.some((link) => link.getAttribute("href") === "/wiki?category=Organization")).toBe(true);
  });

  it("does not show the admin structure action to non-admin users", () => {
    renderPage();
    expect(screen.queryByRole("button", { name: /Manage structure/i })).not.toBeInTheDocument();
  });
});
