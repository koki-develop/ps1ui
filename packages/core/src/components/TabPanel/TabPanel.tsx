"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { cx } from "../../utils/cx";
import { useMergedRef } from "../../utils/useMergedRef";
import { useTabsContext } from "../Tabs/Tabs";

export type TabPanelProps = ComponentProps<"div"> & {
  /**
   * Identifier matched against `<Tabs value>` — when equal, the panel is
   * shown; otherwise it renders with the native `hidden` attribute so it drops
   * out of the a11y tree and layout. Also links back to its owning `<Tab>` via
   * `aria-labelledby`.
   */
  value: string;
};

// WAI-ARIA APG: a tabpanel with no focusable descendants should carry
// `tabindex=0` so keyboard-only users can still reach the panel content. The
// selectors below cover the standard focusable elements (see
// https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Keyboard#focusable_elements)
// without pulling in a full focus-trap library — the panel just needs to
// know "is there anything at all my caller expects to receive Tab focus".
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function TabPanel({
  className,
  value,
  id: idProp,
  hidden: hiddenProp,
  "aria-labelledby": ariaLabelledByProp,
  tabIndex,
  ref: forwardedRef,
  ...rest
}: TabPanelProps) {
  const ctx = useTabsContext();

  // Standalone (no <Tabs> ancestor): fall back to whatever `hidden` the caller
  // passed, so a static docs demo can pin the visible panel by props alone.
  // Inside <Tabs>: hidden iff the group's value doesn't match this panel's.
  const hidden = ctx ? ctx.value !== value : (hiddenProp ?? false);

  const id = idProp ?? (ctx ? `${ctx.idBase}-panel-${value}` : undefined);
  const ariaLabelledBy = ariaLabelledByProp ?? (ctx ? `${ctx.idBase}-tab-${value}` : undefined);

  const localRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(localRef, forwardedRef);

  // Auto-tabIndex: when the caller hasn't pinned one and the visible panel
  // has no focusable descendants, add tabindex=0 so keyboard users can still
  // reach the content. Runs after every commit (no deps) so children changing
  // focusability is picked up on the next render; only writes state when the
  // computed value actually changes, so the re-render short-circuits when
  // the panel content is stable. Hidden panels skip the scan.
  const [autoTabIndex, setAutoTabIndex] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (tabIndex !== undefined || hidden) {
      setAutoTabIndex((prev) => (prev === undefined ? prev : undefined));
      return;
    }
    // `localRef.current` is guaranteed set — the layout effect fires after
    // React has attached the ref during commit.
    const el = localRef.current!;
    const focusable = el.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    const nextValue = focusable ? undefined : 0;
    setAutoTabIndex((prev) => (prev === nextValue ? prev : nextValue));
  });

  const resolvedTabIndex = tabIndex ?? autoTabIndex;

  const orientation = ctx?.orientation ?? "horizontal";

  return (
    <div
      {...rest}
      ref={mergedRef}
      id={id}
      role="tabpanel"
      aria-labelledby={ariaLabelledBy}
      hidden={hidden}
      tabIndex={resolvedTabIndex}
      className={cx(
        "ps1ui-tab-panel",
        orientation === "vertical" && "ps1ui-tab-panel--vertical",
        className,
      )}
    />
  );
}
