import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import ConventionInfo from "@/components/convention/convention-info";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import { toastSaveError, toastNetworkError } from "@/utilities/toastFetchError";
import type { ConventionWithCollections } from "@/types/models";

// ConventionInfo now loads via SWR (useConvention). Give every render its own
// cache so one test's /con/:id response can't be served to the next from SWR's
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
// Stub the heavy modal / card children — this suite is about ConventionInfo's
// own data + readOnly gating, not their internals.
jest.mock("@/components/convention/convention-modal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/collection/collection-modal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/collection/collection-card", () => ({
  __esModule: true,
  default: ({ collectionIn }: { collectionIn: { name: string } }) => (
    <div data-testid="collection-card">{collectionIn.name}</div>
  ),
}));
// The attach toasts render through HeroUI's global toaster; stub them so the
// failure-path assertions don't depend on that machinery being mounted.
jest.mock("@/utilities/toastFetchError", () => ({
  toastSaveError: jest.fn(),
  toastNetworkError: jest.fn(),
}));

const fetchMock = frontendFetch as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const toastSaveErrorMock = toastSaveError as jest.Mock;
const toastNetworkErrorMock = toastNetworkError as jest.Mock;

function mockPermissions(opts: {
  superAdmin?: boolean;
  orgAdmin?: { organizationId: number; admin: boolean }[];
  conAdmin?: { conventionId: number; admin: boolean }[];
} = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: opts.orgAdmin ?? [] },
      conventions: { data: opts.conAdmin ?? [] },
    },
    isLoading: false,
    isError: {},
  });
}

function makeConvention(
  over: Partial<ConventionWithCollections> = {}
): ConventionWithCollections {
  return {
    id: 5,
    organizationId: 7,
    name: "GeekWay 2026",
    theme: "Board Games Galore",
    startDate: "2026-05-01T00:00:00.000Z",
    endDate: "2026-05-05T00:00:00.000Z",
    collections: [],
    ...over,
  } as ConventionWithCollections;
}

