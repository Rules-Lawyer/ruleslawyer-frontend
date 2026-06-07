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

interface AttendeeImportCSVUpdate {
  conventionId: string;
}

interface AttendeeImportCSVModalProps {
  disclosure: ReturnType<typeof useDisclosure>;
  onSaved?: (updated: AttendeeImportCSVUpdate) => void;
  conventionId?: number;
  organizationId?: number;
}

export default function AttendeeImportCSVModal(props: AttendeeImportCSVModalProps) {
  const {
    disclosure,
    conventionId,
  } = props;

  const [importCSV, setImportCSV] = useState<File | null>(null);

  const session = useAuth();

  const { onClose } = disclosure;

  const handleImportCSV = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setImportCSV(event.target.files?.[0] ?? null);
  };

  const onSave = () => {
    if (conventionId && importCSV) {
      // The endpoint reads a multipart file part (request.file()), so send
      // FormData and let the browser set the multipart boundary (multiPart=true).
      const formData = new FormData();
      formData.append("importCSV", importCSV, "import.csv");

      frontendFetch(
        "POST",
        "/con/" + conventionId + "/importAttendeesCSV",
        formData,
        session?.data?.token,
        undefined,
        true
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
                    <input
                      name="importFile"
                      type="file"
                      onChange={handleImportCSV}
                    />
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="primary" type="submit">
                    Import
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
