"use client";

import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "../../utils/cx";
import { useMergedRef } from "../../utils/useMergedRef";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

// The set of props Tooltip injects into the trigger via cloneElement.
// Constraining `children: ReactElement<TooltipTriggerProps>` at the type
// level pushes trigger-compatibility problems (missing ref forwarding,
// clashing handler shapes) to author time instead of a runtime error.
export type TooltipTriggerProps = {
  ref?: Ref<HTMLElement>;
  "aria-describedby"?: string;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

export type TooltipProps = Omit<ComponentProps<"div">, "children" | "content"> & {
  /** Panel body. Rendered inside a `role="tooltip"` element while open. */
  content: ReactNode;
  /** Single interactive element the panel anchors to. */
  children: ReactElement<TooltipTriggerProps>;
  /** Preferred edge to anchor against. The panel flips to the opposite edge when the preferred side would overflow the viewport. */
  placement?: TooltipPlacement;
  /** Milliseconds the pointer must dwell on the trigger before hover opens the panel. Focus opens immediately. */
  delay?: number;
  /** Controlled visibility. When set, hover/focus stop toggling state and only invoke `onOpenChange`. */
  open?: boolean;
  /** Fired whenever the internal (or requested, when controlled) open state changes. Guaranteed to alternate `true`/`false`; no duplicate values. */
  onOpenChange?: (open: boolean) => void;
  /** Element the panel is portaled into. Defaults to `document.body` so overlays escape the responsive-container context. */
  container?: HTMLElement;
};

// Gap in px between the trigger's edge and the panel's edge. Not a token
// yet — no other component uses a "float away from an anchor" offset, so
// introducing a global one now would be a token invented for one caller.
const OFFSET = 8;

function opposite(placement: TooltipPlacement): TooltipPlacement {
  switch (placement) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

function place(
  trigger: DOMRect,
  panel: { width: number; height: number },
  placement: TooltipPlacement,
): { top: number; left: number } {
  const centerX = trigger.left + trigger.width / 2;
  const centerY = trigger.top + trigger.height / 2;
  switch (placement) {
    case "top":
      return { top: trigger.top - panel.height - OFFSET, left: centerX - panel.width / 2 };
    case "bottom":
      return { top: trigger.bottom + OFFSET, left: centerX - panel.width / 2 };
    case "left":
      return { top: centerY - panel.height / 2, left: trigger.left - panel.width - OFFSET };
    case "right":
      return { top: centerY - panel.height / 2, left: trigger.right + OFFSET };
  }
}

function fitsInViewport(
  pos: { top: number; left: number },
  panel: { width: number; height: number },
  viewport: { width: number; height: number },
): boolean {
  return (
    pos.top >= 0 &&
    pos.left >= 0 &&
    pos.top + panel.height <= viewport.height &&
    pos.left + panel.width <= viewport.width
  );
}

// Try the requested placement first; if the panel would clip the viewport
// along the placement axis, flip to the opposite side. This makes placement
// an initial hint rather than a hard directive so callers don't have to guard
// edge cases themselves. Horizontal offset (centering) is left as-is — if the
// panel is too wide for the viewport there's no better answer than clamping,
// which we deliberately don't do so the overflow is visible rather than a
// silently-clipped label; that decision is documented on `placement`.
function computeLayout(
  trigger: DOMRect,
  panel: { width: number; height: number },
  requested: TooltipPlacement,
  viewport: { width: number; height: number },
): { top: number; left: number; placement: TooltipPlacement } {
  const primary = place(trigger, panel, requested);
  if (fitsInViewport(primary, panel, viewport)) {
    return { ...primary, placement: requested };
  }
  const flipped = place(trigger, panel, opposite(requested));
  if (fitsInViewport(flipped, panel, viewport)) {
    return { ...flipped, placement: opposite(requested) };
  }
  // Neither side fits (e.g. a trigger larger than the viewport). Keep the
  // caller's requested placement — clipping there is at least predictable.
  return { ...primary, placement: requested };
}

export function Tooltip({
  content,
  children,
  placement = "top",
  delay = 200,
  open: controlledOpen,
  onOpenChange,
  container,
  className,
  style,
  ...rest
}: TooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  // Imperative model: event handlers call open$/close$ directly. Escape sets
  // a suppression ref that blocks re-open until BOTH hover and focus release
  // — a keyboard-focused button that dismissed the tooltip must not
  // immediately reopen via the still-active focus state, defeating dismiss.
  const hoverRef = useRef(false);
  const focusRef = useRef(false);
  const suppressedRef = useRef(false);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  // Track the last value we emitted to onOpenChange so we can suppress
  // duplicate transitions (e.g. mouseleave during the pre-open delay window
  // would otherwise emit a spurious false; a hover-open followed by focus
  // would emit a duplicate true). Seed with the initial `open` so we don't
  // fire a synthetic close from a stray mouseleave on a Tooltip that mounted
  // in the closed state.
  const lastEmittedRef = useRef<boolean>(open);

  const commitOpen = useCallback(
    (next: boolean) => {
      if (lastEmittedRef.current === next) return;
      lastEmittedRef.current = next;
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  // Sync the emit-guard whenever an external open change slips through
  // without touching commitOpen — a controlled parent updating its own
  // state, or the uncontrolled path's setUncontrolledOpen committing.
  // Without this, a controlled parent's flip would leave lastEmittedRef
  // stuck at its previous value and cause the next legitimate transition
  // to be swallowed.
  useEffect(() => {
    lastEmittedRef.current = open;
  }, [open]);

  const openNow = useCallback(
    (withDelay: boolean) => {
      if (suppressedRef.current) return;
      clearOpenTimer();
      if (!withDelay || delay <= 0) {
        commitOpen(true);
        return;
      }
      openTimerRef.current = setTimeout(() => {
        openTimerRef.current = null;
        // No re-check of hover/focus/suppressed here: every code path that
        // invalidates the pending open (mouseleave, blur, Escape, controlled
        // close) also calls clearOpenTimer, so if the timer fires the
        // scheduled commit is still the correct intent.
        commitOpen(true);
      }, delay);
    },
    [delay, commitOpen, clearOpenTimer],
  );

  const closeNow = useCallback(() => {
    clearOpenTimer();
    commitOpen(false);
  }, [commitOpen, clearOpenTimer]);

  // Whenever the panel is closed (from any cause, including a controlled
  // parent flipping open to false), a still-pending open timer is stale by
  // definition — cancel it so a late fire cannot resurrect the panel after
  // an explicit close. Also fires on initial mount with open=false (a no-op
  // since no timer has been scheduled yet).
  useEffect(() => {
    if (!open) clearOpenTimer();
  }, [open, clearOpenTimer]);

  // Unmount cleanup. Empty deps + inline cleanup so the intent ("clear any
  // in-flight timer when Tooltip unmounts") is expressed directly and
  // cannot regress if clearOpenTimer's identity ever gains a dep.
  useEffect(
    () => () => {
      if (openTimerRef.current !== null) clearTimeout(openTimerRef.current);
    },
    [],
  );

  const reactId = useId();
  const panelId = `ps1ui-tooltip-${reactId}`;

  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [layout, setLayout] = useState<{
    top: number;
    left: number;
    placement: TooltipPlacement;
  } | null>(null);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    // Defensive: the useLayoutEffect below only calls measure() when both
    // `mounted` (panel portaled) and `open` (portal rendered under the mount
    // gate) are true, so both refs are populated at every call site we own.
    // Kept for scroll/resize handlers that could still fire during the
    // transition tick after teardown removes the panel but before the
    // cleanup listener detaches — unreachable from tests without racing.
    /* c8 ignore next */
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    // offsetWidth/offsetHeight (integer, layout box) instead of
    // getBoundingClientRect on the panel: the fractional sub-pixel values
    // from transformed ancestors would inject jitter into `top`/`left`,
    // and the panel is unstyled by any transform at this point anyway.
    const size = { width: panel.offsetWidth, height: panel.offsetHeight };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    setLayout(computeLayout(rect, size, placement, viewport));
  }, [placement]);

  // Portal target guard — SSR renders without `document`, and even with the
  // "use client" boundary the first paint of a hydrated tree happens without
  // window. Deferring the panel mount to a post-mount effect keeps SSR safe
  // and eliminates hydration-mismatch on `open={true}` initial renders.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Recompute on (mount, open, placement) and on scroll/resize while open.
  // `mounted` is in the dep list because the panel doesn't attach to
  // `panelRef` until after the mount-gated portal renders — a measure() on
  // the pre-mount pass would find a null panel and no-op. Uses
  // `capture: true` on scroll so ancestor scroll containers are covered
  // without walking the ancestor chain ourselves. Scroll/resize dispatch
  // is rAF-coalesced so a fast-scrolling parent (120 Hz trackpad,
  // virtualized list) triggers at most one measure per frame instead of
  // one per event.
  useLayoutEffect(() => {
    if (!open || !mounted) {
      setLayout(null);
      return;
    }
    measure();
    let rafId: number | null = null;
    const handle = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        measure();
      });
    };
    window.addEventListener("scroll", handle, true);
    window.addEventListener("resize", handle);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handle, true);
      window.removeEventListener("resize", handle);
    };
  }, [open, mounted, measure]);

  const child = children;
  const mergedTriggerRef = useMergedRef<HTMLElement>(triggerRef, child.props.ref);

  const childDescribedBy = child.props["aria-describedby"];
  const describedBy = open
    ? childDescribedBy
      ? `${childDescribedBy} ${panelId}`
      : panelId
    : childDescribedBy;

  const triggerElement = cloneElement<TooltipTriggerProps>(child, {
    ref: mergedTriggerRef,
    "aria-describedby": describedBy,
    onMouseEnter: (event) => {
      child.props.onMouseEnter?.(event);
      hoverRef.current = true;
      openNow(true);
    },
    onMouseLeave: (event) => {
      child.props.onMouseLeave?.(event);
      hoverRef.current = false;
      // Fully left both channels → dismiss suppression AND close.
      if (!focusRef.current) {
        suppressedRef.current = false;
        closeNow();
      }
    },
    onFocus: (event) => {
      child.props.onFocus?.(event);
      focusRef.current = true;
      openNow(false);
    },
    onBlur: (event) => {
      child.props.onBlur?.(event);
      focusRef.current = false;
      if (!hoverRef.current) {
        suppressedRef.current = false;
        closeNow();
      }
    },
    onKeyDown: (event) => {
      child.props.onKeyDown?.(event);
      if (event.key !== "Escape") return;
      // Suppress + close for BOTH open panels and pending (delayed) opens.
      // Guarding on `open` alone would ignore Escape during the hover-delay
      // window, letting the timer fire after the user's explicit dismiss.
      if (open || openTimerRef.current !== null) {
        suppressedRef.current = true;
        closeNow();
      }
    },
  });

  const resolvedPlacement = layout?.placement ?? placement;

  // Panel style: caller style first so inline `background`/`color` overrides
  // stick, then the vars we own (position, top, left, visibility) last so
  // our positioning always wins. `visibility: hidden` on the pre-measure
  // frame keeps the panel out of view while it takes measurable box
  // dimensions — otherwise it flashes at (0, 0) for one paint.
  const panelStyle: CSSProperties = {
    ...style,
    position: "fixed",
    top: layout?.top ?? 0,
    left: layout?.left ?? 0,
    visibility: layout ? "visible" : "hidden",
  };

  const panel =
    mounted && open
      ? createPortal(
          <div
            {...rest}
            ref={panelRef}
            id={panelId}
            role="tooltip"
            className={cx("ps1ui-tooltip", `ps1ui-tooltip--${resolvedPlacement}`, className)}
            style={panelStyle}
          >
            {content}
          </div>,
          container ?? document.body,
        )
      : null;

  return (
    <>
      {triggerElement}
      {panel}
    </>
  );
}
