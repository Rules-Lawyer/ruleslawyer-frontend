"use client";
import { Button, Modal } from "@heroui/react";
import { useDisclosure } from "@/utilities/useDisclosure";

interface AttendeeMissingBadgeModalProps {
  disclosure: ReturnType<typeof useDisclosure>;
}

export default function AttendeeMissingBadgeModal(props: AttendeeMissingBadgeModalProps) {
  const { disclosure } = props;

  if (!disclosure.isOpen) return null;

  return (
    <Modal state={disclosure}>
      {/* hidden trigger so HeroUI DialogTrigger has a pressable child; see game-modal.tsx */}
      <Modal.Trigger tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container scroll="outside">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Unable to find an attendee badge?</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div>
                <p className="mb-8">Step 1: Ask to see the attendee&apos;s Tabletop.Events receipt.</p>

                <p className="mb-8">
                  Step 2: Validate the receipt and reference the badge number listed.
                  <br/>- The badge number on the receipt translates to the last four digits of the Geekway Badge number.
                  <br/>- For example: badge number 123 on the receipt would be 2610123 in the Geekway system.
                </p>
                <p className="mb-8">
                  Step 3: Search the badge number in the search box to the left.
                  <br/>- If the badge is under a different name than on the receipt, it has already been transferred with their approval.
                  <br/>- If the badge is not found, we have no record of their purchase.
                </p>

                <p>Step 4: Speak with staff to address the issue.</p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={disclosure.onClose}>
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
