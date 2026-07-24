import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../Card/Card";
import { PS1Root } from "../PS1Root/PS1Root";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Container } from "./Container";

const meta = {
  title: "Components/Container",
  component: Container,
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg", "xl", "full"],
    },
    px: {
      control: { type: "select" },
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
    },
  },
} satisfies Meta<typeof Container>;

export default meta;

type Story = StoryObj<typeof meta>;

// Container is structural (max-width + centering + horizontal padding),
// so it has no ink of its own. A dashed outline via inline style makes
// the outer bounds visible in Storybook without wrapping in another
// element — a fixed-width wrapper would overflow the canvas at narrower
// viewports and force horizontal scroll (the very bug that produced this
// story pattern).
const outlineStyle = {
  outline: "1px dashed var(--ps1ui-color-border-strong)",
} as const;

// Compact Card padding so the demo doesn't dwarf the container's own
// padding gutter; Card's default --ps1ui-space-xl (24px) is too heavy
// against the container's default --ps1ui-space-lg (16px) inline padding.
const markerPadding = { padding: 12 } as const;

export const Default: Story = {
  render: (args) => (
    <Container {...args} style={{ ...args.style, ...outlineStyle }}>
      <Card style={markerPadding}>
        <Text>
          Playground Container. Tweak `size` and `px` in the Controls panel to see the max-width
          capping and horizontal padding respond.
        </Text>
      </Card>
    </Container>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack>
      {(["sm", "md", "lg", "xl", "full"] as const).map((size) => (
        <Container key={size} size={size} style={outlineStyle}>
          <Card style={markerPadding}>
            <Text>size=&quot;{size}&quot;</Text>
          </Card>
        </Container>
      ))}
    </Stack>
  ),
};

export const HorizontalPadding: Story = {
  render: () => (
    <Stack>
      {(["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const).map((px) => (
        <Container key={px} px={px} style={outlineStyle}>
          <Card style={markerPadding}>
            <Text>px=&quot;{px}&quot;</Text>
          </Card>
        </Container>
      ))}
    </Stack>
  ),
};

// Responsive size example. Wrapped in PS1Root so the @container queries in
// Container.css have a containment ancestor to resolve against. Resize the
// preview panel to see the max-width switch between breakpoints.
export const ResponsiveSize: Story = {
  render: () => (
    <PS1Root>
      <Container size={{ base: "sm", md: "lg", xl: "full" }} style={outlineStyle}>
        <Card style={markerPadding}>
          <Text>
            size=&#123;&#123; base: &quot;sm&quot;, md: &quot;lg&quot;, xl: &quot;full&quot;
            &#125;&#125; — max-width switches from sm (640px) to lg (1024px) at 48rem, then full at
            80rem.
          </Text>
        </Card>
      </Container>
    </PS1Root>
  ),
};

// Responsive horizontal padding example. Padding shrinks on narrow contexts
// so content stays edge-to-edge on mobile, comfortable on desktop.
export const ResponsivePadding: Story = {
  render: () => (
    <PS1Root>
      <Container px={{ base: "sm", md: "lg", xl: "2xl" }} style={outlineStyle}>
        <Card style={markerPadding}>
          <Text>
            px=&#123;&#123; base: &quot;sm&quot;, md: &quot;lg&quot;, xl: &quot;2xl&quot;
            &#125;&#125; — compact padding on narrow contexts, generous on wide.
          </Text>
        </Card>
      </Container>
    </PS1Root>
  ),
};

export const AsMainLandmark: Story = {
  render: () => (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-landmark pattern; Container is intentionally a bare <div>.
    <Container role="main" aria-labelledby="page-title" style={outlineStyle}>
      <Card style={markerPadding}>
        <Text as="div" id="page-title" weight="semibold" style={{ marginBottom: 6 }}>
          page heading
        </Text>
        <Text as="p" variant="muted">
          Container can be given `role=&quot;main&quot;` plus an aria-labelledby target to become a
          labelled main landmark.
        </Text>
      </Card>
    </Container>
  ),
};
