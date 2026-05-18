import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Signup from "@/pages/Signup";
import { useAuthContext } from "@/contexts/AuthContext";

// Mock the Auth Context
vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

describe("Signup Redirect Flow", () => {
  it("renders the signup form when there is no user", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isApproved: false,
      isAdmin: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      resendSignupConfirmation: vi.fn(),
      signOut: vi.fn(),
      loading: false,
      session: null,
      profile: null,
      roles: [],
      canAccessPage: vi.fn(),
      refetchProfile: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    // Verify form renders
    expect(screen.getAllByText("สมัครสมาชิก").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("สมชาย ใจดี")).toBeInTheDocument();
  });

  it("shows spinner when loading and no user is present", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isApproved: false,
      isAdmin: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      resendSignupConfirmation: vi.fn(),
      signOut: vi.fn(),
      loading: true,
      session: null,
      profile: null,
      roles: [],
      canAccessPage: vi.fn(),
      refetchProfile: vi.fn(),
    });

    const { container } = render(
      <MemoryRouter>
        <Signup />
      </MemoryRouter>
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
