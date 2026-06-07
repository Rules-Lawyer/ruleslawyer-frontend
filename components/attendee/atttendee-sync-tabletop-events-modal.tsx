"use client";
import frontendFetch from "@/utilities/frontendFetch";
import { toastNetworkError, toastSaveError } from "@/utilities/toastFetchError";
import {
  Button,
  Modal,
} from "@heroui/react";
import { useAuth } from "@/utilities/swr/useAuth";
import React, { useState } from "react";
import { useDisclosure } from "@/utilities/useDisclosure";
import { SimpleTextField } from "../ui/simple-field";

interface AttendeeSyncTabletopEventsUpdate {
  conventionId: string;
}

interface AttendeeSyncTabletopEventsModalProps {
  disclosure: ReturnType<typeof useDisclosure>;
  onSaved?: (updated: AttendeeSyncTabletopEventsUpdate) => void;
  conventionId?: number;
}

export default function AttendeeSyncTabletopEventsModal(props: AttendeeSyncTabletopEventsModalProps) {
  const {
    disclosure,
    conventionId,
  } = props;

  const [userName, setUserName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [apiKey, setAPIKey] = useState<string>("");

  const session = useAuth();

  const { onClose } = disclosure;

  const onSave = () => {
    if (conventionId) {
      frontendFetch(
        "POST",
        "/con/" + conventionId + "/syncTabletopEventsAttendees",
        {
          userName: userName,
          password: password,
          apiKey: apiKey,
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

  // Render nothing while closed so HeroUI Modal/DialogTrigger does not mount
  // a (hidden, thus non-focusable) trigger — e.g. inside collapsed Accordion panels.
  if (!disclosure.isOpen) return null;

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
                  <Modal.Heading>Import Attendees</Modal.Heading>
                </Modal.Header>
               <Modal.Body>
                  <SimpleTextField
                    label="User Name"
                    onChange={setUserName}
                    value={userName}
                  />
                  <SimpleTextField
                    label="Password"
                    type="password"
                    onChange={setPassword}
                    value={password}
                  />
                  <SimpleTextField
                    label="API Key"
                    type="password"
                    onChange={setAPIKey}
                    value={apiKey}
                  />
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="primary" type="submit">
                    Sync with TTE
                  </Button>
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
