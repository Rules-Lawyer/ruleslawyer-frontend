import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDisclosure } from "@/utilities/useDisclosure";
import CopyModal from "@/components/copy/copy-modal";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import {
  toastSaveError,
  toastNetworkError,
  toastDeleteError,
  toastDeleteNetworkError,
} from "@/utilities/toastFetchError";
import type { CopyForEditor } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// The save/delete toasts render through HeroUI's global toaster; stub them so
// the failure-path assertions don't depend on that machinery being mounted.
jest.mock("@/utilities/toastFetchError", () => ({
  toastSaveError: jest.fn(),
  toastNetworkError: jest.fn(),
  toastDeleteError: jest.fn(),
  toastDeleteNetworkError: jest.fn(),
}));

const fetchMock = frontendFetch as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const toastSaveErrorMock = toastSaveError as jest.Mock;
const toastNetworkErrorMock = toastNetworkError as jest.Mock;
const toastDeleteErrorMock = toastDeleteError as jest.Mock;
const toastDeleteNetworkErrorMock = toastDeleteNetworkError as jest.Mock;

function mockPermissions(opts: {
  superAdmin?: boolean;
  orgAdmin?: { organizationId: number; admin: boolean }[];
  userData?: null;
} = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: opts.userData === null ? null : { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: opts.orgAdmin ?? [] },
      conventions: { data: [] },
    },
    isLoading: false,
    isError: {},
  });
}

// CopyModal fires several requests on mount (collections list, game-autocomplete
// via useAsyncList) plus the save/delete call. Route them by URL.
function routeFetch() {
  fetchMock.mockImplementation((method: string, url: string) => {
    if (method === "DELETE") return Promise.resolve({ ok: true });
    if (url.includes("/autocomplete")) {
      return Promise.resolve({ json: async () => [{ id: 11, name: "Other Game" }] });
    }
    if (url.includes("/collections")) {
      return Promise.resolve({ json: async () => [{ id: 3, name: "Main" }] });
    }
    // save (PUT/POST) response
    return Promise.resolve({
      ok: true,
      json: async () => ({ collection: {}, collectionId: 3, game: {}, gameId: 10 }),
    });
  });
}

const openDisclosure = () =>
  ({ isOpen: true, onOpen: jest.fn(), onClose: jest.fn() } as unknown as ReturnType<
    typeof useDisclosure
  >);

function makeCopy(over: Partial<CopyForEditor> = {}): CopyForEditor {
  return {
    id: 5,
    gameId: 10,
    organizationId: 7,
    collectionId: 3,
    barcodeLabel: "A-1",
    barcode: "001",
    winnable: false,
    comments: "a note",
    dateAdded: "2026-01-01",
    dateRetired: null,
    winnerId: null,
    game: { id: 10, name: "Catan" } as CopyForEditor["game"],
    collection: { id: 3, name: "Main", organizationId: 7, public: true, allowWinning: false, archived: false },
    ...over,
  } as CopyForEditor;
}

describe("CopyModal — titles", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
    routeFetch();
  });

  it("titles an edit with the game name and barcode label", async () => {
    render(<CopyModal copyIn={makeCopy()} disclosure={openDisclosure()} />);
    expect(await screen.findByText("Catan (A-1)")).toBeInTheDocument();
  });

  it("titles a create modal 'Create Copy'", async () => {
    render(<CopyModal organizationId={7} disclosure={openDisclosure()} />);
    expect(await screen.findByText("Create Copy")).toBeInTheDocument();
  });
});

