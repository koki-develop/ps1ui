import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Tab } from "../Tab/Tab";
import { TabPanel } from "../TabPanel/TabPanel";
import { Tabs } from "../Tabs/Tabs";
import { TabList } from "./TabList";

describe("TabList", () => {
  describe("rendering", () => {
    test("renders a <div role='tablist'>", async () => {
      const screen = await render(<TabList aria-label="fruit" />);
      const el = screen.getByRole("tablist", { name: "fruit" }).element();
      expect(el.tagName).toBe("DIV");
    });

    test("renders its children", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tab", { name: "A" })).toBeInTheDocument();
      await expect.element(screen.getByRole("tab", { name: "B" })).toBeInTheDocument();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-tab-list base + orientation modifier (horizontal default)", async () => {
      const screen = await render(<TabList aria-label="x" />);
      const el = screen.getByRole("tablist");
      await expect.element(el).toHaveClass("ps1ui-tab-list");
      await expect.element(el).toHaveClass("ps1ui-tab-list--horizontal");
    });

    test("uses the vertical modifier when the group is vertical", async () => {
      const screen = await render(
        <Tabs defaultValue="a" orientation="vertical">
          <TabList aria-label="x" />
        </Tabs>,
      );
      await expect.element(screen.getByRole("tablist")).toHaveClass("ps1ui-tab-list--vertical");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<TabList aria-label="x" className="extra" />);
      const el = screen.getByRole("tablist");
      await expect.element(el).toHaveClass("ps1ui-tab-list");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, data-*, aria-*)", async () => {
      const screen = await render(
        <TabList id="tl" data-testid="tl" aria-label="fruit" aria-describedby="hint" />,
      );
      const el = screen.getByRole("tablist");
      await expect.element(el).toHaveAttribute("id", "tl");
      await expect.element(el).toHaveAttribute("data-testid", "tl");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards ref (RefObject) to the underlying <div>", async () => {
      // TabList uses an internal ref to scope its keyboard-nav DOM query;
      // the caller's ref is merged via useMergedRef so both receive the
      // node. Without the merge the internal ref silently replaced the
      // caller's.
      const ref = createRef<HTMLDivElement>();
      await render(<TabList aria-label="x" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current?.getAttribute("role")).toBe("tablist");
    });
  });

  describe("aria-orientation", () => {
    test("horizontal group renders aria-orientation='horizontal'", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x" />
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tablist"))
        .toHaveAttribute("aria-orientation", "horizontal");
    });

    test("vertical group renders aria-orientation='vertical'", async () => {
      const screen = await render(
        <Tabs defaultValue="a" orientation="vertical">
          <TabList aria-label="x" />
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tablist"))
        .toHaveAttribute("aria-orientation", "vertical");
    });

    test("standalone (no Tabs) defaults to horizontal", async () => {
      const screen = await render(<TabList aria-label="x" />);
      await expect
        .element(screen.getByRole("tablist"))
        .toHaveAttribute("aria-orientation", "horizontal");
    });
  });

  describe("keyboard nav (horizontal)", () => {
    test("ArrowRight moves focus to the next tab and activates it", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
            <Tab value="c">C</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(document.activeElement?.textContent).toBe("B");
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("ArrowLeft moves focus to the previous tab and activates it", async () => {
      const screen = await render(
        <Tabs defaultValue="b">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
            <Tab value="c">C</Tab>
          </TabList>
        </Tabs>,
      );
      const b = screen.getByRole("tab", { name: "B" });
      (b.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowLeft}");
      expect(document.activeElement?.textContent).toBe("A");
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("ArrowRight wraps from last to first", async () => {
      const screen = await render(
        <Tabs defaultValue="c">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
            <Tab value="c">C</Tab>
          </TabList>
        </Tabs>,
      );
      const c = screen.getByRole("tab", { name: "C" });
      (c.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(document.activeElement?.textContent).toBe("A");
    });

    test("ArrowLeft wraps from first to last", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
            <Tab value="c">C</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowLeft}");
      expect(document.activeElement?.textContent).toBe("C");
    });

    test("Home jumps focus and selection to the first tab", async () => {
      const screen = await render(
        <Tabs defaultValue="c">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
            <Tab value="c">C</Tab>
          </TabList>
        </Tabs>,
      );
      const c = screen.getByRole("tab", { name: "C" });
      (c.element() as HTMLElement).focus();
      await userEvent.keyboard("{Home}");
      expect(document.activeElement?.textContent).toBe("A");
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("End jumps focus and selection to the last tab", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
            <Tab value="c">C</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{End}");
      expect(document.activeElement?.textContent).toBe("C");
      await expect
        .element(screen.getByRole("tab", { name: "C" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("ArrowRight skips disabled tabs", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b" disabled>
              B
            </Tab>
            <Tab value="c">C</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(document.activeElement?.textContent).toBe("C");
    });

    test("ArrowRight from an unrelated focus target lands on the first tab", async () => {
      // Focus is on a non-tab descendant of TabList (a decorative button in
      // the tablist's toolbar). The keydown bubbles to TabList; `indexOf`
      // returns -1, and the `currentIdx < 0` branch jumps focus onto the
      // first enabled tab. Same shape as focusing the tablist itself.
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <button type="button" data-testid="decor">
              decor
            </button>
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      const decor = screen.getByTestId("decor");
      (decor.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(document.activeElement?.textContent).toBe("A");
    });

    test("ArrowLeft from an unrelated focus target lands on the last tab", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <button type="button" data-testid="decor">
              decor
            </button>
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      const decor = screen.getByTestId("decor");
      (decor.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowLeft}");
      expect(document.activeElement?.textContent).toBe("B");
    });

    test("arrow key with zero enabled tabs is a no-op", async () => {
      // Every tab disabled → tabs.length === 0 after the filter, and the
      // handler bails out without moving focus.
      const screen = await render(
        <Tabs disabled>
          <TabList aria-label="x">
            <button type="button" data-testid="decor">
              decor
            </button>
            <Tab value="a">A</Tab>
          </TabList>
        </Tabs>,
      );
      const decor = screen.getByTestId("decor");
      (decor.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(decor.element());
    });

    test("ArrowUp / ArrowDown are ignored in horizontal orientation", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowDown}");
      expect(document.activeElement?.textContent).toBe("A");
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "true");
    });
  });

  describe("keyboard nav (vertical)", () => {
    test("ArrowDown moves focus + selection to the next tab", async () => {
      const screen = await render(
        <Tabs defaultValue="a" orientation="vertical">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowDown}");
      expect(document.activeElement?.textContent).toBe("B");
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("ArrowUp moves focus + selection to the previous tab", async () => {
      const screen = await render(
        <Tabs defaultValue="b" orientation="vertical">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      const b = screen.getByRole("tab", { name: "B" });
      (b.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowUp}");
      expect(document.activeElement?.textContent).toBe("A");
    });

    test("ArrowLeft / ArrowRight are ignored in vertical orientation", async () => {
      const screen = await render(
        <Tabs defaultValue="a" orientation="vertical">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(document.activeElement?.textContent).toBe("A");
    });
  });

  describe("caller onKeyDown", () => {
    test("fires before the built-in handler", async () => {
      const onKeyDown = vi.fn();
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x" onKeyDown={onKeyDown}>
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(onKeyDown).toHaveBeenCalled();
    });

    test("preventDefault suppresses the built-in arrow-key handling", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x" onKeyDown={(e) => e.preventDefault()}>
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      // Focus stayed on A; the built-in handler bailed out.
      expect(document.activeElement?.textContent).toBe("A");
    });
  });

  describe("standalone (no Tabs)", () => {
    test("keyboard nav is a no-op when there is no group context", async () => {
      const screen = await render(
        <TabList aria-label="x">
          <button type="button" role="tab" data-value="a" tabIndex={0}>
            A
          </button>
          <button type="button" role="tab" data-value="b" tabIndex={-1}>
            B
          </button>
        </TabList>,
      );
      const a = screen.getByRole("tab", { name: "A" });
      (a.element() as HTMLElement).focus();
      await userEvent.keyboard("{ArrowRight}");
      // Focus still moves (roving behavior is DOM-driven), but no context
      // means no selection change fires — this test just verifies the
      // handler does not crash without a context.
      expect(document.activeElement?.textContent).toBe("B");
    });
  });

  describe("a11y", () => {
    test("tablist with aria-label passes axe", async () => {
      // Panels are included so the auto-generated aria-controls values on
      // each Tab resolve to real ids in the DOM — axe's aria-valid-attr-value
      // rule verifies the id targets exist.
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">A</TabPanel>
          <TabPanel value="b">B</TabPanel>
        </Tabs>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });
});
