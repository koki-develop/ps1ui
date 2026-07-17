import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../Card/Card";
import { Text } from "../Text/Text";
import { Code } from "./Code";

const meta = {
  title: "Components/Code",
  component: Code,
  argTypes: {
    children: { control: "text" },
  },
} satisfies Meta<typeof Code>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "useState()",
  },
};

// Chip auto-scales via `font-size: 0.9em` so it matches the surrounding
// text's size without overriding Text's own size axis.
export const InText: Story = {
  render: () => (
    <Text style={{ maxWidth: 520 }}>
      Call <Code>useState()</Code> to add local state, or <Code>useReducer()</Code> when the
      transitions get complex. Types live in <Code>@types/react</Code>.
    </Text>
  ),
};

// Bigger surrounding text — proves the em-relative sizing keeps the chip
// visually paired with the parent text.
export const InLargeText: Story = {
  render: () => (
    <Text size="xl" style={{ maxWidth: 520 }}>
      The <Code>--ps1ui-color-primary</Code> token drives every accent surface.
    </Text>
  ),
};

// On a Card so the chip sits on `--ps1ui-color-surface` twice. The chip's own
// background matches the card exactly by design — the border is what
// delineates the chip from the surrounding surface.
export const OnSurface: Story = {
  render: () => (
    <Card style={{ maxWidth: 420 }}>
      <Text>
        Run <Code>pnpm dev</Code> to start the dev server, then edit{" "}
        <Code>packages/site/src/pages/index.astro</Code>.
      </Text>
    </Card>
  ),
};

// Long identifiers wrap within a narrow container instead of forcing a
// horizontal scrollbar on the parent — driven by `overflow-wrap: anywhere`.
export const LongIdentifier: Story = {
  render: () => (
    <div style={{ maxWidth: 200 }}>
      <Text>
        See <Code>packages/core/src/components/CodeBlock/CodeBlock.tsx</Code> for the full
        implementation.
      </Text>
    </div>
  ),
};
