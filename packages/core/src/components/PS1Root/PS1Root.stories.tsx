import type { Meta, StoryObj } from "@storybook/react-vite";

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
