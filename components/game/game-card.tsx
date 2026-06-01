"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/utilities/swr/useAuth";
import frontendFetch from "@/utilities/frontendFetch";
import { useDisclosure } from "@heroui/modal";
import GameModal from "./game-modal";
import { Skeleton } from "@heroui/react";
import { BiSolidMessageAltError } from "react-icons/bi";
import CopyBubbles from "../copy/copy-bubbles";
import { IoLibrary } from "react-icons/io5";
import usePermissions from "@/utilities/swr/usePermissions";
import BoardGameGeek from "../boardgamegeek/board-game-geek";
import { GameWithCopies } from "@/types/models";

interface GameCardProps {
  gameIn?: GameWithCopies;
  gameId: number;
  archived?: boolean;
}

function GameCard(props: GameCardProps) {
  const { gameIn, gameId, archived } = props;

  const [game, setData] = useState<GameWithCopies | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions } = usePermissions();

  useEffect(() => {
    if(archived) {
      setReadOnly(true);
    } else if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (game) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == game.organizationId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          setReadOnly(true);
        }
      } else {
        setReadOnly(true);
      }
    } else {
      setReadOnly(true);
    }
  }, [permissions.user?.data, permissions.organizations?.data, game]);

  const session = useAuth();

  const onModalClose = () => {
    frontendFetch("GET", "/game/" + gameId, null, session?.data?.token)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {});
  };

  const disclosure = useDisclosure({
    onClose: onModalClose,
  });
  const { isOpen, onOpen, onClose } = disclosure;

  // Cover art is no longer inlined in the game JSON; it's streamed from a
  // dedicated public backend route. Point the <img> straight at it and fall
  // back to the placeholder icon if the game has no cover (the route 404s,
  // firing onError).
  const [coverError, setCoverError] = useState(false);

  // The cover route sends a long-lived Cache-Control header, so the browser
  // keeps serving the old image after a BGG resync swaps in new art. Bust the
  // cache by keying a query param on lastBGGSync, which changes on every sync.
  const coverArtSrc = React.useMemo(() => {
    const id = game?.id;
    if (id == null) return null;
    const base = `${process.env.NEXT_PUBLIC_API_URL}/game/${id}/cover`;
    return game?.lastBGGSync
      ? `${base}?v=${encodeURIComponent(game.lastBGGSync)}`
      : base;
  }, [game?.id, game?.lastBGGSync]);

  // Reset the error flag when switching to a different game.
  useEffect(() => {
    setCoverError(false);
  }, [game?.id]);

  useEffect(() => {
    if (gameIn) {
      setData(gameIn);
      setLoading(false);
    } else {
      frontendFetch("GET", "/game/" + gameId, null, session?.data?.token)
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch((err) => {});
    }
  }, [gameIn, gameId, session?.data?.token]);

  if (isLoading) {
    return (
      <div className="flex items-center border-2 w-80 h-32 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] border-slate-800">
        <div className="flex-col p-3 w-24">
          <IoLibrary size={64} className="text-slate-800" />
        </div>
        <div className="flex-col pr-3 w-full">
          <Skeleton className="rounded-lg">
            <div className="inline-block align-middle h-full"></div>
          </Skeleton>
        </div>
      </div>
    );
  }

  if (!game) {
    return "";
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={(readOnly ? "View " : "Edit ") + (game.name !== "" ? game.name : "game")}
        onClick={
          readOnly
            ? () => {
                alert("Not Yet Implmeneted.");
              }
            : onOpen
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (readOnly) {
              alert("Not Yet Implmeneted.");
            } else {
              onOpen();
            }
          }
        }}
        className="flex items-center border-2 border-gwblue w-88 h-46 mr-5 mb-5 bg-gwdarkblue hover:bg-gwgreen/[.50] cursor-pointer"
      >
        <div className="flex-col p-3 w-40">
          {coverArtSrc && !coverError ? (
            <img
              src={coverArtSrc}
              alt={game.name}
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <IoLibrary size={64} />
          )}
        </div>
        <div className="flex-col pr-3 w-full">
          <span className="inline-block align-middle h-full">
            <span className="font-bold">{game.name !== "" ? game.name : "[unknown name]"}</span>

            <BoardGameGeek game={game} />

            <CopyBubbles
              game={game}
              disclosure={disclosure}
              bubbleStyle={"statusOnly"}
              archived={archived}
            />
          </span>
        </div>
      </div>
      <GameModal disclosure={disclosure} gameIn={game} gameId={game.id} />
    </div>
  );
}

export default React.memo(GameCard);
