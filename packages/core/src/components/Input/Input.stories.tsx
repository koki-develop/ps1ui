import type { Meta, StoryObj } from "@storybook/react-vite";

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
    defaultValue: "hello@poiui.dev",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "hello@poiui.dev",
    disabled: true,
  },
};
