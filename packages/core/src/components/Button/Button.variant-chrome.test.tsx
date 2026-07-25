// Outcome-level regression for the *chrome* each Button variant paints — the
// fill and border that tell the variants apart — asserted against the real
// stylesheet rather than against class names.
//
// Why its own file: Button.test.tsx deliberately loads no CSS (its axe passes
// are semantic-only; importing styles.css there would quietly turn them into a
// duplicate of Button.contrast.test.tsx's colour-contrast runs), and Browser
// Mode isolates per FILE — a stylesheet can't be scoped to a subset of a
// file's tests. Checkbox's checkmark-geometry file exists for the same reason.
//
// The invariant that motivates it is the one --ghost was added for: it is the
// only variant with no chrome at rest, so nothing but its label paints, and
// nothing else in the suite states that directly. Button.vrt.test.tsx captures
// ghost's pixels, but a freshly generated baseline only locks in whatever
// rendered — it cannot say the render was correct in the first place.
//
// Colours are compared through resolveColorToken so a token tuning in
// tokens.css never has to be mirrored here as an rgb() literal; the mix
// percentages behind ghost's hover/active tints are deliberately NOT restated
// (that would assert Button.css against itself), only the fact that a tint
// arrives at all and which hue the label takes.

import "../../styles/styles.css";

import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { resolveColorToken } from "../../testing/color";
import { withPseudoState } from "../../testing/pseudo-state";
import { Button, type ButtonVariant } from "./Button";

// Offsets every fixture away from the viewport origin. Vitest Browser Mode
// does not reset the Playwright cursor between files and the provider's
// initial position is (0, 0) — a button rendered without this sits exactly
// there (measured: `getBoundingClientRect()` returns 0,0), so the resting-state
// tests, which run first and before anything has moved the cursor, would be one
// provider quirk away from reading `:hover` colours under a resting-state name.
// pseudo-state.test.tsx documents that quirk actually firing on the Firefox
// provider and pays for the same wrapper; this file cannot afford it at all,
// since "ghost paints nothing at rest" is the single claim it exists to make.
// A padded wrapper is preferred over parking the cursor in a hook because it is
// local to this fixture instead of a side effect on every test in the file.
const Stage = ({ children }: { children: ReactNode }) => (
  <div style={{ padding: 120 }}>{children}</div>
);

// "Nothing is painted here" has no stable string form: Firefox alternates
// between the two CSS Color 4 serialisations of the same fully-transparent
// value — `rgba(0, 0, 0, 0)` and `color(srgb 0 0 0 / 0)` — across runs of this
// very file, so comparing against a hardcoded literal is a coin flip rather
// than an assertion. Alpha is the only channel the question depends on, so
// parse it out and compare numbers. Opaque expectations keep exact string
// equality against resolveColorToken: solid colours serialise as `rgb(r, g, b)`
// on every engine, and an exact match says more than an alpha check.
function alphaOf(color: string): number {
  // Modern form: `color(srgb r g b / a)`, alpha after the slash (absent when
  // fully opaque).
  const modern = /^color\([^)]*\/\s*([\d.]+)\s*\)$/.exec(color);
  if (modern) return Number(modern[1] ?? "1");
  if (color.startsWith("color(")) return 1;
  // Legacy form: `rgb(r, g, b)` / `rgba(r, g, b, a)`.
  const legacy = /^rgba?\(([^)]+)\)$/.exec(color);
  if (!legacy) throw new Error(`unrecognised computed colour: ${color}`);
  const alpha = (legacy[1] ?? "").split(",")[3];
  return alpha === undefined ? 1 : Number(alpha);
}

const BORDER_SIDES = [
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
] as const;

type ChromeCase = {
  variant: ButtonVariant;
  /** Expected resting fill as a `--ps1ui-*` token name, or null for "no fill". */
  background: string | null;
  /** Expected resting border colour, same convention. */
  border: string | null;
};

const RESTING_CHROME = [
  { variant: "primary", background: "--ps1ui-color-primary", border: "--ps1ui-color-primary" },
  { variant: "secondary", background: null, border: "--ps1ui-color-fg-subtle" },
  { variant: "danger", background: "--ps1ui-color-danger", border: "--ps1ui-color-danger" },
  // The whole point of the variant: neither cell is filled in.
  { variant: "ghost", background: null, border: null },
] as const satisfies readonly ChromeCase[];

// Every computed-style read in this file is synchronous. Resting states have
// nothing in flight to wait for, and inside a withPseudoState callback the
// helper has already verified that the browser matches the pseudo-class, so
// the recalc is done there too.
const expectChrome = (el: Element, { background, border }: Omit<ChromeCase, "variant">) => {
  const style = getComputedStyle(el);
  if (background === null) {
    expect(alphaOf(style.backgroundColor)).toBe(0);
  } else {
    expect(style.backgroundColor).toBe(resolveColorToken(background));
  }
  for (const side of BORDER_SIDES) {
    if (border === null) {
      expect(alphaOf(style[side])).toBe(0);
    } else {
      expect(style[side]).toBe(resolveColorToken(border));
    }
  }
};

