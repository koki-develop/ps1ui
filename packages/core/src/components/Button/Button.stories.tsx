import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["primary", "secondary"],
    },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "save changes",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "cancel",
  },
};

export const Disabled: Story = {
  args: {
    variant: "primary",
    children: "loading…",
    disabled: true,
  },
};

export const SecondaryDisabled: Story = {
  args: {
    variant: "secondary",
    children: "cancel",
    disabled: true,
  },
};
