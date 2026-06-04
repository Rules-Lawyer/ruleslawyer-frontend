"use client";
import { Checkbox, Label } from "@heroui/react";
import type { ReactNode } from "react";
// react-aria's Key (string | number) — narrower than React's Key, which also
// includes bigint | symbol and is rejected by Select/ListBox.
import type { Key } from "react-aria-components";

export function SimpleCheckbox({
  label,
  "aria-label": ariaLabel,
  isSelected,
  onChange,
  isDisabled,
  id
}: {
  label?: ReactNode;
  "aria-label"?: string;
  name?: string;
  isSelected: boolean;
  onChange?: ( value: boolean ) => void
  isDisabled?: boolean;
  id: string;
}) {
  return (
    <Checkbox id={id} isSelected={isSelected} onChange={onChange} isDisabled={isDisabled}>
      <Checkbox.Control>
        <Checkbox.Indicator className="bg-gwdarkgreen"/>
      </Checkbox.Control>
      <Checkbox.Content>
        <Label htmlFor={id}>{label}</Label>
      </Checkbox.Content>
    </Checkbox>
  );
}