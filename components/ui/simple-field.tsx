"use client";
import { Input, Label, TextField, TextArea } from "@heroui/react";
import type { ReactNode } from "react";

// HeroUI v3 made Input/TextArea low-level primitives; a labelled field is now
// composed from <TextField><Label/><Input/></TextField>. These wrappers restore
// the concise v2 `<Input label value onValueChange/>` ergonomics. Note v2's
// `readOnly`/`onValueChange` became react-aria's `isReadOnly`/`onChange`.
type CommonProps = {
  label: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  isReadOnly?: boolean;
  isDisabled?: boolean;
  isRequired?: boolean;
  name?: string;
  className?: string;
  inputClassName?: string;
};

export function SimpleTextField({
  label,
  value,
  onChange,
  isReadOnly,
  isDisabled,
  isRequired,
  name,
  className,
  type,
  placeholder,
}: CommonProps & { type?: string; placeholder?: string }) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      isReadOnly={isReadOnly}
      isDisabled={isDisabled}
      isRequired={isRequired}
      name={name}
      className={className}
    >
      <Label>{label}</Label>
      <Input className={"bg-gwdarkgreen mb-4"} type={type} placeholder={placeholder} />
    </TextField>
  );
}

export function SimpleTextArea({
  label,
  value,
  onChange,
  isReadOnly,
  isDisabled,
  isRequired,
  name,
  className,
  placeholder,
}: CommonProps & { placeholder?: string }) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      isReadOnly={isReadOnly}
      isDisabled={isDisabled}
      isRequired={isRequired}
      name={name}
      className={className}
    >
      <Label>{label}</Label>
      <TextArea placeholder={placeholder} />
    </TextField>
  );
}
