import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Image } from "./Image";

const SAMPLE_SRC =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'><rect width='4' height='4' fill='%237ee787'/></svg>";

describe("Image", () => {
  describe("rendering", () => {
    test("renders an <img> with the given src and alt", async () => {
      const screen = await render(<Image src={SAMPLE_SRC} alt="green square" data-testid="i" />);
      const el = screen.getByTestId("i").element() as HTMLImageElement;
      expect(el.tagName.toLowerCase()).toBe("img");
      expect(el.getAttribute("src")).toBe(SAMPLE_SRC);
      expect(el.getAttribute("alt")).toBe("green square");
    });

    test('preserves alt="" for decorative images', async () => {
      const screen = await render(<Image src={SAMPLE_SRC} alt="" data-testid="i" />);
      const el = screen.getByTestId("i").element();
      expect(el.getAttribute("alt")).toBe("");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-image base class", async () => {
      const screen = await render(<Image src={SAMPLE_SRC} alt="" data-testid="i" />);
      await expect.element(screen.getByTestId("i")).toHaveClass("ps1ui-image");
    });

    test("does not emit a variant modifier for the default (plain) variant", async () => {
      const screen = await render(<Image src={SAMPLE_SRC} alt="" data-testid="i" />);
      const el = screen.getByTestId("i").element();
      expect(el.className).toBe("ps1ui-image");
    });

    test('emits ps1ui-image--bordered for variant="bordered"', async () => {
      const screen = await render(
        <Image src={SAMPLE_SRC} alt="" variant="bordered" data-testid="i" />,
      );
      const el = screen.getByTestId("i");
      await expect.element(el).toHaveClass("ps1ui-image");
      await expect.element(el).toHaveClass("ps1ui-image--bordered");
    });

    test("merges caller-supplied className without dropping any generated class", async () => {
      const screen = await render(
        <Image src={SAMPLE_SRC} alt="" variant="bordered" className="extra" data-testid="i" />,
      );
      const el = screen.getByTestId("i");
      await expect.element(el).toHaveClass("ps1ui-image");
      await expect.element(el).toHaveClass("ps1ui-image--bordered");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("computed styles", () => {
    test('variant="bordered" paints the token-driven border', async () => {
      const screen = await render(
        <Image src={SAMPLE_SRC} alt="" variant="bordered" data-testid="i" />,
      );
      const el = screen.getByTestId("i").element();
      const cs = getComputedStyle(el);
      expect(cs.borderTopStyle).toBe("solid");
      expect(cs.borderTopWidth).toBe("1px");
    });
  });

  describe("passthrough", () => {
    test("forwards native <img> attributes (id, width, height, loading, decoding, srcset, sizes, data-*)", async () => {
      const screen = await render(
        <Image
          id="hero"
          src={SAMPLE_SRC}
          alt="hero"
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          srcSet={`${SAMPLE_SRC} 1x`}
          sizes="64px"
          data-testid="i"
        />,
      );
      const el = screen.getByTestId("i");
      await expect.element(el).toHaveAttribute("id", "hero");
      await expect.element(el).toHaveAttribute("width", "64");
      await expect.element(el).toHaveAttribute("height", "64");
      await expect.element(el).toHaveAttribute("loading", "lazy");
      await expect.element(el).toHaveAttribute("decoding", "async");
      await expect.element(el).toHaveAttribute("srcset", `${SAMPLE_SRC} 1x`);
      await expect.element(el).toHaveAttribute("sizes", "64px");
    });

    test("forwards the style attribute", async () => {
      const screen = await render(
        <Image src={SAMPLE_SRC} alt="" style={{ opacity: 0.5 }} data-testid="i" />,
      );
      const el = screen.getByTestId("i").element() as HTMLImageElement;
      expect(el.style.opacity).toBe("0.5");
    });
  });

  describe("a11y", () => {
    test("no axe violations with meaningful alt", async () => {
      const screen = await render(<Image src={SAMPLE_SRC} alt="green square" />);
      await expectNoAxeViolations(screen.container);
    });

    test('no axe violations with alt="" (decorative)', async () => {
      const screen = await render(<Image src={SAMPLE_SRC} alt="" />);
      await expectNoAxeViolations(screen.container);
    });
  });
});
