// Regression net for the pointer-cursor affordance of every interactive
// component.
//
// The reset in styles/base.css deliberately does NOT set `cursor` on `button`
// (no UA gives a bare <button> a pointer, so supplying one is a preference
// imposed on the consumer's own markup, not a cross-browser normalization).
// That makes each component the sole owner of its own affordance, and nothing
// else covers it: VRT screenshots never capture the cursor, and the unit
// suites don't load CSS.
//
// One file for all components — styles.css is imported here so computed
// values are real, and keeping that import out of the per-component unit
// suites keeps their axe runs free of the colour-contrast checks that
// *.contrast.test.tsx owns.

import "./styles.css";

import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { Anchor } from "../components/Anchor/Anchor";
import { Badge } from "../components/Badge/Badge";
import { Button } from "../components/Button/Button";
import { Checkbox } from "../components/Checkbox/Checkbox";
import { Details } from "../components/Details/Details";
import { Radio } from "../components/Radio/Radio";
import { Switch } from "../components/Switch/Switch";
import { Tab } from "../components/Tab/Tab";
import { TabList } from "../components/TabList/TabList";
import { Tabs } from "../components/Tabs/Tabs";

const CASES = [
  { name: "Button", selector: ".ps1ui-button", ui: <Button>go</Button> },
  {
    name: "Tab",
    selector: ".ps1ui-tab",
    ui: (
      <Tabs defaultValue="a">
        <TabList aria-label="fixture">
          <Tab value="a">Tab</Tab>
        </TabList>
      </Tabs>
    ),
  },
  // Only the button/anchor form is interactive — a static <span> Badge
  // matches no cursor rule, which is the point of Badge's :where(button, a).
  { name: "Badge as=button", selector: ".ps1ui-badge", ui: <Badge as="button">apply</Badge> },
  { name: "Anchor", selector: ".ps1ui-anchor", ui: <Anchor href="/x">link</Anchor> },
  {
    name: "Details summary",
    selector: ".ps1ui-details__summary",
    ui: <Details summary="Section">body copy</Details>,
  },
  { name: "Checkbox", selector: ".ps1ui-checkbox", ui: <Checkbox aria-label="agree" /> },
  { name: "Radio", selector: ".ps1ui-radio", ui: <Radio aria-label="pick" /> },
  { name: "Switch", selector: ".ps1ui-switch", ui: <Switch aria-label="notifications" /> },
] as const satisfies ReadonlyArray<{ name: string; selector: string; ui: ReactElement }>;

describe("interactive components own their pointer cursor", () => {
  test.for(CASES)("$name has cursor: pointer", async ({ selector, ui }) => {
    const screen = await render(ui);
    const el = screen.container.querySelector(selector);
    if (!el) throw new Error(`no element matched ${selector}`);
    expect(getComputedStyle(el).cursor).toBe("pointer");
  });
});
