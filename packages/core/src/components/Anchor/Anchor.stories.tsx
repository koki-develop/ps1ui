import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";

import { Card } from "../Card/Card";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Anchor } from "./Anchor";

const meta = {
  title: "Components/Anchor",
  component: Anchor,
  argTypes: {
    variant: {
      control: { type: "inline-radio" },
      options: ["primary", "subtle"],
    },
    href: { control: "text" },
    target: {
      control: { type: "inline-radio" },
      options: ["_self", "_blank"],
    },
  },
} satisfies Meta<typeof Anchor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    href: "#",
    variant: "primary",
    children: "read the getting-started guide",
  },
};

export const Subtle: Story = {
  args: {
    href: "#",
    variant: "subtle",
    children: "read the getting-started guide",
  },
};

export const Variants: Story = {
  args: { href: "#" },
  render: () => (
    <Stack gap="sm">
      <Anchor href="#" variant="primary">
        primary — accent green, always underlined
      </Anchor>
      <Anchor href="#" variant="subtle">
        subtle — inherits color, underline in fg-subtle
      </Anchor>
    </Stack>
  ),
};

export const InText: Story = {
  args: { href: "#" },
  render: () => (
    <Text style={{ maxWidth: 520 }}>
      ps1ui is a component library. See the{" "}
      <Anchor href="#" variant="primary">
        installation guide
      </Anchor>{" "}
      to get started, or browse the{" "}
      <Anchor href="#" variant="subtle">
        API reference
      </Anchor>{" "}
      for full details.
    </Text>
  ),
};

// External links: the caller supplies rel — the component does not inject one.
export const External: Story = {
  args: {
    href: "https://example.com",
    target: "_blank",
    rel: "noopener noreferrer",
    variant: "primary",
    children: "example.com (opens in a new tab)",
  },
};

// Polymorphic `as` — swap the underlying element for a client-side router link.
// Consumers pass `as={NextLink}` or `as={ReactRouterLink}` and Anchor forwards all
// props through to that component, keeping its styling on top.
export const AsRouterLink: Story = {
  args: { href: "#" },
  render: () => {
    type MockLinkProps = { children: ReactNode; className?: string; href: string };
    const MockLink = ({ children, className, href }: MockLinkProps) => (
      <a className={className} data-router-link href={href}>
        {children}
      </a>
    );
    return (
      <Anchor as={MockLink} href="/docs" variant="primary">
        rendered via a custom router Link component
      </Anchor>
    );
  },
};

export const OnSurface: Story = {
  args: { href: "#" },
  render: () => (
    <Card style={{ maxWidth: 360 }}>
      <Stack gap="sm">
        <Anchor href="#" variant="primary">
          primary on surface
        </Anchor>
        <Text>
          A paragraph on the surface with a{" "}
          <Anchor href="#" variant="subtle">
            subtle inline link
          </Anchor>{" "}
          embedded in the middle.
        </Text>
      </Stack>
    </Card>
  ),
};
