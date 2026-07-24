"use client";

import { useLayoutEffect, type ComponentProps, type MouseEvent } from "react";
import { cx } from "../../utils/cx";
import { useTabsContext } from "../Tabs/Tabs";

// `type` and `value` are the two native <button> keys we want to control
// ourselves. `type` is always "button" (never submit — same defensive default
// as <Button>). `value` is redefined below as the Tabs identifier (a string),
// not the native form-submission payload.
export type TabProps = Omit<ComponentProps<"button">, "type" | "value"> & {
  /**
   * Identifier for this tab. Matched against `<Tabs value>` / `<Tabs defaultValue>`
   * to derive `aria-selected`, and against a sibling `<TabPanel value>` to wire
   * up `aria-controls` / `aria-labelledby`.
   */
  value: string;
  /**
   * Standalone fallback for `aria-selected` when the tab is rendered outside
   * a `<Tabs>` context (e.g. static docs demos). Ignored inside `<Tabs>` — the
   * group's `value` is the source of truth there.
   */
  selected?: boolean;
};

export function Tab({
  className,
  value,
  selected: selectedProp,
  disabled: disabledProp,
  id: idProp,
  "aria-controls": ariaControlsProp,
  onClick,
  ...rest
}: TabProps) {
  const ctx = useTabsContext();

  // Group wins on identity, mirroring Radio-in-RadioGroup. Per-tab
  // `disabled={true}` still opts that tab in when the group is enabled, but a
  // per-tab `disabled={false}` cannot opt OUT of a group-wide disable.
  const disabled = disabledProp || (ctx?.disabled ?? false);
  const selected = ctx ? ctx.value === value : (selectedProp ?? false);

  const id = idProp ?? (ctx ? `${ctx.idBase}-tab-${value}` : undefined);
  const ariaControls = ariaControlsProp ?? (ctx ? `${ctx.idBase}-panel-${value}` : undefined);

  // Register with the group so it can pick a fallback selection (the first
  // enabled tab) when the consumer didn't supply `value`/`defaultValue`.
  // useLayoutEffect fires before paint so the fallback derivation is
  // consistent on the very first paint — no flicker where "nothing selected"
  // shows briefly before the fallback kicks in.
  const registerTab = ctx?.registerTab;
  useLayoutEffect(() => {
    if (!registerTab) return;
    return registerTab(value, disabled);
  }, [registerTab, value, disabled]);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (ctx && !disabled) ctx.onValueChange(value);
  };

  return (
    <button
      {...rest}
      type="button"
      role="tab"
      id={id}
      aria-selected={selected}
      aria-controls={ariaControls}
      // Roving tabindex: the selected tab is the group's single Tab-stop; the
      // rest are reachable only via arrow keys / clicks. The fallback in
      // <Tabs> guarantees at least the first enabled tab is selected when
      // neither `value` nor `defaultValue` is provided, so the tablist is
      // never keyboard-unreachable.
      tabIndex={selected ? 0 : -1}
      data-value={value}
      disabled={disabled}
      onClick={handleClick}
      className={cx("ps1ui-tab", className)}
    />
  );
}
