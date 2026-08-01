// Outcome-level regression for the Switch thumb. Locks the RENDERED position
// and colour of the sliding ::after mark — not the mechanism that produces it
// — so any Switch.css edit, reset change, or upstream browser default that
// would visually break the control fails a specific assertion.
//
// The invariant worth protecting is the SYMMETRY: the thumb has to sit one
// equal gutter in from whichever end of the track it's parked at. That comes
// from three numbers agreeing (track width, thumb size, translate distance),
// and nothing but a test notices when one of them is edited alone — the
// control still renders, just with the thumb clipped or floating short.
//
// Concrete anti-scenarios this catches:
//   * Track width changed without retuning the translate → thumb overhangs
//     the border, or stops visibly short of the on-position.
//   * `.ps1ui-switch:checked::after` deleted → the thumb never moves and on
//     is indistinguishable from off for anyone who can't perceive the fill.
//   * A state's `--_switch-thumb` value dropped → the thumb turns invisible
//     against its own track (disabled-on is the tightest of the four).
//   * base.css putting pseudo elements back into `box-sizing: border-box` →
//     the forced-colors ring's 2px borders get swallowed into its 6×6 content
//     and the ring shrinks (same class of regression Checkbox's ✓ suffered).
//
// Deliberately NOT a `*.contrast.test.tsx`: axe's color-contrast rule only
// evaluates TEXT nodes and a switch renders none, so an axe-based check here
// would assert nothing. The colour pairs are compared to their tokens
// directly instead.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { Switch } from "./Switch";

const TRACK_WIDTH = 28;
const TRACK_HEIGHT = 16;
const BORDER = 1;
const THUMB_SIZE = 10;
const THUMB_INSET = 2;
const TRAVEL = 12;

/** Resolve a `--ps1ui-*` colour token to the `rgb(...)` form getComputedStyle reports. */
function tokenRgb(name: string): string {
  const hex = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`expected a 6-digit hex token for ${name}, got "${hex}"`);
  const value = Number.parseInt(match[1]!, 16);
  return `rgb(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${value & 0xff})`;
}

function switchIn(container: HTMLElement): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>("input.ps1ui-switch");
  if (!el) throw new Error("switch not found");
  return el;
}

describe("Switch thumb geometry", () => {
  test("track stays at the 28×16 canvas the thumb travel is calibrated for", async () => {
    const screen = await render(<Switch aria-label="notifications" />);
    const el = switchIn(screen.container);
    expect(el.offsetWidth).toBe(TRACK_WIDTH);
    expect(el.offsetHeight).toBe(TRACK_HEIGHT);
    expect(getComputedStyle(el).borderTopWidth).toBe(`${BORDER}px`);
  });

  test("off thumb sits one gutter in from the leading edge", async () => {
    const screen = await render(<Switch aria-label="notifications" />);
    const s = getComputedStyle(switchIn(screen.container), "::after");

    // Pseudo actually generates. `content: "none"` (rule deleted) fails here.
    expect(s.content).toBe('""');
    expect(s.position).toBe("absolute");
    expect(s.left).toBe(`${THUMB_INSET}px`);
    expect(s.top).toBe(`${THUMB_INSET}px`);
    expect(s.width).toBe(`${THUMB_SIZE}px`);
    expect(s.height).toBe(`${THUMB_SIZE}px`);
    // Resting position — no translate applied in the off state.
    expect(s.transform).toBe("none");
  });

  test("on thumb travels exactly to the mirrored gutter", async () => {
    const screen = await render(<Switch aria-label="notifications" defaultChecked />);
    const el = switchIn(screen.container);
    const track = getComputedStyle(el);
    const s = getComputedStyle(el, "::after");
    expect(s.transform).toBe(`matrix(1, 0, 0, 1, ${TRAVEL}, 0)`);

    // The symmetry itself, measured off the rendered boxes rather than
    // restated from the constants above: absolute offsets resolve against the
    // track's PADDING box (inset by the border on each side), so the gutter
    // left behind after travelling must equal the one the thumb started at.
    const paddingBoxWidth =
      el.offsetWidth -
      Number.parseFloat(track.borderLeftWidth) -
      Number.parseFloat(track.borderRightWidth);
    const leadingGutter = Number.parseFloat(s.left);
    const travel = new DOMMatrix(s.transform).m41;
    const trailingGutter = paddingBoxWidth - (leadingGutter + travel + Number.parseFloat(s.width));
    expect(trailingGutter).toBe(leadingGutter);
  });

  test.for([
    { name: "off", props: {}, token: "--ps1ui-color-fg-muted" },
    { name: "on", props: { defaultChecked: true }, token: "--ps1ui-color-primary-fg" },
    { name: "disabled", props: { disabled: true }, token: "--ps1ui-color-fg-subtle" },
    {
      name: "disabled + on",
      props: { disabled: true, defaultChecked: true },
      token: "--ps1ui-color-fg-subtle",
    },
  ])("$name thumb is painted in $token", async ({ props, token }) => {
    const screen = await render(<Switch aria-label="notifications" {...props} />);
    const s = getComputedStyle(switchIn(screen.container), "::after");
    expect(s.backgroundColor).toBe(tokenRgb(token));
  });

  test("thumb inherits the pseudo-element initial box-sizing (content-box)", async () => {
    // Locks the "reset does not put pseudos into border-box" invariant from
    // base.css. It is load-bearing for the forced-colors ring, whose 6×6
    // content plus 2px borders is what keeps its outer box at the same 10px
    // the filled thumb occupies — and therefore keeps the 12px travel correct
    // in a mode where thumb POSITION is the only surviving on/off signal.
    const screen = await render(<Switch aria-label="notifications" />);
    expect(getComputedStyle(switchIn(screen.container), "::after").boxSizing).toBe("content-box");
  });
});
