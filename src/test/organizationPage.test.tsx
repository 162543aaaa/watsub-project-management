import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Organization from "@/pages/Organization";

function renderPage() {
  return render(
    <MemoryRouter>
      <Organization />
    </MemoryRouter>,
  );
}

describe("Organization page", () => {
  it("renders the vault-sourced studio identity", () => {
    renderPage();
    expect(screen.getByText("WatSUB! Studio")).toBeInTheDocument();
    expect(screen.getByText("A Space for Creative Connectivity")).toBeInTheDocument();
    expect(screen.getByText(/Creative Production & Media Studio/)).toBeInTheDocument();
    expect(screen.getByText("Pattani, Thailand")).toBeInTheDocument();
  });

  it("renders the full studio DNA and content pillars", () => {
    renderPage();
    expect(screen.getByText("CONNECT")).toBeInTheDocument();
    expect(screen.getByText("CREATE")).toBeInTheDocument();
    expect(screen.getByText("INSPIRE")).toBeInTheDocument();
    expect(screen.getAllByText("#VIBES").length).toBeGreaterThan(0);
    expect(screen.getAllByText("#SOUL").length).toBeGreaterThan(0);
    expect(screen.getAllByText("#JOINT").length).toBeGreaterThan(0);
  });

  it("renders leadership and advisors together without the old nickname", () => {
    renderPage();
    expect(screen.getByText("Tarmisi Wani")).toBeInTheDocument();
    expect(screen.getByText("นครา ยะโกะ")).toBeInTheDocument();
    expect(screen.getByText("สุกรี เจะปูเตะ")).toBeInTheDocument();
    expect(screen.queryByText("Tarmisi Wani (คุณต้า)")).not.toBeInTheDocument();
    expect(screen.getByText("Leadership & Strategic Advisory")).toBeInTheDocument();
  });

  it("renders operating rhythm and delivery discipline", () => {
    renderPage();
    expect(screen.getByText("Check Project Board")).toBeInTheDocument();
    expect(screen.getByText("Deep Work")).toBeInTheDocument();
    expect(screen.getByText("Short Sync")).toBeInTheDocument();
    expect(screen.getByText("D-3")).toBeInTheDocument();
    expect(screen.getByText("D-0")).toBeInTheDocument();
  });

  it("renders the 2026 brand system", () => {
    renderPage();
    expect(screen.getByText("RAW / BOLD / WARM / LOCAL")).toBeInTheDocument();
    expect(screen.getByText("Lime Yellow")).toBeInTheDocument();
    expect(screen.getByText("#D2FA00")).toBeInTheDocument();
    expect(screen.getByText("RAW")).toBeInTheDocument();
    expect(screen.getByText("LOCAL")).toBeInTheDocument();
  });

  it("renders the knowledge infrastructure without the source panel", () => {
    renderPage();
    expect(screen.getByText("Drive architecture")).toBeInTheDocument();
    expect(screen.getByText("Project folder standard")).toBeInTheDocument();
    expect(screen.getByText("Digital Operating System")).toBeInTheDocument();
    expect(screen.queryByText("Knowledge source")).not.toBeInTheDocument();
    expect(screen.queryByText("Built from the WatSUB Obsidian Vault")).not.toBeInTheDocument();
  });

  it("keeps a direct route to the Organization Wiki", () => {
    renderPage();
    const links = screen.getAllByRole("link", { name: /Organization Wiki/i });
    expect(links.some((link) => link.getAttribute("href") === "/wiki?category=Organization")).toBe(true);
  });
});