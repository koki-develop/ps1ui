import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button/Button";
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
        <div style={{ color: "var(--poiui-color-accent)", marginBottom: 6 }}>
          welcome to poiui
        </div>
        <p style={{ margin: "0 0 18px", color: "var(--poiui-color-fg-muted)" }}>
          A dev-focused React UI kit. Monospace type, dark ground,
          terminal-adjacent aesthetic.
        </p>
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
