"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import { Button, Modal } from "@heroui/react";
import { SimpleTextField } from "@/components/ui/simple-field";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import { useDisclosure } from "@/utilities/useDisclosure";
import { ConventionType } from "@/types/models";

interface ConventionTypeUpdate {
  name: string | undefined,
}

interface ConventionTypeModalProps {
  conventionTypeIn?: ConventionType;
  organizationId: number;
  disclosure: ReturnType<typeof useDisclosure>;
  onSaved?: (updated: ConventionTypeUpdate) => void;
}

export default function ConventionTypeModal(props: ConventionTypeModalProps) {
  const {
    disclosure,
    onSaved,
    conventionTypeIn,
    organizationId
  } = props;

  const [conventionType, setData] = useState<ConventionType | null>(null);
  const [conventionTypeName, setConventionTypeName] = useState<string | undefined>(undefined);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);

  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { isOpen, onClose } = disclosure;

  const onSave = () => {
    if (conventionType) {
      frontendFetch(
        "PUT",
        "/conventionType/" + conventionType?.id,
        {
          name: conventionTypeName,
        },
        session?.data?.token
      )
      .then((res) => {
          if (!res.ok) {
              toastSaveError(res);
              return;
          }
          onSaved?.({
            name: conventionTypeName
          });
          onClose();
        })
        .catch(() => {
            toastNetworkError();
        });
    } else {
      frontendFetch(
        "Post",
        "/org/" + organizationId + "/conventionType",
        {
          name: conventionTypeName,
        },
        session?.data?.token
      )
      .then((res) => {
          if (!res.ok) {
              toastSaveError(res);
              return;
          }
          onSaved?.({
            name: conventionTypeName
          });
          onClose();
        })
        .catch(() => {
            toastNetworkError();
        });
    }
  };

  useEffect(() => {
    if (conventionTypeIn) {
      setData(conventionTypeIn);
      setConventionTypeName(conventionTypeIn.name);

      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [conventionTypeIn, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (conventionType) {
        if (
          permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == conventionType.organizationId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        }
      } else {
        setReadOnly(true);
      }
    } else {
      setReadOnly(true);
    }
  }, [permissions.user?.data, permissions.organizations?.data, conventionType]);

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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave();
              }}
            >
              <div>
                <Modal.Header>
                  <Modal.Heading>
                    Convention Type Editor - {conventionType?.name ?? "New Convention Type"}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <SimpleTextField isReadOnly={readOnly} label="Name" value={conventionTypeName ?? ""} onChange={setConventionTypeName} />
                </Modal.Body>
                <Modal.Footer>
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
              </div>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
