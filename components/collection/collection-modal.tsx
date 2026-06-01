"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import {
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import { useDisclosure } from "@heroui/react";
import { Collection } from "@/types/models";

interface CollectionModalProps {
  collectionIn?: Collection;
  collectionId?: number;
  organizationId?: number;
  disclosure: ReturnType<typeof useDisclosure>;
  conventionId?: number;
  importFile?: boolean;
}

export default function CollectionModal(props: CollectionModalProps) {
  const {
    collectionIn,
    collectionId,
    organizationId,
    disclosure,
    conventionId,
    importFile,
  } = props;

  const [collection, setData] = useState<Collection | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [collectionName, setCollectionName] = useState("");
  const [allowWinning, setAllowWinning] = useState(false);
  const [importCSV, setImportCSV] = useState<File | null>(null);
  const [readOnly, setReadOnly] = useState(true);

  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { isOpen, onOpen, onClose } = disclosure;

  const handleImportCSV = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setImportCSV(event.target.files?.[0] ?? null);
  };

  const onSave = () => {
    if (collection) {
      frontendFetch(
        "PUT",
        "/collection/" + collection.id,
        {
          name: collectionName,
          allowWinning: allowWinning,
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
          onClose();
        })
        .catch(() => {
          toastNetworkError();
        });
    } else if (importFile) {
      const formData = new FormData();

      formData.append("name", collectionName);
      formData.append("allowWinning", String(allowWinning));
      formData.append("importCSV", importCSV as File, "import.csv");

      frontendFetch(
        "POST",
        "/org/" + organizationId + "/col",
        formData,
        session?.data?.token,
        undefined,
        true
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
          if (conventionId) {
            frontendFetch(
              "POST",
              "/con/" +
                conventionId +
                "/conventionCollection/" +
                data.collectionId,
              null,
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
                onClose();
              })
              .catch(() => {
                toastNetworkError();
              });
          } else {
            onClose();
          }
        })
        .catch(() => {
          toastNetworkError();
        });
    } else {
      frontendFetch(
        "POST",
        "/org/" + organizationId + "/collections",
        {
          name: collectionName,
          allowWinning: allowWinning,
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
          if (conventionId) {
            frontendFetch(
              "POST",
              "/con/" + conventionId + "/conventionCollection/" + data.id,
              null,
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
                onClose();
              })
              .catch(() => {
                toastNetworkError();
              });
          } else {
            onClose();
          }
        })
        .catch(() => {
          toastNetworkError();
        });
    }
  };

  const onArchive = () => {
    if (collection) {
      if (confirm("Are you sure you want to archive this collection?")) {
        frontendFetch(
        "PUT",
        "/collection/" + collection.id + "/archive",
        null,
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
        onClose();
      })
      .catch(() => {
        toastNetworkError();
      });
      }
    }
  };

  useEffect(() => {
    if (collectionIn) {
      setData(collectionIn);

      setCollectionName(collectionIn.name);
      setAllowWinning(collectionIn.allowWinning);

      setLoading(false);
    } else if (collectionId) {
      frontendFetch(
        "GET",
        "/collection/" + collectionId,
        null,
        session?.data?.token
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);

          setCollectionName(data.name);
          setAllowWinning(data.allowWinning);

          setLoading(false);
        })
        .catch((err) => {});
    } else {
      setLoading(false);
    }
  }, [collectionId, collectionIn, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (collection) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == collection.organizationId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          setReadOnly(true);
        }
      } else if (organizationId) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == organizationId && d.admin === true
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
  }, [permissions.user?.data, permissions.organizations?.data, permissions.conventions?.data, collection, organizationId]);

  if (isLoading || isLoadingPermissions) return <div></div>;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        {(onClose) => (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <div>
              <ModalHeader>
                {collection ? "Edit" : importFile ? "Import" : "Create"}{" "}
                Collection
              </ModalHeader>
              <ModalBody>
                <Input
                  name="name"
                  type="text"
                  isRequired
                  label="Name"
                  value={collectionName}
                  onValueChange={(value) => setCollectionName(value)}
                  isDisabled={readOnly}
                />
                <Checkbox
                  isSelected={allowWinning}
                  onValueChange={setAllowWinning}
                  isDisabled={readOnly}
                >
                  Allow Winning
                </Checkbox>
                {importFile ? (
                  <input
                    name="importFile"
                    type="file"
                    onChange={handleImportCSV}
                  />
                ) : (
                  ""
                )}
              </ModalBody>
              <ModalFooter>
                {readOnly? (
                  ""
                ) : (
                  <Button color="danger" onPress={onArchive}>
                    Archive
                  </Button>
                )}
                {readOnly && !collection?.archived ? (
                  ""
                ) : (
                  <Button color="success" type="submit">
                    {importFile ? "Import" : "Save"}
                  </Button>
                )}
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </div>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
