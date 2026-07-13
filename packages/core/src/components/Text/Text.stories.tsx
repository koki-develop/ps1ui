import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "../Input/Input";
import { Text } from "./Text";

const meta = {
  title: "Components/Text",
  component: Text,
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["body", "muted", "subtle", "primary", "accent"],
    },
    size: {
      control: { type: "select" },
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    weight: {
      control: { type: "select" },
      options: ["regular", "medium", "semibold", "bold"],
    },
    truncate: { control: "boolean" },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "the quick brown fox jumps over the lazy dog",
  },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Text variant="body">body — default foreground</Text>
      <Text variant="muted">muted — secondary foreground</Text>
      <Text variant="subtle">subtle — least emphasis</Text>
      <Text variant="primary">primary — accent green</Text>
      <Text variant="accent">accent — accent orange</Text>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Text size="xs">xs — 11px</Text>
      <Text size="sm">sm — 13px</Text>
      <Text size="md">md — 15px</Text>
      <Text size="lg">lg — 18px</Text>
      <Text size="xl">xl — 22px</Text>
    </div>
  ),
};

export const Weights: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Text weight="regular">regular</Text>
      <Text weight="medium">medium</Text>
      <Text weight="semibold">semibold</Text>
      <Text weight="bold">bold</Text>
    </div>
  ),
};

export const AsElement: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Text as="label" htmlFor="email" weight="medium">
        email address
      </Text>
      <Input id="email" placeholder="you@example.com" />
      <Text as="span" variant="muted" size="xs">
        inline span, e.g. for helper copy next to a field
      </Text>
    </div>
  ),
};

export const Truncate: Story = {
  args: {
    truncate: true,
    style: { maxWidth: 200 },
    children:
      "this is a long line of text that will be truncated with an ellipsis",
  },
};
