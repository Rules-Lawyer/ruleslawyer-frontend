import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserGrid from "@/components/user/user-grid";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import type { UserPermissionRow } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
jest.mock("@/components/user/user-modal", () => ({ __esModule: true, default: () => null }));
// Stub UserCard so we can observe order without its own fetch/permission logic.
// The delete button lets us drive the grid's onDeleted -> onModalClose refetch.
jest.mock("@/components/user/user-card", () => ({
  __esModule: true,
  default: ({
    userIn,
    onDeleted,
  }: {
    userIn: UserPermissionRow;
    onDeleted: () => void;
  }) => (
    <>
      <span data-testid="user-card">{userIn.user.name}</span>
      <button onClick={onDeleted}>delete-{userIn.user.name}</button>
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

function makeUser(id: number, name: string): UserPermissionRow {
  return {
    id,
    userId: id,
    organizationId: 7,
    admin: false,
    geekGuide: false,
    user: { id, name, email: `${name}@test.dev` },
  } as UserPermissionRow;
}

describe("UserGrid", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions();
  });

  it("sorts users alphabetically by name", () => {
    const users = [makeUser(1, "Charlie"), makeUser(2, "Alice"), makeUser(3, "Bob")];
    render(<UserGrid usersIn={users} organizationId={7} userType="organization" />);

    const names = screen.getAllByTestId("user-card").map((n) => n.textContent);
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);
  });

  it("renders one card per user", () => {
    const users = [makeUser(1, "Alice"), makeUser(2, "Bob")];
    render(<UserGrid usersIn={users} organizationId={7} userType="organization" />);
    expect(screen.getAllByTestId("user-card")).toHaveLength(2);
  });

  it("hides the add-user button from read-only viewers", () => {
    mockPermissions({ superAdmin: false });
    render(<UserGrid usersIn={[]} organizationId={7} userType="organization" />);
    expect(screen.queryByRole("button", { name: "Add User" })).not.toBeInTheDocument();
  });

  it("shows the add-user button to super admins", () => {
    mockPermissions({ superAdmin: true });
    render(<UserGrid usersIn={[]} organizationId={7} userType="organization" />);
    expect(screen.getByRole("button", { name: "Add User" })).toBeInTheDocument();
  });

  it("fetches organization users when none are passed in", async () => {
    fetchMock.mockResolvedValue({ json: async () => [makeUser(1, "Alice")] });
    render(<UserGrid organizationId={7} userType="organization" />);

    expect(await screen.findByTestId("user-card")).toHaveTextContent("Alice");
    expect(fetchMock).toHaveBeenCalledWith(
      "GET",
      "/userOrgPerm/organization/7",
      null,
      "tok"
    );
  });

  it("fetches convention users when only a conventionId is passed in", async () => {
    fetchMock.mockResolvedValue({ json: async () => [makeUser(1, "Alice")] });
    render(<UserGrid conventionId={42} userType="convention" />);

    expect(await screen.findByTestId("user-card")).toHaveTextContent("Alice");
    expect(fetchMock).toHaveBeenCalledWith(
      "GET",
      "/userConPerm/convention/42",
      null,
      "tok"
    );
  });

  it("shows the add-user button to an admin of the grid's organization", () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    render(<UserGrid usersIn={[]} organizationId={7} userType="organization" />);
    expect(screen.getByRole("button", { name: "Add User" })).toBeInTheDocument();
  });

  it("keeps read-only for a non-admin of the grid's organization", () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: false }] });
    render(<UserGrid usersIn={[]} organizationId={7} userType="organization" />);
    expect(screen.queryByRole("button", { name: "Add User" })).not.toBeInTheDocument();
  });

  it("refetches organization users after a card is deleted", async () => {
    mockPermissions({ superAdmin: true });
    render(
      <UserGrid usersIn={[makeUser(1, "Alice")]} organizationId={7} userType="organization" />
    );

    fetchMock.mockResolvedValue({ json: async () => [makeUser(2, "Bob")] });
    await userEvent.click(screen.getByRole("button", { name: "delete-Alice" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "GET",
        "/userOrgPerm/organization/7",
        null,
        "tok"
      )
    );
  });

  it("refetches convention users after a card is deleted", async () => {
    mockPermissions({ superAdmin: true });
    render(
      <UserGrid usersIn={[makeUser(1, "Alice")]} conventionId={42} userType="convention" />
    );

    fetchMock.mockResolvedValue({ json: async () => [makeUser(2, "Bob")] });
    await userEvent.click(screen.getByRole("button", { name: "delete-Alice" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "GET",
        "/userConPerm/convention/42",
        null,
        "tok"
      )
    );
  });
});
