"use client";
import { Tooltip } from "@heroui/react";
import { Button } from "react-aria-components";
import type { ReactNode } from "react";

// HeroUI v3 replaced the v2 prop-based <Tooltip content="..."> with a compound
// component. This wrapper preserves the old ergonomics. v2's `color` prop was
// removed in v3 (style with Tailwind instead).
//
// react-aria's TooltipTrigger (the HeroUI <Tooltip> root) sets up BOTH a Focusable
// and a PressResponder around its trigger, so the trigger must be a real pressable
// + focusable element. HeroUI's <Tooltip.Trigger> only provides Focusable (no
// Pressable), which spams "<Focusable> child must be focusable" and "PressResponder
// without a pressable child" on every render. So for an interactive tooltip pass
// `onPress` (+ optional aria-label / triggerClassName) and we render an UNSTYLED
// react-aria <Button> as the trigger — it consumes both contexts cleanly, with no
// nested <button> and a single tab stop. `children` is just the icon/content.
// Non-interactive triggers (a <Link>) omit `onPress` and render via Tooltip.Trigger.
export function SimpleTooltip({
  content,
  delay = 0,
  showArrow = true,
  classNames,
  onPress,
  ariaLabel,
  triggerClassName,
  children,
}: {
  content: ReactNode;
  delay?: number;
  showArrow?: boolean;
  children: ReactNode;
  /** Accepted but ignored — v2's tooltip `color` was removed in v3. */
  color?: string;
  /** v2 `classNames={{ content }}` — the content slot maps to Tooltip.Content. */
  classNames?: { content?: string };
  /** When set, the trigger is an unstyled react-aria Button carrying this handler. */
  onPress?: () => void;
  ariaLabel?: string;
  triggerClassName?: string;
}) {
  return (
    <Tooltip delay={delay}>
      {onPress !== undefined ? (
        <Button
          type="button"
          aria-label={ariaLabel}
          className={triggerClassName}
          onPress={onPress}
          // Stop the click from bubbling to a clickable ancestor (e.g. a <Link>
          // card) and suppress default navigation — preserves the behavior the
          // old inline button onClick handlers had via e.stopPropagation().
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {children}
        </Button>
      ) : (
        <Tooltip.Trigger tabIndex={0} aria-label={ariaLabel} className={triggerClassName}>
          {children}
        </Tooltip.Trigger>
      )}
      <Tooltip.Content showArrow={showArrow} className={classNames?.content}>
        {showArrow && <Tooltip.Arrow />}
        {content}
      </Tooltip.Content>
    </Tooltip>
  );
}
