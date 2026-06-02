import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GameCard from "@/components/game/game-card";
import usePermissions from "@/utilities/swr/usePermissions";
import type { GameWithCopies } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
// Isolate GameCard from its (heroui / fetch heavy) children.
jest.mock("@/components/game/game-modal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/copy/copy-bubbles", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/boardgamegeek/board-game-geek", () => ({ __esModule: true, default: () => null }));
jest.mock("@/utilities/swr/usePermissions");

const usePermissionsMock = usePermissions as jest.Mock;

// Build the permissions shape GameCard reads: user.data.superAdmin and
// organizations.data[].{organizationId, admin}.
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

function makeGame(over: Partial<GameWithCopies> = {}): GameWithCopies {
  return {
    id: 1,
    organizationId: 7,
    name: "Catan",
    copies: [],
    bggId: null,
    ...over,
  } as unknown as GameWithCopies;
}

describe("GameCard — readOnly access logic", () => {
  beforeEach(() => usePermissionsMock.mockReset());

  it("labels the card 'View' for an archived game even for an admin", async () => {
    mockPermissions({ superAdmin: true });
    render(<GameCard gameIn={makeGame()} gameId={1} archived />);
    expect(
      await screen.findByRole("button", { name: "View Catan" })
    ).toBeInTheDocument();
  });

  it("labels the card 'Edit' for a super admin", async () => {
    mockPermissions({ superAdmin: true });
    render(<GameCard gameIn={makeGame()} gameId={1} />);
    expect(
      await screen.findByRole("button", { name: "Edit Catan" })
    ).toBeInTheDocument();
  });

  it("labels the card 'Edit' for an admin of the game's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: true }] });
    render(<GameCard gameIn={makeGame({ organizationId: 7 })} gameId={1} />);
    expect(
      await screen.findByRole("button", { name: "Edit Catan" })
    ).toBeInTheDocument();
  });

  it("labels the card 'View' for a non-admin of the game's organization", async () => {
    mockPermissions({ orgAdmin: [{ organizationId: 7, admin: false }] });
    render(<GameCard gameIn={makeGame({ organizationId: 7 })} gameId={1} />);
    expect(
      await screen.findByRole("button", { name: "View Catan" })
    ).toBeInTheDocument();
  });
});

describe("GameCard — rendering", () => {
  beforeEach(() => mockPermissions({ superAdmin: true }));

  it("falls back to a placeholder name when the game name is empty", async () => {
    render(<GameCard gameIn={makeGame({ name: "" })} gameId={1} />);
    expect(await screen.findByText("[unknown name]")).toBeInTheDocument();
    // Empty name also feeds the "game" word into the aria-label.
    expect(screen.getByRole("button", { name: "Edit game" })).toBeInTheDocument();
  });

  it("points the cover <img> at the backend cover route for the game id", async () => {
    render(<GameCard gameIn={makeGame({ id: 42 })} gameId={42} />);
    const img = await screen.findByRole("img", { name: "Catan" });
    expect(img.getAttribute("src")).toMatch(/\/game\/42\/cover$/);
  });

  it("busts the cover cache with a ?v= param keyed on lastBGGSync", async () => {
    render(
      <GameCard gameIn={makeGame({ id: 42, lastBGGSync: "2026-06-02T00:00:00Z" })} gameId={42} />
    );
    const img = await screen.findByRole("img", { name: "Catan" });
    expect(img.getAttribute("src")).toMatch(
      /\/game\/42\/cover\?v=2026-06-02T00%3A00%3A00Z$/
    );
  });

  it("falls back to the library icon when the cover image fails to load", async () => {
    render(<GameCard gameIn={makeGame()} gameId={1} />);
    const img = await screen.findByRole("img", { name: "Catan" });

    // The cover route 404s for a game with no art; the browser fires onError.
    fireEvent.error(img);

    await waitFor(() =>
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    );
  });

  it("re-shows the cover when new art arrives for a game that previously had none", async () => {
    // Game starts with no cover: the route 404s and we fall back to the icon.
    const { rerender } = render(
      <GameCard gameIn={makeGame({ id: 42 })} gameId={42} />
    );
    fireEvent.error(await screen.findByRole("img", { name: "Catan" }));
    await waitFor(() =>
      expect(screen.queryByRole("img")).not.toBeInTheDocument()
    );

    // A BGG sync adds art and bumps lastBGGSync, changing the cover URL. The
    // error flag must reset so the new art renders — keying the reset on the
    // game id alone left the placeholder stuck since the id never changed.
    rerender(
      <GameCard
        gameIn={makeGame({ id: 42, lastBGGSync: "2026-06-02T00:00:00Z" })}
        gameId={42}
      />
    );

    const img = await screen.findByRole("img", { name: "Catan" });
    expect(img.getAttribute("src")).toMatch(/\?v=2026-06-02T00%3A00%3A00Z$/);
  });
});
