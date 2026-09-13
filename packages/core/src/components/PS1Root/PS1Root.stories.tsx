import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button/Button";
import { Card } from "../Card/Card";
import { Text } from "../Text/Text";
import { PS1Root } from "./PS1Root";

const meta = {
  title: "Components/PS1Root",
  component: PS1Root,
} satisfies Meta<typeof PS1Root>;

export default meta;

type Story = StoryObj<typeof meta>;

// PS1Root has no ink of its own — it establishes a responsive containment
// context so that descendant components with responsive props can query the
// nearest ancestor's inline-size. The Card marker inside makes the wrapper
// area visible in the story canvas.
export const Default: Story = {
  render: () => (
    <PS1Root>
      <Card style={{ padding: 12 }}>
        <Text>
          PS1Root wraps an app tree once at the top level to enable responsive props on descendant
          components. It renders a transparent &lt;div&gt; and adds no visual ink.
        </Text>
      </Card>
    </PS1Root>
  ),
};

// `theme` scopes `data-ps1ui-theme` (and the `color-scheme` it sets) to a
// PS1Root subtree — nesting two of them here, each painting its own canvas,
// makes that scoping visible in one story. A themed PS1Root paints its own
// background and text color (see PS1Root.css), so no inline background is
// needed here — that's the whole point being demonstrated. This also gives
// the storybook Vitest project's axe run a light-themed fixture, alongside
// the `*.contrast.test.tsx` files that check contrast ratios.
// The wrapper is `display: grid`, not `flex`: each nested PS1Root is a query
// container (`container-type: inline-size`), which per PS1Root's own header
// comment collapses its intrinsic inline size to 0 on the flex main axis —
// grid tracks give each PS1Root a definite size that containment can't erase.
export const Themes: Story = {
  render: () => (
    <PS1Root>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <PS1Root theme="light" style={{ padding: 16 }}>
          <Card style={{ padding: 12 }}>
            <Text>Light theme</Text>
            <Button>Primary</Button>
          </Card>
        </PS1Root>
        <PS1Root theme="dark" style={{ padding: 16 }}>
          <Card style={{ padding: 12 }}>
            <Text>Dark theme</Text>
            <Button>Primary</Button>
          </Card>
        </PS1Root>
      </div>
    </PS1Root>
  ),
};
