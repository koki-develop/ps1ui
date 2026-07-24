import type { Meta, StoryObj } from "@storybook/react-vite";

import { Image } from "./Image";

const SAMPLE_SRC = "https://koki-develop.github.io/ps1ui/og.png";

const meta = {
  title: "Components/Image",
  component: Image,
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["plain", "bordered"],
    },
  },
} satisfies Meta<typeof Image>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  args: {
    src: SAMPLE_SRC,
    alt: "ps1ui OG banner",
    width: 320,
    height: 168,
  },
};

export const Bordered: Story = {
  args: {
    src: SAMPLE_SRC,
    alt: "ps1ui OG banner",
    variant: "bordered",
    width: 320,
    height: 168,
  },
};
