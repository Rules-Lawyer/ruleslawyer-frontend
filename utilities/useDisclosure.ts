import { useOverlayState, type UseOverlayStateReturn } from "@heroui/react";

// HeroUI v3 replaced `useDisclosure` with `useOverlayState`, which renames the
// methods (onOpen->open, onClose->close, onOpenChange->setOpen) and drops the
// `onClose` callback option. This shim keeps the v2-shaped API the app already
// uses everywhere, while the returned object is ALSO a valid v3 `<Modal state>`
// (it spreads the full useOverlayState return). That limits the v3 modal
// migration to the JSX of each modal rather than every call site.

export interface UseDisclosureProps {
  isOpen?: boolean;
  defaultOpen?: boolean;
  /** Called when the overlay transitions to closed (v2 parity). */
  onClose?: () => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export type Disclosure = UseOverlayStateReturn & {
  /** v2 alias for `open()`. */
  onOpen: () => void;
  /** v2 alias for `close()`. */
  onClose: () => void;
  /** v2 alias for `setOpen()`. */
  onOpenChange: (isOpen: boolean) => void;
};

export function useDisclosure(props: UseDisclosureProps = {}): Disclosure {
  const { onClose, onOpenChange, ...rest } = props;

  const state = useOverlayState({
    ...rest,
    onOpenChange: (isOpen) => {
      onOpenChange?.(isOpen);
      if (!isOpen) onClose?.();
    },
  });

  return {
    ...state,
    onOpen: state.open,
    onClose: state.close,
    onOpenChange: state.setOpen,
  };
}
