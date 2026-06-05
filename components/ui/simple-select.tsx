"use client";
import { ComboBox, Input, Label, ListBox, Select } from "@heroui/react";
import type { ReactNode } from "react";
// react-aria's Key (string | number) — narrower than React's Key, which also
// includes bigint | symbol and is rejected by Select/ListBox.
import type { Key } from "react-aria-components";

// HeroUI v3 replaced the v2 `<Select><SelectItem/></Select>` with a verbose
// compound (Trigger/Value/Indicator/Popover + a ListBox of items) and switched
// single-select from `selectedKeys: Set` + `onSelectionChange(keys)` to
// `selectedKey: Key` + `onSelectionChange(key)`. These wrappers preserve concise
// call sites. Use <SimpleSelectItem id=...> for each option.
export function SimpleSelect({
  label,
  "aria-label": ariaLabel,
  placeholder,
  name,
  selectedKey,
  onSelectionChange,
  isDisabled,
  className,
  children,
}: {
  label?: ReactNode;
  "aria-label"?: string;
  placeholder?: string;
  name?: string;
  selectedKey?: Key | null;
  onSelectionChange?: (key: Key | null) => void;
  isDisabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Select
      aria-label={ariaLabel}
      placeholder={placeholder}
      name={name}
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
      isDisabled={isDisabled}
      className={className}
    >
      {label ? <Label>{label}</Label> : null}
      <Select.Trigger className={"bg-gwdarkgreen"}>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox className={"bg-gwdarkgreen"}>{children}</ListBox>
      </Select.Popover>
    </Select>
  );
}

// Server-driven autocomplete (items are already filtered by the backend, so we
// pass a no-op filter rather than HeroUI's client-side useFilter). `inputValue`
// /`onInputChange` drive the search text; `selectedKey`/`onSelectionChange` the
// chosen item. Children are <SimpleSelectItem> (ListBox.Item) elements.
export function SimpleAutocomplete({
  label,
  placeholder,
  name,
  inputValue,
  onInputChange,
  selectedKey,
  onSelectionChange,
  isDisabled,
  isRequired,
  children,
  className
}: {
  label?: ReactNode;
  placeholder?: string;
  name?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  selectedKey?: Key | null;
  onSelectionChange?: (key: Key | null) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  children: ReactNode;
  className: string;
}) {
  return (
    <ComboBox
      name={name}
      inputValue={inputValue}
      onInputChange={onInputChange}
      selectedKey={selectedKey}
      onSelectionChange={onSelectionChange}
      isDisabled={isDisabled}
      isRequired={isRequired}
      className={className}
    >
      {label ? <Label>{label}</Label> : null}
      <ComboBox.InputGroup>
        <Input className={"bg-gwdarkgreen"} placeholder={placeholder} />
        <ComboBox.Trigger />
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox className={"bg-gwdarkgreen"}>{children}</ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}

export function SimpleSelectItem({
  id,
  textValue,
  children,
}: {
  id: Key;
  textValue: string;
  children?: ReactNode;
}) {
  return (
    <ListBox.Item id={id} textValue={textValue}>
      {children ?? textValue}
      <ListBox.ItemIndicator />
    </ListBox.Item>
  );
}
