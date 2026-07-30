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
import { ContributionGraph } from "../components/ContributionGraph/ContributionGraph";
import { Details } from "../components/Details/Details";
import { Input } from "../components/Input/Input";
import { Radio } from "../components/Radio/Radio";
import { Select } from "../components/Select/Select";
import { Tab } from "../components/Tab/Tab";
import { TabList } from "../components/TabList/TabList";
import { TabPanel } from "../components/TabPanel/TabPanel";
import { Tabs } from "../components/Tabs/Tabs";
import { Table } from "../components/Table/Table";
import { Tbody } from "../components/Tbody/Tbody";
import { Td } from "../components/Td/Td";
import { Textarea } from "../components/Textarea/Textarea";
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

  test("Radio checked inner dot is border-drawn (background would be force-stripped)", async () => {
    // The normal-mode dot uses `background: currentColor`, which forced-colors
    // strips — the border ring replacement survives as system ink. Assert the
    // ring's geometry (a 2px solid circle) instead of colors, same convention
    // as the Checkbox case above.
    const screen = await render(<Radio aria-label="pick" defaultChecked data-testid="fc-target" />);
    const s = getComputedStyle(screen.getByTestId("fc-target").element(), "::after");
    expect(s.borderTopWidth).toBe("2px");
    expect(s.borderTopStyle).toBe("solid");
    expect(s.width).toBe("8px");
    expect(s.height).toBe("8px");
  });

  // Select's disclosure marker is painted as a background gradient (Select.css
  // explains why it can't be an element), and forced-colors force-replaces
  // author backgrounds — so the marker would vanish and leave a control with
  // no disclosure affordance. The repair is to hand the element back to the
  // platform, which paints its own arrow in system ink. Assert the handover,
  // not the arrow: `appearance` is the mechanism, and the native glyph itself
  // is neither styleable nor observable from script.
  test("Select drops back to the platform control (its gradient marker is force-stripped)", async (ctx) => {
    const screen = await render(
      <Select aria-label="language" data-testid="fc-target">
        <option value="go">Go</option>
      </Select>,
    );
    const s = getComputedStyle(screen.getByTestId("fc-target").element());
    expect(s.appearance).not.toBe("none");

    // The reserved inline-end padding STAYS. The platform arrow paints inside
    // the control's inline end, over the author padding box rather than in
    // space of its own, so zeroing the reservation runs the value text into
    // the glyph — verified on Chromium with a long option label. See
    // Select.css's forced-colors block.
    //
    // WebKit's native menulist owns its metrics outright: under
    // `appearance: auto` it discards author padding on BOTH sides (each
    // computes to 0px), so there is no reservation left to assert. That's the
    // engine taking over, which is exactly what this rule asks it to do — no
    // CSS.supports query expresses it, so this is one of the verified
    // rendering quirks `server.browser` is reserved for.
    ctx.skip(
      server.browser === "webkit",
      "WebKit's native menulist discards author padding under appearance: auto",
    );
    expect(parseFloat(s.paddingRight)).toBeGreaterThan(parseFloat(s.paddingLeft));
  });

  // The counterpart: a list box never had a marker to lose, so it keeps our
  // styling instead of reverting to platform chrome.
  test("Select in list-box mode keeps the authored appearance (it has no marker to lose)", async () => {
    const screen = await render(
      <Select aria-label="languages" multiple data-testid="fc-target">
        <option value="go">Go</option>
      </Select>,
    );
    expect(getComputedStyle(screen.getByTestId("fc-target").element()).appearance).toBe("none");
  });

  test("ContributionGraph focus ring survives as a stroke distinct from the cell fill", async () => {
    // The grid's focus ring can't join the grouped outline rule: neither
    // `outline` nor `box-shadow` paints on an SVG shape, so the indicator is
    // the rect's own `stroke`. Forced colors substitutes `fill` and `stroke`
    // from the SAME system palette, which would repaint cell and ring in one
    // identical ink and erase the indicator — hence the `Highlight` override
    // in ContributionGraph.css.
    //
    // Keyed on `:focus`, not `:focus-visible` (see the CSS comment: a cell is
    // click-focusable and the tooltip opens from focus, so the ring has to show
    // for pointer focus too). That also means no Tab is involved and no WebKit
    // skip is needed here, unlike every case in FOCUS_CASES below.
    //
    // A single day, no labels, no legend: exactly one cell in the document.
    await render(
      <ContributionGraph
        data={[{ date: "2025-01-05", count: 3 }]}
        showMonthLabels={false}
        showWeekdayLabels={false}
        showLegend={false}
      />,
    );
    const target = ".ps1ui-contribution-graph__cell";
    await withPseudoState(target, ["focus"], async () => {
      const matches = document.querySelectorAll<HTMLElement>(target);
      expect(matches.length).toBe(1);
      const s = getComputedStyle(matches[0]!);
      expect(s.strokeWidth).toBe("2px");
      // The one place this file compares colours — and it compares them to
      // each other, never to a literal. "The ring is not the same ink as the
      // thing it rings" is the whole invariant, and it holds on any system
      // palette; asserting `Highlight`'s resolved value would not.
      expect(s.stroke).not.toBe(s.fill);
    });
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
      name: "Radio",
      pseudo: "focus-visible",
      webkitSkip: true,
      ui: <Radio aria-label="pick" data-testid="fc-target" />,
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
      name: "Textarea",
      pseudo: "focus",
      webkitSkip: false,
      ui: <Textarea aria-label="notes" data-testid="fc-target" />,
    },
    {
      // Like Input / Textarea, Select's ring is keyed on `:focus`, which
      // programmatic focus reaches on every engine — no Tab, so no WebKit skip.
      name: "Select",
      pseudo: "focus",
      webkitSkip: false,
      ui: (
        <Select aria-label="language" data-testid="fc-target">
          <option value="go">Go</option>
        </Select>
      ),
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
    {
      name: "Tab",
      pseudo: "focus-visible",
      webkitSkip: true,
      // Focus lands on the selected tab (the roving-tabindex Tab-stop). Only
      // one Tab is rendered so the single-match selector guard passes.
      selector: ".ps1ui-tab",
      ui: (
        <Tabs defaultValue="a">
          <TabList aria-label="fixture">
            <Tab value="a" data-testid="fc-target">
              Tab
            </Tab>
          </TabList>
        </Tabs>
      ),
    },
    {
      name: "TabPanel",
      pseudo: "focus-visible",
      webkitSkip: true,
      // TabPanel is non-focusable by default but auto-adds tabindex=0 when it
      // has no focusable descendants — plain text content triggers that path,
      // so the panel becomes reachable via Tab and :focus-visible fires.
      // Rendered standalone (no <Tabs>/Tab) so no upstream Tab-stop competes;
      // the pseudo-state helper's "first tabbable is the target" invariant
      // needs the panel to be the very first tab stop in the document.
      selector: ".ps1ui-tab-panel",
      ui: (
        <TabPanel value="a" aria-label="fixture panel" data-testid="fc-target">
          plain content
        </TabPanel>
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

  // `retry: 3` mirrors the Firefox-flake precedent set by Checkbox / Button /
  // Anchor / Details (`.focus()` + native key activation, documented in
  // CLAUDE.md's "Known Firefox flake"). The failure mode here is different in
  // detail — a Tab-driven `:focus-visible` case where computed style read back
  // as the base rule instead of the `@media (forced-colors: active)` override,
  // implying a Firefox style-recalc / forced-colors-emulation timing race that
  // no `settle.ts` tick can close from application code — but the shape is the
  // same: Firefox-only, load-dependent, absorbs on immediate re-run. Kept on
  // `test.for` so every case in FOCUS_CASES inherits it, not just the one
  // observed to flake; the underlying race is not Table-specific.
  test.for(FOCUS_CASES as readonly FocusCase[])(
    "$name :$pseudo falls back to a real outline (box-shadow is force-stripped)",
    { retry: 3 },
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
