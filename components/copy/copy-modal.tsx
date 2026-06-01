"use client";
import frontendFetch from "@/utilities/frontendFetch";
import {
  toastDeleteError,
  toastDeleteNetworkError,
  toastNetworkError,
  toastSaveError,
} from "@/utilities/toastFetchError";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
  Autocomplete,
  AutocompleteItem,
  useDisclosure
} from "@heroui/react";
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

  const { isOpen, onOpen, onClose } = disclosure;

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

  if (isLoading || isLoadingPermissions) return <div></div>;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        {(onClose) => (
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
            >
              <ModalHeader>
                {copy
                  ? copy.game.name + " (" + copy.barcodeLabel + ")"
                  : "Create Copy"}
              </ModalHeader>
              <ModalBody>
                <Select
                  name="collectionSelect"
                  items={collections ?? []}
                  label="Collection"
                  placeholder="Select a collection"
                  defaultSelectedKeys={copy ? [String(copy.collectionId)] : []}
                  isDisabled={readOnly}
                  isRequired
                  onChange={(event) => {
                    setCopyCollectionId(Number(event.target.value));
                  }}
                >
                  {(collection) => (
                    <SelectItem key={collection.id}>
                      {collection.name}
                    </SelectItem>
                  )}
                </Select>
                <Autocomplete
                  name="gameAutocomplete"
                  label="Select a game"
                  placeholder="Type to search..."
                  inputValue={gameList.filterText}
                  isLoading={gameList.isLoading}
                  items={gameList.items}
                  onInputChange={gameList.setFilterText}
                  isDisabled={readOnly}
                  isRequired
                  onSelectionChange={(key) =>
                    setGameId(
                      typeof key === "string" || typeof key === "number"
                        ? key
                        : null
                    )
                  }
                >
                  {(item) => (
                    <AutocompleteItem key={item.id}>
                      {item.name}
                    </AutocompleteItem>
                  )}
                </Autocomplete>
                {gameId === "0" ? (
                  <Input
                    name="newGameName"
                    type="text"
                    label="New Game Name"
                    value={newGameName ?? ""}
                    isRequired
                    onValueChange={(value) => setNewGameName(value)}
                  />
                ) : (
                  ""
                )}
                <Input
                  name="barcodeLabel"
                  type="text"
                  isRequired
                  label="Barcode Label"
                  value={copyBarcodeLabel}
                  onValueChange={(value) => setCopyBarcodeLabel(value)}
                  isDisabled={readOnly}
                />
                <Input
                  name="barcode"
                  type="text"
                  isRequired
                  label="Barcode"
                  value={copyBarcode}
                  onValueChange={(value) => setCopyBarcode(value)}
                  isDisabled={readOnly}
                />
                <Textarea
                  name="comments"
                  label="Comments"
                  placeholder="Enter your comments"
                  value={copyComments ?? ""}
                  onValueChange={(value) => setCopyComments(value)}
                  isDisabled={readOnly}
                />
                {copy?.collection?.allowWinning && (
                  <Checkbox
                    name="allowWinning"
                    defaultSelected={copy.winnable}
                    onValueChange={(isSelected) => setCopyWinnable(isSelected)}
                    isDisabled={readOnly}
                  >
                    Winnable
                  </Checkbox>
                )}
              </ModalBody>
              <ModalFooter>
                {!readOnly && copy ? (
                  <Button color="danger" onPress={onDelete}>
                    Delete
                  </Button>
                ) : (
                  ""
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
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
