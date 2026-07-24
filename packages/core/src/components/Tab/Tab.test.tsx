import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { TabList } from "../TabList/TabList";
import { TabPanel } from "../TabPanel/TabPanel";
import { Tabs } from "../Tabs/Tabs";
import { Tab } from "./Tab";

describe("Tab", () => {
  describe("rendering", () => {
    test("renders a <button role='tab' type='button'>", async () => {
      const screen = await render(<Tab value="a">A</Tab>);
      const el = screen.getByRole("tab", { name: "A" }).element();
      expect(el.tagName).toBe("BUTTON");
      expect(el.getAttribute("type")).toBe("button");
    });

    test("keeps type='button' even without a <Tabs> ancestor", async () => {
      // Same defensive default as <Button> — a Tab inside a <form> must
      // never submit implicitly.
      const screen = await render(<Tab value="a">A</Tab>);
      await expect.element(screen.getByRole("tab")).toHaveAttribute("type", "button");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-tab base class", async () => {
      const screen = await render(<Tab value="a">A</Tab>);
      await expect.element(screen.getByRole("tab")).toHaveClass("ps1ui-tab");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Tab value="a" className="extra">
          A
        </Tab>,
      );
      const el = screen.getByRole("tab");
      await expect.element(el).toHaveClass("ps1ui-tab");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, data-*, aria-*)", async () => {
      const screen = await render(
        <Tab value="a" id="t" data-testid="t" aria-describedby="hint">
          A
        </Tab>,
      );
      const el = screen.getByRole("tab");
      // id is overridable — caller supplied one takes precedence over the
      // auto-generated one.
      await expect.element(el).toHaveAttribute("id", "t");
      await expect.element(el).toHaveAttribute("data-testid", "t");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("caller-supplied aria-controls overrides the auto-generated one", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a" aria-controls="custom">
              A
            </Tab>
          </TabList>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-controls", "custom");
    });

    test("forwards ref (RefObject) to the underlying <button>", async () => {
      const ref = createRef<HTMLButtonElement>();
      await render(
        <Tab value="a" ref={ref}>
          A
        </Tab>,
      );
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.getAttribute("role")).toBe("tab");
    });

    test("forwards disabled", async () => {
      const screen = await render(
        <Tab value="a" disabled>
          A
        </Tab>,
      );
      await expect.element(screen.getByRole("tab")).toBeDisabled();
    });
  });

  describe("standalone (no Tabs)", () => {
    test("aria-selected defaults to false", async () => {
      const screen = await render(<Tab value="a">A</Tab>);
      await expect.element(screen.getByRole("tab")).toHaveAttribute("aria-selected", "false");
    });

    test("the `selected` prop drives aria-selected when no Tabs is above", async () => {
      const screen = await render(
        <Tab value="a" selected>
          A
        </Tab>,
      );
      await expect.element(screen.getByRole("tab")).toHaveAttribute("aria-selected", "true");
    });

    test("selected tab has tabIndex=0, unselected -1 (roving)", async () => {
      const screen = await render(
        <>
          <Tab value="a" selected data-testid="on">
            A
          </Tab>
          <Tab value="b" data-testid="off">
            B
          </Tab>
        </>,
      );
      await expect.element(screen.getByTestId("on")).toHaveAttribute("tabindex", "0");
      await expect.element(screen.getByTestId("off")).toHaveAttribute("tabindex", "-1");
    });

    test("caller onClick still fires", async () => {
      const onClick = vi.fn();
      const screen = await render(
        <Tab value="a" onClick={onClick}>
          A
        </Tab>,
      );
      await screen.getByRole("tab").click();
      expect(onClick).toHaveBeenCalled();
    });
  });

  describe("inside Tabs", () => {
    test("aria-selected reflects context.value === value", async () => {
      const screen = await render(
        <Tabs defaultValue="b">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "A" }))
        .toHaveAttribute("aria-selected", "false");
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "true");
    });

    test("the group's `selected` fallback is ignored (context wins)", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b" selected>
              B
            </Tab>
          </TabList>
        </Tabs>,
      );
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("aria-selected", "false");
    });

    test("tabIndex is 0 only for the selected tab (roving)", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tab", { name: "A" })).toHaveAttribute("tabindex", "0");
      await expect
        .element(screen.getByRole("tab", { name: "B" }))
        .toHaveAttribute("tabindex", "-1");
    });

    test("aria-controls links to `${idBase}-panel-${value}`", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
          </TabList>
          <TabPanel value="a">panel</TabPanel>
        </Tabs>,
      );
      const controls = screen.getByRole("tab").element().getAttribute("aria-controls");
      const panelId = screen.getByRole("tabpanel").element().getAttribute("id");
      expect(controls).toBe(panelId);
    });

    test("group-wide disable propagates when the per-tab disabled is not set", async () => {
      const screen = await render(
        <Tabs defaultValue="a" disabled>
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
          </TabList>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tab")).toBeDisabled();
    });

    test("per-tab disable still opts in when the group is enabled", async () => {
      const screen = await render(
        <Tabs defaultValue="a">
          <TabList aria-label="x">
            <Tab value="a" disabled>
              A
            </Tab>
            <Tab value="b">B</Tab>
          </TabList>
        </Tabs>,
      );
      await expect.element(screen.getByRole("tab", { name: "A" })).toBeDisabled();
      await expect.element(screen.getByRole("tab", { name: "B" })).not.toBeDisabled();
    });

    test("caller onClick fires alongside the group handler", async () => {
      const onClick = vi.fn();
      const onValueChange = vi.fn();
      const screen = await render(
        <Tabs defaultValue="a" onValueChange={onValueChange}>
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b" onClick={onClick}>
              B
            </Tab>
          </TabList>
        </Tabs>,
      );
      await screen.getByRole("tab", { name: "B" }).click();
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("b");
    });

    test("caller onClick can preventDefault to stop the group's update", async () => {
      // Escape hatch: the caller inspects the event and, if it should not be
      // propagated to the group, calls preventDefault() — proving the "group
      // handler runs only when the caller didn't preventDefault" branch in Tab.
      const onValueChange = vi.fn();
      const screen = await render(
        <Tabs defaultValue="a" onValueChange={onValueChange}>
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b" onClick={(e) => e.preventDefault()}>
              B
            </Tab>
          </TabList>
        </Tabs>,
      );
      await screen.getByRole("tab", { name: "B" }).click();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    test("clicking a disabled tab does not fire onValueChange", async () => {
      const onValueChange = vi.fn();
      const screen = await render(
        <Tabs defaultValue="a" onValueChange={onValueChange}>
          <TabList aria-label="x">
            <Tab value="a">A</Tab>
            <Tab value="b" disabled>
              B
            </Tab>
          </TabList>
        </Tabs>,
      );
      // Native `disabled` swallows the click at the browser layer, so this
      // is really an integration check that we don't circumvent it.
      const b = screen.getByRole("tab", { name: "B" }).element() as HTMLButtonElement;
      b.click();
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe("a11y", () => {
    test("tab inside a labelled tablist passes axe", async () => {
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
