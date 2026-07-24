import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment } from "react";

import { Badge } from "./Badge";

const meta = {
  title: "Components/Badge",
  component: Badge,
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["solid", "outline", "subtle"],
    },
    color: {
      control: { type: "inline-radio" },
      options: ["primary", "accent", "danger", "muted"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Subtle: Story = {
  args: {
    variant: "subtle",
    color: "primary",
    children: "new",
  },
};

export const Solid: Story = {
  args: {
    variant: "solid",
    color: "primary",
    children: "released",
  },
};

export const Outline: Story = {
  args: {
    variant: "outline",
    color: "primary",
    children: "beta",
  },
};

export const Accent: Story = {
  args: {
    variant: "subtle",
    color: "accent",
    children: "featured",
  },
};

export const Danger: Story = {
  args: {
    variant: "solid",
    color: "danger",
    children: "breaking",
  },
};

export const Muted: Story = {
  args: {
    variant: "subtle",
    color: "muted",
    children: "draft",
  },
};

// Every (variant × color) tuple side by side — the surface a token / mix
// change touches. Reads at a glance whether the palette holds together.
export const Matrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "auto 1fr" }}>
      {(["solid", "outline", "subtle"] as const).map((variant) => (
        <Fragment key={variant}>
          <span
            style={{
              color: "var(--ps1ui-color-fg-muted)",
              fontFamily: "var(--ps1ui-font-mono)",
              fontSize: 12,
              alignSelf: "center",
            }}
          >
            {variant}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge variant={variant} color="primary">
              primary
            </Badge>
            <Badge variant={variant} color="accent">
              accent
            </Badge>
            <Badge variant={variant} color="danger">
              danger
            </Badge>
            <Badge variant={variant} color="muted">
              muted
            </Badge>
          </div>
        </Fragment>
      ))}
    </div>
  ),
};

// Leading slot — icons/markers sit inline with the label at the same
// baseline. The Badge itself applies the gap; consumers just drop the
// element in via the prop.
export const WithLeading: Story = {
  args: {
    variant: "subtle",
    color: "primary",
    children: "up 24%",
    leading: <span aria-hidden="true">↑</span>,
  },
};

// Polymorphic `as="button"` — turns the chip into an interactive control
// with proper cursor, hover/active feedback, and a focus-visible ring. Use
// for tag filters, dismiss chips, and anything the user can click.
export const AsButton: Story = {
  args: {
    variant: "outline",
    color: "primary",
    children: "filter: react",
  },
  render: (args) => <Badge as="button" {...args} />,
};

// Polymorphic `as="a"` — the chip navigates. Common for tag lists that
// link to a filtered view.
export const AsLink: Story = {
  args: {
    variant: "subtle",
    color: "accent",
    children: "#react",
  },
  render: (args) => (
    <Badge as="a" href="#" {...args}>
      {args.children}
    </Badge>
  ),
};

// Disabled interactive badge — the resting opacity change signals
// "unavailable" without needing per-variant colour tweaks.
export const DisabledButton: Story = {
  args: {
    variant: "solid",
    color: "primary",
    children: "action",
  },
  render: (args) => <Badge as="button" disabled {...args} />,
};
