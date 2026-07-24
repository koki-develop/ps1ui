import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Tab } from "../Tab/Tab";
import { TabList } from "../TabList/TabList";
import { TabPanel } from "../TabPanel/TabPanel";
import { Tabs } from "./Tabs";

describe("Tabs", () => {
  describe("rendering", () => {
    test("renders its children inside a wrapper <div>", async () => {
      const screen = await render(
        <Tabs defaultValue="a" data-testid="root">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
        </Tabs>,
      );
      const el = screen.getByTestId("root").element();
      expect(el.tagName).toBe("DIV");
      await expect.element(screen.getByRole("tablist", { name: "fruit" })).toBeInTheDocument();
      await expect.element(screen.getByRole("tab", { name: "A" })).toBeInTheDocument();
      await expect
        .element(screen.getByRole("tabpanel", { name: "A" }))
        .toHaveTextContent("panel a");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-tabs base class + orientation modifier", async () => {
      const screen = await render(<Tabs defaultValue="a" data-testid="root" />);
      const el = screen.getByTestId("root");
      await expect.element(el).toHaveClass("ps1ui-tabs");
      await expect.element(el).toHaveClass("ps1ui-tabs--horizontal");
    });

    test("uses the vertical modifier when orientation='vertical'", async () => {
      const screen = await render(
        <Tabs defaultValue="a" orientation="vertical" data-testid="root" />,
      );
      await expect.element(screen.getByTestId("root")).toHaveClass("ps1ui-tabs--vertical");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<Tabs defaultValue="a" data-testid="root" className="extra" />);
      const el = screen.getByTestId("root");
      await expect.element(el).toHaveClass("ps1ui-tabs");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, data-*, aria-*)", async () => {
      const screen = await render(
        <Tabs defaultValue="a" id="grp" data-testid="root" aria-describedby="hint" />,
      );
      const el = screen.getByTestId("root");
      await expect.element(el).toHaveAttribute("id", "grp");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });
  });

  describe("uncontrolled", () => {
    test("defaultValue selects the matching tab initially", async () => {
      const screen = await render(
        <Tabs defaultValue="b">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">A</TabPanel>
          <TabPanel value="b">B</TabPanel>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "false");
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
      await expect.element(screen.getByRole("tabpanel", { name: "B" })).toBeVisible();
    });

    test("clicking a tab updates the selection and swaps the visible panel", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
          <TabPanel value="b">panel b</TabPanel>
        </Tabs>,
      );
      await screen.getByRole("tab", { name: "B" }).click();
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "false");
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
      await expect.element(screen.getByRole("tabpanel", { name: "B" })).toBeVisible();
    });

    test("with no defaultValue, falls back to the first enabled tab (WAI-ARIA APG)", async () => {
      // Roving tabindex requires the first tab to be Tab-reachable when
      // nothing is selected — Tabs registers every child <Tab> via context
      // and derives a fallback selection from insertion order so the group
      // is never keyboard-unreachable.
      const screen = await render(
        <Tabs>
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
          <TabPanel value="b">panel b</TabPanel>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "true");
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "false");
      await expect.element(screen.getByRole("tabpanel", { name: "A" })).toBeVisible();
    });

    test("fallback skips disabled tabs", async () => {
      const screen = await render(
        <Tabs>
          <TabList aria-label="fruit">
            <Tab value="a" disabled>
              A
            </Tab>
            <Tab value="b">B</Tab>
            <Tab value="c">C</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
          <TabPanel value="b">panel b</TabPanel>
          <TabPanel value="c">panel c</TabPanel>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("fallback yields when every tab is disabled", async () => {
      // Group-wide disable + no explicit value → no fallback exists. The
      // tablist is genuinely unreachable, which is the correct outcome
      // (there's nothing to activate).
      const screen = await render(
        <Tabs disabled>
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "false");
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "false");
    });

    test("fallback loses to an explicit defaultValue", async () => {
      const screen = await render(
        <Tabs defaultValue="b">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("fallback loses to a controlled value", async () => {
      const onValueChange = vi.fn();
      const screen = await render(
        <Tabs value="b" onValueChange={onValueChange}>
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
    });
  });

  describe("controlled", () => {
    test("value prop drives which tab is selected and ignores clicks", async () => {
      const onValueChange = vi.fn();
      const screen = await render(
        <Tabs value="a" onValueChange={onValueChange}>
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
          <TabPanel value="b">panel b</TabPanel>
        </Tabs>,
      );
      await screen.getByRole("tab", { name: "B" }).click();
      expect(onValueChange).toHaveBeenCalledWith("b");
      // Selection is frozen — controlled parent never lifted the value into props.
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("re-renders reflect an externally lifted value", async () => {
      const Ctl = () => {
        const [v, setV] = useState("a");
        return (
          <>
            <button type="button" onClick={() => setV("b")}>
              switch
            </button>
            <Tabs value={v}>
              <TabList aria-label="fruit">
                <Tab value="a">A</Tab>
                <Tab value="b">B</Tab>
              </TabList>
              <TabPanel value="a">panel a</TabPanel>
              <TabPanel value="b">panel b</TabPanel>
            </Tabs>
          </>
        );
      };
      const screen = await render(<Ctl />);
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "true");
      await screen.getByRole("button", { name: "switch" }).click();
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
    });
  });

  describe("onValueChange", () => {
    test("fires with the newly-selected value when a tab is clicked", async () => {
      const onValueChange = vi.fn();
      const screen = await render(
        <Tabs defaultValue="a" onValueChange={onValueChange}>
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">A</TabPanel>
          <TabPanel value="b">B</TabPanel>
        </Tabs>,
      );
      await screen.getByRole("tab", { name: "B" }).click();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith("b");
    });

    test("clicks still update internal state when the handler is omitted", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
          <TabPanel value="b">panel b</TabPanel>
        </Tabs>,
      );
      await screen.getByRole("tab", { name: "B" }).click();
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
    });
  });

  describe("disabled", () => {
    test("disables every child tab", async () => {
      const screen = await render(
        <Tabs defaultValue="a" disabled>
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tab", { name: "A" })).toBeDisabled();
      await expect.element(screen.getByRole("tab", { name: "B" })).toBeDisabled();
    });

    test("does not disable tabs when omitted", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
          </TabList>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tab", { name: "A" })).not.toBeDisabled();
    });

    test("a group-wide disable cannot be opted out of by a per-tab disabled={false}", async () => {
      const screen = await render(
        <Tabs defaultValue="a" disabled>
          <TabList aria-label="fruit">
            <Tab value="a" disabled={false}>
              A
            </Tab>
          </TabList>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tab", { name: "A" })).toBeDisabled();
    });
  });

  describe("id linking", () => {
    test("Tab and TabPanel share a stable id namespace so aria-controls / aria-labelledby link up", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="fruit">
            <Tab value="a">A</Tab>
          </TabList>
          <TabPanel value="a">panel a</TabPanel>
        </Tabs>,
      );
      const tab = screen.getByRole("tab", { name: "A" }).element();
      const panel = screen.getByRole("tabpanel", { name: "A" }).element();
      const tabId = tab.getAttribute("id");
      const panelId = panel.getAttribute("id");
      expect(tabId).toBeTruthy();
      expect(panelId).toBeTruthy();
      expect(tab.getAttribute("aria-controls")).toBe(panelId);
      expect(panel.getAttribute("aria-labelledby")).toBe(tabId);
    });
  });

  describe("a11y", () => {
    test("tablist + tabs + visible panel passes axe", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="fruit">
            <Tab value="a">apple</Tab>
            <Tab value="b">banana</Tab>
          </TabList>
          <TabPanel value="a">apple panel</TabPanel>
          <TabPanel value="b">banana panel</TabPanel>
        </Tabs>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });
});
