"use client";
import frontendFetch from "@/utilities/frontendFetch";
import {
  toastDeleteError,
  toastDeleteNetworkError,
  toastNetworkError,
  toastSaveError,
} from "@/utilities/toastFetchError";
import { Button, Modal } from "@heroui/react";
import { SimpleCheckbox } from "@/components/ui/simple-checkbox";
import { SimpleTextField, SimpleTextArea } from "@/components/ui/simple-field";
import {
  SimpleSelect,
  SimpleSelectItem,
  SimpleAutocomplete,
} from "@/components/ui/simple-select";
import { useDisclosure } from "@/utilities/useDisclosure";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import { useAsyncList } from "@react-stately/data";
import usePermissions from "@/utilities/swr/usePermissions";
import { CollectionWithCount, CopyForEditor } from "@/types/models";

type game = {
  id: number;
  name: string;
};

interface CopyModalProps {
  copyIn?: CopyForEditor;
  copyId?: number;
  organizationId?: number;
  disclosure: ReturnType<typeof useDisclosure>;
}

export default function CopyModal(props: CopyModalProps) {
  const { copyIn, copyId, organizationId, disclosure } = props;

  const [copy, setData] = useState<CopyForEditor | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionWithCount[] | null>(
    null
  );
  const [copyCollectionId, setCopyCollectionId] = useState<number | null>(null);
  const [copyWinnable, setCopyWinnable] = useState(false);
  const [copyBarcode, setCopyBarcode] = useState("");
  const [copyBarcodeLabel, setCopyBarcodeLabel] = useState("");
  const [copyComments, setCopyComments] = useState<string | null>("");
  const [gameId, setGameId] = useState<string | number | null>(null);
  const [newGameName, setNewGameName] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(true);
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { onClose } = disclosure;

  const onDelete = () => {
    if (copy) {
      if (confirm("Are you sure you want to delete this collection?")) {
        frontendFetch(
          "DELETE",
          "/copy/" + copy.id,
          null,
          session?.data?.token
        )
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
    }
  };

  const onSave = () => {
    if (copy) {
      frontendFetch(
        "PUT",
        "/copy/" + copy.id,
        {
          collectionId: copyCollectionId,
          winnable: copyWinnable,
          barcodeLabel: copyBarcodeLabel,
          barcode: copyBarcode,
          comments: copyComments,
          gameId: Number(gameId),
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
          copy.collection = data.collection;
          copy.collectionId = data.collectionId;
          copy.game = data.game;
          copy.gameId = data.gameId;
          onClose();
        })
        .catch(() => {
          toastNetworkError();
        });
    } else {
      const createCopyGame: {
        game:
          | { create: { organizationId: number; name: string | null } }
          | { connect: { id: number } }
          | null;
      } = {
        game: null,
      };

      if (gameId === "0") {
        createCopyGame.game = {
          create: {
            organizationId: Number(organizationId),
            name: newGameName,
          },
        };
      } else {
        createCopyGame.game = {
          connect: {
            id: Number(gameId),
          },
        };
      }

      frontendFetch(
        "POST",
        "/org/" + organizationId + "/col/" + copyCollectionId + "/copy",
        {
          winnable: copyWinnable,
          barcodeLabel: copyBarcodeLabel,
          barcode: copyBarcode,
          comments: copyComments,
          ...createCopyGame,
        },
        session?.data?.token
      )
        .then((res) => {
          if (!res.ok) {
            toastSaveError(res);
            return;
          }
          onClose();
        })
        .catch(() => {
          toastNetworkError();
        });
    }
  };

  const gameList = useAsyncList<game>({
    async load({ signal, filterText }) {
      if (filterText === "--- NEW GAME ---") {
        filterText = "";
      }

      if (filterText) {
        const res = await frontendFetch(
          "GET",
          `/org/${
            copy ? copy.organizationId : organizationId
          }/games/autocomplete/${filterText}`,
          null,
          session?.data?.token,
          signal
        );
        const json = await res.json();
        json.unshift({ name: "--- NEW GAME ---", id: 0 });
        return {
          items: json,
        };
      } else {
        return { items: [{ name: "--- NEW GAME ---", id: 0 }] };
      }
    },
  });

  useEffect(() => {
    if (copyIn) {
      setData(copyIn);
      setCopyWinnable(copyIn.winnable);
      setCopyBarcodeLabel(copyIn.barcodeLabel);
      setCopyBarcode(copyIn.barcode);
      setCopyCollectionId(copyIn.collectionId);
      setCopyComments(copyIn.comments);
      setGameId(copyIn.gameId);

      gameList.setFilterText(copyIn.game.name);

      setLoading(false);
    } else if (copyId) {
      frontendFetch("GET", "/copy/" + copyId, null, session?.data?.token)
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setCopyWinnable(data.winnable);
          setCopyBarcodeLabel(data.barcodeLabel);
          setCopyBarcode(data.barcode);
          setCopyCollectionId(data.collectionId);
          setCopyComments(data.comments);
          setGameId(data.gameId);

          gameList.setFilterText(data.game.name);

          setLoading(false);
        })
        .catch((err) => {});
    } else {
      setLoading(false);
    }
    // gameList is not a dependency, ignoring this error makes a warning go away
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyIn, copy, copyId, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (copy) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == copy.organizationId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          setReadOnly(true);
        }
      } else if (organizationId) {
        setReadOnly(false);
      }
    } else {
      setReadOnly(true);
    }
  }, [permissions.user?.data, permissions.organizations?.data, permissions.conventions?.data, copy, organizationId]);

  const orgIdForCollections = copy?.organizationId ?? organizationId;

  useEffect(() => {
    if (orgIdForCollections) {
      frontendFetch(
        "GET",
        "/org/" + orgIdForCollections + "/collections",
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setCollections(data);
        })
        .catch(() => {});
    }
  }, [orgIdForCollections, session?.data?.token]);

  // Render nothing while closed so HeroUI Modal/DialogTrigger does not mount
  // a (hidden, thus non-focusable) trigger — e.g. inside collapsed Accordion panels.
  if (!disclosure.isOpen) return null;
  if (isLoading || isLoadingPermissions) return <div></div>;

  return (
    <Modal state={disclosure}>
      {/* hidden trigger so HeroUI DialogTrigger has a pressable child; see game-modal.tsx */}
      <Modal.Trigger tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container scroll="outside">
          <Modal.Dialog>
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSave();
                }}
              >
                <Modal.Header>
                  <Modal.Heading>
                    {copy
                      ? copy.game.name + " (" + copy.barcodeLabel + ")"
                      : "Create Copy"}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <SimpleSelect
                    name="collectionSelect"
                    label="Collection"
                    placeholder="Select a collection"
                    selectedKey={
                      copyCollectionId != null
                        ? String(copyCollectionId)
                        : null
                    }
                    isDisabled={readOnly}
                    onSelectionChange={(key) => {
                      setCopyCollectionId(key != null ? Number(key) : null);
                    }}
                    className="mb-4"
                  >
                    {(collections ?? []).map((collection) => (
                      <SimpleSelectItem
                        key={collection.id}
                        id={String(collection.id)}
                        textValue={collection.name}
                      />
                    ))}
                  </SimpleSelect>
                  <SimpleAutocomplete
                    name="gameAutocomplete"
                    label="Select a game"
                    placeholder="Type to search..."
                    inputValue={gameList.filterText}
                    onInputChange={gameList.setFilterText}
                    isDisabled={readOnly}
                    isRequired
                    selectedKey={gameId != null ? String(gameId) : null}
                    onSelectionChange={(key) => setGameId(key)}
                    className="mb-4"
                  >
                    {gameList.items.map((item) => (
                      <SimpleSelectItem
                        key={item.id}
                        id={String(item.id)}
                        textValue={item.name}
                      />
                    ))}
                  </SimpleAutocomplete>
                  {gameId === "0" ? (
                    <SimpleTextField
                      name="newGameName"
                      label="New Game Name"
                      value={newGameName ?? ""}
                      isRequired
                      onChange={(value) => setNewGameName(value)}
                    />
                  ) : (
                    null
                  )}
                  <SimpleTextField
                    name="barcodeLabel"
                    isRequired
                    label="Barcode Label"
                    value={copyBarcodeLabel}
                    onChange={(value) => setCopyBarcodeLabel(value)}
                    isDisabled={readOnly}
                  />
                  <SimpleTextField
                    name="barcode"
                    isRequired
                    label="Barcode"
                    value={copyBarcode}
                    onChange={(value) => setCopyBarcode(value)}
                    isDisabled={readOnly}
                  />
                  <SimpleTextArea
                    name="comments"
                    label="Comments"
                    placeholder="Enter your comments"
                    value={copyComments ?? ""}
                    onChange={(value) => setCopyComments(value)}
                    isDisabled={readOnly}
                  />
                  {copy?.collection?.allowWinning && (
                    <SimpleCheckbox
                      isSelected={copyWinnable}
                      onChange={(isSelected) => setCopyWinnable(isSelected)}
                      isDisabled={readOnly}
                      label="Winnable"
                      aria-label="Winnable"
                      id="allowWinning"
                    />
                  )}
                </Modal.Body>
                <Modal.Footer>
                  {!readOnly && copy ? (
                    <Button variant="danger" onPress={onDelete}>
                      Delete
                    </Button>
                  ) : (
                    null
                  )}
                  {readOnly ? (
                    null
                  ) : (
                    <Button variant="primary" type="submit">
                      Save
                    </Button>
                  )}
                  <Button variant="secondary" onPress={onClose}>
                    Close
                  </Button>
                </Modal.Footer>
              </form>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
