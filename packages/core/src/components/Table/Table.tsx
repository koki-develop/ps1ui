"use client";

import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";
import { useMergedRef } from "../../utils/useMergedRef";
import { useScrollableFocus } from "../../utils/useScrollableFocus";

// Props type the native <table>: everything spreads onto the <table> element,
// ref included. The horizontal-scroll wrapper the component renders around it
// is an internal implementation detail — it carries no caller props and is
// styled/targeted via the stable `.ps1ui-table__scroller` class.
export type TableProps = ComponentProps<"table">;

export function Table({ className, ref: forwardedRef, ...rest }: TableProps) {
  // A <table> cannot be its own overflow container (`display: table` boxes
  // don't honor overflow), so scrolling lives on a wrapper div. Keyboard
  // reachability of that wrapper — tabIndex only while the table actually
  // overflows, kept while focused, safe-side under static SSR — is the shared
  // useScrollableFocus contract (see the hook's header for the full account).
  // The table's own box is the observed content: children re-rendering wider
  // or narrower resize it, which re-fires the measurement.
  const { scrollerRef, contentRef, tabIndex, measure } = useScrollableFocus<
    HTMLDivElement,
    HTMLTableElement
  >();

  // Both the hook (overflow observation) and the caller get the <table> node.
  const mergedRef = useMergedRef(contentRef, forwardedRef);

  return (
    <div
      className="ps1ui-table__scroller"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe scrollable-region-focusable requires the scroller be keyboard-reachable when the table overflows; useScrollableFocus gates this on measured overflow so small tables stay out of the tab order.
      tabIndex={tabIndex}
      ref={scrollerRef}
      // Re-measure once focus leaves: while focused the hook keeps the tab
      // stop even if content now fits (dropping tabindex off the focused
      // element would blur it to <body>); blur is the moment it can safely go.
      onBlur={measure}
    >
      <table {...rest} ref={mergedRef} className={cx("ps1ui-table", className)} />
    </div>
  );
}
