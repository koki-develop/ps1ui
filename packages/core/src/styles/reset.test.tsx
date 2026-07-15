// Behavioral coverage for base.css's reset block. Every declaration that
// surfaces via getComputedStyle is asserted here so a future tweak to the
// reset can't silently regress the "same look across browsers" guarantee.
// Runs against Chromium, Firefox, and WebKit (see vitest.config.ts); a few
// declarations are genuinely engine-specific vendor properties or values —
// those use CSS.supports() feature detection (see "reset — interpolate-size"
// below for the established pattern) so "this engine doesn't parse the
// declaration" and "our rule stopped applying it" stay distinguishable.
//
// Declarations that CANNOT be verified from any Vitest Browser Mode
// environment are catalogued (with reasons) at the bottom of the file so
// silent omission per packages/core/CLAUDE.md's behavioral-coverage rule is
// impossible.

import "./styles.css";

import { createElement, type ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { server } from "vitest/browser";
import { render } from "vitest-browser-react";

const GIF_1X1 = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const gcs = (el: Element, pseudo?: string) => window.getComputedStyle(el, pseudo);

async function renderProbes(node: ReactNode) {
  const screen = await render(node);
  const get = (testId: string) => {
    const el = screen.container.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
    if (!el) throw new Error(`element with data-testid="${testId}" not found`);
    return el;
  };
  return { container: screen.container, get };
}

// ---------------------------------------------------------------------------
// html-scoped base
// ---------------------------------------------------------------------------

describe("reset — html base", () => {
  test("color-scheme: dark (UA scrollbars / form controls render dark)", () => {
    expect(gcs(document.documentElement).colorScheme).toBe("dark");
  });

  test("line-height resolves to 1.5x font-size", () => {
    const s = gcs(document.documentElement);
    expect(parseFloat(s.lineHeight) / parseFloat(s.fontSize)).toBeCloseTo(1.5, 2);
  });

  test("tab-size: 4", () => {
    expect(gcs(document.documentElement).tabSize).toBe("4");
  });

  test("text-rendering: optimizeLegibility", () => {
    expect(gcs(document.documentElement).textRendering).toBe("optimizelegibility");
  });

  test("-webkit-text-size-adjust: 100% (iOS rotation zoom locked out)", () => {
    // Blink/WebKit-only property, invented for mobile Safari; feature-detect
    // rather than hardcode an engine name (see interpolate-size below).
    if (!CSS.supports("-webkit-text-size-adjust", "100%")) return;
    expect(gcs(document.documentElement).getPropertyValue("-webkit-text-size-adjust")).toBe("100%");
  });

  test("-webkit-tap-highlight-color is transparent (iOS blue flash killed)", () => {
    if (!CSS.supports("-webkit-tap-highlight-color", "transparent")) return;
    expect(gcs(document.documentElement).getPropertyValue("-webkit-tap-highlight-color")).toBe(
      "rgba(0, 0, 0, 0)",
    );
  });
});

// ---------------------------------------------------------------------------
// body-scoped base
// ---------------------------------------------------------------------------

describe("reset — body base", () => {
  test("body carries no UA margin (canvas paints edge-to-edge)", () => {
    const s = gcs(document.body);
    expect([s.marginTop, s.marginRight, s.marginBottom, s.marginLeft]).toEqual([
      "0px",
      "0px",
      "0px",
      "0px",
    ]);
  });

  test("body min-height fills the viewport (100dvh)", () => {
    expect(parseFloat(gcs(document.body).minHeight)).toBeCloseTo(window.innerHeight, 0);
  });

  test("-webkit-font-smoothing: antialiased (macOS Chrome/Safari parity)", () => {
    // Firefox 128+ deliberately aliases -webkit-font-smoothing to
    // -moz-osx-font-smoothing (https://bugzilla.mozilla.org/show_bug.cgi?id=1670993)
    // — the values differ (grayscale/auto vs. antialiased/subpixel-antialiased),
    // so ANY declared -webkit-font-smoothing keyword resolves to one of the
    // two -moz-osx-font-smoothing states. CSS.supports("-webkit-font-smoothing",
    // "antialiased") returns true regardless (verified empirically), so unlike
    // the other vendor-property tests above, feature detection can't
    // distinguish this from a real regression. Skipped by engine name.
    if (server.browser === "firefox") return;
    expect(gcs(document.body).getPropertyValue("-webkit-font-smoothing")).toBe("antialiased");
  });
});

// ---------------------------------------------------------------------------
// Box model — applied to `*` only; pseudo-elements are intentionally excluded
// so components using border-drawn glyphs (Checkbox's rotated-L ✓, future
// tooltip carets, radio dot outlines) get the initial content-box behavior
// their trick depends on.
// ---------------------------------------------------------------------------

describe("reset — box model on elements", () => {
  test("a plain element uses box-sizing: border-box + zero-width solid border", async () => {
    // `border: 0 solid` is a symmetric shorthand — no way to end up with
    // asymmetric per-side widths or styles, so probing one side proves the
    // whole rule.
    const { get } = await renderProbes(<div data-testid="probe" />);
    const s = gcs(get("probe"));
    expect(s.boxSizing).toBe("border-box");
    expect(s.borderTopWidth).toBe("0px");
    expect(s.borderTopStyle).toBe("solid");
  });
});

describe("reset — pseudo-elements are NOT touched", () => {
  // Probed via <q>::before/::after because our reset sets `q::before, q::after
  // { content: "" }`, guaranteeing the pseudos generate. If a future edit
  // re-adds pseudo selectors to the `* { box-sizing: border-box; border: 0 solid }`
  // block, these tests fire — the Checkbox rotated-L ✓ (and any other pseudo
  // border-trick) depends on the initial content-box + default border-style.

  test("<q>::before keeps the initial box-sizing (content-box)", async () => {
    const { get } = await renderProbes(<q data-testid="probe">x</q>);
    expect(gcs(get("probe"), "::before").boxSizing).toBe("content-box");
  });

  test("<q>::after keeps the initial box-sizing (content-box)", async () => {
    const { get } = await renderProbes(<q data-testid="probe">x</q>);
    expect(gcs(get("probe"), "::after").boxSizing).toBe("content-box");
  });

  test("<q>::before keeps the initial border-style (none) so bare border-width paints nothing", async () => {
    // If the reset re-adds `border: 0 solid` to pseudos, this becomes "solid"
    // and border-drawn glyphs stop rendering as expected.
    const { get } = await renderProbes(<q data-testid="probe">x</q>);
    expect(gcs(get("probe"), "::before").borderTopStyle).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// Margin / padding zeroing on block containers
// ---------------------------------------------------------------------------

// <hr> is intentionally excluded: modern UA sheets set `margin-inline: auto`
// on it for centering, and `margin: 0` shorthand does zero it out — but the
// used value that getComputedStyle reports for margin-inline on a full-width
// block hr is browser-dependent (Chromium reports "0px", but Safari has been
// seen to report the used inline offset when the parent is narrower).
// The behavior we actually care about — no vertical stacking gap — is asserted
// in the dedicated "reset — hr" describe below.
const MARGIN_TAGS = [
  { tag: "blockquote" },
  { tag: "dl" },
  { tag: "dd" },
  { tag: "figure" },
  { tag: "fieldset" },
  { tag: "h1" },
  { tag: "h2" },
  { tag: "h3" },
  { tag: "h4" },
  { tag: "h5" },
  { tag: "h6" },
  { tag: "menu" },
  { tag: "ol" },
  { tag: "p" },
  { tag: "pre" },
  { tag: "ul" },
] as const;

describe("reset — margin zero on block containers", () => {
  test.for(MARGIN_TAGS)("<$tag> has zero UA margin", async ({ tag }) => {
    const { get } = await renderProbes(createElement(tag, { "data-testid": "probe" }, "x"));
    const s = gcs(get("probe"));
    expect([s.marginTop, s.marginRight, s.marginBottom, s.marginLeft]).toEqual([
      "0px",
      "0px",
      "0px",
      "0px",
    ]);
  });
});

const PADDING_TAGS = [
  { tag: "fieldset" },
  { tag: "legend" },
  { tag: "menu" },
  { tag: "ol" },
  { tag: "ul" },
] as const;

describe("reset — padding zero on list-like containers", () => {
  test.for(PADDING_TAGS)("<$tag> has zero UA padding", async ({ tag }) => {
    const { get } = await renderProbes(createElement(tag, { "data-testid": "probe" }, "x"));
    const s = gcs(get("probe"));
    expect([s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft]).toEqual([
      "0px",
      "0px",
      "0px",
      "0px",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Headings — <Heading> owns sizing, bare tags inherit
// ---------------------------------------------------------------------------

const HEADING_TAGS = [
  { tag: "h1" },
  { tag: "h2" },
  { tag: "h3" },
  { tag: "h4" },
  { tag: "h5" },
  { tag: "h6" },
] as const;

describe("reset — headings", () => {
  test.for(HEADING_TAGS)(
    "<$tag> font-size and font-weight inherit from the surrounding text",
    async ({ tag }) => {
      const { get } = await renderProbes(
        <div>
          {createElement(tag, { "data-testid": "probe" }, "heading")}
          <span data-testid="baseline">baseline</span>
        </div>,
      );
      expect(gcs(get("probe")).fontSize).toBe(gcs(get("baseline")).fontSize);
      expect(gcs(get("probe")).fontWeight).toBe(gcs(get("baseline")).fontWeight);
    },
  );

  test("h1 has text-wrap: balance (even wrap for headings)", async () => {
    const { get } = await renderProbes(<h1 data-testid="probe">x</h1>);
    expect(gcs(get("probe")).textWrap).toBe("balance");
  });

  test("h1 has overflow-wrap: break-word (long tokens don't overflow)", async () => {
    const { get } = await renderProbes(<h1 data-testid="probe">x</h1>);
    expect(gcs(get("probe")).overflowWrap).toBe("break-word");
  });
});

// ---------------------------------------------------------------------------
// Paragraph
// ---------------------------------------------------------------------------

describe("reset — paragraph", () => {
  test("p has text-wrap: pretty (widow avoidance)", async () => {
    // Chromium-only CSS Text Level 4 value as of writing; Firefox/WebKit fall
    // back to the initial "wrap" and never parse "pretty" as valid.
    if (!CSS.supports("text-wrap", "pretty")) return;
    const { get } = await renderProbes(<p data-testid="probe">x</p>);
    expect(gcs(get("probe")).textWrap).toBe("pretty");
  });

  test("p has overflow-wrap: break-word", async () => {
    const { get } = await renderProbes(<p data-testid="probe">x</p>);
    expect(gcs(get("probe")).overflowWrap).toBe("break-word");
  });
});

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

describe("reset — lists", () => {
  test.for([{ tag: "ol" }, { tag: "ul" }, { tag: "menu" }])(
    "<$tag> drops its UA bullet marker",
    async ({ tag }) => {
      const { get } = await renderProbes(
        createElement(tag, { "data-testid": "probe" }, <li key="i">item</li>),
      );
      expect(gcs(get("probe")).listStyleType).toBe("none");
    },
  );
});

// ---------------------------------------------------------------------------
// Replaced elements — display: block kills the inline baseline gap
// ---------------------------------------------------------------------------

describe("reset — replaced elements", () => {
  test.for([
    { tag: "svg" },
    { tag: "video" },
    { tag: "canvas" },
    { tag: "iframe" },
    { tag: "embed" },
    { tag: "object" },
  ])("<$tag> defaults to display: block", async ({ tag }) => {
    const { get } = await renderProbes(createElement(tag, { "data-testid": "probe" }));
    expect(gcs(get("probe")).display).toBe("block");
  });

  test("<audio controls> defaults to display: block", async () => {
    // Bare <audio> without controls is forced to `display: none` by every
    // major UA (there's nothing to render); the reset can only lift it back
    // to block once the control strip exists.
    const { get } = await renderProbes(<audio data-testid="probe" controls />);
    expect(gcs(get("probe")).display).toBe("block");
  });

  test("<img> defaults to display: block", async () => {
    const { get } = await renderProbes(<img data-testid="probe" src={GIF_1X1} alt="" />);
    expect(gcs(get("probe")).display).toBe("block");
  });

  test("<img> uses vertical-align: middle", async () => {
    const { get } = await renderProbes(<img data-testid="probe" src={GIF_1X1} alt="" />);
    expect(gcs(get("probe")).verticalAlign).toBe("middle");
  });

  test("<img> caps at max-width: 100% (fits the container without overflowing)", async () => {
    // `height: auto` is set by the reset, but getComputedStyle returns the
    // resolved used value (the image's intrinsic pixel height, "1px" for our
    // GIF probe), so the declared keyword is unobservable via CSSOM. Aspect
    // preservation is a downstream behavioral consequence of max-width: 100%
    // combined with the (unobservable) height: auto — the reset lets the
    // browser scale height proportionally when the image would otherwise
    // overflow. Covered in Storybook visually.
    const { get } = await renderProbes(<img data-testid="probe" src={GIF_1X1} alt="" />);
    expect(gcs(get("probe")).maxWidth).toBe("100%");
  });
});

// ---------------------------------------------------------------------------
// Anchor — <Anchor> owns color/decoration, bare <a> inherits
// ---------------------------------------------------------------------------

describe("reset — anchor", () => {
  test("bare <a> inherits color instead of UA blue", async () => {
    const { get } = await renderProbes(
      <div style={{ color: "rgb(200, 100, 50)" }}>
        <a data-testid="probe" href="/x">
          link
        </a>
        <span data-testid="baseline">baseline</span>
      </div>,
    );
    expect(gcs(get("probe")).color).toBe(gcs(get("baseline")).color);
  });

  test("bare <a> inherits text-decoration instead of UA underline", async () => {
    const { get } = await renderProbes(
      <div>
        <a data-testid="probe" href="/x">
          link
        </a>
      </div>,
    );
    expect(gcs(get("probe")).textDecorationLine).toBe("none");
  });
});

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

const FORM_TAGS = [
  { tag: "button" },
  { tag: "input" },
  { tag: "select" },
  { tag: "textarea" },
] as const;

describe("reset — form controls", () => {
  // Every shared form-control property comes from ONE CSS rule in base.css,
  // so we render each tag ONCE and assert all shared properties together —
  // avoids the 5× render fan-out the split test.for blocks used to cause.
  test.for(FORM_TAGS)(
    "<$tag> inherits ambient font/color, has transparent bg, no border-radius, full opacity",
    async ({ tag }) => {
      const { get } = await renderProbes(
        <div style={{ color: "rgb(123, 200, 55)" }}>
          {createElement(tag, { "data-testid": "probe" })}
          <span data-testid="baseline">x</span>
        </div>,
      );
      const probe = gcs(get("probe"));
      const baseline = gcs(get("baseline"));
      expect(probe.fontFamily).toBe(baseline.fontFamily);
      expect(probe.color).toBe(baseline.color);
      expect(probe.backgroundColor).toBe("rgba(0, 0, 0, 0)");
      // WebKit's native <select> widget (appearance retained, no
      // -webkit-appearance: none override) ignores author border-radius on
      // its own menulist chrome — a rendering quirk, not a missing property,
      // so CSS.supports can't detect it. See the footnote at the bottom.
      if (!(tag === "select" && server.browser === "webkit")) {
        expect(probe.borderRadius).toBe("0px");
      }
      expect(probe.opacity).toBe("1");
    },
  );

  test("button has cursor: pointer (Firefox otherwise gives default)", async () => {
    const { get } = await renderProbes(
      <button type="button" data-testid="probe">
        x
      </button>,
    );
    expect(gcs(get("probe")).cursor).toBe("pointer");
  });

  test("button and submit/reset/button inputs use appearance: button (locks UA button widget)", async () => {
    const { get } = await renderProbes(
      <div>
        <button type="button" data-testid="btn">
          x
        </button>
        <input type="submit" data-testid="submit" />
        <input type="reset" data-testid="reset" />
        <input type="button" data-testid="button-input" />
      </div>,
    );
    for (const id of ["btn", "submit", "reset", "button-input"]) {
      expect(gcs(get(id)).appearance).toBe("button");
    }
  });

  test.for([{ tag: "button" }, { tag: "select" }])(
    "<$tag> has text-transform: none",
    async ({ tag }) => {
      const { get } = await renderProbes(createElement(tag, { "data-testid": "probe" }));
      expect(gcs(get("probe")).textTransform).toBe("none");
    },
  );

  test("textarea has resize: vertical (horizontal resize breaks layout)", async () => {
    const { get } = await renderProbes(<textarea data-testid="probe" />);
    expect(gcs(get("probe")).resize).toBe("vertical");
  });

  test("input inherits font-feature-settings (JetBrains Mono axes survive)", async () => {
    const { get } = await renderProbes(
      <div style={{ fontFeatureSettings: '"cv01"' }}>
        <input data-testid="probe" />
        <span data-testid="baseline">x</span>
      </div>,
    );
    expect(gcs(get("probe")).fontFeatureSettings).toBe(gcs(get("baseline")).fontFeatureSettings);
  });

  test("input inherits letter-spacing", async () => {
    const { get } = await renderProbes(
      <div style={{ letterSpacing: "0.05em" }}>
        <input data-testid="probe" />
        <span data-testid="baseline">x</span>
      </div>,
    );
    expect(gcs(get("probe")).letterSpacing).toBe(gcs(get("baseline")).letterSpacing);
  });

  test("input::placeholder is fully opaque and color-mixed off currentcolor", async () => {
    // Firefox's default placeholder opacity is 0.54 — the reset forces 1.
    // The color-mix at 55% currentcolor makes the placeholder distinct from
    // the parent color; asserting they DIFFER proves the color-mix rule
    // actually applied (removing the `color` declaration would let the
    // placeholder inherit currentcolor and the two would collapse).
    const { get } = await renderProbes(
      <div style={{ color: "rgb(200, 100, 50)" }}>
        <input data-testid="probe" placeholder="hint" />
        <span data-testid="baseline">x</span>
      </div>,
    );
    const placeholder = gcs(get("probe"), "::placeholder");
    expect(placeholder.opacity).toBe("1");
    expect(placeholder.color).not.toBe(gcs(get("baseline")).color);
  });

  test("[type=search] uses -webkit-appearance: textfield (defeats Safari's search styling)", async () => {
    const { get } = await renderProbes(<input type="search" data-testid="probe" />);
    expect(gcs(get("probe")).getPropertyValue("-webkit-appearance")).toBe("textfield");
  });

  test("[type=search] uses outline-offset: -2px", async () => {
    const { get } = await renderProbes(<input type="search" data-testid="probe" />);
    expect(gcs(get("probe")).outlineOffset).toBe("-2px");
  });
});

// ---------------------------------------------------------------------------
// Text-level elements
// ---------------------------------------------------------------------------

describe("reset — text-level", () => {
  test.for([{ tag: "b" }, { tag: "strong" }])(
    "<$tag> resolves to font-weight 700 (bolder against default 400)",
    async ({ tag }) => {
      const { get } = await renderProbes(createElement(tag, { "data-testid": "probe" }, "x"));
      expect(gcs(get("probe")).fontWeight).toBe("700");
    },
  );

  test("<small> shrinks to 80% of parent font-size", async () => {
    const { get } = await renderProbes(
      <div style={{ fontSize: "20px" }}>
        <small data-testid="probe">x</small>
      </div>,
    );
    expect(parseFloat(gcs(get("probe")).fontSize)).toBeCloseTo(16, 1);
  });

  test.for([{ tag: "code" }, { tag: "kbd" }, { tag: "samp" }, { tag: "pre" }])(
    "<$tag> uses JetBrains Mono at 1em (not the UA -3em shrunk mono)",
    async ({ tag }) => {
      const { get } = await renderProbes(
        <div style={{ fontSize: "20px" }}>
          {createElement(tag, { "data-testid": "probe" }, "x")}
        </div>,
      );
      expect(gcs(get("probe")).fontFamily).toContain("JetBrains Mono");
      expect(parseFloat(gcs(get("probe")).fontSize)).toBeCloseTo(20, 1);
    },
  );

  test("abbr[title] gets dotted underline decoration", async () => {
    const { get } = await renderProbes(
      <abbr data-testid="probe" title="hello">
        HTML
      </abbr>,
    );
    expect(gcs(get("probe")).textDecorationLine).toBe("underline");
    expect(gcs(get("probe")).textDecorationStyle).toBe("dotted");
  });

  test("abbr without [title] is NOT touched by the reset (selector is scoped)", async () => {
    const { get } = await renderProbes(<abbr data-testid="probe">x</abbr>);
    expect(gcs(get("probe")).textDecorationLine).not.toBe("underline");
  });

  test("<q>::before and <q>::after have empty content (UA smart-quotes killed)", async () => {
    const { get } = await renderProbes(<q data-testid="probe">x</q>);
    expect(gcs(get("probe"), "::before").content).toBe('""');
    expect(gcs(get("probe"), "::after").content).toBe('""');
  });

  test("<sub> shrinks to 75%, drops line-height, positions relative with bottom offset -0.25em", async () => {
    const { get } = await renderProbes(
      <div style={{ fontSize: "20px" }}>
        <sub data-testid="probe">x</sub>
      </div>,
    );
    const s = gcs(get("probe"));
    expect(parseFloat(s.fontSize)).toBeCloseTo(15, 1);
    expect(s.lineHeight).toBe("0px");
    expect(s.position).toBe("relative");
    expect(s.verticalAlign).toBe("baseline");
    // -0.25em relative to sub's own 15px font-size = -3.75px.
    expect(parseFloat(s.bottom)).toBeCloseTo(-3.75, 1);
  });

  test("<sup> shrinks to 75%, drops line-height, positions relative with top offset -0.5em", async () => {
    const { get } = await renderProbes(
      <div style={{ fontSize: "20px" }}>
        <sup data-testid="probe">x</sup>
      </div>,
    );
    const s = gcs(get("probe"));
    expect(parseFloat(s.fontSize)).toBeCloseTo(15, 1);
    expect(s.lineHeight).toBe("0px");
    expect(s.position).toBe("relative");
    expect(s.verticalAlign).toBe("baseline");
    // -0.5em relative to sup's own 15px font-size = -7.5px.
    expect(parseFloat(s.top)).toBeCloseTo(-7.5, 1);
  });
});

// ---------------------------------------------------------------------------
// Miscellaneous elements
// ---------------------------------------------------------------------------

describe("reset — table", () => {
  test("<table> has border-collapse: collapse", async () => {
    const { get } = await renderProbes(
      <table data-testid="probe">
        <tbody>
          <tr>
            <td>x</td>
          </tr>
        </tbody>
      </table>,
    );
    expect(gcs(get("probe")).borderCollapse).toBe("collapse");
  });
});

describe("reset — hr", () => {
  test("<hr> paints a 1px solid top border (color inherited)", async () => {
    const { get } = await renderProbes(<hr data-testid="probe" />);
    const s = gcs(get("probe"));
    expect(s.borderTopWidth).toBe("1px");
    expect(s.borderTopStyle).toBe("solid");
    // `height: 0` is set by the reset but the used height resolves to 1px
    // because border-box + a 1px top border can't shrink below the border.
    // The declared value is unobservable via CSSOM.
  });

  test("<hr> stacks flush (no UA 0.5em vertical margin gap)", async () => {
    const { get } = await renderProbes(<hr data-testid="probe" />);
    const s = gcs(get("probe"));
    expect(s.marginBlockStart).toBe("0px");
    expect(s.marginBlockEnd).toBe("0px");
  });
});

describe("reset — summary", () => {
  test("<summary> stays as list-item so the disclosure triangle renders", async () => {
    const { get } = await renderProbes(
      <details>
        <summary data-testid="probe">toggle</summary>
      </details>,
    );
    expect(gcs(get("probe")).display).toBe("list-item");
  });
});

describe("reset — [hidden] wins over display: flex/grid", () => {
  test("[hidden] child inside a flex parent still resolves to display: none", async () => {
    const { get } = await renderProbes(
      <div style={{ display: "flex" }}>
        <div data-testid="probe" hidden>
          hidden
        </div>
        <div>visible</div>
      </div>,
    );
    expect(gcs(get("probe")).display).toBe("none");
  });
});

describe("reset — interpolate-size (Chromium)", () => {
  test("html declares interpolate-size: allow-keywords when the browser supports it", () => {
    // Skip via CSS.supports() feature detection — the previous `if (!value) return`
    // pattern also fired when the @media block itself was deleted (getPropertyValue
    // returns "" in that case too), silently masking a regression. Feature-detection
    // separates "browser doesn't support the property" from "our rule stopped
    // applying it": the former skips, the latter asserts and fails.
    if (!CSS.supports("interpolate-size", "allow-keywords")) return;
    expect(gcs(document.documentElement).getPropertyValue("interpolate-size")).toBe(
      "allow-keywords",
    );
  });
});

// ---------------------------------------------------------------------------
// Declarations that are NOT verifiable from any current Vitest Browser Mode
// environment (Chromium / Firefox / WebKit — see vitest.config.ts), plus
// engine-specific rendering quirks CSS.supports() can't feature-detect.
// Enumerated per packages/core/CLAUDE.md ("silent omission is not an option").
// ---------------------------------------------------------------------------
//
//   * -webkit-font-smoothing on Firefox         Firefox 128+ deliberately aliases this to
//                                              -moz-osx-font-smoothing (Mozilla bug 1670993:
//                                              https://bugzilla.mozilla.org/show_bug.cgi?id=1670993),
//                                              whose only two states are "grayscale"/"auto" — any
//                                              declared -webkit-font-smoothing keyword resolves to
//                                              one of those two, so the computed value is never the
//                                              declared keyword verbatim. CSS.supports("-webkit-
//                                              font-smoothing", "antialiased") returns true in
//                                              Firefox regardless (verified empirically), so feature
//                                              detection can't tell that apart from a real
//                                              regression; skipped by engine name instead.
//   * <select> border-radius on WebKit         A well-documented WebKit/Safari limitation (see e.g.
//                                              github.com/alphagov/govuk-frontend/issues/3520,
//                                              github.com/google/model-viewer/issues/662): a native-
//                                              appearance <select> ignores author border-radius
//                                              unless -webkit-appearance: none is also set, which
//                                              also strips the native disclosure arrow. Verified in
//                                              this repo by isolating each declaration on a bare
//                                              <select> (appearance left at its default "auto"):
//                                              authoring EITHER `border-radius` (even `0`) OR
//                                              `background-color` makes WebKit fall back to a fixed
//                                              native ~5px corner radius — font/color/opacity alone
//                                              don't trigger it. Not a missing-property case, so
//                                              CSS.supports can't detect it. Skipped explicitly for tag="select" on
//                                              server.browser === "webkit" in the form-controls test
//                                              above. Fully overriding would require
//                                              `-webkit-appearance: none`, which also strips WebKit's
//                                              native disclosure chrome — a bigger, more opinionated
//                                              change than this reset's normalize-don't-redesign
//                                              scope covers.
//   * -moz-osx-font-smoothing: grayscale       Firefox-only property; unobservable outside Firefox.
//   * :-moz-ui-invalid, :-moz-focusring        Firefox-only pseudos.
//   * input[type=number] { -moz-appearance }   Firefox-only; Chromium/WebKit hide the spinner via
//                                              ::-webkit-inner-spin-button (see below). The
//                                              deprecated unprefixed `appearance: textfield`
//                                              was intentionally removed from base.css — it
//                                              was moved to the CSS UI Level 4 compatibility
//                                              appendix and dropped by Tailwind v4 Preflight.
//   * ::-webkit-inner/outer-spin-button reset  getComputedStyle on these pseudos returns empty
//                                              string in current Chromium — the styles apply but
//                                              are not observable via CSSOM.
//   * ::-webkit-search-decoration/cancel-button Same CSSOM limitation as spin buttons.
//   * ::-webkit-date-and-time-value            Same CSSOM limitation.
//   * ::-webkit-datetime-edit(-fields-wrapper) Chromium exposes the sibling ::-webkit-datetime-edit
//                                              via CSSOM but returns its UA-computed `display`
//                                              (inline-block) regardless of what our reset
//                                              writes — the vendor pseudo's cascade appears to
//                                              defeat our declaration in current Chromium. The
//                                              rules stay in base.css as defense-in-depth for
//                                              iOS Safari (matching Tailwind Preflight's stance)
//                                              but can't be asserted from here.
//   * ::backdrop                               Only rendered while <dialog>.showModal() is open,
//                                              which requires transient user activation the
//                                              vitest browser cannot reliably grant.
//   * ::file-selector-button { font: inherit } getComputedStyle on this pseudo returns empty
//                                              in current Chromium; the font override is applied
//                                              but not queryable.
//   * -webkit-text-size-adjust visual effect   The property value is asserted above; the actual
//                                              iOS rotation-zoom suppression needs a real iPhone.
//   * -webkit-tap-highlight-color visual flash Property value asserted; the tap flash itself
//                                              needs a touch device.
//   * :where(select:is([multiple], [size])) optgroup { font-weight: bolder }
//                                              Requires a multi-select select with an <optgroup>;
//                                              browsers render this as a native list widget whose
//                                              optgroup label doesn't participate in CSSOM in a
//                                              testable way.
//   * color-scheme: dark's effect on native    The `color-scheme` PROPERTY VALUE is asserted
//     UA widgets (scrollbars, date pickers,   above; the resulting UA widget appearance
//     autofill overlay)                        (native scrollbar coloring, date picker chrome,
//                                              autofill background) is browser-controlled and
//                                              not exposed via CSSOM.
