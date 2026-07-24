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

// Props shared by both anchoring modes.
type TooltipBaseProps = Omit<ComponentProps<"div">, "children" | "content"> & {
  /** Panel body. Rendered inside a `role="tooltip"` element while open. */
  content: ReactNode;
  /** Preferred edge to anchor against. The panel flips to the opposite edge when the preferred side would overflow the viewport. */
  placement?: TooltipPlacement;
  /** Milliseconds the pointer must dwell on the trigger before hover opens the panel. Focus opens immediately. Trigger mode only — in anchor mode the caller owns the open timing. */
  delay?: number;
  /** Fired whenever the internal (or requested, when controlled) open state changes. Guaranteed to alternate `true`/`false`; no duplicate values. Never fires in anchor mode, where every transition originates from the caller. */
  onOpenChange?: (open: boolean) => void;
  /** Element the panel is portaled into. Defaults to `document.body` so overlays escape the responsive-container context. */
  container?: HTMLElement;
};

// Two anchoring modes, split at the type level so the impossible combinations
// (both a trigger and an anchor, or an anchor with no controlled `open`) never
// typecheck:
//
//   - TRIGGER mode — the ergonomic default. Tooltip owns one child element,
//     clones it to inject the ref + `aria-describedby` + the hover/focus/
//     Escape state machine, and anchors the panel to it.
//   - ANCHOR mode — for callers whose "trigger" is not a single React element
//     Tooltip can clone: one of N interchangeable sub-elements (a cell inside
//     ContributionGraph's SVG grid), a canvas hit region, a virtualized row.
//     Those callers already track which sub-element is active and own the
//     hover/focus bookkeeping, so Tooltip contributes only what it uniquely
//     owns: the portal, the viewport-aware placement, and the panel chrome.
//     `open` is required because with no trigger to listen on, nothing inside
//     Tooltip could ever open the panel.
//
// JSDoc lives on the trigger branch only — the site's props extractor unions
// the branches and takes the one documented copy (duplicating it would risk
// the two drifting, which it treats as a build error).
type TooltipModeProps =
  | {
      /** Single interactive element the panel anchors to. Cloned to receive a ref, `aria-describedby`, and the hover/focus/Escape handlers. Mutually exclusive with `anchor`. */
      children: ReactElement<TooltipTriggerProps>;
      /** DOM node to position the panel against, for callers that own their own trigger geometry and open state (e.g. the active cell of an SVG grid). Mutually exclusive with `children`, and requires a controlled `open`. The panel re-measures when this node changes identity, and on scroll/resize — the same triggers as a cloned child, so a node that moves in place without either is not tracked. */
      anchor?: undefined;
      /** Controlled visibility. In trigger mode, setting it stops hover/focus from toggling state — they only invoke `onOpenChange`. Required in anchor mode. */
      open?: boolean;
    }
  | {
      children?: undefined;
      anchor: Element | null;
      open: boolean;
    };

export type TooltipProps = TooltipBaseProps & TooltipModeProps;

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
  anchor,
  placement = "top",
  delay = 200,
  open: controlledOpen,
  onOpenChange,
  container,
  className,
  style,
  id,
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

  // A caller-supplied `id` wins and becomes the id `aria-describedby` points
  // at, so the two can never disagree. Anchor-mode callers need this: with no
  // cloned trigger, Tooltip cannot wire `aria-describedby` itself, so the
  // caller supplies an id it can reference from its own element.
  const reactId = useId();
  const panelId = id ?? `ps1ui-tooltip-${reactId}`;

  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [layout, setLayout] = useState<{
    top: number;
    left: number;
    placement: TooltipPlacement;
  } | null>(null);

  const measure = useCallback(() => {
    // Anchor mode supplies the element directly; trigger mode reads the one
    // the cloned child's ref captured. Exactly one is ever populated — the
    // type-level union rules out a Tooltip that has both.
    const target = anchor ?? triggerRef.current;
    const panel = panelRef.current;
    // `!panel` is defensive: the useLayoutEffect below only calls measure()
    // when both `mounted` (panel portaled) and `open` (portal rendered under
    // the mount gate) are true, so the panel ref is populated at every call
    // site we own. Kept for scroll/resize handlers that could still fire
    // during the transition tick after teardown removes the panel but before
    // the cleanup listener detaches — unreachable from tests without racing.
    // `!target` IS reachable: an anchor-mode caller may hold `open` true for
    // a frame while its active element is still null, and the panel then
    // stays `visibility: hidden` rather than flashing at the viewport origin.
    if (!target || !panel) return;
    const rect = target.getBoundingClientRect();
    // offsetWidth/offsetHeight (integer, layout box) instead of
    // getBoundingClientRect on the panel: the fractional sub-pixel values
    // from transformed ancestors would inject jitter into `top`/`left`,
    // and the panel is unstyled by any transform at this point anyway.
    const size = { width: panel.offsetWidth, height: panel.offsetHeight };
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    setLayout(computeLayout(rect, size, placement, viewport));
  }, [anchor, placement]);

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
    // `content` is a dependency because the panel's measured box is a function
    // of what it renders: an anchor-mode caller that swaps content while the
    // panel stays open (sweeping across grid cells) changes the panel's width,
    // and a `top`/`left` computed from the previous size would misplace it.
  }, [open, mounted, measure, content]);

  // Listener registration is kept in its own effect, deliberately NOT keyed on
  // `content` — a trigger-mode caller passing inline JSX hands us a fresh
  // reference every render, and folding that into this effect would tear down
  // and re-add the window listeners on each one.
  useLayoutEffect(() => {
    if (!open || !mounted) return;
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
  const mergedTriggerRef = useMergedRef<HTMLElement>(triggerRef, child?.props.ref);

  // Anchor mode renders no trigger at all — the caller owns that element, and
  // with it the `aria-describedby` wiring (Tooltip only guarantees the panel
  // carries `panelId`).
  let triggerElement: ReactElement | null = null;
  if (child) {
    const childDescribedBy = child.props["aria-describedby"];
    const describedBy = open
      ? childDescribedBy
        ? `${childDescribedBy} ${panelId}`
        : panelId
      : childDescribedBy;

    triggerElement = cloneElement<TooltipTriggerProps>(child, {
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
  }

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
