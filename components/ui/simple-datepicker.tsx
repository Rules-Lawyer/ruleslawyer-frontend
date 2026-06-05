"use client";
import { Calendar, DateField, DatePicker, Label } from "@heroui/react";
import type { DateValue } from "react-aria-components";
import type { ReactNode } from "react";

// HeroUI v3 exploded the v2 all-in-one <DatePicker label value onChange/> into a
// large compound (DateField segments + a Trigger + a full Calendar with year
// picker). This wrapper restores a single-prop call site. Generic over the date
// type so callers keep their ZonedDateTime state types end to end. The v2
// `showMonthAndYearPickers` is now built into Calendar's YearPicker subtree.
export function SimpleDatePicker({
  label,
  value,
  onChange,
  defaultValue,
  isRequired,
  isDisabled,
}: {
  label: ReactNode;
  value?: DateValue | null;
  onChange?: (value: DateValue | null) => void;
  defaultValue?: DateValue | null;
  isRequired?: boolean;
  isDisabled?: boolean;
}) {
  return (
    <DatePicker
      value={value}
      onChange={onChange}
      defaultValue={defaultValue}
      isRequired={isRequired}
      isDisabled={isDisabled}
    >
      <Label>{label}</Label>
      <DateField.Group>
        <DateField.Input>
          {(segment) => <DateField.Segment segment={segment} />}
        </DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label="Choose date">
          <Calendar.Header>
            <Calendar.NavButton slot="previous" />
            <Calendar.Heading />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