describe("Button variant chrome", () => {
  test.for(RESTING_CHROME)(
    "variant=$variant paints its documented resting fill and border",
    async ({ variant, background, border }) => {
      const screen = await render(
        <Stage>
          <Button variant={variant}>label</Button>
        </Stage>,
      );
      expectChrome(screen.getByRole("button").element(), { background, border });
    },
  );

  // The claim ghost's CSS comment makes about keeping the base rule's 1px
  // transparent border: dropping the border instead of making it invisible
  // would shrink the control by 2px on both axes and break row alignment
  // beside any bordered variant.
  test("ghost keeps the same border box as a bordered variant, so the two align in a row", async () => {
    const screen = await render(
      <Stage>
        <Button variant="primary" data-testid="chrome-primary">
          label
        </Button>
        <Button variant="ghost" data-testid="chrome-ghost">
          label
        </Button>
      </Stage>,
    );
    const primary = screen.getByTestId("chrome-primary").element() as HTMLElement;
    const ghost = screen.getByTestId("chrome-ghost").element() as HTMLElement;
    expect(getComputedStyle(ghost).borderTopWidth).toBe(getComputedStyle(primary).borderTopWidth);
    expect(ghost.offsetHeight).toBe(primary.offsetHeight);
    expect(ghost.offsetWidth).toBe(primary.offsetWidth);
  });

  // Ghost enters hover with zero resting affordance, so hover has to do the
  // work of announcing that the label is a control: a tint appears behind it
  // AND the label itself takes the primary hue. Assert both — either one alone
  // regressing would leave a control that reads as inert text.
  test.for([
    { state: "hover", token: "--ps1ui-color-primary" },
    { state: "active", token: "--ps1ui-color-primary-active" },
  ] as const)(
    "ghost announces itself on $state with both a background tint and the $token label",
    async ({ state, token }) => {
      const screen = await render(
        <Stage>
          {/* Transitions off so the assertion reads the destination colour
              rather than a frame somewhere along the 120ms fade — same trick
              Button.contrast.test.tsx uses. */}
          <Button variant="ghost" data-testid="chrome-ghost" style={{ transition: "none" }}>
            label
          </Button>
        </Stage>,
      );
      const el = screen.getByTestId("chrome-ghost").element();
      await withPseudoState('[data-testid="chrome-ghost"]', [state], async () => {
        const style = getComputedStyle(el);
        expect(alphaOf(style.backgroundColor)).toBeGreaterThan(0);
        expect(style.color).toBe(resolveColorToken(token));
      });
    },
  );

  // Accessibility outranks the no-chrome rule: the base `:focus-visible` block
  // must still win over ghost's transparent border, or a keyboard user gets a
  // control with no visible focus target at all.
  test("ghost still paints the shared primary focus border when focused by keyboard", async (ctx) => {
    // Same WebKit limitation the contrast and VRT files document: macOS
    // Safari's default Full Keyboard Access excludes <button> from the Tab
    // sequence, so :focus-visible can't be reached authentically here.
    ctx.skip(
      server.browser === "webkit",
      "WebKit's Full-Keyboard-Access default excludes <button> from Tab; :focus-visible unreachable",
    );
    const screen = await render(
      <Stage>
        <Button variant="ghost" data-testid="chrome-ghost" style={{ transition: "none" }}>
          label
        </Button>
      </Stage>,
    );
    const el = screen.getByTestId("chrome-ghost").element();
    await withPseudoState('[data-testid="chrome-ghost"]', ["focus-visible"], async () => {
      expect(getComputedStyle(el).borderTopColor).toBe(resolveColorToken("--ps1ui-color-primary"));
    });
  });

  // Every other variant answers `:disabled` by painting a --ps1ui-color-border
  // outline. Ghost must not: an outline that shows up only once the control
  // becomes unavailable makes the disabled state the loudest thing on the
  // surface. Both halves rendered together so the divergence is asserted as a
  // contrast, not as two independent facts that could drift apart.
  test("a disabled ghost stays chrome-free while a disabled bordered variant gains its outline", async () => {
    const screen = await render(
      <Stage>
        <Button variant="primary" data-testid="chrome-primary" disabled>
          label
        </Button>
        <Button variant="ghost" data-testid="chrome-ghost" disabled>
          label
        </Button>
      </Stage>,
    );
    expectChrome(screen.getByTestId("chrome-primary").element(), {
      background: null,
      border: "--ps1ui-color-border",
    });
    expectChrome(screen.getByTestId("chrome-ghost").element(), { background: null, border: null });
    // Dimming the label is ghost's entire disabled treatment — the same token
    // the other variants dim to, so the states read as one system.
    expect(getComputedStyle(screen.getByTestId("chrome-ghost").element()).color).toBe(
      resolveColorToken("--ps1ui-color-fg-subtle"),
    );
  });
});
