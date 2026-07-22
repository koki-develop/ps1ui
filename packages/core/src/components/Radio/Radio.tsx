"use client";

import type { ChangeEvent, ComponentProps } from "react";
import { cx } from "../../utils/cx";
import { useRadioGroupContext } from "../RadioGroup/RadioGroup";

export type RadioProps = Omit<ComponentProps<"input">, "type" | "value"> & {
  /** Value submitted when this radio is selected. Also used by `<RadioGroup>` to identify the selected radio. */
  value?: string;
};

export function Radio({
  className,
  name: nameProp,
  checked: checkedProp,
  defaultChecked: defaultCheckedProp,
  onChange: onChangeProp,
  disabled: disabledProp,
  value,
  ...rest
}: RadioProps) {
  const group = useRadioGroupContext();

  // Group wins on identity (name / selection / disabled) — the group is the
  // source of truth for those concerns. Per-radio `disabled` still opts in
  // (a single radio can force-disable itself even in an enabled group), but
  // it can't opt OUT of a group-wide disable. Per-radio `checked` /
  // `defaultChecked` are ignored inside a group so React never sees a
  // controlled + uncontrolled mix from a `defaultChecked` leaked through
  // `...rest` alongside the group's controlled `checked`.
  const name = group ? group.name : nameProp;
  const disabled = disabledProp || (group?.disabled ?? false);
  const checked = group ? value !== undefined && group.value === value : checkedProp;
  const defaultChecked = group ? undefined : defaultCheckedProp;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChangeProp?.(event);
    if (group && !event.defaultPrevented) group.onChange(event);
  };

  return (
    <input
      {...rest}
      type="radio"
      name={name}
      value={value}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      onChange={handleChange}
      className={cx("ps1ui-radio", className)}
    />
  );
}
