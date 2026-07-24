import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { Stack } from "../Stack/Stack";
import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["primary", "secondary", "danger"],
    },
    size: {
      control: { type: "inline-radio" },
      options: ["sm", "md", "lg"],
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

export const Danger: Story = {
  args: {
    variant: "danger",
    children: "delete account",
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

export const DangerDisabled: Story = {
  args: {
    variant: "danger",
    children: "delete account",
    disabled: true,
  },
};

export const Small: Story = {
  args: {
    variant: "primary",
    size: "sm",
    children: "save changes",
  },
};

export const Medium: Story = {
  args: {
    variant: "primary",
    size: "md",
    children: "save changes",
  },
};

export const Large: Story = {
  args: {
    variant: "primary",
    size: "lg",
    children: "save changes",
  },
};

// Renders the three sizes side by side so relative dimensions read at a glance
// — the individual size stories above cover each size in isolation.
export const Sizes: Story = {
  render: () => (
    <Stack direction="row" gap="md" align="center">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </Stack>
  ),
};

// Polymorphic `as` — render as a real anchor so a button-shaped CTA can navigate.
// The generated element is <a>, exposing role="link" and all native href/target/rel
// semantics; the visual is unchanged from a native <button>.
export const AsLink: Story = {
  args: {
    variant: "primary",
    children: "read the docs",
  },
  render: (args) => (
    <Button as="a" href="#" {...args}>
      {args.children}
    </Button>
  ),
};

// Polymorphic `as={Component}` — swap the underlying element for a client-side
// router link (Next.js `<Link>`, React Router `<Link>`, TanStack Router `<Link>`).
// Consumers pass their router's Link component and Button forwards props through
// while keeping the button styling on top.
export const AsRouterLink: Story = {
  render: () => {
    type MockLinkProps = { children: ReactNode; className?: string; href: string };
    const MockLink = ({ children, className, href }: MockLinkProps) => (
      <a className={className} data-router-link href={href}>
        {children}
      </a>
    );
    return (
      <Button as={MockLink} href="/dashboard" variant="secondary">
        rendered via a custom router Link
      </Button>
    );
  },
};
