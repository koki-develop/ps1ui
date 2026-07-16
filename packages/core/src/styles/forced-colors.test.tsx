// Regression net for the `@media (forced-colors: active)` adjustments: the
// grouped focus rule in styles/components.css (box-shadow rings are
// force-stripped in forced-colors mode, so focus indication switches to a
// real outline) and Checkbox's indeterminate bar redraw (author backgrounds
// are force-replaced with Canvas, so the `background: currentColor` bar
// would vanish; a border survives as system ink).
//
// Forced colors is entered via Playwright's `emulateMedia({ forcedColors })`
// (a server-side browser command — see src/testing/forced-colors.ts). Support
// is engine-dependent, so the beforeEach feature-detects with matchMedia
// after enabling and skips (not passes) where emulation doesn't take effect.
// What we assert is GEOMETRY (outline style/width/offset, border widths) —
// computed colors under forced-colors are the browser's system palette, not
// ours, and asserting them would couple the test to platform theming.
//
// One file for all components on purpose: emulation is page-global and
// Browser Mode isolates state per FILE, so keeping every forced-colors test
// here guarantees no other test ever runs against an emulated page.

import "./styles.css";

import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { Button } from "../components/Button/Button";
import { Checkbox } from "../components/Checkbox/Checkbox";
import { CodeBlock } from "../components/CodeBlock/CodeBlock";
import { Input } from "../components/Input/Input";
import { disableForcedColors, enableForcedColors } from "../testing/forced-colors";
import { withPseudoState, type PseudoClass } from "../testing/pseudo-state";

// Every test in this file needs forced colors active — hoisted so a future
// test can't silently assert against a page that never entered the mode.
beforeEach(async (ctx) => {
  ctx.skip(!(await enableForcedColors()), "engine cannot emulate forced-colors");
});

afterEach(async () => {
  await disableForcedColors();
});

describe("forced-colors adjustments", () => {
  test("Checkbox indeterminate bar is border-drawn (background would be force-stripped)", async () => {
    const screen = await render(
      <Checkbox aria-label="agree" indeterminate data-testid="fc-target" />,
    );
    const s = getComputedStyle(screen.getByTestId("fc-target").element(), "::after");
    // Same 6–8px band as the normal-mode background bar: a 0-height content
    // box whose 2px top border is the visible ink, squared off.
    expect(s.borderTopWidth).toBe("2px");
    expect(s.borderTopStyle).toBe("solid");
    expect(s.height).toBe("0px");
    expect(s.width).toBe("10px");
    expect(s.borderRadius).toBe("0px");
  });

  // One case per component the grouped focus rule in styles/components.css
  // names. `webkitSkip` marks the :focus-visible cases — WebKit's
  // Full-Keyboard-Access default excludes non-text controls from Tab, so
  // :focus-visible is unreachable there (Input uses :focus and needs no skip).
  const FOCUS_CASES = [
    {
      name: "Checkbox",
      pseudo: "focus-visible",
      webkitSkip: true,
      ui: <Checkbox aria-label="agree" data-testid="fc-target" />,
    },
    {
      name: "Button",
      pseudo: "focus-visible",
      webkitSkip: true,
      ui: <Button data-testid="fc-target">Run</Button>,
    },
    {
      name: "Input",
      pseudo: "focus",
      webkitSkip: false,
      ui: <Input aria-label="name" data-testid="fc-target" />,
    },
    {
      name: "CodeBlock",
      pseudo: "focus-visible",
      webkitSkip: true,
      // Narrow wrapper + long line so the <pre> measures as scrollable and
      // keeps tabIndex=0.
      ui: (
        <div style={{ width: 120 }}>
          <CodeBlock data-testid="fc-target">
            {"const veryLongIdentifierThatDefinitelyOverflows = 1;"}
          </CodeBlock>
        </div>
      ),
    },
  ] as const satisfies ReadonlyArray<{
    name: string;
    pseudo: PseudoClass;
    webkitSkip: boolean;
    ui: ReactElement;
  }>;

  test.for(FOCUS_CASES)(
    "$name :$pseudo falls back to a real outline (box-shadow is force-stripped)",
    async ({ pseudo, webkitSkip, ui }, ctx) => {
      ctx.skip(
        webkitSkip && server.browser === "webkit",
        "WebKit's Full-Keyboard-Access default excludes non-text controls from Tab; :focus-visible unreachable",
      );
      const screen = await render(ui);
      await withPseudoState('[data-testid="fc-target"]', [pseudo], async () => {
        const s = getComputedStyle(screen.getByTestId("fc-target").element());
        expect(s.outlineStyle).toBe("solid");
        expect(s.outlineWidth).toBe("2px");
        expect(s.outlineOffset).toBe("2px");
      });
    },
  );
});