describe("CopyModal — edit actions", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
    routeFetch();
  });

  it("prefills the comments field from the copy", async () => {
    render(<CopyModal copyIn={makeCopy({ comments: "a note" })} disclosure={openDisclosure()} />);
    expect(await screen.findByLabelText("Comments")).toHaveValue("a note");
  });

  it("PUTs the copy with its prefilled fields on save", async () => {
    render(<CopyModal copyIn={makeCopy({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    const call = fetchMock.mock.calls.find((c) => c[0] === "PUT" && c[1] === "/copy/5");
    expect(call).toBeTruthy();
    // The prefill effect restores every field, including comments, so an
    // untouched edit round-trips the original values.
    expect(call![2]).toEqual({
      collectionId: 3,
      winnable: false,
      barcodeLabel: "A-1",
      barcode: "001",
      comments: "a note",
      gameId: 10,
    });
  });

  it("deletes the copy after confirmation", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<CopyModal copyIn={makeCopy({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("DELETE", "/copy/5", null, "tok")
    );
    confirmSpy.mockRestore();
  });

  it("does not delete when confirmation is dismissed", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    render(<CopyModal copyIn={makeCopy({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    expect(fetchMock).not.toHaveBeenCalledWith("DELETE", "/copy/5", null, "tok");
    confirmSpy.mockRestore();
  });
});

describe("CopyModal — permissions", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    routeFetch();
  });

  it("hides Save and Delete from read-only viewers", async () => {
    mockPermissions({ superAdmin: false });
    render(<CopyModal copyIn={makeCopy()} disclosure={openDisclosure()} />);

    await screen.findByText("Catan (A-1)");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("unlocks Save/Delete for an admin of the copy's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    render(<CopyModal copyIn={makeCopy({ organizationId: 7 })} disclosure={openDisclosure()} />);

    expect(await screen.findByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("unlocks Save for a non-super-admin creating a copy in an organization", async () => {
    mockPermissions({ superAdmin: false });
    render(<CopyModal organizationId={7} disclosure={openDisclosure()} />);

    expect(await screen.findByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("stays read-only when the viewer has no loaded permission record", async () => {
    mockPermissions({ userData: null });
    render(<CopyModal copyIn={makeCopy()} disclosure={openDisclosure()} />);

    await screen.findByText("Catan (A-1)");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });

  it("shows the Winnable checkbox only when the collection allows winning", async () => {
    mockPermissions({ superAdmin: true });
    render(
      <CopyModal
        copyIn={makeCopy({
          collection: {
            id: 3,
            name: "Main",
            organizationId: 7,
            public: true,
            allowWinning: true,
            archived: false,
          },
        })}
        disclosure={openDisclosure()}
      />
    );

    expect(await screen.findByLabelText("Winnable")).toBeInTheDocument();
  });
});

describe("CopyModal — load by id", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("fetches the copy by id and titles the modal from it", async () => {
    fetchMock.mockImplementation((_method: string, url: string) => {
      if (url === "/copy/5") {
        return Promise.resolve({ json: async () => makeCopy({ id: 5 }) });
      }
      if (url.includes("/autocomplete")) {
        return Promise.resolve({ json: async () => [] });
      }
      if (url.includes("/collections")) {
        return Promise.resolve({ json: async () => [{ id: 3, name: "Main" }] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<CopyModal copyId={5} disclosure={openDisclosure()} />);

    expect(await screen.findByText("Catan (A-1)")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("GET", "/copy/5", null, "tok");
  });
});

describe("CopyModal — error handling", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    toastSaveErrorMock.mockReset();
    toastNetworkErrorMock.mockReset();
    toastDeleteErrorMock.mockReset();
    toastDeleteNetworkErrorMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  // Route the supporting requests (collections / autocomplete) to benign data,
  // and let the test override the save/delete outcome.
  function routeWithSave(saveResult: Promise<unknown>) {
    fetchMock.mockImplementation((_method: string, url: string) => {
      if (url.includes("/autocomplete")) {
        return Promise.resolve({ json: async () => [{ id: 11, name: "Other Game" }] });
      }
      if (url.includes("/collections")) {
        return Promise.resolve({ json: async () => [{ id: 3, name: "Main" }] });
      }
      return saveResult;
    });
  }

  it("surfaces a save error when an edit PUT comes back non-ok", async () => {
    routeWithSave(Promise.resolve({ ok: false, status: 500 }));
    render(<CopyModal copyIn={makeCopy({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(toastSaveErrorMock).toHaveBeenCalledTimes(1));
  });

  it("surfaces a network error when an edit PUT rejects", async () => {
    routeWithSave(Promise.reject(new Error("offline")));
    render(<CopyModal copyIn={makeCopy({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(toastNetworkErrorMock).toHaveBeenCalledTimes(1));
  });

  it("surfaces a delete error when the DELETE comes back non-ok", async () => {
    routeWithSave(Promise.resolve({ ok: false, status: 500 }));
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<CopyModal copyIn={makeCopy({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(toastDeleteErrorMock).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });

  it("surfaces a delete network error when the DELETE rejects", async () => {
    routeWithSave(Promise.reject(new Error("offline")));
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<CopyModal copyIn={makeCopy({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(toastDeleteNetworkErrorMock).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });
});
