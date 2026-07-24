"use client";

import { useRef, type ComponentProps, type KeyboardEvent } from "react";
import { cx } from "../../utils/cx";
import { useMergedRef } from "../../utils/useMergedRef";
import { useTabsContext } from "../Tabs/Tabs";

export type TabListProps = ComponentProps<"div">;

// Arrow keys drive roving focus + automatic activation. Reading the DOM instead
// of a child registry keeps the composition open: any wrapper element between
// TabList and Tab (a filter div, a Tooltip host, etc.) works as long as the
// role="tab" descendants stay reachable via `querySelectorAll`.
export function TabList({
  className,
  onKeyDown,
  children,
  ref: forwardedRef,
  ...rest
}: TabListProps) {
  const ctx = useTabsContext();
  const orientation = ctx?.orientation ?? "horizontal";
  const localRef = useRef<HTMLDivElement>(null);
  // Merge the caller's ref with our internal one — the internal ref scopes
  // the arrow-key DOM query to this specific tablist; the caller may want a
  // handle for their own measurement/animation code.
  const mergedRef = useMergedRef(localRef, forwardedRef);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const prevKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";

    // Single guard — the switch's `default: return` below is the only key
    // filter. Deriving `tabs` above the switch would run querySelectorAll
    // for every irrelevant key, so the arrow-key branches build it lazily.
    let nextIdx: number;
    switch (event.key) {
      case nextKey:
      case prevKey:
      case "Home":
      case "End":
        break;
      default:
        return;
    }

    // `localRef.current` is guaranteed set here — the keydown fires on the
    // div this ref is attached to, and React attaches the ref during commit
    // before any user event can reach the handler.
    const el = localRef.current!;
    const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'));
    if (tabs.length === 0) return;

    // `event.target` is the element that received the key — always scoped to
    // this tablist's subtree, unlike `document.activeElement` which returns
    // the shadow host inside a shadow root and can drift after a synchronous
    // focus mutation by an upstream handler. `indexOf` naturally returns -1
    // for anything that isn't one of the enabled tabs (a non-tab descendant
    // that received focus, an `EventTarget` that isn't an element at all),
    // so no separate guard is needed for those shapes.
    const currentIdx = tabs.indexOf(event.target as HTMLButtonElement);

    if (event.key === nextKey) {
      nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % tabs.length;
    } else if (event.key === prevKey) {
      nextIdx = currentIdx < 0 ? tabs.length - 1 : (currentIdx - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIdx = 0;
    } else {
      // Only "End" reaches here — the initial switch rejected every other key.
      nextIdx = tabs.length - 1;
    }

    event.preventDefault();
    // `nextIdx` is bounded by modulo / literal 0 / `tabs.length - 1` above,
    // so the index is always within `tabs` — the non-null assertion is safe
    // under `noUncheckedIndexedAccess`.
    const next = tabs[nextIdx]!;
    next.focus();
    // Automatic activation: focus = select. Read value from the tab's
    // `data-value` rather than dispatching a synthetic click so consumers'
    // per-tab onClick handlers still only fire on real clicks.
    const val = next.dataset.value;
    if (val !== undefined && ctx) ctx.onValueChange(val);
  };

  return (
    <div
      {...rest}
      ref={mergedRef}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={cx("ps1ui-tab-list", `ps1ui-tab-list--${orientation}`, className)}
    >
      {children}
    </div>
  );
}
