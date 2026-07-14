import type { Meta, StoryObj } from "@storybook/react-vite";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Text as="label" htmlFor="email-with-label" weight="medium">
        email address
      </Text>
      <Input id="email-with-label" placeholder="you@example.com" />
    </div>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Input
        aria-label="email address"
        aria-invalid="true"
        aria-describedby="invalid-hint"
        defaultValue="not-an-email"
      />
      <Text as="span" id="invalid-hint" variant="accent" size="xs">
        please enter a valid email address
      </Text>
    </div>
  ),
};
