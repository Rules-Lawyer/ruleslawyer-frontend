import { render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import CollectionGrid from "@/components/collection/collection-grid";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import type { CollectionWithCount } from "@/types/models";

// CollectionGrid now loads via SWR (useOrgCollections). Give every render its own
// cache so one test's seeded/fetched list can't be served to the next from SWR's
// dedupe window.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
jest.mock("@/components/collection/collection-modal", () => ({ __esModule: true, default: () => null }));
// Stub CollectionCard so the grid's own logic is what's under test.
jest.mock("@/components/collection/collection-card", () => ({
  __esModule: true,
  default: ({ collectionIn }: { collectionIn: CollectionWithCount }) => (
    <div data-testid="collection-card">{collectionIn.name}</div>
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

function makeCollection(over: Partial<CollectionWithCount> = {}): CollectionWithCount {
  return {
    id: 1,
    name: "Strategy Games",
    organizationId: 7,
    public: true,
    allowWinning: false,
    archived: false,
    _count: { copies: 0, conventions: 0 },
    conventions: [],
    ...over,
  } as CollectionWithCount;
}

describe("CollectionGrid", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions();
  });

  it("renders a card for each passed-in collection without fetching", async () => {
    const collections = [
      makeCollection({ id: 1, name: "Alpha" }),
      makeCollection({ id: 2, name: "Beta" }),
    ];
    render(<CollectionGrid collectionsIn={collections} organizationId={7} />, { wrapper });

    const names = (await screen.findAllByTestId("collection-card")).map(
      (n) => n.textContent
    );
    expect(names).toEqual(["Alpha", "Beta"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches the organization's collections when none are passed in", async () => {
    fetchMock.mockResolvedValue({
      json: async () => [makeCollection({ id: 3, name: "Fetched" })],
    });
    render(<CollectionGrid organizationId={7} />, { wrapper });

    expect(await screen.findByTestId("collection-card")).toHaveTextContent("Fetched");
    expect(fetchMock).toHaveBeenCalledWith(
      "GET",
      "/org/7/collections",
      null,
      "tok"
    );
  });

  it("hides the create/import controls from read-only viewers", () => {
    mockPermissions({ superAdmin: false });
    render(<CollectionGrid collectionsIn={[]} organizationId={7} />, { wrapper });
    expect(
      screen.queryByRole("button", { name: "Create Collection" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Import Collection" })
    ).not.toBeInTheDocument();
  });

  it("shows the create/import controls to super admins", () => {
    mockPermissions({ superAdmin: true });
    render(<CollectionGrid collectionsIn={[]} organizationId={7} />, { wrapper });
    expect(
      screen.getByRole("button", { name: "Create Collection" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Import Collection" })
    ).toBeInTheDocument();
  });

  it("shows the controls to an admin of the grid's organization", () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    render(<CollectionGrid collectionsIn={[]} organizationId={7} />, { wrapper });
    expect(
      screen.getByRole("button", { name: "Create Collection" })
    ).toBeInTheDocument();
  });

  it("keeps read-only for a non-admin of the grid's organization", () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: false }] });
    render(<CollectionGrid collectionsIn={[]} organizationId={7} />, { wrapper });
    expect(
      screen.queryByRole("button", { name: "Create Collection" })
    ).not.toBeInTheDocument();
  });
});
