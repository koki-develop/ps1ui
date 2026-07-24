import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../Card/Card";
import { Input } from "../Input/Input";
import { PS1Root } from "../PS1Root/PS1Root";
import { Stack } from "../Stack/Stack";
import { Text } from "./Text";

const meta = {
  title: "Components/Text",
  component: Text,
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["body", "muted", "subtle", "primary", "accent", "danger"],
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
    <Stack gap="sm">
      <Text variant="body">body — default foreground</Text>
      <Text variant="muted">muted — secondary foreground</Text>
      <Text variant="subtle">subtle — least emphasis</Text>
      <Text variant="primary">primary — accent green</Text>
      <Text variant="accent">accent — accent orange</Text>
      <Text variant="danger">danger — destructive / error</Text>
    </Stack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="sm">
      <Text size="xs">xs — 12px</Text>
      <Text size="sm">sm — 14px</Text>
      <Text size="md">md — 16px</Text>
      <Text size="lg">lg — 18px</Text>
      <Text size="xl">xl — 22px</Text>
    </Stack>
  ),
};

export const Weights: Story = {
  render: () => (
    <Stack gap="sm">
      <Text weight="regular">regular</Text>
      <Text weight="medium">medium</Text>
      <Text weight="semibold">semibold</Text>
      <Text weight="bold">bold</Text>
    </Stack>
  ),
};

export const AsElement: Story = {
  render: () => (
    <Stack gap="sm">
      <Text as="label" htmlFor="email" weight="medium">
        email address
      </Text>
      <Input id="email" placeholder="you@example.com" />
      <Text as="span" variant="muted" size="xs">
        inline span, e.g. for helper copy next to a field
      </Text>
    </Stack>
  ),
};

export const Truncate: Story = {
  args: {
    truncate: true,
    style: { maxWidth: 200 },
    children: "this is a long line of text that will be truncated with an ellipsis",
  },
};

// Responsive size — Text sizing adapts to the ancestor containment
// context's width. Resize the preview panel to see the size step through
// the breakpoint scale.
export const ResponsiveSize: Story = {
  render: () => (
    <PS1Root>
      <Text size={{ base: "xs", sm: "sm", md: "md", lg: "lg", xl: "xl" }}>
        Responsive text — size scales with the ancestor container width.
      </Text>
    </PS1Root>
  ),
};

export const OnSurface: Story = {
  render: () => (
    <Card style={{ maxWidth: 360 }}>
      <Stack gap="sm">
        <Text variant="body">body — default foreground on surface</Text>
        <Text variant="muted">muted — secondary foreground on surface</Text>
        <Text variant="subtle">subtle — least emphasis on surface</Text>
        <Text variant="primary">primary — accent green on surface</Text>
        <Text variant="accent">accent — accent orange on surface</Text>
        <Text variant="danger">danger — destructive / error on surface</Text>
      </Stack>
    </Card>
  ),
};