// Route frontendFetch by URL: the convention itself, plus the org-collections
// list fetched once an editor unlocks the page.
function routeFetch(convention: ConventionWithCollections, collections: unknown[] = []) {
  fetchMock.mockImplementation((_method: string, url: string) => {
    if (url === `/con/${convention.id}`) {
      return Promise.resolve({ json: async () => convention });
    }
    if (url.endsWith("/collections")) {
      return Promise.resolve({ json: async () => collections });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

describe("ConventionInfo", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
  });

  it("fetches and renders the convention name, theme, and dates", async () => {
    mockPermissions();
    routeFetch(makeConvention());
    render(<ConventionInfo id={5} />, { wrapper });

    expect(await screen.findByText("GeekWay 2026")).toBeInTheDocument();
    expect(screen.getByText("Board Games Galore")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("GET", "/con/5", null, "tok");
    // Both dates render through the DateFormatter (full date style).
    expect(screen.getByText("Start Date:")).toBeInTheDocument();
    expect(screen.getByText("End Date:")).toBeInTheDocument();
  });

  it("renders a card for each attached collection", async () => {
    mockPermissions();
    routeFetch(
      makeConvention({
        collections: [
          { id: 1, collectionId: 11, conventionId: 5, collection: { id: 11, name: "Alpha" } },
          { id: 2, collectionId: 12, conventionId: 5, collection: { id: 12, name: "Beta" } },
        ],
      } as unknown as Partial<ConventionWithCollections>)
    );
    render(<ConventionInfo id={5} />, { wrapper });

    const names = (await screen.findAllByTestId("collection-card")).map(
      (n) => n.textContent
    );
    expect(names).toEqual(["Alpha", "Beta"]);
  });

  it("hides edit/attach controls from read-only viewers", async () => {
    mockPermissions(); // no admin anywhere
    routeFetch(makeConvention());
    render(<ConventionInfo id={5} />, { wrapper });

    await screen.findByText("GeekWay 2026");
    expect(
      screen.queryByRole("button", { name: "Edit GeekWay 2026" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Attach Collection" })
    ).not.toBeInTheDocument();
  });

  it("shows edit + attach/create/import controls to a super admin", async () => {
    mockPermissions({ superAdmin: true });
    routeFetch(makeConvention());
    render(<ConventionInfo id={5} />, { wrapper });

    expect(
      await screen.findByRole("button", { name: "Edit GeekWay 2026" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach Collection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Collection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import Collection" })).toBeInTheDocument();
  });

  it("unlocks editing for an admin of the convention's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    routeFetch(makeConvention({ organizationId: 7 }));
    render(<ConventionInfo id={5} />, { wrapper });

    expect(
      await screen.findByRole("button", { name: "Edit GeekWay 2026" })
    ).toBeInTheDocument();
  });

  it("unlocks editing for an admin of the convention itself", async () => {
    mockPermissions({ conAdmin: [{ conventionId: 5, admin: true }] });
    routeFetch(makeConvention({ id: 5 }));
    render(<ConventionInfo id={5} />, { wrapper });

    expect(
      await screen.findByRole("button", { name: "Edit GeekWay 2026" })
    ).toBeInTheDocument();
  });

  it("fetches the org collection list once an editor unlocks the page", async () => {
    mockPermissions({ superAdmin: true });
    routeFetch(makeConvention({ organizationId: 7 }), [
      { id: 99, name: "Available" },
    ]);
    render(<ConventionInfo id={5} />, { wrapper });

    await screen.findByText("GeekWay 2026");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "GET",
        "/org/7/collections",
        null,
        "tok"
      )
    );
  });
});

describe("ConventionInfo — attach collection", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    toastSaveErrorMock.mockReset();
    toastNetworkErrorMock.mockReset();
  });

  // Open the attach modal (only an editor sees the control) and return the
  // "Attach" submit button once the dialog is on screen.
  async function openAttachModal() {
    await screen.findByText("GeekWay 2026");
    await userEvent.click(screen.getByRole("button", { name: "Attach Collection" }));
    return screen.findByRole("button", { name: "Attach" });
  }

  it("POSTs to the conventionCollection endpoint when an attach is submitted", async () => {
    mockPermissions({ superAdmin: true });
    routeFetch(makeConvention({ organizationId: 7 }), [{ id: 99, name: "Available" }]);
    render(<ConventionInfo id={5} />, { wrapper });

    await userEvent.click(await openAttachModal());

    const call = fetchMock.mock.calls.find(
      (c) => c[0] === "POST" && String(c[1]).startsWith("/con/5/conventionCollection/")
    );
    expect(call).toBeTruthy();
    expect(call![3]).toBe("tok");
  });

  it("surfaces a save error when the attach response is not ok", async () => {
    mockPermissions({ superAdmin: true });
    fetchMock.mockImplementation((_method: string, url: string) => {
      if (url === "/con/5") {
        return Promise.resolve({ json: async () => makeConvention({ organizationId: 7 }) });
      }
      if (url.endsWith("/collections")) {
        return Promise.resolve({ json: async () => [{ id: 99, name: "Available" }] });
      }
      // The attach POST fails.
      return Promise.resolve({ ok: false, status: 500 });
    });
    render(<ConventionInfo id={5} />, { wrapper });

    await userEvent.click(await openAttachModal());

    await waitFor(() => expect(toastSaveErrorMock).toHaveBeenCalledTimes(1));
  });

  it("surfaces a network error when the attach request rejects", async () => {
    mockPermissions({ superAdmin: true });
    fetchMock.mockImplementation((_method: string, url: string) => {
      if (url === "/con/5") {
        return Promise.resolve({ json: async () => makeConvention({ organizationId: 7 }) });
      }
      if (url.endsWith("/collections")) {
        return Promise.resolve({ json: async () => [{ id: 99, name: "Available" }] });
      }
      return Promise.reject(new Error("offline"));
    });
    render(<ConventionInfo id={5} />, { wrapper });

    await userEvent.click(await openAttachModal());

    await waitFor(() => expect(toastNetworkErrorMock).toHaveBeenCalledTimes(1));
  });
});
