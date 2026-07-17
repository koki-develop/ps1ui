import { createElement } from "react";
import type { ComponentProps, ReactElement } from "react";
import { cx } from "../../utils/cx";

// Discriminated union: an unordered <List> shouldn't typecheck with <ol>-only
// attributes (start / reversed) and shouldn't type its ref as HTMLOListElement.
// `type` is dropped from the ordered variant because the visible marker is
// drawn by `::before`, not the browser's `::marker`, so `type="a"` would
// silently not affect the visible numbering.
export type ListProps =
  | ({ ordered?: false } & ComponentProps<"ul">)
  | ({ ordered: true } & Omit<ComponentProps<"ol">, "type">);

// Return type annotated so tsdown emits a small ReactElement in the .d.mts
// instead of the wide DetailedReactHTMLElement createElement infers for a
// `"ol" | "ul"` tag union.
export function List(props: ListProps): ReactElement {
  const { ordered = false, className, ...rest } = props;
  const tag = ordered ? "ol" : "ul";
  return createElement(tag, {
    // Safari's a11y tree drops list semantics ("list, N items") when the
    // computed `list-style-type` is `none` — the global reset applies that,
    // so `role="list"` restores VoiceOver's announcement. Placed before
    // `...rest` so a caller can override with a different role.
    role: "list",
    ...rest,
    className: cx(
      "ps1ui-list",
      ordered ? "ps1ui-list--ordered" : "ps1ui-list--unordered",
      className,
    ),
  });
}
