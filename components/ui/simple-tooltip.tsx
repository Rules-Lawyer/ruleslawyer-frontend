"use client";
import { Tooltip } from "@heroui/react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

// HeroUI v3 replaced the v2 prop-based <Tooltip content="..."> with a compound
// component. This wrapper preserves the old ergonomics for the app's many simple
// tooltips. v2's `color` prop was removed in v3 (style with Tailwind instead).
//
// HeroUI's Tooltip.Trigger renders a `<div role="button">` (wrapped in react-aria
// <Focusable>) and spreads its props onto that div. For an icon-button tooltip,
// pass `onPress` (+ optional aria-label / triggerClassName) so the TRIGGER itself
// is the interactive, focusable button and `children` is just the icon — this
// avoids nesting a real <button> inside the trigger (which produced both the
// "<Focusable> child must be focusable" warning and a duplicate tab stop).
// For non-button triggers (e.g. a <Link>), omit `onPress` and pass the element
// as children; tabIndex still makes the trigger focusable so the warning stays
// quiet.
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
  /** When set, the trigger itself becomes the interactive button. */
  onPress?: () => void;
  ariaLabel?: string;
  triggerClassName?: string;
}) {
  const interactive = onPress
    ? {
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          onPress();
        },
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPress();
          }
        },
      }
    : {};

  return (
    <Tooltip delay={delay}>
      <Tooltip.Trigger
        tabIndex={0}
        aria-label={ariaLabel}
        className={triggerClassName}
        {...interactive}
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content showArrow={showArrow} className={classNames?.content}>
        {showArrow && <Tooltip.Arrow />}
        {content}
      </Tooltip.Content>
    </Tooltip>
  );
}
