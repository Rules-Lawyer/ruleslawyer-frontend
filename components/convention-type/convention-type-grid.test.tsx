import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConventionTypeGrid from "@/components/convention-type/convention-type-grid";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import type { ConventionType } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
jest.mock("@/components/convention-type/convention-type-modal", () => ({
  __esModule: true,
  default: () => null,
}));
// Stub the card so the grid's own fetch/sort/permission logic is what's tested.
// The rename button drives the grid's onUpdated -> state update -> re-sort.
jest.mock("@/components/convention-type/convention-type-card", () => ({
  __esModule: true,
  default: ({
    conventionTypeIn,
    onUpdated,
  }: {
    conventionTypeIn: ConventionType;
    onUpdated?: (updated: Partial<ConventionType>) => void;
  }) => (
    <>
      <span data-testid="convention-type-card">{conventionTypeIn.name}</span>
      <button onClick={() => onUpdated?.({ name: "Zzz " + conventionTypeIn.name })}>
        rename-{conventionTypeIn.name}
      </button>
    </>
  ),
}));

const fetchMock = frontendFetch as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;

function mockPermissions(opts: {
  superAdmin?: boolean;
  orgAdmin?: { organizationId: number; admin: boolean }[];
} = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: opts.orgAdmin ?? [] },
      conventions: { data: [] },
    },
    isLoading: false,
    isError: {},
  });
}

function mockConventionTypes(list: Partial<ConventionType>[]) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => list });
}

describe("ConventionTypeGrid", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions();
  });

  it("fetches the organization's convention types and renders a card for each, sorted by name", async () => {
    mockConventionTypes([
      { id: 1, name: "Winter" },
      { id: 2, name: "Annual" },
      { id: 3, name: "Spring" },
    ]);
    render(<ConventionTypeGrid organizationId={7} />);

    const names = (await screen.findAllByTestId("convention-type-card")).map(
      (n) => n.textContent
    );
    expect(names).toEqual(["Annual", "Spring", "Winter"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "GET",
      "/org/7/conventionTypes",
      null,
      "tok"
    );
  });

  it("re-sorts when a card reports a renamed convention type", async () => {
    mockConventionTypes([
      { id: 1, name: "Annual" },
      { id: 2, name: "Spring" },
    ]);
    render(<ConventionTypeGrid organizationId={7} />);

    await screen.findByText("Annual");
    // Rename "Annual" -> "Zzz Annual", which should drop it below "Spring".
    await userEvent.click(screen.getByRole("button", { name: "rename-Annual" }));

    const names = screen
      .getAllByTestId("convention-type-card")
      .map((n) => n.textContent);
    expect(names).toEqual(["Spring", "Zzz Annual"]);
  });

  it("hides the add control from read-only viewers", async () => {
    mockPermissions({ superAdmin: false });
    mockConventionTypes([]);
    render(<ConventionTypeGrid organizationId={7} />);

    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    expect(
      screen.queryByRole("button", { name: "Add Convention Type" })
    ).not.toBeInTheDocument();
  });

  it("shows the add control to super admins", async () => {
    mockPermissions({ superAdmin: true });
    mockConventionTypes([]);
    render(<ConventionTypeGrid organizationId={7} />);

    expect(
      await screen.findByRole("button", { name: "Add Convention Type" })
    ).toBeInTheDocument();
  });

  it("shows the add control to an admin of the grid's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    mockConventionTypes([]);
    render(<ConventionTypeGrid organizationId={7} />);

    expect(
      await screen.findByRole("button", { name: "Add Convention Type" })
    ).toBeInTheDocument();
  });

  it("keeps read-only for a non-admin of the grid's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: false }] });
    mockConventionTypes([]);
    render(<ConventionTypeGrid organizationId={7} />);

    await waitFor(() =>
      expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
    );
    expect(
      screen.queryByRole("button", { name: "Add Convention Type" })
    ).not.toBeInTheDocument();
  });
});
