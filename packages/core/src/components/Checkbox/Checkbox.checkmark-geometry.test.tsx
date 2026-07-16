// Outcome-level regression for the Checkbox checkmark. Locks the RENDERED
// GEOMETRY of the rotated-L ✓ — not the fix mechanism — so any reset change,
// Checkbox.css edit, or upstream browser default that would visually break
// the tick fails a specific assertion.
//
// Deliberately NOT a `*.contrast.test.tsx` (it used to be misnamed as one):
// axe's color-contrast rule only evaluates TEXT nodes, and a checkbox renders
// no text — an axe-based contrast test here would assert nothing. The checked
// state's fg/bg pair (--ps1ui-color-primary-fg on --ps1ui-color-primary) is
// the same pair Button's primary variant uses, already verified with real
// text by Button.contrast.test.tsx.
//
// Concrete anti-scenarios this test catches:
//   * base.css puts pseudo elements back into `box-sizing: border-box` →
//     the 2px right/bottom borders get swallowed into the 4×8 content and
//     the tick shrinks to a corner (the July 2026 regression).
//   * Someone deletes the `.ps1ui-checkbox:checked::after` rule entirely →
//     `content` resolves to `none`, pseudo doesn't generate.
//   * Someone tweaks `width`/`height`/`border-width`/`top`/`left`/`transform`
//     to a value that no longer paints as a centered ✓.
//   * A future width/height/padding change on `.ps1ui-checkbox` breaks the
//     16×16 checkbox baseline the L geometry is calibrated against.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { Checkbox } from "./Checkbox";

describe("Checkbox checkmark geometry", () => {
  test("checkbox stays at the 16×16 canvas the L geometry is calibrated for", async () => {
    const screen = await render(<Checkbox aria-label="agree" />);
    const cb = screen.container.querySelector<HTMLInputElement>("input.ps1ui-checkbox");
    if (!cb) throw new Error("checkbox not found");
    expect(cb.offsetWidth).toBe(16);
    expect(cb.offsetHeight).toBe(16);
  });

  test("checked ::after paints as a rotated-L ✓ with the exact declared geometry", async () => {
    const screen = await render(<Checkbox aria-label="agree" defaultChecked />);
    const cb = screen.container.querySelector<HTMLInputElement>("input.ps1ui-checkbox");
    if (!cb) throw new Error("checkbox not found");
    const s = getComputedStyle(cb, "::after");

    // Pseudo actually generates. `content: "none"` (rule deleted) fails here.
    expect(s.content).toBe('""');

    // Positioning inside the 16×16 checkbox.
    expect(s.position).toBe("absolute");
    expect(s.left).toBe("4px");
    expect(s.top).toBe("1px");

    // Declared box (content-box; borders extend OUTSIDE these dimensions).
    expect(s.width).toBe("4px");
    expect(s.height).toBe("8px");

    // Right + bottom border draw the rotated L. Top + left must stay zero.
    expect(s.borderTopWidth).toBe("0px");
    expect(s.borderRightWidth).toBe("2px");
    expect(s.borderBottomWidth).toBe("2px");
    expect(s.borderLeftWidth).toBe("0px");
    expect(s.borderRightStyle).toBe("solid");
    expect(s.borderBottomStyle).toBe("solid");

    // 45° rotation is what turns the L into a ✓.
    expect(s.transform).toMatch(/matrix\(0\.7071/);
  });

  test("checked ::after inherits the pseudo-element initial box-sizing (content-box) so borders extend beyond width/height", async () => {
    // This locks in the "reset does not put pseudos into border-box" invariant
    // from base.css. If a future edit re-adds ::before/::after to the universal
    // `box-sizing: border-box` block, this test fires before the borders can
    // silently shrink the ✓ (per the previous test) — a second-line defense so
    // the failure mode is diagnosed as "reset regressed" rather than "geometry
    // drifted".
    const screen = await render(<Checkbox aria-label="agree" defaultChecked />);
    const cb = screen.container.querySelector<HTMLInputElement>("input.ps1ui-checkbox");
    if (!cb) throw new Error("checkbox not found");
    expect(getComputedStyle(cb, "::after").boxSizing).toBe("content-box");
  });
});
