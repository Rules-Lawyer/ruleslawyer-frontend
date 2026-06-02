import { render, screen } from "@testing-library/react";
import BoardGameGeek from "@/components/boardgamegeek/board-game-geek";
import type { Game } from "@/types/models";

// useAuth pulls in @auth0/nextjs-auth0, which doesn't resolve under jsdom, and
// is only needed for the fetch fallback (not exercised when a game prop with a
// bggId is provided). frontendFetch is mocked for the same safety reason.
jest.mock("@/utilities/swr/useAuth", () => ({
  useAuth: () => ({ data: { token: "tok", user: { email: "u@test.dev" } } }),
}));
jest.mock("@/utilities/frontendFetch", () => jest.fn());

function makeGame(over: Partial<Game> = {}): Game {
  return {
    id: 1,
    organizationId: 1,
    bggId: 42,
    bggVersionId: null,
    bggRank: null,
    bggRating: null,
    lastBGGSync: null,
    name: "Catan",
    shortDescription: null,
    designer: null,
    artist: null,
    publisher: null,
    longDescription: null,
    minPlayers: null,
    maxPlayers: null,
    minTime: null,
    maxTime: null,
    minAge: null,
    weight: null,
    yearPublished: null,
    ...over,
  };
}

describe("BoardGameGeek", () => {
  it("renders nothing when the game has no bggId", () => {
    const { container } = render(<BoardGameGeek game={makeGame({ bggId: null })} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.querySelector("a")).toBeNull();
  });

  it("renders nothing when no game is provided", () => {
    render(<BoardGameGeek game={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links to the BoardGameGeek page for the game's bggId", () => {
    render(<BoardGameGeek game={makeGame({ bggId: 13 })} />);
    const link = screen.getByRole("link", { name: /boardgamegeek/i });
    expect(link).toHaveAttribute("href", "https://boardgamegeek.com/boardgame/13");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("collapses an equal min/max player range to a single number", () => {
    render(<BoardGameGeek game={makeGame({ minPlayers: 4, maxPlayers: 4 })} />);
    expect(screen.getByLabelText("4 players")).toHaveTextContent("4");
  });

  it("renders a min–max player range when they differ", () => {
    render(<BoardGameGeek game={makeGame({ minPlayers: 2, maxPlayers: 4 })} />);
    expect(screen.getByLabelText("2–4 players")).toHaveTextContent("2–4");
  });

  it("formats weight to two decimal places", () => {
    render(<BoardGameGeek game={makeGame({ weight: 2.5 })} />);
    expect(screen.getByLabelText("Weight 2.50 out of 5")).toBeInTheDocument();
  });

  it("renders the rating badge with the rating to one decimal place", () => {
    render(<BoardGameGeek game={makeGame({ bggRating: 7.83 })} />);
    expect(screen.getByText("7.8")).toBeInTheDocument();
  });

  it("omits the players row when no player counts are set", () => {
    render(<BoardGameGeek game={makeGame({ minPlayers: null, maxPlayers: null })} />);
    expect(screen.queryByLabelText(/players/)).not.toBeInTheDocument();
  });
});
