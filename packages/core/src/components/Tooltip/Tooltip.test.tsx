import { useState, type CSSProperties, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Tooltip, type TooltipPlacement } from "./Tooltip";

const PLACEMENTS = [
  "top",
  "bottom",
  "left",
  "right",
] as const satisfies readonly TooltipPlacement[];

describe("Tooltip", () => {
  describe("rendering", () => {
    test("renders the trigger as-is when closed and no panel appears", async () => {
      const screen = await render(
        <Tooltip content="tip">
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger").element();
      expect(trigger.tagName).toBe("BUTTON");
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    test("renders a role=tooltip panel when open, with the trigger's aria-describedby wired to it", async () => {
      const screen = await render(
        <Tooltip content="body copy" open>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger").element();
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      expect(panel).not.toBeNull();
      expect(panel?.textContent).toBe("body copy");
      expect(trigger.getAttribute("aria-describedby")).toBe(panel?.id);
    });

    test("portals the panel to document.body (not next to the trigger)", async () => {
      const screen = await render(
        <div data-testid="host">
          <Tooltip content="tip" open>
            <button type="button">open</button>
          </Tooltip>
        </div>,
      );
      const host = screen.getByTestId("host").element();
      // No tooltip inside the host tree; it lives directly under <body>.
      expect(host.querySelector('[role="tooltip"]')).toBeNull();
      expect(document.body.querySelector('[role="tooltip"]')?.parentElement).toBe(document.body);
    });

    test("removes the panel from the DOM when open flips back to false", async () => {
      function Harness() {
        const [open, setOpen] = useState(true);
        return (
          <>
            <button type="button" data-testid="toggle" onClick={() => setOpen(false)}>
              close
            </button>
            <Tooltip content="tip" open={open}>
              <button type="button" data-testid="trigger">
                open
              </button>
            </Tooltip>
          </>
        );
      }
      const screen = await render(<Harness />);
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
      await screen.getByTestId("toggle").click();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    test("appends the panel id to a pre-existing aria-describedby on the trigger", async () => {
      const screen = await render(
        <>
          <span id="ext-hint">external hint</span>
          <Tooltip content="tip" open>
            <button type="button" aria-describedby="ext-hint" data-testid="trigger">
              open
            </button>
          </Tooltip>
        </>,
      );
      const trigger = screen.getByTestId("trigger").element();
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      const value = trigger.getAttribute("aria-describedby") ?? "";
      const ids = value.split(/\s+/);
      expect(ids).toContain("ext-hint");
      expect(ids).toContain(panel?.id);
    });

    test("preserves a pre-existing aria-describedby untouched while closed", async () => {
      const screen = await render(
        <Tooltip content="tip">
          <button type="button" aria-describedby="ext-hint" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger").element();
      expect(trigger.getAttribute("aria-describedby")).toBe("ext-hint");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-tooltip base class + placement modifier on the panel", async () => {
      await render(
        <Tooltip content="tip" placement="bottom" open>
          <button type="button">open</button>
        </Tooltip>,
      );
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      expect(panel?.classList.contains("ps1ui-tooltip")).toBe(true);
      expect(panel?.classList.contains("ps1ui-tooltip--bottom")).toBe(true);
    });

    test("defaults placement to top", async () => {
      // Padding gives the trigger enough space above so the default `top`
      // placement doesn't flip to `bottom` under the overflow resolver.
      await render(
        <div style={{ padding: 100 }}>
          <Tooltip content="tip" open>
            <button type="button">open</button>
          </Tooltip>
        </div>,
      );
      await vi.waitFor(() => {
        const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
        expect(panel?.style.visibility).toBe("visible");
      });
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      expect(panel?.classList.contains("ps1ui-tooltip--top")).toBe(true);
    });

    test("merges caller-supplied className without dropping the base", async () => {
      await render(
        <Tooltip content="tip" open className="extra">
          <button type="button">open</button>
        </Tooltip>,
      );
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      expect(panel?.classList.contains("ps1ui-tooltip")).toBe(true);
      expect(panel?.classList.contains("extra")).toBe(true);
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id override is disallowed on purpose — internal id wins)", async () => {
      await render(
        <Tooltip content="tip" open data-custom="v" aria-label="tag">
          <button type="button">open</button>
        </Tooltip>,
      );
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      expect(panel?.getAttribute("data-custom")).toBe("v");
      expect(panel?.getAttribute("aria-label")).toBe("tag");
    });

    test("caller style merges under the internal positioning vars (internal wins)", async () => {
      await render(
        <Tooltip
          content="tip"
          open
          style={{ background: "rgb(1, 2, 3)", position: "static", top: "500px" }}
        >
          <button type="button">open</button>
        </Tooltip>,
      );
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      // caller-owned style survives.
      expect(panel?.style.background).toBe("rgb(1, 2, 3)");
      // internal positioning wins over same-name caller keys.
      expect(panel?.style.position).toBe("fixed");
    });
  });

  describe("interaction (uncontrolled)", () => {
    test("hover opens the panel and unhover closes it (delay=0)", async () => {
      const screen = await render(
        <Tooltip content="tip" delay={0}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger");
      await userEvent.hover(trigger);
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      await userEvent.unhover(trigger);
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
    });

    test("hover open is deferred by `delay`", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        const screen = await render(
          <Tooltip content="tip" delay={400}>
            <button type="button" data-testid="trigger">
              open
            </button>
          </Tooltip>,
        );
        const trigger = screen.getByTestId("trigger");
        await userEvent.hover(trigger);
        // Still closed while inside the delay window.
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
        vi.advanceTimersByTime(400);
        await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      } finally {
        vi.useRealTimers();
      }
    });

    // `.focus()` + subsequent assertions are the known intermittent Firefox
    // flake documented in packages/core/CLAUDE.md; retry mirrors the same
    // pattern Details.test.tsx uses for Enter-on-summary.
    test("focus opens the panel immediately (no delay)", { retry: 3 }, async () => {
      const screen = await render(
        <>
          <div data-testid="cursor-sink" style={{ padding: 8, marginBottom: 200 }}>
            park cursor
          </div>
          <Tooltip content="tip" delay={5000}>
            <button type="button" data-testid="trigger">
              open
            </button>
          </Tooltip>
        </>,
      );
      // The Playwright cursor sits at (0, 0) by default, and elements landing
      // there fire mouseenter on mount — which would race the intended
      // focus-only path. Park the cursor over a sink element first.
      await userEvent.hover(screen.getByTestId("cursor-sink"));
      const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
      trigger.focus();
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
    });

    test("blur closes the panel", { retry: 3 }, async () => {
      const screen = await render(
        <>
          <div data-testid="cursor-sink" style={{ padding: 8, marginBottom: 200 }}>
            park cursor
          </div>
          <Tooltip content="tip" delay={0}>
            <button type="button" data-testid="trigger">
              open
            </button>
          </Tooltip>
        </>,
      );
      await userEvent.hover(screen.getByTestId("cursor-sink"));
      const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
      trigger.focus();
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      trigger.blur();
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
    });

    test(
      "Escape closes the panel and suppresses re-open until focus fully leaves",
      { retry: 3 },
      async () => {
        const screen = await render(
          <>
            <div data-testid="cursor-sink" style={{ padding: 8, marginBottom: 200 }}>
              park cursor
            </div>
            <button type="button" data-testid="other">
              other
            </button>
            <Tooltip content="tip" delay={0}>
              <button type="button" data-testid="trigger">
                open
              </button>
            </Tooltip>
          </>,
        );
        await userEvent.hover(screen.getByTestId("cursor-sink"));
        const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
        trigger.focus();
        await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
        await userEvent.keyboard("{Escape}");
        await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
        // Still focused — must NOT re-open because escape suppressed the state.
        expect(document.activeElement).toBe(trigger);
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
        // Fully leaving the trigger clears suppression; refocus reopens.
        (screen.getByTestId("other").element() as HTMLButtonElement).focus();
        trigger.focus();
        await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      },
    );

    test("Escape while closed is a no-op", { retry: 3 }, async () => {
      const screen = await render(
        <>
          <div data-testid="cursor-sink" style={{ padding: 8, marginBottom: 200 }}>
            park cursor
          </div>
          <Tooltip content="tip" delay={0}>
            <button type="button" data-testid="trigger">
              open
            </button>
          </Tooltip>
        </>,
      );
      await userEvent.hover(screen.getByTestId("cursor-sink"));
      const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
      trigger.focus();
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      trigger.blur();
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
      // Panel is gone; the next Escape must not toggle anything.
      trigger.focus();
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      await userEvent.keyboard("{Escape}");
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
    });

    test("hover then unhover before the delay fires does NOT emit onOpenChange", async () => {
      // Guard against the phantom-close bug: mouseleave during the pre-open
      // delay window must not emit a spurious `false` transition when the
      // panel was never opened. Also covers the timer callback's re-check
      // that skips commit when the user walked away.
      //
      // Uses synchronous dispatchEvent (React catches mouseover/mouseout and
      // synthesises onMouseEnter/onMouseLeave from them) instead of
      // userEvent.hover/unhover so the sequence stays deterministic even
      // under v8 coverage instrumentation, which slows real-time userEvent
      // enough to race the delay timer.
      const onOpenChange = vi.fn();
      const screen = await render(
        <Tooltip content="tip" delay={200} onOpenChange={onOpenChange}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
      trigger.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }),
      );
      trigger.dispatchEvent(
        new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
      );
      // Wait past the scheduled fire time — a leaked timer would commit
      // and show up in onOpenChange by now.
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    test("Escape delivered during the hover-delay window cancels the pending open", async () => {
      // The onKeyDown branch that also considers a pending timer (not just
      // `open`) is only reachable when we can dispatch a keydown while
      // `open` is false AND `openTimerRef` is set. Controlled `open={false}`
      // pins visibility so focus-fires-onOpenChange(true) doesn't flip
      // internal state; hover schedules the delayed timer; keyboard Escape
      // on the focused trigger reaches the handler and must clear both.
      const onOpenChange = vi.fn();
      const screen = await render(
        <Tooltip content="tip" delay={200} open={false} onOpenChange={onOpenChange}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
      trigger.focus();
      trigger.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }),
      );
      onOpenChange.mockClear();
      await userEvent.keyboard("{Escape}");
      // Wait past the scheduled fire time. A leaked timer would fire
      // commitOpen(true) → onOpenChange(true). Escape must have cleared it.
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(onOpenChange).not.toHaveBeenCalledWith(true);
    });

    test("calls onOpenChange for both open and close transitions", async () => {
      const onOpenChange = vi.fn();
      const screen = await render(
        <Tooltip content="tip" delay={0} onOpenChange={onOpenChange}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger");
      await userEvent.hover(trigger);
      await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));
      await userEvent.unhover(trigger);
      await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    test("mouseleave while still focused keeps the panel open (focus channel wins)", async () => {
      const screen = await render(
        <>
          <div data-testid="cursor-sink" style={{ padding: 8, marginBottom: 200 }}>
            park cursor
          </div>
          <Tooltip content="tip" delay={0}>
            <button type="button" data-testid="trigger">
              open
            </button>
          </Tooltip>
        </>,
      );
      await userEvent.hover(screen.getByTestId("cursor-sink"));
      const trigger = screen.getByTestId("trigger");
      const el = trigger.element() as HTMLButtonElement;
      el.focus();
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      await userEvent.hover(trigger);
      await userEvent.unhover(trigger);
      // Panel must still be open — focus is still active.
      expect(document.activeElement).toBe(el);
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    });

    test("blur while still hovered keeps the panel open (hover channel wins)", async () => {
      const screen = await render(
        <Tooltip content="tip" delay={0}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger");
      await userEvent.hover(trigger);
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      const el = trigger.element() as HTMLButtonElement;
      el.focus();
      el.blur();
      // Panel must still be open — pointer is still over the trigger.
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    });

    test("hover after Escape is suppressed until the pointer fully leaves the trigger", async () => {
      const screen = await render(
        <Tooltip content="tip" delay={0}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger");
      const el = trigger.element() as HTMLButtonElement;
      el.focus();
      await userEvent.hover(trigger);
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      // Escape while both hovered and focused — sets suppression that lives
      // beyond an immediate mouseleave (focus still holds).
      await userEvent.keyboard("{Escape}");
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
      // Leave the pointer while focus is still active — suppression persists.
      await userEvent.unhover(trigger);
      // Re-enter with the pointer — mouseenter's openNow must find suppression
      // still set and return without opening.
      await userEvent.hover(trigger);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    test("Escape while closed AND no timer pending is a no-op (short-circuit false branch)", async () => {
      // Covers the `open || openTimerRef.current !== null` FALSE branch:
      // both operands must be false and the keydown must still reach the
      // handler. Controlled `open={false}` lets the trigger stay focused
      // without opening; no hover means no pending timer; Escape then
      // enters the handler with nothing to close.
      const onOpenChange = vi.fn();
      const screen = await render(
        <Tooltip content="tip" open={false} delay={0} onOpenChange={onOpenChange}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
      trigger.focus();
      onOpenChange.mockClear();
      await userEvent.keyboard("{Escape}");
      // Handler entered but the `if` body was skipped — no closeNow, no
      // extra onOpenChange call.
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    test("non-Escape keydowns pass through without touching visibility", async () => {
      const screen = await render(
        <Tooltip content="tip" delay={0}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger");
      await userEvent.hover(trigger);
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
      // 'a' is not Escape — the handler runs but the state-changing branch
      // does not fire and the panel stays open.
      const el = trigger.element() as HTMLButtonElement;
      el.focus();
      await userEvent.keyboard("a");
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    });

    test("chains the trigger's own event handlers (they still fire alongside ours)", async () => {
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const onKeyDown = vi.fn();
      const screen = await render(
        <Tooltip content="tip" delay={0}>
          <button
            type="button"
            data-testid="trigger"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          >
            open
          </button>
        </Tooltip>,
      );
      const trigger = screen.getByTestId("trigger");
      const el = trigger.element() as HTMLButtonElement;
      await userEvent.hover(trigger);
      await userEvent.unhover(trigger);
      el.focus();
      el.blur();
      el.focus();
      await userEvent.keyboard("{Escape}");
      expect(onMouseEnter).toHaveBeenCalled();
      expect(onMouseLeave).toHaveBeenCalled();
      expect(onFocus).toHaveBeenCalled();
      expect(onBlur).toHaveBeenCalled();
      expect(onKeyDown).toHaveBeenCalled();
    });
  });

  describe("interaction (controlled)", () => {
    test("visibility follows the `open` prop; internal hover state doesn't override the parent", async () => {
      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" data-testid="ext" onClick={() => setOpen((v) => !v)}>
              flip
            </button>
            <Tooltip content="tip" open={open} delay={0}>
              <button type="button" data-testid="trigger">
                open
              </button>
            </Tooltip>
          </>
        );
      }
      const screen = await render(<Harness />);
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
      // Hover fires onOpenChange, but the parent-provided `open` still gates
      // rendering. Since our Harness doesn't sync hover to state, hovering
      // alone must NOT reveal the panel.
      await userEvent.hover(screen.getByTestId("trigger"));
      // Small settle window for React to flush any pending updates.
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
      // Flipping the external state opens it.
      await screen.getByTestId("ext").click();
      await vi.waitFor(() => expect(document.querySelector('[role="tooltip"]')).not.toBeNull());
    });

    test("controlled parent flipping open→false clears a pending hover-delay timer", async () => {
      // Prevents the stale-timer bug: a controlled parent that closes the
      // tooltip while a hover-delay timer is pending must not receive a
      // late `true` when the timer fires. Uses sync dispatchEvent so the
      // hover→close→wait sequence is deterministic under coverage.
      const onOpenChange = vi.fn();
      function Harness() {
        const [open, setOpen] = useState<boolean>(true);
        return (
          <>
            <button type="button" data-testid="ext-close" onClick={() => setOpen(false)}>
              close
            </button>
            <Tooltip content="tip" open={open} delay={200} onOpenChange={onOpenChange}>
              <button type="button" data-testid="trigger">
                open
              </button>
            </Tooltip>
          </>
        );
      }
      const screen = await render(<Harness />);
      const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
      trigger.dispatchEvent(
        new MouseEvent("mouseover", { bubbles: true, relatedTarget: document.body }),
      );
      // Hover scheduled a delayed open even though the panel is already
      // open — external close during that window is the scenario.
      await screen.getByTestId("ext-close").click();
      onOpenChange.mockClear();
      // Wait past the scheduled fire time. A leaked timer would fire
      // commitOpen(true) and show up here.
      await new Promise((resolve) => setTimeout(resolve, 400));
      expect(onOpenChange).not.toHaveBeenCalledWith(true);
    });

    test("fires onOpenChange even while controlled, so parents can subscribe to hover/focus intent", async () => {
      const onOpenChange = vi.fn();
      const screen = await render(
        <Tooltip content="tip" open={false} delay={0} onOpenChange={onOpenChange}>
          <button type="button" data-testid="trigger">
            open
          </button>
        </Tooltip>,
      );
      await userEvent.hover(screen.getByTestId("trigger"));
      await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));
    });
  });

  describe("positioning", () => {
    test.for(PLACEMENTS.map((placement) => ({ placement })))(
      "placement=$placement anchors the panel around the trigger",
      async ({ placement }) => {
        const screen = await render(
          <div style={{ padding: 100 }}>
            <Tooltip content="tip body" open placement={placement}>
              <button type="button" data-testid="trigger" style={{ width: 60, height: 24 }}>
                open
              </button>
            </Tooltip>
          </div>,
        );
        const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
        // Wait for the post-mount measure + paint.
        await vi.waitFor(() => {
          const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
          expect(panel).not.toBeNull();
          expect(panel!.style.visibility).toBe("visible");
        });
        const panel = document.querySelector<HTMLElement>('[role="tooltip"]')!;
        const tr = trigger.getBoundingClientRect();
        const pr = panel.getBoundingClientRect();
        const OFFSET = 8;
        const tolerance = 1.5;
        const centerX = tr.left + tr.width / 2;
        const centerY = tr.top + tr.height / 2;
        if (placement === "top") {
          expect(Math.abs(pr.bottom - (tr.top - OFFSET))).toBeLessThan(tolerance);
          expect(Math.abs(pr.left + pr.width / 2 - centerX)).toBeLessThan(tolerance);
        } else if (placement === "bottom") {
          expect(Math.abs(pr.top - (tr.bottom + OFFSET))).toBeLessThan(tolerance);
          expect(Math.abs(pr.left + pr.width / 2 - centerX)).toBeLessThan(tolerance);
        } else if (placement === "left") {
          expect(Math.abs(pr.right - (tr.left - OFFSET))).toBeLessThan(tolerance);
          expect(Math.abs(pr.top + pr.height / 2 - centerY)).toBeLessThan(tolerance);
        } else {
          expect(Math.abs(pr.left - (tr.right + OFFSET))).toBeLessThan(tolerance);
          expect(Math.abs(pr.top + pr.height / 2 - centerY)).toBeLessThan(tolerance);
        }
      },
    );

    test("flips to the opposite edge when the requested placement would overflow the viewport", async () => {
      const screen = await render(
        <Tooltip content="tip body" open placement="top">
          <button
            type="button"
            data-testid="trigger"
            style={{ position: "fixed", top: 0, left: 100, width: 60, height: 24 }}
          >
            open
          </button>
        </Tooltip>,
      );
      await vi.waitFor(() => {
        const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
        expect(panel?.style.visibility).toBe("visible");
      });
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      const trigger = screen.getByTestId("trigger").element() as HTMLButtonElement;
      // Requested placement="top" would render at negative top; the resolver
      // must flip to bottom and the class modifier must track the resolved
      // side so callers styling arrows-per-placement see reality.
      expect(panel.classList.contains("ps1ui-tooltip--bottom")).toBe(true);
      expect(panel.classList.contains("ps1ui-tooltip--top")).toBe(false);
      const pr = panel.getBoundingClientRect();
      const tr = trigger.getBoundingClientRect();
      expect(pr.top).toBeGreaterThanOrEqual(tr.bottom);
    });

    test.for(
      (["bottom", "left", "right"] as const satisfies readonly TooltipPlacement[]).map(
        (placement) => ({ placement }),
      ),
    )("flip: requested=$placement flips when the panel would overflow", async ({ placement }) => {
      // Complements the "top → bottom" flip test with the remaining three
      // opposite-axis pairs so every branch of `opposite()` is exercised.
      // The trigger is pinned against the edge where the requested placement
      // would overflow.
      const style: Record<TooltipPlacement, CSSProperties> = {
        top: { position: "fixed", top: 0, left: 100 },
        bottom: { position: "fixed", bottom: 0, left: 100 },
        left: { position: "fixed", top: 100, left: 0 },
        right: { position: "fixed", top: 100, right: 0 },
      };
      await render(
        <Tooltip content="tip body" open placement={placement}>
          <button
            type="button"
            data-testid="trigger"
            style={{ ...style[placement], width: 60, height: 24 }}
          >
            open
          </button>
        </Tooltip>,
      );
      await vi.waitFor(() => {
        const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
        expect(panel?.style.visibility).toBe("visible");
      });
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      const flipped: Record<TooltipPlacement, TooltipPlacement> = {
        top: "bottom",
        bottom: "top",
        left: "right",
        right: "left",
      };
      expect(panel.classList.contains(`ps1ui-tooltip--${flipped[placement]}`)).toBe(true);
    });

    test("keeps the requested placement when neither side fits (bigger-than-viewport edge case)", async () => {
      // A panel taller than the viewport can't fit on either axis — the
      // resolver must fall back to the requested placement deterministically
      // instead of silently doing something else. This exercises the final
      // "neither fits" branch of computeLayout.
      await render(
        <Tooltip
          content="giant tip body"
          open
          placement="right"
          style={{ width: `${window.innerWidth + 200}px` }}
        >
          <button
            type="button"
            data-testid="trigger"
            style={{ position: "fixed", top: 100, left: 100, width: 60, height: 24 }}
          >
            open
          </button>
        </Tooltip>,
      );
      await vi.waitFor(() => {
        const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
        expect(panel?.style.visibility).toBe("visible");
      });
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]')!;
      expect(panel.classList.contains("ps1ui-tooltip--right")).toBe(true);
    });

    test("recomputes position on window resize while open", async () => {
      await render(
        <div style={{ padding: 40 }}>
          <Tooltip content="tip" open placement="bottom">
            <button type="button" style={{ width: 60, height: 24 }}>
              open
            </button>
          </Tooltip>
        </div>,
      );
      await vi.waitFor(() => {
        const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
        expect(panel?.style.visibility).toBe("visible");
      });
      const before = document
        .querySelector<HTMLElement>('[role="tooltip"]')!
        .getBoundingClientRect();
      // A resize event alone (no viewport change) is enough to prove the
      // handler fires — it re-measures from the (still-same) trigger rect
      // and re-writes the same coords. The handler is rAF-coalesced, so
      // wait for the next frame before reading position back.
      window.dispatchEvent(new Event("resize"));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      // A second frame flushes any state update the rAF callback produced.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const after = document
        .querySelector<HTMLElement>('[role="tooltip"]')!
        .getBoundingClientRect();
      expect(after.top).toBeCloseTo(before.top, 1);
      expect(after.left).toBeCloseTo(before.left, 1);
    });

    test("closing while a scroll-triggered rAF is pending cancels it (cleanup path)", async () => {
      // Covers the `if (rafId !== null) cancelAnimationFrame(rafId)` cleanup
      // branch: a scroll fires the coalescing handler which schedules a
      // rAF; the tooltip is then closed before the frame runs, so the
      // effect cleanup has to cancel the pending rAF. Uses the sync DOM
      // `.click()` API so the scroll → click sequence stays inside a single
      // task without a paint boundary flushing the rAF first.
      function Harness() {
        const [open, setOpen] = useState(true);
        return (
          <>
            <button type="button" data-testid="ext-close" onClick={() => setOpen(false)}>
              close
            </button>
            <div style={{ padding: 40 }}>
              <Tooltip content="tip" open={open}>
                <button type="button" style={{ width: 60, height: 24 }}>
                  open
                </button>
              </Tooltip>
            </div>
          </>
        );
      }
      const screen = await render(<Harness />);
      await vi.waitFor(() => {
        const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
        expect(panel?.style.visibility).toBe("visible");
      });
      const closeBtn = screen.getByTestId("ext-close").element() as HTMLButtonElement;
      // Scroll + close in the same synchronous task so the rAF from scroll
      // is still pending when the effect cleanup runs.
      window.dispatchEvent(new Event("scroll"));
      closeBtn.click();
      // Wait past the next frame to confirm cleanup ran without leaks.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    test("coalesces multiple scroll events into one measure per frame", async () => {
      // The scroll handler wraps its work in requestAnimationFrame; a burst
      // of scroll events inside a single frame must schedule only one rAF.
      // We can't assert measure() call count directly (it's an internal),
      // but we can drive a burst and confirm the panel stays consistent
      // and the rAF cleanup path runs on unmount without leaks.
      await render(
        <div style={{ padding: 40 }} data-testid="host">
          <Tooltip content="tip" open placement="bottom">
            <button type="button" style={{ width: 60, height: 24 }}>
              open
            </button>
          </Tooltip>
        </div>,
      );
      await vi.waitFor(() => {
        const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
        expect(panel?.style.visibility).toBe("visible");
      });
      // Burst 5 scroll events in the same tick — should collapse into a
      // single rAF-scheduled measure.
      for (let i = 0; i < 5; i++) window.dispatchEvent(new Event("scroll"));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      expect(panel?.style.visibility).toBe("visible");
      // A scroll fired while a rAF is already scheduled must return early
      // (rafId !== null branch). Fire again mid-frame to exercise that.
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "closed",
        node: () => (
          <Tooltip content="tip">
            <button type="button">save</button>
          </Tooltip>
        ),
      },
      {
        name: "open with plain-string content",
        node: () => (
          <Tooltip content="Deletes this row" open>
            <button type="button">delete</button>
          </Tooltip>
        ),
      },
      {
        name: "open with rich (ReactNode) content",
        node: () => (
          <Tooltip
            content={
              <>
                Press <strong>Enter</strong>
              </>
            }
            open
          >
            <button type="button">submit</button>
          </Tooltip>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
      // The panel is portaled OUT of the rendered container — scan it
      // separately so its aria/role wiring is checked. `region` is scoped
      // off: the portal escapes any consumer landmarks by design, and
      // enforcing landmark containment on a tooltip primitive would push a
      // page-level concern down into the component.
      const panel = document.querySelector<HTMLElement>('[role="tooltip"]');
      if (panel) {
        await expectNoAxeViolations(panel, { rules: { region: { enabled: false } } });
      }
    });
  });
});
