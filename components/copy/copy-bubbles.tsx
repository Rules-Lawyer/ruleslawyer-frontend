"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { useAuth } from "@/utilities/swr/useAuth";
import { useCallback, useEffect, useState } from "react";
import CopyModal from "./copy-modal";
import { useDisclosure } from "@/utilities/useDisclosure";
import { BsBox2Heart } from "react-icons/bs";
import { GameCopy, GameWithCopies } from "@/types/models";

interface BubbleModalProps {
  c: GameCopy;
  bubbleStyle?: string;
  onCloseModal: () => void;
}

function BubbleModal({ c, bubbleStyle, onCloseModal }: BubbleModalProps) {
  const disclosure = useDisclosure({ onClose: onCloseModal });
  const { onOpen } = disclosure;

  if (bubbleStyle === "boxesOnly") {
    return (
      <div>
        {c.checkOuts.length === 0 || c.checkOuts[0].checkIn !== null ? (
          <BsBox2Heart role="img" aria-label="Available" className="inline-block mr-2 mb-2 text-gwgreen" />
        ) : (
          <BsBox2Heart role="img" aria-label="Checked out" className="inline-block mr-2 mb-2 text-gwdarkred" />
        )}
      </div>
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={"Copy " + c.barcodeLabel}
      className="flex-col inline-block mb-2 mr-2 bg-gwdarkblue p-3 rounded-full border-4 border-gwgreen hover:border-gwblue hover:text-gwgreen cursor-pointer"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div>
        {c.checkOuts.length === 0 || c.checkOuts[0].checkIn !== null ? (
          <BsBox2Heart role="img" aria-label="Available" className="inline-block text-gwgreen mr-2 mb-2" />
        ) : (
          <BsBox2Heart role="img" aria-label="Checked out" className="inline-block text-gwdarkred mr-2 mb-2" />
        )}
        {c.barcodeLabel}
      </div>
      <CopyModal disclosure={disclosure} copyIn={c} copyId={c.id} organizationId={c.organizationId} />
    </span>
  );
}

interface CopyBubblesProps {
  game: GameWithCopies;
  bubbleStyle?: string;
  disclosure: ReturnType<typeof useDisclosure>;
  archived?: boolean;
}

export default function CopyBubbles(props: CopyBubblesProps) {
  const { game, bubbleStyle, disclosure, archived } = props;

  const [copies, setData] = useState<GameCopy[] | null>(null);
  const [isLoading, setLoading] = useState(true);

  const { onClose } = disclosure;
  const session = useAuth();

  const onCloseModal = useCallback(() => {
    frontendFetch("GET", "/game/" + game.id, null, session?.data?.token)
      .then((res) => res.json())
      .then((data) => {
        setData(data.copies);
        onClose();
        setLoading(false);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id, session?.data?.token]);

  useEffect(() => {
    if (game?.copies) {
      setData(game.copies);
      setLoading(false);
    } else {
      frontendFetch("GET", "/game/" + game.id, null, session?.data?.token)
        .then((res) => res.json())
        .then((data) => {
          setData(data.copies);
          setLoading(false);
        })
        .catch(() => {});
    }
  }, [game?.id, session?.data?.token]);

  if (isLoading) return <div></div>;
  if (!copies) return <div></div>;

  if (bubbleStyle === "statusOnly") {
    const availableCopies = copies.filter(
      (c) => c.checkOuts.length === 0 || c.checkOuts[0].checkIn !== null
    );
    // Archived collections report every copy under "Archived" and suppress the
    // available / checked-out tallies.
    const availableCount = archived ? 0 : availableCopies.length;
    const checkedOutCount = archived ? 0 : copies.length - availableCount;

    return (
      <div className="flex flex-wrap w-full">
        {availableCount > 0 ? (
          <div className="rounded-full bg-gwgreen p-1 mr-2 mt-2 text-sm text-gwdarkblue">{availableCount} Available</div>
        ) : (
          null
        )}
        {checkedOutCount > 0 ? (
          <div className="rounded-full bg-gwdarkred p-1 mr-2 mt-2 text-sm text-gwdarkblue">
            {checkedOutCount} Checked Out
          </div>
        ) : (
          null
        )}
        {archived ? (
          <div className="rounded-full bg-bggorange p-1 mr-2 mt-2 text-sm text-white">
            {copies.length} Archived
          </div>
        ) : (
          null
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap w-full">
      {copies?.map((c) => (
        <BubbleModal key={c.id} c={c} bubbleStyle={bubbleStyle} onCloseModal={onCloseModal} />
      ))}
    </div>
  );
}
