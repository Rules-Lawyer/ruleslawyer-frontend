"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import { useEffect, useState } from "react";
import { FaExternalLinkAlt, FaUserFriends } from "react-icons/fa";
import { FaClock, FaWeightHanging } from "react-icons/fa6";
import { Game } from "@/types/models";
import { BsFillHexagonFill } from "react-icons/bs";

function formatRange(
  min: number | null,
  max: number | null
): string | null {
  if (min == null && max == null) {
    return null;
  }

  if (min != null && max != null) {
    return min === max ? `${min}` : `${min}–${max}`;
  }

  return `${min ?? max}`;
}

interface BoardGameGeekProps {
  game?: Game | null;
}

export default function BoardGameGeek(props: BoardGameGeekProps) {
  const { game: gameIn } = props;

  const [game, setData] = useState<Game | null>(gameIn ?? null);
  const session = useAuth();

  useEffect(() => {
    if (gameIn?.bggId !== undefined) {
      setData(gameIn);
    } else if (gameIn?.id) {
      frontendFetch("GET", "/game/" + gameIn.id, null, session?.data?.token)
        .then((res) => res.json())
        .then((data) => setData(data))
        .catch(() => {});
    }
  }, [gameIn, session?.data?.token]);

  if (!game || !game.bggId) return <div></div>;

  const players = formatRange(game.minPlayers, game.maxPlayers);
  const time = formatRange(game.minTime, game.maxTime);

  // BGG colours its rating badges in integer tiers. Reference the theme CSS
  // variable directly: Tailwind only generates utility classes it can find as
  // complete literal strings, so a dynamically-built `text-bgg-${n}` class is
  // never emitted. Clamp to the 1–10 range we actually define.
  const ratingTier = Math.min(10, Math.max(1, Math.floor(Number(game.bggRating))));

  return (
    <div className="flex flex-wrap items-center w-full text-sm mt-2">
      {players ? (
        <span className="inline-flex items-center mr-3 mb-1" aria-label={`${players} players`}>
          <FaUserFriends className="mr-1" aria-hidden="true" />
          {players}
        </span>
      ) : null}
      {time ? (
        <span className="inline-flex items-center mr-3 mb-1" aria-label={`${time} minutes`}>
          <FaClock className="mr-1" aria-hidden="true" />
          {time} min
        </span>
      ) : null}
      {game.weight != null ? (
        <span className="inline-flex items-center mr-3 mb-1" aria-label={`Weight ${Number(game.weight).toFixed(2)} out of 5`}>
          <FaWeightHanging className="mr-1" aria-hidden="true" />
          {Number(game.weight).toFixed(2)}
        </span>
      ) : null}
      {game.bggRating != null ? (
        <div className="relative flex items-center justify-center size-8 mr-3">
          <BsFillHexagonFill
            className="size-full"
            style={{ color: `var(--color-bgg-${ratingTier})` }}
          />
          <span className="absolute text-center text-xs font-bold text-white">
            {Number(game.bggRating).toFixed(1)}
          </span>
        </div>
      ) : null}
      <a
        href={`https://boardgamegeek.com/boardgame/${game.bggId}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label="View on BoardGameGeek (opens in new tab)"
        className="inline-flex items-center mb-1 text-bggorange hover:text-gwblue"
      >
        BoardGameGeek
        <FaExternalLinkAlt className="ml-1" aria-hidden="true" />
      </a>
    </div>
  );
}
