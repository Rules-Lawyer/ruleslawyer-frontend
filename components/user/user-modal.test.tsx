import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDisclosure } from "@/utilities/useDisclosure";
import UserModal from "@/components/user/user-modal";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import type { UserPermissionRow } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// Keep real heroui components, but stub addToast so no ToastProvider is needed.
jest.mock("@heroui/react", () => ({
  ...jest.requireActual("@heroui/react"),
  addToast: jest.fn(),
}));

const fetchMock = frontendFetch as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;

function mockPermissions(opts: { superAdmin?: boolean } = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: [] },
      conventions: { data: [] },
    },
    isLoading: false,
    isError: {},
  });
}

function openDisclosure() {
  const onClose = jest.fn();
  const disclosure = { isOpen: true, onOpen: jest.fn(), onClose } as unknown as ReturnType<
    typeof useDisclosure
  >;
  return { disclosure, onClose };
}

function makeUser(over: Partial<UserPermissionRow> = {}): UserPermissionRow {
  return {
    id: 1,
    userId: 1,
    organizationId: 7,
    admin: false,
    geekGuide: false,
    readOnly: false,
    attendee: false,
    user: { id: 1, name: "Ada Lovelace", email: "ada@test.dev" },
    conventions: [],
    ...over,
  } as UserPermissionRow;
}

describe("UserModal — layout", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("titles the modal with the existing user's name and hides the email field", async () => {
    render(
      <UserModal userIn={makeUser()} disclosure={openDisclosure().disclosure} userType="organization" />
    );
    expect(await screen.findByText("User Editor - Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("shows 'New User' and an email field when adding", async () => {
    render(
      <UserModal organizationId={7} disclosure={openDisclosure().disclosure} userType="organization" />
    );
    expect(await screen.findByText("User Editor - New User")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows the Attendee checkbox for convention users (not Read Only)", async () => {
    render(
      <UserModal userIn={makeUser()} disclosure={openDisclosure().disclosure} userType="convention" />
    );
    await screen.findByText("User Editor - Ada Lovelace");
    expect(screen.getByRole("checkbox", { name: "Attendee" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Read Only" })).not.toBeInTheDocument();
  });
});

describe("UserModal — organization save", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("PUTs an edited organization user with its permission flags", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    const { disclosure, onClose } = openDisclosure();
    const onSaved = jest.fn();
    render(
      <UserModal
        userIn={makeUser({ id: 55, admin: true, geekGuide: false, readOnly: true })}
        disclosure={disclosure}
        onSaved={onSaved}
        userType="organization"
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/userOrgPerm/55",
      { admin: true, geekGuide: false, readOnly: true },
      "tok"
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalled();
  });

  it("POSTs a new organization user with the entered email", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    render(
      <UserModal organizationId={7} disclosure={openDisclosure().disclosure} userType="organization" />
    );

    await userEvent.type(await screen.findByLabelText("Email"), "new@test.dev");
    await userEvent.click(screen.getByRole("checkbox", { name: "Admin" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "POST",
      "/userOrgPerm/organization/7/addUser",
      { email: "new@test.dev", admin: true, geekGuide: false, readOnly: false },
      "tok"
    );
  });
});

describe("UserModal — convention save", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
  });

  it("PUTs an edited convention user with the attendee flag", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    render(
      <UserModal
        userIn={makeUser({ id: 88, admin: false, geekGuide: true, attendee: true })}
        disclosure={openDisclosure().disclosure}
        userType="convention"
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/userConPerm/88",
      { admin: false, geekGuide: true, attendee: true },
      "tok"
    );
  });

  it("POSTs a new convention user to the convention endpoint", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    render(
      <UserModal
        conventionId={3}
        disclosure={openDisclosure().disclosure}
        userType="convention"
      />
    );

    await userEvent.type(await screen.findByLabelText("Email"), "con@test.dev");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "POST",
      "/userConPerm/convention/3/addUser",
      { email: "con@test.dev", admin: false, geekGuide: false, attendee: false },
      "tok"
    );
  });
});

describe("UserModal — failures & permissions", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
  });

  it("does not call onSaved or close when the server rejects the save", async () => {
    mockPermissions({ superAdmin: true });
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const { disclosure, onClose } = openDisclosure();
    const onSaved = jest.fn();

    render(
      <UserModal userIn={makeUser({ id: 55 })} disclosure={disclosure} onSaved={onSaved} userType="organization" />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("hides Save from read-only viewers", async () => {
    mockPermissions({ superAdmin: false });
    render(
      <UserModal userIn={makeUser()} disclosure={openDisclosure().disclosure} userType="organization" />
    );
    await screen.findByText("User Editor - Ada Lovelace");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
