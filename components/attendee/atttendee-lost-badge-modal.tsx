"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import {
  Button,
  Input,
  Label,
  Modal,
  TextField,
} from "@heroui/react";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useEffect, useState } from "react";
import usePermissions from "@/utilities/swr/usePermissions";
import { useDisclosure } from "@/utilities/useDisclosure";
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

  const { onClose } = disclosure;

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
    <Modal state={disclosure}>
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
                  <Modal.Heading>Replace Badge - {attendee?.badgeName}</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <div>
                    <p>Step 1: Charge the attendee in the Square payment device for a replacement badge.</p>
                    <p>Step 2: Get a blank badge from the badge station and enter the badge number in the box below.</p>
                    <p>Step 3: Use the label printing software to print two stickers with the attendee&apos;s name.</p>
                    <p>Step 4: Put one sticker on each side of the badge.</p>
                    <p>Step 5: Remove the geeklet and throw it away.</p>
                  </div>
                  <TextField
                    value={toBadgeNumber}
                    onChange={setToBadgeNumber}
                    isReadOnly={readOnly}
                  >
                    <Label>New Badge Number</Label>
                    <Input />
                  </TextField>
                </Modal.Body>
                <Modal.Footer>
                  {readOnly ? null : (
                    <Button variant="primary" type="submit">
                      Replace Badge
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
