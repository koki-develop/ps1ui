import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "../Input/Input";
import { Stack } from "../Stack/Stack";
import { Label } from "./Label";

const meta = {
  title: "Components/Label",
  component: Label,
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    htmlFor: "email",
    children: "email address",
  },
};

export const WithInput: Story = {
  render: () => (
    <Stack gap="sm">
      <Label htmlFor="email-with-input">email address</Label>
      <Input id="email-with-input" placeholder="you@example.com" />
    </Stack>
  ),
};

export const WrappingInput: Story = {
  render: () => (
    <Label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      email address
      <Input placeholder="you@example.com" />
    </Label>
  ),
};
