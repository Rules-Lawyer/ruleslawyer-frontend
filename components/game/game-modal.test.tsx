import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useDisclosure } from "@/utilities/useDisclosure";
import GameModal from "@/components/game/game-modal";
import frontendFetch from "@/utilities/frontendFetch";
import usePermissions from "@/utilities/swr/usePermissions";
import type { GameWithCopies } from "@/types/models";

jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
jest.mock("@/utilities/swr/usePermissions");
jest.mock("@/components/copy/copy-bubbles", () => ({ __esModule: true, default: () => null }));

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

// When open, GameModal fetches /game/{id}/copies to compute copyCount; `copies`
// controls whether the Delete button is allowed.
function routeFetch(copies: unknown[] = []) {
  fetchMock.mockImplementation((method: string, url: string) => {
    if (method === "GET" && url.endsWith("/copies")) {
      return Promise.resolve({ json: async () => copies });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ id: 5, name: "Catan", bggId: 42 }),
      text: async () => JSON.stringify({ id: 5, name: "Catan", bggId: 42 }),
    });
  });
}

const openDisclosure = () =>
  ({ isOpen: true, onOpen: jest.fn(), onClose: jest.fn() } as unknown as ReturnType<
    typeof useDisclosure
  >);

function makeGame(over: Partial<GameWithCopies> = {}): GameWithCopies {
  return {
    id: 5,
    organizationId: 7,
    name: "Catan",
    bggId: 42,
    copies: [],
    ...over,
  } as unknown as GameWithCopies;
}

describe("GameModal", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    usePermissionsMock.mockReset();
    mockPermissions({ superAdmin: true });
    routeFetch([]);
  });

  it("titles the modal with the game name and prefills the inputs", async () => {
    render(
      <GameModal
        gameIn={makeGame({ bggVersionId: 99 })}
        disclosure={openDisclosure()}
      />
    );
    expect(await screen.findByText("Catan")).toBeInTheDocument();
    expect(screen.getByLabelText("Game Name")).toHaveValue("Catan");
    expect(screen.getByLabelText("BoardGameGeek ID")).toHaveValue("42");
    expect(screen.getByLabelText("BoardGameGeek Version ID")).toHaveValue("99");
  });

  it("PUTs the game with numeric bggId/bggVersionId on save", async () => {
    render(
      <GameModal
        gameIn={makeGame({ id: 5, bggVersionId: 99 })}
        disclosure={openDisclosure()}
      />
    );

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/game/5",
      { name: "Catan", bggId: 42, bggVersionId: 99 },
      "tok"
    );
  });

  it("sends null (not 0) for an unset bggVersionId on save", async () => {
    // makeGame() leaves bggVersionId undefined -> the field is empty -> null,
    // so we never persist a bogus version id 0.
    render(<GameModal gameIn={makeGame({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "PUT",
      "/game/5",
      { name: "Catan", bggId: 42, bggVersionId: null },
      "tok"
    );
  });

  it("triggers a BGG sync", async () => {
    render(<GameModal gameIn={makeGame({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Sync With BGG" }));

    expect(fetchMock).toHaveBeenCalledWith("PUT", "/game/5/orgId/7/syncWithBGG", null, "tok");
  });

  it("does not prompt to sync when re-typing the same bggId on save", async () => {
    // Editing the field turns the state into a string ("42"); normalizing both
    // sides means "42" still equals the model's 42, so no change is detected.
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<GameModal gameIn={makeGame({ id: 5 })} disclosure={openDisclosure()} />);

    const bggInput = await screen.findByLabelText("BoardGameGeek ID");
    await userEvent.clear(bggInput);
    await userEvent.type(bggInput, "42");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "PUT",
      "/game/5/orgId/7/syncWithBGG",
      null,
      "tok"
    );
    confirmSpy.mockRestore();
  });

  it("prompts and syncs when the bggId actually changes on save", async () => {
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<GameModal gameIn={makeGame({ id: 5 })} disclosure={openDisclosure()} />);

    const bggInput = await screen.findByLabelText("BoardGameGeek ID");
    await userEvent.clear(bggInput);
    await userEvent.type(bggInput, "43");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "PUT",
        "/game/5/orgId/7/syncWithBGG",
        null,
        "tok"
      )
    );
    confirmSpy.mockRestore();
  });

  it("deletes a game with no copies after confirmation", async () => {
    routeFetch([]); // zero copies -> Delete allowed
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    render(<GameModal gameIn={makeGame({ id: 5 })} disclosure={openDisclosure()} />);

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("DELETE", "/game/5", null, "tok")
    );
    confirmSpy.mockRestore();
  });

  it("hides Delete once the game has copies", async () => {
    routeFetch([{ id: 1 }, { id: 2 }]); // copyCount becomes 2
    render(<GameModal gameIn={makeGame({ id: 5 })} disclosure={openDisclosure()} />);

    await screen.findByText("Catan");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
    );
  });

  it("hides editing controls from read-only viewers", async () => {
    mockPermissions({ superAdmin: false });
    render(<GameModal gameIn={makeGame()} disclosure={openDisclosure()} />);

    await screen.findByText("Catan");
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sync With BGG" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
