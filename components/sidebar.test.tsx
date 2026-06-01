import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUser } from "@auth0/nextjs-auth0";
import { usePathname, useRouter } from "next/navigation";
import SideBar from "@/components/sidebar";
import usePermissions from "@/utilities/swr/usePermissions";

jest.mock("@/utilities/swr/usePermissions");
// @auth0/nextjs-auth0 is auto-mocked via <rootDir>/__mocks__ (its package ships
// only an ESM export condition jest's CJS resolver can't load).
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
}));

const usePermissionsMock = usePermissions as jest.Mock;
const useUserMock = useUser as jest.Mock;
const usePathnameMock = usePathname as jest.Mock;
const useRouterMock = useRouter as jest.Mock;
const replaceMock = jest.fn();

interface OrgEntry {
  organizationId: number;
  admin: boolean;
  organization: { name: string };
}

function mockPermissions(opts: {
  isLoading?: boolean;
  superAdmin?: boolean;
  organizations?: OrgEntry[];
  conventions?: { convention: { organizationId: number } }[];
} = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: opts.organizations ?? [] },
      conventions: { data: opts.conventions ?? [] },
    },
    isLoading: opts.isLoading ?? false,
  });
}

const singleOrg: OrgEntry[] = [
  { organizationId: 7, admin: true, organization: { name: "GeekWay" } },
];

describe("SideBar", () => {
  beforeEach(() => {
    usePermissionsMock.mockReset();
    useUserMock.mockReset();
    usePathnameMock.mockReset();
    useRouterMock.mockReset();
    replaceMock.mockReset();
    useRouterMock.mockReturnValue({ replace: replaceMock });
    // Default: not on /dashboard so the auto-redirect effect stays dormant.
    usePathnameMock.mockReturnValue("/dashboard/organizations");
    useUserMock.mockReturnValue({ user: { name: "Mattie", picture: "" } });
  });

  it("shows a loading spinner while permissions resolve", () => {
    mockPermissions({ isLoading: true });
    render(<SideBar />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows the single-org nav (org/conventions/games/collections) for a member of one org", () => {
    mockPermissions({ organizations: singleOrg });
    render(<SideBar />);
    expect(screen.getByRole("link", { name: "GeekWay" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conventions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Games" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Collections" })).toBeInTheDocument();
    // The org link points at that org's dashboard route.
    expect(screen.getByRole("link", { name: "GeekWay" })).toHaveAttribute(
      "href",
      "/dashboard/organization/7"
    );
  });

  it("shows the 'Organizations' link to a super admin", () => {
    mockPermissions({ superAdmin: true });
    render(<SideBar />);
    expect(screen.getByRole("link", { name: "Organizations" })).toBeInTheDocument();
    // Super admins also get the global "All Conventions" link.
    expect(screen.getByRole("link", { name: "All Conventions" })).toBeInTheDocument();
  });

  it("shows the 'Organizations' link when a user belongs to more than one org", () => {
    mockPermissions({
      organizations: [
        { organizationId: 7, admin: true, organization: { name: "GeekWay" } },
        { organizationId: 8, admin: false, organization: { name: "OtherCon" } },
      ],
    });
    render(<SideBar />);
    expect(screen.getByRole("link", { name: "Organizations" })).toBeInTheDocument();
    // Multi-org users don't get the single-org named link.
    expect(screen.queryByRole("link", { name: "GeekWay" })).not.toBeInTheDocument();
  });

  it("shows 'All Conventions' when conventions span more than one organization", () => {
    mockPermissions({
      organizations: singleOrg,
      conventions: [
        { convention: { organizationId: 7 } },
        { convention: { organizationId: 9 } },
      ],
    });
    render(<SideBar />);
    expect(screen.getByRole("link", { name: "All Conventions" })).toBeInTheDocument();
  });

  it("renders the signed-in user's name and a sign-out control", () => {
    mockPermissions({ organizations: singleOrg });
    render(<SideBar />);
    expect(screen.getByText("Mattie")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("toggles the collapse state, flipping the toggle button's label", async () => {
    mockPermissions({ organizations: singleOrg });
    render(<SideBar />);

    const collapseBtn = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapseBtn).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(collapseBtn);

    const expandBtn = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");
    // The collapse toggle persists state via a cookie.
    expect(document.cookie).toContain("sidebar-collapsed=true");
  });

  it("respects the initialCollapsed prop", () => {
    mockPermissions({ organizations: singleOrg });
    render(<SideBar initialCollapsed />);
    expect(
      screen.getByRole("button", { name: "Expand sidebar" })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("redirects from the empty /dashboard to the first nav link once loaded", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    mockPermissions({ organizations: singleOrg });
    render(<SideBar />);
    // First rendered link for a single-org member is their org dashboard.
    expect(replaceMock).toHaveBeenCalledWith("/dashboard/organization/7");
  });

  it("does not redirect while permissions are still loading", () => {
    usePathnameMock.mockReturnValue("/dashboard");
    mockPermissions({ isLoading: true });
    render(<SideBar />);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("does not redirect when already on a real section", () => {
    usePathnameMock.mockReturnValue("/dashboard/organizations");
    mockPermissions({ organizations: singleOrg });
    render(<SideBar />);
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
