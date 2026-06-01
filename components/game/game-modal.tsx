"use client";
import frontendFetch from "@/utilities/frontendFetch";
import {
  toastDeleteError,
  toastDeleteNetworkError,
  toastNetworkError,
  toastSaveError,
  toastSyncError,
} from "@/utilities/toastFetchError";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@heroui/react";
import { useAuth } from "@/utilities/swr/useAuth";
import { useEffect, useState } from "react";
import CopyBubbles from "../copy/copy-bubbles";
import usePermissions from "@/utilities/swr/usePermissions";
import { GameWithCopies } from "@/types/models";

interface GameModalProps {
  gameIn?: GameWithCopies;
  gameId?: number;
  disclosure: ReturnType<typeof useDisclosure>;
}

export default function GameModal(props: GameModalProps) {
  const { gameIn, gameId, disclosure } = props;

  const [game, setData] = useState<GameWithCopies | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [gameName, setGameName] = useState("");
  const [bggId, setBggId] = useState<string | number | null>("");
  const [bggVersionId, setBggVersionId] = useState<string | number | null>("");
  const [readOnly, setReadOnly] = useState(true);
  const [trigger, setTrigger] = useState(0);
  const [copyCount, setCopyCount] = useState(0);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { isOpen, onClose } = disclosure;

  const onCopyModalClose = () => {
    setTrigger(trigger + 1);
  };

  const copyDisclosure = useDisclosure({
    onClose: onCopyModalClose,
  });

  const onDelete = () => {
    if (confirm("Are you sure you want to delete this collection?")) {
      frontendFetch("DELETE", "/game/" + game?.id, null, session?.data?.token)
        .then((res) => {
          if (!res.ok) {
            toastDeleteError(res);
            return;
          }
          onClose();
        })
        .catch(() => {
          toastDeleteNetworkError();
        });
    }
  };

  // Map the text inputs to int-or-null: an empty/cleared field means "no value"
  // (null), not BGG id 0. Number("") is 0 and Number(undefined) is NaN, so the
  // raw Number() coercion would persist bogus ids on every save.
  const toIntOrNull = (v: string | number | null | undefined) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : Number(s);
  };

  const onSave = () => {
    let syncWithBgg = false;

    // Normalize both sides before comparing: the inputs hold strings once
    // edited, so a raw !== against the model's numbers ("42" !== 42) would
    // report a change even when the value is unchanged.
    if (
      toIntOrNull(game?.bggId) !== toIntOrNull(bggId) ||
      toIntOrNull(game?.bggVersionId) !== toIntOrNull(bggVersionId)
    ) {
      if (
        confirm(
          "BGG ID and/or BGG Version ID have changed. Do you want to sync with BGG?"
        )
      ) {
        syncWithBgg = true;
      }
    }

    frontendFetch(
      "PUT",
      "/game/" + game?.id,
      {
        name: gameName,
        bggId: toIntOrNull(bggId),
        bggVersionId: toIntOrNull(bggVersionId),
      },
      session?.data?.token
    )
      .then((res) => {
        if (!res.ok) {
          toastSaveError(res);
          return undefined;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setData(data);

        if (syncWithBgg) {
          onSyncWithBGG();
          return;
        }

        onClose();
      })
      .catch(() => {
        toastNetworkError();
      });
  };

  const onSyncWithBGG = () => {
    frontendFetch(
      "PUT",
      "/game/" + game?.id + "/orgId/" + game?.organizationId + "/syncWithBGG",
      null,
      session?.data?.token
    )
      .then(async (res) => {
        if (!res.ok) {
          await toastSyncError(res);
          return undefined;
        }
        // syncWithBGG can answer 200 with an empty body; tolerate that rather
        // than letting res.json() throw into the network-error catch.
        const text = await res.text();
        return text ? JSON.parse(text) : undefined;
      })
      .then((data) => {
        if (!data) return;
        setData(data);
        onClose();
      })
      .catch(() => {
        toastNetworkError();
      });
  };

  useEffect(() => {
    // Seed display data from the list row without a network call. A GameModal
    // is mounted (closed) inside every GameCard, so fetching here would fire
    // one request per card — defer the network calls until the modal opens.
    if (gameIn && trigger === 0) {
      setData(gameIn);
      setGameName(gameIn.name);
      setBggId(gameIn.bggId);
      setBggVersionId(gameIn.bggVersionId);
      setLoading(false);
    }

    if (!isOpen) return;

    if (gameIn && trigger === 0) {
      frontendFetch(
        "GET",
        "/game/" + (game !== null ? game.id : gameId) + "/copies",
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setCopyCount(data.length);
          setLoading(false);
        })
        .catch(() => {});
    } else {
      frontendFetch(
        "GET",
        "/game/" + (game !== null ? game.id : gameId),
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setGameName(data.name);
          setBggId(data.bggId);
          setBggVersionId(data.bggVersionId);
          setLoading(false);
        })
        .catch(() => {});
    }
    // copyDisclosure is not a dependency - remove a warning and prevent errors
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, gameIn, gameId, session?.data?.token, trigger]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (
        permissions.organizations?.data?.filter(
          (d) =>
            d.organizationId == game?.organizationId && d.admin === true
        ).length > 0
      ) {
        setReadOnly(false);
      } else {
        setReadOnly(true);
      }
      setLoading(false);
    }
  }, [permissions.user?.data, permissions.organizations?.data, game?.organizationId]);

  if (isLoading || isLoadingPermissions) return <div>Loading...</div>;
  if (!game) return <div>No game data</div>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} scrollBehavior="outside">
      <ModalContent>
        {(onClose) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <ModalHeader>
              {game.name !== "" ? game.name : "[unknown name]"}
            </ModalHeader>
            <ModalBody>
              {game.name != "" ? (
                <Input
                  name="gameName"
                  type="text"
                  isRequired
                  label="Game Name"
                  value={gameName}
                  onValueChange={(value) => setGameName(value)}
                  isDisabled={readOnly}
                />
              ) : (
                ""
              )}

              <Input
                name="bggId"
                type="text"
                label="BoardGameGeek ID"
                value={bggId == null ? "" : String(bggId)}
                onValueChange={(value) => setBggId(value)}
              />

              <Input
                name="bggVersionId"
                type="text"
                label="BoardGameGeek Version ID"
                value={bggVersionId == null ? "" : String(bggVersionId)}
                onValueChange={(value) => setBggVersionId(value)}
              />

              <CopyBubbles game={game} disclosure={copyDisclosure} />
            </ModalBody>
            <ModalFooter>
              {!readOnly && copyCount === 0 ? (
                <Button color="danger" onPress={onDelete}>
                  Delete
                </Button>
              ) : (
                ""
              )}
              {readOnly ? (
                ""
              ) : (
                <Button color="primary" onPress={onSyncWithBGG}>
                  Sync With BGG
                </Button>
              )}
              {readOnly ? (
                ""
              ) : (
                <Button color="success" type="submit">
                  Save
                </Button>
              )}
              <Button color="primary" onPress={onClose}>
                Close
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
