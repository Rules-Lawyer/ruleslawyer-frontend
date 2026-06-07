import { render, screen } from "@testing-library/react";
import GameGrid from "@/components/game/game-grid";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
// GameCard and CopyModal are exercised by their own suites; stub them here so
// GameGrid is tested in isolation.
jest.mock("@/components/game/game-card", () => ({
  __esModule: true,
  default: ({ gameId }: { gameId: number }) => <div data-testid="game-card">{gameId}</div>,
}));
jest.mock("@/components/copy/copy-modal", () => ({ __esModule: true, default: () => null }));

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

// The non-collection path issues a single GET /game/withCopies request.
function mockGamesResponse(body: {
  data?: { id: number }[];
  total?: number;
  totalPages?: number;
}) {
  fetchMock.mockResolvedValue({ json: async () => body });
}

describe("GameGrid", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions();
  });

  it("shows a loading indicator until the games request resolves", () => {
    // A never-resolving fetch keeps the grid in its loading state.
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<GameGrid organizationId={7} />);
    expect(screen.getByLabelText("Loading...")).toBeInTheDocument();
  });

  it("renders a GameCard for each returned game", async () => {
    mockGamesResponse({ data: [{ id: 1 }, { id: 2 }, { id: 3 }], total: 3, totalPages: 1 });
    render(<GameGrid organizationId={7} />);
    expect(await screen.findAllByTestId("game-card")).toHaveLength(3);
  });

  it("requests games for the given organization", async () => {
    mockGamesResponse({ data: [], total: 0, totalPages: 1 });
    render(<GameGrid organizationId={7} />);
    await screen.findByPlaceholderText("Type a game name");
    expect(fetchMock).toHaveBeenCalledWith(
      "GET",
      expect.stringContaining("/game/withCopies?orgId=7"),
      null,
      "tok"
    );
  });

  it("renders pagination with the current page and Previous disabled on page one", async () => {
    mockGamesResponse({ data: [{ id: 1 }], total: 120, totalPages: 3 });
    render(<GameGrid organizationId={7} />);

    // Pagination is rendered both above and below the grid.
    expect(await screen.findAllByText(/Page 1 of 3\s*\(120 games\)/)).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Previous" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Next" })[0]).toBeEnabled();
  });

  it("omits pagination when there is only one page", async () => {
    mockGamesResponse({ data: [{ id: 1 }], total: 1, totalPages: 1 });
    render(<GameGrid organizationId={7} />);
    await screen.findByTestId("game-card");
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
  });

  it("hides the create-game button from non-admins", async () => {
    mockPermissions({ superAdmin: false });
    mockGamesResponse({ data: [], total: 0, totalPages: 1 });
    render(<GameGrid organizationId={7} />);
    await screen.findByPlaceholderText("Type a game name");
    expect(screen.queryByRole("button", { name: "Create Game" })).not.toBeInTheDocument();
  });

  it("shows the create-game button to super admins", async () => {
    mockPermissions({ superAdmin: true });
    mockGamesResponse({ data: [], total: 0, totalPages: 1 });
    render(<GameGrid organizationId={7} />);
    expect(
      await screen.findByRole("button", { name: "Create Game" })
    ).toBeInTheDocument();
  });
});
