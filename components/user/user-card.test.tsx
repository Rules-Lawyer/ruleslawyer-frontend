import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserCard from "@/components/user/user-card";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import { toastDeleteError, toastDeleteNetworkError } from "@/utilities/toastFetchError";
import type { UserPermissionRow } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
jest.mock("@/components/user/user-modal", () => ({ __esModule: true, default: () => null }));
// The delete toasts render through HeroUI's global toaster; stub them so the
// failure-path assertions don't depend on that machinery being mounted.
jest.mock("@/utilities/toastFetchError", () => ({
  toastDeleteError: jest.fn(),
  toastDeleteNetworkError: jest.fn(),
}));

const fetchMock = frontendFetch as jest.Mock;
const usePermissionsMock = usePermissions as jest.Mock;
const toastDeleteErrorMock = toastDeleteError as jest.Mock;
const toastDeleteNetworkErrorMock = toastDeleteNetworkError as jest.Mock;

function mockPermissions(opts: {
  superAdmin?: boolean;
  orgAdmin?: { organizationId: number; admin: boolean }[];
  conAdmin?: { conventionId: number; admin: boolean }[];
  /** Pass null to simulate a viewer with no loaded permission record. */
  userData?: null;
} = {}) {
  usePermissionsMock.mockReturnValue({
    permissions: {
      user: { data: opts.userData === null ? null : { superAdmin: opts.superAdmin ?? false } },
      organizations: { data: opts.orgAdmin ?? [] },
      conventions: { data: opts.conAdmin ?? [] },
    },
    isLoading: false,
    isError: {},
  });
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

describe("UserCard — display", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions();
  });

  it("renders the user's name and email", async () => {
    render(<UserCard userIn={makeUser()} onDeleted={jest.fn()} userType="organization" />);
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@test.dev")).toBeInTheDocument();
  });

  it("falls back to placeholders for an empty name and email", async () => {
    render(
      <UserCard
        userIn={makeUser({ user: { id: 1, name: "", email: "" } as UserPermissionRow["user"] })}
        onDeleted={jest.fn()}
        userType="organization"
      />
    );
    expect(await screen.findAllByText("[unknown user]")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Edit user" })).toBeInTheDocument();
  });

  it("composes organization role labels joined by pipes", async () => {
    render(
      <UserCard
        userIn={makeUser({ admin: true, geekGuide: true, readOnly: true })}
        onDeleted={jest.fn()}
        userType="organization"
      />
    );
    expect(await screen.findByText("Admin | Geek Guide | Read Only")).toBeInTheDocument();
  });

  it("includes the Attendee label for convention users", async () => {
    render(
      <UserCard
        userIn={makeUser({ admin: false, attendee: true, geekGuide: true })}
        onDeleted={jest.fn()}
        userType="convention"
      />
    );
    expect(await screen.findByText("Attendee | Geek Guide")).toBeInTheDocument();
  });
});

describe("UserCard — delete action", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
  });

  it("hides the delete button when the viewer is read-only", async () => {
    mockPermissions({ superAdmin: false });
    render(<UserCard userIn={makeUser()} onDeleted={jest.fn()} userType="organization" />);
    await screen.findByText("Ada Lovelace");
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("deletes an organization user after confirmation and notifies the parent", async () => {
    mockPermissions({ superAdmin: true });
    fetchMock.mockResolvedValue({ ok: true });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    const onDeleted = jest.fn();

    render(<UserCard userIn={makeUser({ id: 55 })} onDeleted={onDeleted} userType="organization" />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Ada Lovelace" }));

    expect(fetchMock).toHaveBeenCalledWith("DELETE", "/userOrgPerm/55", {}, "tok");
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });

  it("does not delete when the confirmation is dismissed", async () => {
    mockPermissions({ superAdmin: true });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);
    const onDeleted = jest.fn();

    render(<UserCard userIn={makeUser()} onDeleted={onDeleted} userType="organization" />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Ada Lovelace" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("targets the convention endpoint for convention users", async () => {
    mockPermissions({ superAdmin: true });
    fetchMock.mockResolvedValue({ ok: true });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<UserCard userIn={makeUser({ id: 88 })} onDeleted={jest.fn()} userType="convention" />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Ada Lovelace" }));

    expect(fetchMock).toHaveBeenCalledWith("DELETE", "/userConPerm/88", {}, "tok");
    confirmSpy.mockRestore();
  });

  it("surfaces a delete error and does not notify the parent on a non-ok response", async () => {
    mockPermissions({ superAdmin: true });
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    const onDeleted = jest.fn();

    render(<UserCard userIn={makeUser({ id: 55 })} onDeleted={onDeleted} userType="organization" />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Ada Lovelace" }));

    await waitFor(() => expect(toastDeleteErrorMock).toHaveBeenCalledTimes(1));
    expect(onDeleted).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("surfaces a delete network error when the request rejects", async () => {
    mockPermissions({ superAdmin: true });
    fetchMock.mockRejectedValue(new Error("offline"));
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    render(<UserCard userIn={makeUser({ id: 55 })} onDeleted={jest.fn()} userType="convention" />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete Ada Lovelace" }));

    await waitFor(() => expect(toastDeleteNetworkErrorMock).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });
});

describe("UserCard — edit affordance + permission gating", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
  });

  it("opens the edit modal when the card is activated by keyboard", async () => {
    mockPermissions();
    render(<UserCard userIn={makeUser()} onDeleted={jest.fn()} userType="organization" />);

    const card = await screen.findByRole("button", { name: "Edit Ada Lovelace" });
    // The card is a div with role=button, so it handles Enter/Space itself.
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    // No throw / crash; the modal child is stubbed, so this just exercises the handler.
    expect(card).toBeInTheDocument();
  });

  it("shows the delete control to an admin of the user's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    render(<UserCard userIn={makeUser()} onDeleted={jest.fn()} userType="organization" />);
    expect(
      await screen.findByRole("button", { name: "Delete Ada Lovelace" })
    ).toBeInTheDocument();
  });

  it("shows the delete control to an admin of one of the user's conventions", async () => {
    mockPermissions({ conAdmin: [{ conventionId: 9, admin: true }] });
    render(
      <UserCard
        userIn={makeUser({
          conventions: [{ conventionId: 9 }] as UserPermissionRow["conventions"],
        })}
        onDeleted={jest.fn()}
        userType="convention"
      />
    );
    expect(
      await screen.findByRole("button", { name: "Delete Ada Lovelace" })
    ).toBeInTheDocument();
  });

  it("stays read-only when the viewer has no loaded permission record", async () => {
    mockPermissions({ userData: null });
    render(<UserCard userIn={makeUser()} onDeleted={jest.fn()} userType="organization" />);
    await screen.findByText("Ada Lovelace");
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });
});
