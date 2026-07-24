import type { Meta, StoryObj } from "@storybook/react-vite";

import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Divider } from "./Divider";

const meta = {
  title: "Components/Divider",
  component: Divider,
  argTypes: {
    orientation: {
      control: { type: "inline-radio" },
      options: ["horizontal", "vertical"],
    },
    variant: {
      control: { type: "inline-radio" },
      options: ["solid", "dashed", "dotted"],
    },
  },
} satisfies Meta<typeof Divider>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div style={{ width: 320 }}>
      <Text>Section above.</Text>
      <Divider {...args} />
      <Text>Section below.</Text>
    </div>
  ),
};

// Border-style comparison — the three variants side-by-side so the visual
// weight difference is obvious at a glance.
export const Variants: Story = {
  render: () => (
    <Stack gap="lg" style={{ width: 320 }}>
      {(["solid", "dashed", "dotted"] as const).map((variant) => (
        <Stack key={variant} gap="xs">
          <Text variant="muted">{variant}</Text>
          <Divider variant={variant} />
        </Stack>
      ))}
    </Stack>
  ),
};

// Vertical rule inside a horizontal Stack — the toolbar pattern. The row's
// cross-axis height (driven by Text's line-box) is what the rule stretches
// against via `align-self: stretch`.
export const VerticalInRow: Story = {
  render: () => (
    <Stack direction="row" gap="md" align="center">
      <Text>File</Text>
      <Divider orientation="vertical" />
      <Text>Edit</Text>
      <Divider orientation="vertical" />
      <Text>View</Text>
    </Stack>
  ),
};

// Vertical rule variants side-by-side. Flat row (label / rule / label / …)
// instead of nested Stacks — a nested `ps1ui-stack` inherits the shared
// `align-self: stretch; min-width: 0` defence and collapses inside a
// `direction="row"` parent, which visually overlaps the labels. The parent
// Stack pins a fixed height so each vertical rule has cross-axis space to
// stretch against.
export const VerticalVariants: Story = {
  render: () => (
    <Stack direction="row" gap="md" align="center" style={{ height: 60 }}>
      <Text variant="muted">solid</Text>
      <Divider orientation="vertical" variant="solid" />
      <Text variant="muted">dashed</Text>
      <Divider orientation="vertical" variant="dashed" />
      <Text variant="muted">dotted</Text>
      <Divider orientation="vertical" variant="dotted" />
    </Stack>
  ),
};
