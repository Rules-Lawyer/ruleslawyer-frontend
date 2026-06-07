"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import { Button, Modal } from "@heroui/react";
import { SimpleTextField } from "@/components/ui/simple-field";
import { SimpleSelect, SimpleSelectItem } from "@/components/ui/simple-select";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import { useDisclosure } from "@/utilities/useDisclosure";
import { Attendee } from "@/types/models";

interface AttendeeBadgeTransfer {
  newBadgeNumber: string;
}

interface AttendeeBadgeTransferModalProps {
  attendeeId?: number | undefined;
  disclosure: ReturnType<typeof useDisclosure>;
  onSaved?: (updated: AttendeeBadgeTransfer) => void;
  conventionId?: number;
  pronounsIn?: { id: number; pronouns: string }[];
  organizationId?: number;
  attendeeIn?: Attendee;
}

export default function AttendeeTransferBadgeModal(props: AttendeeBadgeTransferModalProps) {
  const {
    attendeeId,
    attendeeIn,
    disclosure,
    conventionId,
    organizationId,
    pronounsIn,
  } = props;

  const [attendee, setData] = useState<Attendee | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const [attendeeBadgeName, setAttendeeBadgeName] = useState("");
  const [attendeeBadgeFirstName, setAttendeeBadgeFirstName] = useState("");
  const [attendeeBadgeLastName, setAttendeeBadgeLastName] = useState("");
  const [attendeeLegalName, setAttendeeLegalName] = useState("");
  const [attendeePronounsId, setAttendeePronounsId] = useState<number | null>(
    null,
  );
  const [attendeeEmail, setAttendeeEmail] = useState<string | null>(null);

  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { onClose } = disclosure;

  const onSave = () => {
    if (conventionId) {
      frontendFetch(
        "PUT",
        "/con/" + conventionId + "/transferBadge",
        {
            fromBadgeNumber: attendee?.badgeNumber ?? "",
            newBadgeName: attendeeBadgeName,
            newBadgeFirstName: attendeeBadgeFirstName,
            newBadgeLastName: attendeeBadgeLastName,
            newBadgeLegalName: attendeeLegalName,
            newBadgePronounsId: attendeePronounsId,
            newBadgeEmail: attendeeEmail,
        },
        session?.data?.token,
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

  // Attendee data: from the passed-in prop, or fetched by id.
  useEffect(() => {
    if (attendeeIn) {
      setData(attendeeIn);
      setLoading(false);
    } else if (attendee?.id) {
      frontendFetch(
        "GET",
        "/attendee/" + attendee?.id,
        null,
        session?.data?.token,
      )
        .then((res) => res.json())
        .then((data) => {
          setData(data);
          setLoading(false);
        })
        .catch(() => {});
    } else {
      setLoading(false);
    }
  }, [attendeeIn, attendee?.id, session?.data?.token]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (conventionId) {
        if (
          permissions.conventions.data?.filter(
            (d) => d.conventionId == conventionId && d.admin === true,
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          if (
            permissions.organizations.data?.filter(
              (d) => d.organizationId == organizationId && d.admin === true,
            ).length > 0
          ) {
            setReadOnly(false);
          }
        }
      } else {
        setReadOnly(true);
      }
    } else {
      setReadOnly(true);
    }
  }, [
    permissions.user?.data,
    permissions.conventions?.data,
    permissions.organizations?.data,
    conventionId,
    organizationId,
  ]);

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
                  <Modal.Heading>Badge Transfer - {attendee?.badgeName}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div>
                      <p>Step 1: Charge the attendee in the Square payment device for a transfered badge.</p>
                      <p>Step 2: Get the original attendee&apos;s badge from the badge station.</p>
                      <p>Step 3: Enter the new attendee&apos;s name and pronouns in the boxes below.</p>
                      <p>Step 4: Use the label printing software to print three stickers with the new attendee&apos;s name.</p>
                      <p>Step 5: Put one sticker on each side of the badge, and the third on the badge&apos;s geeklet.</p>
                  </div>
                  <SimpleTextField
                    label="Badge Name"
                    onChange={setAttendeeBadgeName}
                    value={attendeeBadgeName}
                    isReadOnly={readOnly}
                  />
                  <SimpleTextField
                    label="Badge First Name"
                    onChange={setAttendeeBadgeFirstName}
                    value={attendeeBadgeFirstName}
                    isReadOnly={readOnly}
                  />
                  <SimpleTextField
                    label="Badge Last Name"
                    onChange={setAttendeeBadgeLastName}
                    value={attendeeBadgeLastName}
                    isReadOnly={readOnly}
                  />
                  <SimpleTextField
                    label="Legal Name"
                    onChange={setAttendeeLegalName}
                    value={attendeeLegalName}
                    isReadOnly={readOnly}
                  />
                  <SimpleTextField
                    label="Email"
                    onChange={setAttendeeEmail}
                    value={attendeeEmail ?? ""}
                    isReadOnly={readOnly}
                  />
                  <SimpleSelect
                    label="Pronouns"
                    placeholder="Select Pronouns"
                    selectedKey={
                      attendeePronounsId != null
                        ? String(attendeePronounsId)
                        : null
                    }
                    isDisabled={readOnly}
                    onSelectionChange={(key) => {
                      setAttendeePronounsId(key != null ? Number(key) : null);
                    }}
                  >
                    {(pronounsIn ?? []).map((p) => (
                      <SimpleSelectItem
                        key={p.id}
                        id={String(p.id)}
                        textValue={p.pronouns}
                      />
                    ))}
                  </SimpleSelect>
                </Modal.Body>
                <Modal.Footer>
                  {readOnly ? null : (
                    <Button variant="primary" type="submit">
                      Transfer Badge
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
