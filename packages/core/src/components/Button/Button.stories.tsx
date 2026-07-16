import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

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
