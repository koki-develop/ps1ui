// The five-step --ps1ui-contribution-l0..l4 ramp must read as monotonically
// increasing activity: each level's rendered color has to be strictly more
// "intense" (relative luminance strictly further from the ramp's low end)
// than the previous one. l0 deliberately uses a different source per theme
// (see tokens.css's ramp comment): in light theme --ps1ui-color-border
// (Y≈0.673) is darker than l1 (Y≈0.688), so l0 gets its own lighter gray
// instead, keeping luminance strictly descending l0→l4; in dark theme l0
// stays --ps1ui-color-border, already darker than l1, so luminance strictly
// ascends l0→l4 there.
//
// This file — rather than ContributionGraph.test.tsx — because none of that
// file's describe axes (rendering / layout math / month labels / weekday
// labels / legend / passthrough / grid semantics / interaction / keyboard
// navigation / a11y) fit a token-luminance assertion; it doesn't render the
// component at all.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { resolveColorTokenIn } from "../../testing/color";
import { THEMES } from "../../testing/theme";

const LEVELS = ["l0", "l1", "l2", "l3", "l4"] as const;

// WCAG relative luminance (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance)
// from a computed-style color string. A `color-mix()` result (the l1–l3
// tokens) computes to `color(srgb r g b)` — components already 0–1 — rather
// than `rgb(r, g, b)` — components 0–255 — that a plain hex/`light-dark()`
// token (l0, l4) computes to. Both are handled, normalized to 0–1 either way.
function relativeLuminance(colorString: string): number {
  const rgbMatch = colorString.match(/^rgba?\(([^)]+)\)$/);
  const srgbMatch = colorString.match(/^color\(srgb ([^)]+)\)$/);
  let r: number;
  let g: number;
  let b: number;
  if (rgbMatch) {
    const parts = rgbMatch[1]!.split(",").map((n) => Number.parseFloat(n.trim()));
    [r, g, b] = [parts[0]! / 255, parts[1]! / 255, parts[2]! / 255];
  } else if (srgbMatch) {
    const parts = srgbMatch[1]!
      .trim()
      .split(/\s+/)
      .map((n) => Number.parseFloat(n));
    [r, g, b] = [parts[0]!, parts[1]!, parts[2]!];
  } else {
    throw new Error(`Unrecognized color format: ${colorString}`);
  }
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

describe("ContributionGraph ramp", () => {
  test.for(THEMES.map((theme) => ({ theme })))(
    "theme=$theme: l0..l4 luminance is strictly monotonic",
    async ({ theme }) => {
      const container = document.createElement("div");
      container.setAttribute("data-ps1ui-theme", theme);
      document.body.appendChild(container);
      try {
        const luminances = LEVELS.map((level) =>
          relativeLuminance(resolveColorTokenIn(container, `--ps1ui-contribution-${level}`)),
        );

        if (theme === "light") {
          // Light theme: the ramp gets progressively darker as activity rises
          // (the empty cell is closest to the page's light canvas; full
          // intensity is the primary hue's own, darker-than-canvas, value).
          for (let i = 1; i < luminances.length; i++) {
            expect(luminances[i]!).toBeLessThan(luminances[i - 1]!);
          }
        } else {
          // Dark theme: the ramp gets progressively lighter (the primary
          // hue's dark-theme value is brighter than the dark canvas/border).
          for (let i = 1; i < luminances.length; i++) {
            expect(luminances[i]!).toBeGreaterThan(luminances[i - 1]!);
          }
        }
      } finally {
        container.remove();
      }
    },
  );
});
