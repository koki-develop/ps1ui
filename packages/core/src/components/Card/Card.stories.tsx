import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button/Button";
import { Text } from "../Text/Text";
import { Card } from "./Card";

const meta = {
  title: "Components/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    style: { maxWidth: 360 },
    children: (
      <>
        <Text as="div" variant="accent" weight="semibold" style={{ marginBottom: 6 }}>
          welcome to ps1ui
        </Text>
        <Text as="p" variant="muted" style={{ marginBottom: 18 }}>
          A dev-focused React UI kit. Monospace type, dark ground, terminal-adjacent aesthetic.
        </Text>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="primary">try it</Button>
          <Button variant="secondary">docs</Button>
        </div>
      </>
    ),
  },
};

export const Empty: Story = {
  args: {
    style: { maxWidth: 360 },
    children: "any content, wrapped in the surface.",
  },
};
