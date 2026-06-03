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
} from "@heroui/react";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import { useDisclosure } from "@heroui/react";
import { Attendee } from "@/types/models";

interface AttendeeLostBadgeUpdate {
  newBadgeNumber: string;
}

interface AttendeeLostBadgeModalProps {
  attendeeId?: number;
  disclosure: ReturnType<typeof useDisclosure>;
  onSaved?: (updated: AttendeeLostBadgeUpdate) => void;
  conventionId?: number;
  pronounsIn?: { id: number; pronouns: string }[];
  organizationId?: number;
  attendeeIn?: Attendee;
}

export default function AttendeeLostBadgeModal(props: AttendeeLostBadgeModalProps) {
  const {
    attendeeId,
    attendeeIn,
    disclosure,
    conventionId,
    organizationId,
  } = props;

  const [attendee, setData] = useState<Attendee | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(true);
  const [toBadgeNumber, setToBadgeNumber] = useState("");

  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const session = useAuth();

  const { isOpen, onClose } = disclosure;

  const onSave = () => {
    if (conventionId) {
      frontendFetch(
        "PUT",
        "/con/" + conventionId + "/replaceBadge",
        {
            fromBadgeNumber: Number(attendee?.badgeNumber),
            toBadgeNumber: Number(toBadgeNumber)
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
              <ModalHeader>Replace Badge - {attendee?.badgeName}</ModalHeader>
              <ModalBody>
                <div>
                  <p>Step 1: Charge the attendee in the Square payment device for a replacement badge.</p>
                  <p>Step 2: Get a blank badge from the badge station and enter the badge number in the box below.</p>
                  <p>Step 3: Use the label printing software to print two stickers with the attendee&apos;s name.</p>
                  <p>Step 4: Put one sticker on each side of the badge.</p>
                  <p>Step 5: Remove the geeklet and throw it away.</p>
                </div>
                <Input
                  label="New Badge Number"
                  onValueChange={setToBadgeNumber}
                  value={toBadgeNumber}
                  readOnly={readOnly}
                />
              </ModalBody>
              <ModalFooter>
                {readOnly ? null : (
                  <Button color="success" type="submit">
                    Replace Badge
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
