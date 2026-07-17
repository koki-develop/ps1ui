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
import { Details } from "../components/Details/Details";
import { Input } from "../components/Input/Input";
import { Table } from "../components/Table/Table";
import { Tbody } from "../components/Tbody/Tbody";
import { Td } from "../components/Td/Td";
import { Tr } from "../components/Tr/Tr";
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
  // `selector` (optional) overrides the pseudo-state + assertion target when
  // the focusable element is nested inside the rendered fixture — e.g.
  // Details, whose focus lives on the internal <summary>, not on the outer
  // <details> element the fixture attaches data-testid to.
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
    {
      name: "Details (summary)",
      pseudo: "focus-visible",
      webkitSkip: true,
      selector: ".ps1ui-details__summary",
      ui: (
        <Details summary="Components" data-testid="fc-target">
          body
        </Details>
      ),
    },
    {
      name: "Table (scroller)",
      pseudo: "focus-visible",
      webkitSkip: true,
      // Focus lives on the internal scroll wrapper, not the <table> the
      // fixture's data-testid lands on. Narrow wrapper + an unbreakable cell
      // so the table measures as scrollable and the scroller keeps tabIndex=0.
      selector: ".ps1ui-table__scroller",
      ui: (
        <div style={{ width: 120 }}>
          <Table data-testid="fc-target">
            <Tbody>
              <Tr>
                <Td>{"veryLongUnbreakableCellContentThatDefinitelyOverflows"}</Td>
              </Tr>
            </Tbody>
          </Table>
        </div>
      ),
    },
  ] as const satisfies ReadonlyArray<{
    name: string;
    pseudo: PseudoClass;
    webkitSkip: boolean;
    selector?: string;
    ui: ReactElement;
  }>;

  type FocusCase = (typeof FOCUS_CASES)[number] & { selector?: string };

  test.for(FOCUS_CASES as readonly FocusCase[])(
    "$name :$pseudo falls back to a real outline (box-shadow is force-stripped)",
    async ({ pseudo, webkitSkip, selector, ui }, ctx) => {
      ctx.skip(
        webkitSkip && server.browser === "webkit",
        "WebKit's Full-Keyboard-Access default excludes non-text controls from Tab; :focus-visible unreachable",
      );
      await render(ui);
      const target = selector ?? '[data-testid="fc-target"]';
      await withPseudoState(target, [pseudo], async () => {
        // Strict-mode singularity check: querySelectorAll + length assertion
        // recovers the guarantee that `screen.getByTestId(...)` used to give
        // us (fail-loud on multiple matches). vitest-browser's LocatorSelectors
        // don't expose a raw-CSS locator, so we do the check by hand for the
        // selector-override cases. Silent fall-through to the first match
        // would let a fixture that renders two `.ps1ui-details__summary`
        // instances pass while asserting against the wrong element.
        const matches = document.querySelectorAll<HTMLElement>(target);
        if (matches.length !== 1) {
          throw new Error(
            `forced-colors target selector "${target}" matched ${matches.length} elements (expected exactly 1)`,
          );
        }
        const s = getComputedStyle(matches[0]!);
        expect(s.outlineStyle).toBe("solid");
        expect(s.outlineWidth).toBe("2px");
        expect(s.outlineOffset).toBe("2px");
      });
    },
  );
});
