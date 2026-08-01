import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

// Ultra-thin native wrapper, exactly like Checkbox / Radio: one element, every
// prop (className, style, ref and all native attributes) spread onto the
// <input> itself.
//
// ── Why a checkbox with role="switch", and not <button aria-pressed> ──────
// A switch is a checkbox that announces itself differently: ARIA in HTML lists
// `switch` among the roles allowed on `input[type=checkbox]`, and the role
// changes only what assistive tech reads out ("on/off" instead of
// "checked/unchecked"). Everything else stays native and therefore free —
// form participation (the control's name/value reach FormData), Space
// activation, `:checked` / `:disabled` styling hooks, and label association
// via `htmlFor` or wrapping. A <button aria-pressed> would have to
// re-implement every one of those in JS, and would submit nothing.
//
// `type` and `role` are the two attributes that make this component what it
// is, so both are Omit-ed from the public props rather than left overridable:
// the CSS is keyed on a checkbox's `:checked`, so a caller who swapped either
// one would get a control that still paints as a switch but no longer behaves
// or announces as one.
export type SwitchProps = Omit<ComponentProps<"input">, "type" | "role">;

export function Switch({ className, ...rest }: SwitchProps) {
  return (
    // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props -- the rule is written for `<div role="switch">`, which has no state of its own. This is a native checkbox: HTML-AAM maps its `checked` state onto the switch role's aria-checked, live, with no attribute of ours. Writing an explicit `aria-checked` would be actively wrong — it would freeze at its initial value while the control toggles underneath it. Switch.test.tsx asserts the mapping holds by querying `getByRole("switch", { checked })` before and after a click.
    <input {...rest} type="checkbox" role="switch" className={cx("ps1ui-switch", className)} />
  );
}
