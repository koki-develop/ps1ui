import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label/Label";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Input } from "./Input";

const meta = {
  title: "Components/Input",
  component: Input,
  argTypes: {
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "you@example.com",
  },
};

export const Filled: Story = {
  args: {
    "aria-label": "email address",
    defaultValue: "hello@ps1ui.dev",
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "email address",
    defaultValue: "hello@ps1ui.dev",
    disabled: true,
  },
};

export const Password: Story = {
  args: {
    "aria-label": "password",
    type: "password",
    placeholder: "••••••••",
  },
};

export const WithLabel: Story = {
  render: () => (
    <Stack gap="sm">
      <Label htmlFor="email-with-label">email address</Label>
      <Input id="email-with-label" placeholder="you@example.com" />
    </Stack>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Stack gap="sm">
      <Label htmlFor="invalid-email">email address</Label>
      <Input
        id="invalid-email"
        aria-invalid="true"
        aria-describedby="invalid-hint"
        defaultValue="not-an-email"
      />
      <Text as="span" id="invalid-hint" variant="accent" size="xs">
        please enter a valid email address
      </Text>
    </Stack>
  ),
};
