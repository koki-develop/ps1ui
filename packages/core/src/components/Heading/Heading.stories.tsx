import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../Card/Card";
import { PS1Root } from "../PS1Root/PS1Root";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Heading } from "./Heading";

const meta = {
  title: "Components/Heading",
  component: Heading,
  argTypes: {
    level: {
      control: { type: "select" },
      options: [1, 2, 3, 4, 5, 6],
    },
    as: {
      control: { type: "select" },
      options: ["h1", "h2", "h3", "h4", "h5", "h6"],
    },
    variant: {
      control: { type: "select" },
      options: ["body", "muted", "subtle", "primary", "accent", "danger"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg", "xl", "2xl", "3xl"],
    },
    weight: {
      control: { type: "select" },
      options: ["regular", "medium", "semibold", "bold"],
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    level: 1,
    children: "The quick brown fox",
  },
};

// Full h1→h6 hierarchy so axe's heading-order rule passes on this story's initial render.
export const Levels: Story = {
  args: { level: 1 },
  render: () => (
    <article>
      <Stack gap="md">
        <Heading level={1}>Level 1 — page title</Heading>
        <Heading level={2}>Level 2 — section</Heading>
        <Heading level={3}>Level 3 — subsection</Heading>
        <Heading level={4}>Level 4 — sub-subsection</Heading>
        <Heading level={5}>Level 5 — minor</Heading>
        <Heading level={6}>Level 6 — smallest</Heading>
      </Stack>
    </article>
  ),
};

// Every heading here sits at the same level, so axe's heading-order rule
// sees no skipped step — the story varies colour only.
export const Variants: Story = {
  args: { level: 2 },
  render: () => (
    <article>
      <Stack gap="md">
        <Heading level={2} variant="body">
          body — default foreground
        </Heading>
        <Heading level={2} variant="muted">
          muted — secondary foreground
        </Heading>
        <Heading level={2} variant="subtle">
          subtle — least emphasis
        </Heading>
        <Heading level={2} variant="primary">
          primary — accent green
        </Heading>
        <Heading level={2} variant="accent">
          accent — accent orange
        </Heading>
        <Heading level={2} variant="danger">
          danger — destructive / error
        </Heading>
      </Stack>
    </article>
  ),
};

export const SizeOverrides: Story = {
  args: { level: 1 },
  render: () => (
    <article>
      <Stack gap="md">
        <Heading level={1}>Level 1 default (3xl)</Heading>
        <Heading level={2} size="sm">
          Level 2 with size=sm — small headline
        </Heading>
        <Heading level={3} size="3xl">
          Level 3 with size=3xl — visually promoted
        </Heading>
      </Stack>
    </article>
  ),
};

export const WeightOverrides: Story = {
  args: { level: 1 },
  render: () => (
    <article>
      <Stack gap="md">
        <Heading level={1}>Level 1 default (bold)</Heading>
        <Heading level={2} weight="regular">
          Level 2 with weight=regular
        </Heading>
        <Heading level={3} weight="bold">
          Level 3 with weight=bold
        </Heading>
      </Stack>
    </article>
  ),
};

// Semantic (`level`) and visual (`size`) split — level stays valid for heading-order
// while size tweaks the rendered magnitude to fit a compact layout.
export const AsOverride: Story = {
  args: { level: 1 },
  render: () => (
    <article>
      <Stack gap="md">
        <Heading level={1}>Doc title (level 1)</Heading>
        <Heading level={2} as="h2" size="lg">
          Level 2 rendered smaller (as=h2, size=lg)
        </Heading>
        <Heading level={3} as="h3" size="xl">
          Level 3 rendered larger (as=h3, size=xl)
        </Heading>
      </Stack>
    </article>
  ),
};

// Responsive size — level 1's default (3xl) applies at the base (narrow)
// context, then steps down at wider containers to keep the heading in scale
// with body copy. Wrap in PS1Root so the @container queries in Heading.css
// have a containment ancestor to resolve against.
export const ResponsiveSize: Story = {
  args: { level: 1 },
  render: () => (
    <PS1Root>
      <Heading level={1} size={{ base: "xl", md: "2xl", xl: "3xl" }}>
        Responsive heading
      </Heading>
    </PS1Root>
  ),
};

// Level 6 (the smallest heading) on the surface token — the tightest
// contrast case for every variant, since axe's large-text threshold never
// kicks in at this size.
export const OnSurface: Story = {
  args: { level: 6 },
  render: () => (
    <Card style={{ maxWidth: 360 }}>
      <article>
        <Stack gap="sm">
          <Heading level={6} variant="body">
            body — on surface
          </Heading>
          <Heading level={6} variant="muted">
            muted — on surface
          </Heading>
          <Heading level={6} variant="subtle">
            subtle — on surface
          </Heading>
          <Heading level={6} variant="primary">
            primary — on surface
          </Heading>
          <Heading level={6} variant="accent">
            accent — on surface
          </Heading>
          <Heading level={6} variant="danger">
            danger — on surface
          </Heading>
        </Stack>
      </article>
    </Card>
  ),
};

export const WithBodyText: Story = {
  args: { level: 1 },
  render: () => (
    <article style={{ maxWidth: 520 }}>
      <Stack gap="sm">
        <Heading level={1}>Getting started</Heading>
        <Text>
          ps1ui ships a monospace design system built on JetBrains Mono. Every component is a thin
          wrapper around a native element, styled with CSS custom properties.
        </Text>

        <Heading level={2} style={{ marginTop: 16 }}>
          Installation
        </Heading>
        <Text>
          Add{" "}
          <Text as="strong" weight="bold">
            @ps1ui/core
          </Text>{" "}
          to your project and import the compiled stylesheet once at your entry point.
        </Text>

        <Heading level={3} style={{ marginTop: 12 }}>
          Requirements
        </Heading>
        <Text>React 19+. Tokens rely on CSS variables and JetBrains Mono Variable.</Text>
      </Stack>
    </article>
  ),
};
