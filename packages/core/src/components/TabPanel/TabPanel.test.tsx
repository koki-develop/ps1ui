import { createRef, useState } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Button } from "../Button/Button";
import { Tab } from "../Tab/Tab";
import { TabList } from "../TabList/TabList";
import { Tabs } from "../Tabs/Tabs";
import { TabPanel } from "./TabPanel";

describe("TabPanel", () => {
  describe("rendering", () => {
    test("renders a <div role='tabpanel'>", async () => {
      const screen = await render(
        <TabPanel value="a" aria-label="panel a">
          content
        </TabPanel>,
      );
      const el = screen.getByRole("tabpanel", { name: "panel a" }).element();
      expect(el.tagName).toBe("DIV");
      expect(el.textContent).toBe("content");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-tab-panel base class", async () => {
      const screen = await render(<TabPanel value="a" aria-label="a" />);
      await expect.element(screen.getByRole("tabpanel")).toHaveClass("ps1ui-tab-panel");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<TabPanel value="a" aria-label="a" className="extra" />);
      const el = screen.getByRole("tabpanel");
      await expect.element(el).toHaveClass("ps1ui-tab-panel");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, data-*, aria-*)", async () => {
      const screen = await render(
        <TabPanel value="a" id="p" data-testid="p" aria-label="a" aria-describedby="hint" />,
      );
      const el = screen.getByRole("tabpanel");
      await expect.element(el).toHaveAttribute("id", "p");
      await expect.element(el).toHaveAttribute("data-testid", "p");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("caller-supplied aria-labelledby overrides the auto-generated one", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
          </TabList>
          <TabPanel value="a" aria-labelledby="custom">
            panel
          </TabPanel>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tabpanel"))
        .toHaveAttribute("aria-labelledby", "custom");
    });

    test("respects a caller-supplied tabIndex", async () => {
      // Even when the panel has focusable descendants (which would otherwise
      // suppress the auto-tabIndex), a caller-supplied tabIndex is honored
      // verbatim.
      const screen = await render(
        <TabPanel value="a" aria-label="a" tabIndex={-1}>
          <Button>focusable</Button>
        </TabPanel>,
      );
      await expect.element(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "-1");
    });

    test("forwards ref (RefObject) to the underlying <div>", async () => {
      // TabPanel keeps an internal ref for the focusable-descendant scan;
      // the caller's ref is merged via useMergedRef so both receive the
      // node. Without the merge the internal ref silently replaced the
      // caller's.
      const ref = createRef<HTMLDivElement>();
      await render(<TabPanel value="a" aria-label="a" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
      expect(ref.current?.getAttribute("role")).toBe("tabpanel");
    });
  });

  describe("auto tabIndex", () => {
    test("adds tabindex=0 when the visible panel has no focusable descendants", async () => {
      // WAI-ARIA APG: a tabpanel with no focusable content should carry
      // tabindex=0 so keyboard users can still reach the content. TabPanel
      // scans its descendants on mount and applies tabindex=0 when the
      // scan returns nothing.
      const screen = await render(
        <TabPanel value="a" aria-label="a">
          Plain text with no focusable descendants.
        </TabPanel>,
      );
      await expect.element(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "0");
    });

    test("omits tabindex when the panel has a focusable descendant", async () => {
      const screen = await render(
        <TabPanel value="a" aria-label="a">
          <Button>focusable</Button>
        </TabPanel>,
      );
      const el = screen.getByRole("tabpanel").element();
      expect(el.hasAttribute("tabindex")).toBe(false);
    });

    test("hidden panels do not receive an auto tabindex", async () => {
      // A hidden panel is out of the a11y tree — adding tabindex=0 would be
      // pointless (the element is display:none) and could re-appear if the
      // consumer toggles `hidden` back on without triggering a rescan.
      const screen = await render(
        <Tabs defaultValue="b">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a" data-testid="hidden-panel">
            plain content
          </TabPanel>
          <TabPanel value="b">plain content</TabPanel>
        </Tabs>,
      );
      const hidden = screen.getByTestId("hidden-panel").element();
      expect(hidden.hasAttribute("hidden")).toBe(true);
      expect(hidden.hasAttribute("tabindex")).toBe(false);
    });

    test("re-scans when the visible content changes focusability", async () => {
      // The layout effect runs after every commit, so toggling a child from
      // non-focusable to focusable updates the auto tabindex on the next
      // render — no MutationObserver required for React-driven changes.
      const Fixture = () => {
        const [hasButton, setHasButton] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setHasButton((v) => !v)} data-testid="toggle">
              toggle
            </button>
            <TabPanel value="a" aria-label="a" data-testid="panel">
              {hasButton ? <Button>focusable</Button> : "plain"}
            </TabPanel>
          </>
        );
      };

      const screen = await render(<Fixture />);
      const panel = screen.getByTestId("panel");
      await expect.element(panel).toHaveAttribute("tabindex", "0");
      await screen.getByTestId("toggle").click();
      const el = panel.element();
      expect(el.hasAttribute("tabindex")).toBe(false);
    });
  });

  describe("vertical orientation", () => {
    test("adds the vertical modifier class when the group is vertical", async () => {
      const screen = await render(
        <Tabs defaultValue="a" orientation="vertical">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
          </TabList>
          <TabPanel value="a">panel</TabPanel>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tabpanel")).toHaveClass("ps1ui-tab-panel--vertical");
    });

    test("omits the vertical modifier class when the group is horizontal", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
          </TabList>
          <TabPanel value="a">panel</TabPanel>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tabpanel"))
        .not.toHaveClass("ps1ui-tab-panel--vertical");
    });

    test("survives an intermediate wrapper between TabList and TabPanel", async () => {
      // Regression net for the old sibling-selector styling — a routing /
      // animation wrapper between TabList and TabPanel used to break the
      // vertical padding. Class-on-the-element rides through any wrapper.
      const screen = await render(
        <Tabs defaultValue="a" orientation="vertical">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
          </TabList>
          <div>
            <TabPanel value="a">panel</TabPanel>
          </div>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tabpanel")).toHaveClass("ps1ui-tab-panel--vertical");
    });
  });

  describe("standalone (no Tabs)", () => {
    test("hidden defaults to false so the caller sees the panel", async () => {
      const screen = await render(
        <TabPanel value="a" aria-label="a">
          content
        </TabPanel>,
      );
      await expect.element(screen.getByRole("tabpanel")).toBeVisible();
    });

    test("the caller can pin hidden={true} to keep it out of the a11y tree", async () => {
      const screen = await render(
        <TabPanel value="a" aria-label="a" hidden>
          content
        </TabPanel>,
      );
      // hidden panels are removed from the a11y tree — getByRole would miss them.
      const el = screen.container.querySelector('[role="tabpanel"]');
      expect(el?.hasAttribute("hidden")).toBe(true);
    });
  });

  describe("inside Tabs", () => {
    test("panel matching the selected value is visible", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
          <TabPanel value="b">panel b</TabPanel>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tabpanel", { name: "A" })).toBeVisible();
    });

    test("non-matching panels carry the hidden attribute", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a" data-testid="pa">
            panel a
          </TabPanel>
          <TabPanel value="b" data-testid="pb">
            panel b
          </TabPanel>
        </Tabs>,
      );
      expect(screen.getByTestId("pa").element().hasAttribute("hidden")).toBe(false);
      expect(screen.getByTestId("pb").element().hasAttribute("hidden")).toBe(true);
    });

    test("aria-labelledby resolves to the owning tab's id", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
          </TabList>
          <TabPanel value="a">panel</TabPanel>
        </Tabs>,
      );
      const tabId = screen.getByRole("tab").element().getAttribute("id");
      const labelledBy = screen.getByRole("tabpanel").element().getAttribute("aria-labelledby");
      expect(labelledBy).toBe(tabId);
    });

    test("context wins over caller-supplied hidden", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          {/* Caller asked for hidden={false} but the group's value is 'a' —
              the context wins so this stays hidden. */}
          <TabPanel value="b" hidden={false} data-testid="pb">
            panel b
          </TabPanel>
        </Tabs>,
      );
      expect(screen.getByTestId("pb").element().hasAttribute("hidden")).toBe(true);
    });
  });

  describe("a11y", () => {
    test("panel inside a Tabs group passes axe", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="fruit">
            <Tab value="a">apple</Tab>
          </TabList>
          <TabPanel value="a">apple content</TabPanel>
        </Tabs>,
      );
      await expectNoAxeViolations(screen.container);
    });

    test("standalone panel with aria-label passes axe", async () => {
      const screen = await render(
        <TabPanel value="a" aria-label="apple">
          apple content
        </TabPanel>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });
});
