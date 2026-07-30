// Select's own CSS is load-bearing behavior, not decoration: the disclosure
// marker is painted by the control's background and the drop-down / list-box
// split is expressed as computed background + padding. Neither is observable
// without the stylesheet loaded, so this file imports it (same precedent as
// Details / Table).
import "../../styles/styles.css";

import { createRef, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { resolveColorToken } from "../../testing/color";
import { withPseudoState } from "../../testing/pseudo-state";
import { Select } from "./Select";

type Screen = Awaited<ReturnType<typeof render>>;

const OPTIONS = (
  <>
    <option value="a">alpha</option>
    <option value="b">bravo</option>
    <option value="c">charlie</option>
  </>
);

describe("Select", () => {
  describe("rendering", () => {
    test("renders a bare <select> carrying the given options", async () => {
      const screen = await render(<Select aria-label="language">{OPTIONS}</Select>);
      const el = screen.getByRole("combobox", { name: "language" }).element();
      expect(el.tagName.toLowerCase()).toBe("select");
      expect(el.querySelectorAll("option").length).toBe(3);
    });

    // The component renders exactly one element. A wrapper would be the easy
    // way to hang a marker glyph off the control, and it is exactly what makes
    // the control unsizable — see Select.css's header and the "caller width"
    // block below.
    test("renders no wrapper element around the control", async () => {
      const screen = await render(
        <div data-testid="host">
          <Select aria-label="language">{OPTIONS}</Select>
        </div>,
      );
      const host = screen.getByTestId("host").element();
      expect(host.children.length).toBe(1);
      expect(host.firstElementChild?.tagName.toLowerCase()).toBe("select");
    });

    test("drops the UA drop-down chrome so our marker is the only arrow", async () => {
      const screen = await render(<Select aria-label="language">{OPTIONS}</Select>);
      expect(getComputedStyle(screen.getByRole("combobox").element()).appearance).toBe("none");
    });

    test("paints the disclosure marker onto the control's own background", async () => {
      const screen = await render(<Select aria-label="language">{OPTIONS}</Select>);
      const s = getComputedStyle(screen.getByRole("combobox").element());
      // Two gradient tiles abutting into one triangle.
      expect(s.backgroundImage).toContain("gradient");
      expect(s.backgroundImage.match(/gradient/g)?.length).toBe(2);
      // One marker, not a tiled row of them. Compared per layer because the
      // engines disagree on serialization: Chromium repeats the value once per
      // background layer ("no-repeat, no-repeat"), Firefox and WebKit collapse
      // identical layers to a single token.
      expect(new Set(s.backgroundRepeat.split(",").map((v) => v.trim()))).toEqual(
        new Set(["no-repeat"]),
      );
    });

    test("tints the marker with the muted token so it reads as chrome", async () => {
      const screen = await render(<Select aria-label="language">{OPTIONS}</Select>);
      const s = getComputedStyle(screen.getByRole("combobox").element());
      expect(s.backgroundImage).toContain(resolveColorToken("--ps1ui-color-fg-muted"));
    });

    test("reserves inline-end space on the control for the marker", async () => {
      const screen = await render(<Select aria-label="language">{OPTIONS}</Select>);
      const s = getComputedStyle(screen.getByRole("combobox").element());
      expect(parseFloat(s.paddingRight)).toBeGreaterThan(parseFloat(s.paddingLeft));
    });
  });

  // The reason the marker is a background rather than a sibling glyph: it is
  // anchored to the CONTROL's own box, so `width` / `max-width` on the Select
  // are ordinary, fully supported props instead of something a caller has to
  // route through a container.
  describe("caller-controlled width", () => {
    const WIDTHS = [
      { name: "width", style: { width: 140 }, expected: 140 },
      { name: "max-width in a wide container", style: { maxWidth: 160 }, expected: 160 },
    ] as const;

    test.for(WIDTHS)("honours a caller-supplied $name exactly", async ({ style, expected }) => {
      const screen = await render(
        <div style={{ width: 400 }}>
          <Select aria-label="language" data-testid="sel" style={style}>
            {OPTIONS}
          </Select>
        </div>,
      );
      const el = screen.getByTestId("sel").element();
      expect(el.getBoundingClientRect().width).toBe(expected);
    });

    // Anchoring, stated as an observable: the marker's placement is declared
    // against the element's own box, so it is byte-identical at every control
    // width. Reintroducing a wrapper-positioned glyph fails this — there would
    // be no background to compare in the first place.
    test("places the marker identically regardless of the control's width", async () => {
      const screen = await render(
        <div style={{ width: 400 }}>
          <Select aria-label="wide" data-testid="wide">
            {OPTIONS}
          </Select>
          <Select aria-label="narrow" data-testid="narrow" style={{ width: 120 }}>
            {OPTIONS}
          </Select>
        </div>,
      );
      const wide = getComputedStyle(screen.getByTestId("wide").element());
      const narrow = getComputedStyle(screen.getByTestId("narrow").element());
      expect(narrow.backgroundPosition).toBe(wide.backgroundPosition);
      expect(narrow.backgroundSize).toBe(wide.backgroundSize);
      expect(narrow.paddingRight).toBe(wide.paddingRight);
    });

    test("fills its container when the caller sets no width", async () => {
      const screen = await render(
        <div style={{ width: 320 }}>
          <Select aria-label="language" data-testid="sel">
            {OPTIONS}
          </Select>
        </div>,
      );
      expect(screen.getByTestId("sel").element().getBoundingClientRect().width).toBe(320);
    });
  });

  describe("list-box mode", () => {
    // A <select> is a drop-down only at display size 1 without `multiple`;
    // every other configuration renders as an in-page list with no popup, so
    // the marker and its reserved space must both disappear. `size={1}` is the
    // boundary case the `size > 1` test in Select.tsx exists for — an
    // attribute-presence check would wrongly demote it to a list box.
    const CASES = [
      { name: "multiple", props: { multiple: true }, listbox: true },
      { name: "size={4}", props: { size: 4 }, listbox: true },
      { name: "size={2}", props: { size: 2 }, listbox: true },
      { name: "size={1}", props: { size: 1 }, listbox: false },
      { name: "no size, not multiple", props: {}, listbox: false },
      { name: "multiple={false}", props: { multiple: false }, listbox: false },
    ] as const;

    test.for(CASES)("$name → listbox=$listbox modifier class", async ({ props, listbox }) => {
      const screen = await render(
        <Select aria-label="language" {...props}>
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole(listbox ? "listbox" : "combobox").element();
      expect(el.classList.contains("ps1ui-select--listbox")).toBe(listbox);
    });

    test.for(CASES)("$name → listbox=$listbox marker presence", async ({ props, listbox }) => {
      const screen = await render(
        <Select aria-label="language" {...props}>
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole(listbox ? "listbox" : "combobox").element();
      const { backgroundImage } = getComputedStyle(el);
      if (listbox) {
        expect(backgroundImage).toBe("none");
      } else {
        expect(backgroundImage).toContain("gradient");
      }
    });

    test.for(CASES)(
      "$name → listbox=$listbox reclaims the marker padding",
      async ({ props, listbox }) => {
        const screen = await render(
          <Select aria-label="language" {...props}>
            {OPTIONS}
          </Select>,
        );
        const el = screen.getByRole(listbox ? "listbox" : "combobox").element();
        const s = getComputedStyle(el);
        if (listbox) {
          expect(s.paddingRight).toBe(s.paddingLeft);
        } else {
          expect(parseFloat(s.paddingRight)).toBeGreaterThan(parseFloat(s.paddingLeft));
        }
      },
    );
  });

  // Styling the option background takes the UA's selection highlight with it,
  // so the component has to paint selection itself — otherwise the chosen row
  // in a list box is pixel-identical to its neighbours and selection is
  // invisible. Asserted on the CSS contract (computed style), which holds on
  // every engine; WebKit additionally overrides list-box painting from the
  // platform, so what it draws is the system highlight rather than these
  // values. See Select.css.
  describe("selected option", () => {
    test("paints the selected option with the solid primary pair", async () => {
      const screen = await render(
        <Select aria-label="language" size={4} defaultValue="b">
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole("listbox").element();
      const checked = el.querySelector("option[value='b']")!;
      const s = getComputedStyle(checked);
      expect(s.backgroundColor).toBe(resolveColorToken("--ps1ui-color-primary"));
      expect(s.color).toBe(resolveColorToken("--ps1ui-color-primary-fg"));
    });

    test("leaves unselected options on the canvas background", async () => {
      const screen = await render(
        <Select aria-label="language" size={4} defaultValue="b">
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole("listbox").element();
      const unchecked = el.querySelector("option[value='c']")!;
      const s = getComputedStyle(unchecked);
      expect(s.backgroundColor).toBe(resolveColorToken("--ps1ui-color-bg"));
      expect(s.color).toBe(resolveColorToken("--ps1ui-color-fg"));
    });

    test("distinguishes every selected row in a multi-select", async () => {
      const screen = await render(
        <Select aria-label="language" multiple size={4} defaultValue={["a", "c"]}>
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole("listbox").element();
      const primary = resolveColorToken("--ps1ui-color-primary");
      const canvas = resolveColorToken("--ps1ui-color-bg");
      const backgrounds = [...el.querySelectorAll("option")].map(
        (o) => getComputedStyle(o).backgroundColor,
      );
      expect(backgrounds).toEqual([primary, canvas, primary]);
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-select base class", async () => {
      const screen = await render(<Select aria-label="language">{OPTIONS}</Select>);
      await expect.element(screen.getByRole("combobox")).toHaveClass("ps1ui-select");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Select aria-label="language" className="extra">
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole("combobox");
      await expect.element(el).toHaveClass("ps1ui-select");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, name, data-*, aria-*)", async () => {
      const screen = await render(
        <Select
          id="lang"
          name="lang"
          aria-label="language"
          data-testid="sel"
          aria-describedby="hint"
        >
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole("combobox");
      await expect.element(el).toHaveAttribute("id", "lang");
      await expect.element(el).toHaveAttribute("name", "lang");
      await expect.element(el).toHaveAttribute("data-testid", "sel");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards the disabled attribute", async () => {
      const screen = await render(
        <Select aria-label="language" disabled>
          {OPTIONS}
        </Select>,
      );
      await expect.element(screen.getByRole("combobox")).toBeDisabled();
    });

    test("forwards defaultValue", async () => {
      const screen = await render(
        <Select aria-label="language" defaultValue="b">
          {OPTIONS}
        </Select>,
      );
      expect((screen.getByRole("combobox").element() as HTMLSelectElement).value).toBe("b");
    });

    // `multiple` and `size` are destructured to derive the list-box modifier,
    // so they need an explicit re-application to survive onto the DOM — this
    // is the regression net for that.
    test("re-applies the destructured multiple / size onto the <select>", async () => {
      const screen = await render(
        <Select aria-label="language" multiple size={5}>
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole("listbox").element() as HTMLSelectElement;
      expect(el.multiple).toBe(true);
      expect(el.size).toBe(5);
    });

    test("forwards ref (RefObject) to the underlying <select>", async () => {
      const ref = createRef<HTMLSelectElement>();
      await render(
        <Select ref={ref} aria-label="language">
          {OPTIONS}
        </Select>,
      );
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });
  });

  describe("interaction", () => {
    test("fires onChange when the user picks a different option", async () => {
      const onChange = vi.fn();
      const screen = await render(
        <Select aria-label="language" onChange={onChange}>
          {OPTIONS}
        </Select>,
      );
      const el = screen.getByRole("combobox");
      await el.selectOptions("bravo");
      expect(onChange).toHaveBeenCalled();
      expect((el.element() as HTMLSelectElement).value).toBe("b");
    });

    // `transition: none` so the reads below land on the destination colour
    // instead of a frame somewhere along the 120ms border-colour fade — the
    // same trick Button.variant-chrome.test.tsx uses.
    test("hovering an enabled select promotes its border to the primary token", async () => {
      const screen = await render(
        <Select aria-label="language" data-testid="sel" style={{ transition: "none" }}>
          {OPTIONS}
        </Select>,
      );
      await withPseudoState('[data-testid="sel"]', ["hover"], async () => {
        const s = getComputedStyle(screen.getByTestId("sel").element());
        expect(s.borderTopColor).toBe(resolveColorToken("--ps1ui-color-primary"));
      });
    });

    test("focusing paints the shared focus ring", async () => {
      const screen = await render(
        <Select aria-label="language" data-testid="sel" style={{ transition: "none" }}>
          {OPTIONS}
        </Select>,
      );
      await withPseudoState('[data-testid="sel"]', ["focus"], async () => {
        const s = getComputedStyle(screen.getByTestId("sel").element());
        expect(s.outlineStyle).toBe("none");
        expect(s.borderTopColor).toBe(resolveColorToken("--ps1ui-color-primary"));
        expect(s.boxShadow).not.toBe("none");
      });
    });
  });

  describe("disabled styling", () => {
    test("dims the control text and swaps to the surface background", async () => {
      const screen = await render(
        <Select aria-label="language" disabled>
          {OPTIONS}
        </Select>,
      );
      const s = getComputedStyle(screen.getByRole("combobox").element());
      expect(s.color).toBe(resolveColorToken("--ps1ui-color-fg-subtle"));
      expect(s.backgroundColor).toBe(resolveColorToken("--ps1ui-color-surface"));
      expect(s.cursor).toBe("not-allowed");
    });

    // The disabled rule sets `background-color`, never the `background`
    // shorthand — the shorthand would reset background-image and silently
    // erase the marker.
    test("keeps the marker and retints it, rather than erasing it", async () => {
      const screen = await render(
        <Select aria-label="language" disabled>
          {OPTIONS}
        </Select>,
      );
      const { backgroundImage } = getComputedStyle(screen.getByRole("combobox").element());
      expect(backgroundImage).toContain("gradient");
      expect(backgroundImage).toContain(resolveColorToken("--ps1ui-color-fg-subtle"));
      expect(backgroundImage).not.toContain(resolveColorToken("--ps1ui-color-fg-muted"));
    });
  });

  describe("a11y", () => {
    type A11yCase = {
      name: string;
      node: () => ReactElement;
      interact?: (screen: Screen) => Promise<void>;
    };

    const GROUPED = (
      <optgroup label="scripting">
        <option value="a">alpha</option>
        <option value="b">bravo</option>
      </optgroup>
    );

    const labelStrategies = [
      {
        key: "aria-label",
        render: (extra: Record<string, unknown>, children: ReactElement = OPTIONS) => (
          <Select aria-label="language" {...extra}>
            {children}
          </Select>
        ),
      },
      {
        key: "<label htmlFor>",
        render: (extra: Record<string, unknown>, children: ReactElement = OPTIONS) => (
          <>
            <label htmlFor="language">language</label>
            <Select id="language" {...extra}>
              {children}
            </Select>
          </>
        ),
      },
    ] as const;

    const states = [
      { key: "default", props: {} },
      { key: "disabled", props: { disabled: true } },
      { key: "aria-invalid", props: { "aria-invalid": "true" } },
      { key: "multiple", props: { multiple: true } },
      { key: "grouped", props: {}, children: GROUPED },
    ] as const satisfies readonly {
      key: string;
      props: Record<string, unknown>;
      children?: ReactElement;
    }[];

    const staticCases: A11yCase[] = labelStrategies.flatMap((label): A11yCase[] =>
      states.map(
        (s): A11yCase => ({
          name: `${label.key} / ${s.key}`,
          node: () => label.render(s.props, "children" in s ? s.children : undefined),
        }),
      ),
    );

    const focusedCases: A11yCase[] = labelStrategies.map(
      (label): A11yCase => ({
        name: `${label.key} / focused`,
        node: () => label.render({}),
        interact: async (screen) => {
          (screen.getByRole("combobox").element() as HTMLElement).focus();
        },
      }),
    );

    const cases: A11yCase[] = [...staticCases, ...focusedCases];

    test.for(cases)("$name → no axe violations", async ({ node, interact }) => {
      const screen = await render(node());
      if (interact) await interact(screen);
      await expectNoAxeViolations(screen.container);
    });
  });
});
