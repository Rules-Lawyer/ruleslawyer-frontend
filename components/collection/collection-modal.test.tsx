import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDisclosure } from "@/utilities/useDisclosure";
import CollectionModal from "@/components/collection/collection-modal";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import { toastSaveError, toastNetworkError } from "@/utilities/toastFetchError";
import type { Collection } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// The save/archive toasts render through HeroUI's global toaster; stub them so
// the failure-path assertions don't depend on that machinery being mounted.
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

// CollectionModal reads { isOpen, onOpen, onClose } off the disclosure.
const openDisclosure = () =>
  ({ isOpen: true, onOpen: jest.fn(), onClose: jest.fn() } as unknown as ReturnType<
    typeof useDisclosure
  >);

function makeCollection(over: Partial<Collection> = {}): Collection {
  return {
    id: 5,
    name: "Strategy",
    organizationId: 7,
    public: true,
    allowWinning: false,
    archived: false,
    ...over,
  };
}

describe("CollectionModal — edit", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 5 }) });
  });

  it("titles the modal 'Edit' and prefills the form from the collection", async () => {
    render(
      <CollectionModal
        collectionIn={makeCollection({ name: "Strategy", allowWinning: true })}
        disclosure={openDisclosure()}
      />
    );

    expect(await screen.findByText("Edit Collection")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Strategy");
    expect(screen.getByLabelText("Allow Winning")).toBeChecked();
  });

  it("PUTs the edited collection on save", async () => {
    render(
      <CollectionModal
        collectionIn={makeCollection({ id: 5, name: "Strategy", allowWinning: false })}
        disclosure={openDisclosure()}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/collection/5",
      { name: "Strategy", allowWinning: false },
      "tok"
    );
  });

  it("archives the collection after confirmation", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<CollectionModal collectionIn={makeCollection({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Archive" }));

    expect(fetchMock).toHaveBeenCalledWith("PUT", "/collection/5/archive", null, "tok");
    confirmSpy.mockRestore();
  });
});

describe("CollectionModal — create", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("titles the modal 'Create' when no collection is provided", async () => {
    render(<CollectionModal organizationId={7} disclosure={openDisclosure()} />);
    expect(await screen.findByText("Create Collection")).toBeInTheDocument();
  });

  it("POSTs a new collection to the organization", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 42 }) });
    render(<CollectionModal organizationId={7} disclosure={openDisclosure()} />);

    await userEvent.type(await screen.findByLabelText("Name"), "New Shelf");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "POST",
      "/org/7/collections",
      { name: "New Shelf", allowWinning: false },
      "tok"
    );
  });

  it("attaches the new collection to a convention when conventionId is set", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 42 }) });
    render(
      <CollectionModal organizationId={7} conventionId={3} disclosure={openDisclosure()} />
    );

    await userEvent.type(await screen.findByLabelText("Name"), "Con Shelf");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "POST",
        "/con/3/conventionCollection/42",
        null,
        "tok"
      )
    );
  });
});

describe("CollectionModal — import", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ collectionId: 99 }) });
  });

  it("titles the modal 'Import' and uploads a multipart payload", async () => {
    render(<CollectionModal organizationId={7} importFile disclosure={openDisclosure()} />);

    expect(await screen.findByText("Import Collection")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "Imported");

    const file = new File(["a,b,c"], "import.csv", { type: "text/csv" });
    await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    const call = fetchMock.mock.calls.find((c) => c[0] === "POST" && c[1] === "/org/7/col");
    expect(call).toBeTruthy();
    const [, , body, token, , multipart] = call!;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("name")).toBe("Imported");
    expect(token).toBe("tok");
    expect(multipart).toBe(true);
  });
});

describe("CollectionModal — load by id", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("fetches the collection by id and prefills the form", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => makeCollection({ id: 8, name: "Fetched", allowWinning: true }),
    });
    render(<CollectionModal collectionId={8} disclosure={openDisclosure()} />);

    expect(await screen.findByText("Edit Collection")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("GET", "/collection/8", null, "tok");
    expect(screen.getByLabelText("Name")).toHaveValue("Fetched");
    expect(screen.getByLabelText("Allow Winning")).toBeChecked();
  });
});

describe("CollectionModal — import + attach", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ collectionId: 99 }) });
  });

  it("attaches the imported collection to a convention when conventionId is set", async () => {
    render(
      <CollectionModal
        organizationId={7}
        conventionId={3}
        importFile
        disclosure={openDisclosure()}
      />
    );

    await userEvent.type(await screen.findByLabelText("Name"), "Imported");
    const file = new File(["a,b,c"], "import.csv", { type: "text/csv" });
    await userEvent.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      file
    );
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "POST",
        "/con/3/conventionCollection/99",
        null,
        "tok"
      )
    );
  });
});

describe("CollectionModal — error handling", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    toastSaveErrorMock.mockReset();
    toastNetworkErrorMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("surfaces a save error when an edit PUT comes back non-ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    render(
      <CollectionModal collectionIn={makeCollection({ id: 5 })} disclosure={openDisclosure()} />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(toastSaveErrorMock).toHaveBeenCalledTimes(1));
  });

  it("surfaces a network error when an edit PUT rejects", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(
      <CollectionModal collectionIn={makeCollection({ id: 5 })} disclosure={openDisclosure()} />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(toastNetworkErrorMock).toHaveBeenCalledTimes(1));
  });

  it("surfaces a save error when archiving comes back non-ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <CollectionModal collectionIn={makeCollection({ id: 5 })} disclosure={openDisclosure()} />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Archive" }));
    await waitFor(() => expect(toastSaveErrorMock).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });
});

describe("CollectionModal — permissions", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
  });

  it("hides Save and Archive from read-only viewers", async () => {
    mockPermissions({ superAdmin: false });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 5 }) });
    render(<CollectionModal collectionIn={makeCollection()} disclosure={openDisclosure()} />);

    await screen.findByText("Edit Collection");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
    // The footer Close button (distinct from the modal's built-in dismiss "X",
    // which also exposes the accessible name "Close").
    expect(screen.getByText("Close")).toBeInTheDocument();
  });

  it("unlocks Save/Archive for an admin of the collection's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 5 }) });
    render(
      <CollectionModal
        collectionIn={makeCollection({ organizationId: 7 })}
        disclosure={openDisclosure()}
      />
    );

    expect(await screen.findByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  });

  it("unlocks Save for an org admin creating a new collection", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    render(<CollectionModal organizationId={7} disclosure={openDisclosure()} />);

    expect(await screen.findByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("stays read-only when the viewer has no loaded permission record", async () => {
    mockPermissions({ userData: null });
    render(
      <CollectionModal collectionIn={makeCollection()} disclosure={openDisclosure()} />
    );

    await screen.findByText("Edit Collection");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
