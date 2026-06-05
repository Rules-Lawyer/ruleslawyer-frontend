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

interface AttendeeUpdate {
  badgeName?: string;
  badgeFirstName?: string;
  badgeLastName?: string;
  legalName?: string;
  pronounsId?: number | null;
  email?: string | null;
}

interface AttendeeModalProps {
  attendeeIn?: Attendee;
  disclosure: ReturnType<typeof useDisclosure>;
  onSaved?: (updated: AttendeeUpdate) => void;
  conventionId?: number;
  pronounsIn?: { id: number; pronouns: string }[];
  organizationId?: number;
}

export default function AttendeeModal(props: AttendeeModalProps) {
  const {
    attendeeIn,
    disclosure,
    onSaved,
    conventionId,
    pronounsIn,
    organizationId,
  } = props;

  const [attendee, setData] = useState<Attendee | null>(null);
  const [attendeeBadgeName, setAttendeeBadgeName] = useState("");
  const [attendeeBadgeFirstName, setAttendeeBadgeFirstName] = useState("");
  const [attendeeBadgeLastName, setAttendeeBadgeLastName] = useState("");
  const [attendeeLegalName, setAttendeeLegalName] = useState("");
  const [attendeePronounsId, setAttendeePronounsId] = useState<number | null>(null);
  const [attendeeEmail, setAttendeeEmail] = useState<string | null>(null);
  const [pronouns, setPronouns] = useState<{ id: number; pronouns: string }[]>(pronounsIn ?? []);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);

  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { isOpen, onClose } = disclosure;

  const onSave = () => {
    if (attendeeIn) {
      frontendFetch(
        "PUT",
        "/attendee/" + attendeeIn?.id,
        {
          badgeName: attendeeBadgeName,
          badgeFirstName: attendeeBadgeFirstName,
          badgeLastName: attendeeBadgeLastName,
          legalName: attendeeLegalName,
          pronounsId: attendeePronounsId,
          email: attendeeEmail,
        },
        session?.data?.token
      )
      .then((res) => {
        if (!res.ok) {
            toastSaveError(res);
            return;
        }
        onSaved?.({
          badgeName: attendeeBadgeName,
          badgeFirstName: attendeeBadgeFirstName,
          badgeLastName: attendeeBadgeLastName,
          legalName: attendeeLegalName,
          pronounsId: attendeePronounsId,
          email: attendeeEmail,
        });
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
        session?.data?.token
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
    if (attendee && isOpen) {
      setAttendeeBadgeName(attendee.badgeName ?? "");
      setAttendeeBadgeFirstName(attendee.badgeFirstName ?? "");
      setAttendeeBadgeLastName(attendee.badgeLastName ?? "");
      setAttendeeLegalName(attendee.legalName ?? "");
      setAttendeePronounsId(attendee.pronounsId ?? null);
      setAttendeeEmail(attendee.email ?? null);
    }
  }, [attendee, isOpen]);

  useEffect(() => {
    if (permissions.user?.data) {
      if (permissions.user.data.superAdmin) {
        setReadOnly(false);
      } else if (conventionId) {
        if (
          permissions.conventions.data?.filter(
            (d) =>
              d.conventionId == conventionId && d.admin === true
          ).length > 0
        ) {
          setReadOnly(false);
        } else {
          if (permissions.organizations.data?.filter(
            (d) =>
              d.organizationId == organizationId && d.admin === true
          ).length > 0) {
            setReadOnly(false);
          }
        }
      } else {
        setReadOnly(true);
      }
    } else {
      setReadOnly(true);
    }
  }, [permissions.user?.data, permissions.conventions?.data, permissions.organizations?.data, conventionId, organizationId]);

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
                    User Editor - {attendee?.badgeName ?? "New User"}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body>
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
                    {pronouns.map((p) => (
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
