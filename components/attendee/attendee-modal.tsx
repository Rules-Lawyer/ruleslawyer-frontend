"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from "@heroui/react";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import { useDisclosure } from "@heroui/react";
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

  const { isOpen, onOpen, onClose } = disclosure;

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
                User Editor - {attendee?.badgeName ?? "New User"}
              </ModalHeader>
              <ModalBody>
                <Input
                  label="Badge Name"
                  onValueChange={setAttendeeBadgeName}
                  value={attendeeBadgeName}
                  readOnly={readOnly}
                />
                <Input
                  label="Badge First Name"
                  onValueChange={setAttendeeBadgeFirstName}
                  value={attendeeBadgeFirstName}
                  readOnly={readOnly}
                />
                <Input
                  label="Badge Last Name"
                  onValueChange={setAttendeeBadgeLastName}
                  value={attendeeBadgeLastName}
                  readOnly={readOnly}
                />
                <Input
                  label="Legal Name"
                  onValueChange={setAttendeeLegalName}
                  value={attendeeLegalName}
                  readOnly={readOnly}
                />
                <Input
                  label="Email"
                  onValueChange={setAttendeeEmail}
                  value={attendeeEmail ?? ""}
                  readOnly={readOnly}
                />
                <Select
                  label="Pronouns"
                  placeholder="Select Pronouns"
                  selectedKeys={
                    attendeePronounsId != null
                      ? new Set([String(attendeePronounsId)])
                      : new Set()
                  }
                  isDisabled={readOnly}
                  onSelectionChange={(keys) => {
                    const [first] = keys;
                    setAttendeePronounsId(
                      first != null ? Number(first) : null
                    );
                  }}
                >
                  {pronouns.map((p) => (
                    <SelectItem key={p.id} textValue={p.pronouns}>
                      {p.pronouns}
                    </SelectItem>
                  ))}
                </Select>
              </ModalBody>
              <ModalFooter>
                {readOnly ? null : (
                  <Button color="success" type="submit">
                    Save
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
