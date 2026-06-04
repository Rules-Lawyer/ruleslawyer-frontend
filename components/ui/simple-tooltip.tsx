"use client";
import { Tooltip } from "@heroui/react";
import type { ReactNode } from "react";

// HeroUI v3 replaced the v2 prop-based <Tooltip content="..."> with a compound
// component. This wrapper preserves the old ergonomics for the app's many
// simple tooltips (a label on a single trigger). v2's `color` prop was removed
// in v3 (style with Tailwind on the trigger/content instead).
export function SimpleTooltip({
  content,
  delay = 0,
  showArrow = true,
  classNames,
  children,
}: {
  content: ReactNode;
  delay?: number;
  showArrow?: boolean;
  children: ReactNode;
  /** Accepted but ignored — v2's tooltip `color` was removed in v3. Lets call
   *  sites migrate with just a tag rename; restyle with Tailwind if needed. */
  color?: string;
  /** v2 `classNames={{ content }}` — the content slot maps to Tooltip.Content. */
  classNames?: { content?: string };
}) {
  return (
    <Tooltip delay={delay}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content showArrow={showArrow} className={classNames?.content}>
        {showArrow && <Tooltip.Arrow />}
        {content}
      </Tooltip.Content>
    </Tooltip>
  );
}
