"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// Measured keyboard reachability for a horizontal-overflow scroll container,
// shared by CodeBlock (the <pre> is its own scroller) and Table (a wrapper div
// scrolls the <table>).
//
// axe scrollable-region-focusable requires a scrollable region to be
// keyboard-reachable IF its content actually overflows, while an unconditional
// tabIndex=0 would drop every non-overflowing instance into the tab order for
// no benefit. So the hook measures and exposes `tabIndex: 0` only while
// there is somewhere to scroll.
//
// The initial state is scrollable (`true`) so overflowing content is never
// *un*reachable on the very first paint, before useLayoutEffect has measured.
// The same bias is deliberate for static SSR without hydration (e.g. the docs
// site renders every component server-side with no client JS): the measurement
// never runs there, and whether a table overflows depends on the reader's
// viewport — a phone-width visitor needs the scroller reachable, so the safe
// static default is an extra tab stop on wide screens, not unreachable content
// on narrow ones.
//
// Two more contract details, both load-bearing:
//   - `measure` keeps the scroller in the tab order while it IS the focused
//     element even if its content now fits — removing tabindex from the
//     focused element blurs it to <body>, silently teleporting a keyboard
//     user's position. Components re-run `measure` on the scroller's blur so
//     the tab stop is dropped once focus has moved on.
//   - The quantity measured (scrollWidth) never fires a ResizeObserver by
//     itself, so the hook observes the scroller's box (container resizes) and,
//     when provided, a content box via `contentRef` (content-driven growth —
//     Table observes its <table>). Content whose box can't be observed (inline
//     elements report no box) needs a manual `measure()` keyed on the content
//     instead — CodeBlock re-measures keyed on its source string.
export function useScrollableFocus<S extends HTMLElement, C extends HTMLElement = HTMLElement>(): {
  scrollerRef: RefObject<S | null>;
  contentRef: RefObject<C | null>;
  tabIndex: 0 | undefined;
  measure: () => void;
} {
  const scrollerRef = useRef<S | null>(null);
  const contentRef = useRef<C | null>(null);
  const [scrollable, setScrollable] = useState(true);

  const measure = useCallback(() => {
    // scrollerRef is populated before layout effects fire (React sets refs
    // during commit) and every later call site holds a live element, so no
    // defensive null check.
    const el = scrollerRef.current!;
    setScrollable(el.scrollWidth > el.clientWidth || document.activeElement === el);
  }, []);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scrollerRef.current!);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, [measure]);

  return { scrollerRef, contentRef, tabIndex: scrollable ? 0 : undefined, measure };
}
