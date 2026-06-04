import { render, screen } from "@testing-library/react";
import { useDisclosure } from "@/utilities/useDisclosure";
import CopyBubbles from "@/components/copy/copy-bubbles";
import frontendFetch from "@/utilities/frontendFetch";
import type { GameCopy, GameWithCopies } from "@/types/models";

// Same jsdom-safety mocks as the other component tests: useAuth pulls in
// @auth0/nextjs-auth0, and frontendFetch is only hit on the fetch fallback
// (not exercised here because we pass game.copies directly).
jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());
// CopyModal renders a heroui Modal subtree we don't care about here.
jest.mock("@/components/copy/copy-modal", () => ({
  __esModule: true,
  default: () => null,
}));

function makeCopy(over: Partial<GameCopy> = {}): GameCopy {
  return {
    id: 1,
    gameId: 1,
    dateAdded: "2026-01-01",
    barcodeLabel: "A-1",
    barcode: "0001",
    dateRetired: null,
    comments: null,
    winnable: false,
    winnerId: null,
    bggVersionOverride: null,
    collectionId: 1,
    organizationId: 1,
    checkOuts: [],
    game: {} as GameCopy["game"],
    ...over,
  };
}

// A copy that is currently checked out: it has an open check-out (checkIn null).
function checkedOut(over: Partial<GameCopy> = {}): GameCopy {
  return makeCopy({
    checkOuts: [
      {
        id: 1,
        attendeeId: 1,
        checkOut: "2026-01-01",
        checkIn: null,
        copyId: 1,
        submitted: true,
      },
    ],
    ...over,
  });
}

function makeGame(copies: GameCopy[]): GameWithCopies {
  return { id: 1, copies } as GameWithCopies;
}

// CopyBubbles only reads disclosure.onClose; a stub is enough.
function renderBubbles(props: {
  game: GameWithCopies;
  bubbleStyle?: string;
  archived?: boolean;
}) {
  const disclosure = { onClose: jest.fn() } as unknown as ReturnType<
    typeof useDisclosure
  >;
  return render(<CopyBubbles disclosure={disclosure} {...props} />);
}

describe("CopyBubbles — statusOnly", () => {
  it("counts available and checked-out copies", () => {
    const game = makeGame([
      makeCopy({ id: 1 }), // available (no checkouts)
      checkedOut({ id: 2 }), // checked out
      checkedOut({ id: 3 }), // checked out
    ]);

    renderBubbles({ game, bubbleStyle: "statusOnly" });

    expect(screen.getByText("1 Available")).toBeInTheDocument();
    expect(screen.getByText("2 Checked Out")).toBeInTheDocument();
    expect(screen.queryByText(/Archived/)).not.toBeInTheDocument();
  });

  it("treats a copy whose latest checkout is checked back in as available", () => {
    const returned = makeCopy({
      id: 1,
      checkOuts: [
        {
          id: 1,
          attendeeId: 1,
          checkOut: "2026-01-01",
          checkIn: "2026-01-02",
          copyId: 1,
          submitted: true,
        },
      ],
    });

    renderBubbles({ game: makeGame([returned]), bubbleStyle: "statusOnly" });

    expect(screen.getByText("1 Available")).toBeInTheDocument();
    expect(screen.queryByText(/Checked Out/)).not.toBeInTheDocument();
  });

  it("reports every copy as archived and suppresses the other tallies", () => {
    const game = makeGame([makeCopy({ id: 1 }), checkedOut({ id: 2 })]);

    renderBubbles({ game, bubbleStyle: "statusOnly", archived: true });

    expect(screen.getByText("2 Archived")).toBeInTheDocument();
    expect(screen.queryByText(/Available/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Checked Out/)).not.toBeInTheDocument();
  });
});

describe("CopyBubbles — boxesOnly", () => {
  it("labels each copy's box by availability", () => {
    const game = makeGame([makeCopy({ id: 1 }), checkedOut({ id: 2 })]);

    renderBubbles({ game, bubbleStyle: "boxesOnly" });

    expect(screen.getByLabelText("Available")).toBeInTheDocument();
    expect(screen.getByLabelText("Checked out")).toBeInTheDocument();
  });
});

describe("CopyBubbles — default", () => {
  it("renders an interactive bubble per copy with its barcode label", () => {
    const game = makeGame([
      makeCopy({ id: 1, barcodeLabel: "A-1" }),
      makeCopy({ id: 2, barcodeLabel: "A-2" }),
    ]);

    renderBubbles({ game });

    expect(screen.getByRole("button", { name: "Copy A-1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy A-2" })).toBeInTheDocument();
  });
});

describe("CopyBubbles — fetch fallback", () => {
  const fetchMock = frontendFetch as jest.Mock;

  afterEach(() => fetchMock.mockReset());

  it("fetches copies from /game/{id} when the game prop has none", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ copies: [makeCopy({ id: 9, barcodeLabel: "B-9" })] }),
    });
    // No `copies` field, so the component falls back to fetching them.
    const game = { id: 7 } as GameWithCopies;

    renderBubbles({ game, bubbleStyle: "statusOnly" });

    // findBy* retries until the async setState from the fetch resolves.
    expect(await screen.findByText("1 Available")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("GET", "/game/7", null, "tok");
  });
});
