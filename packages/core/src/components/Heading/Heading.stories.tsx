import type { Meta, StoryObj } from "@storybook/react-vite";

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
    <article style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Heading level={1}>Level 1 — page title</Heading>
      <Heading level={2}>Level 2 — section</Heading>
      <Heading level={3}>Level 3 — subsection</Heading>
      <Heading level={4}>Level 4 — sub-subsection</Heading>
      <Heading level={5}>Level 5 — minor</Heading>
      <Heading level={6}>Level 6 — smallest</Heading>
    </article>
  ),
};

export const SizeOverrides: Story = {
  args: { level: 1 },
  render: () => (
    <article style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Heading level={1}>Level 1 default (3xl)</Heading>
      <Heading level={2} size="sm">
        Level 2 with size=sm — small headline
      </Heading>
      <Heading level={3} size="3xl">
        Level 3 with size=3xl — visually promoted
      </Heading>
    </article>
  ),
};

export const WeightOverrides: Story = {
  args: { level: 1 },
  render: () => (
    <article style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Heading level={1}>Level 1 default (bold)</Heading>
      <Heading level={2} weight="regular">
        Level 2 with weight=regular
      </Heading>
      <Heading level={3} weight="bold">
        Level 3 with weight=bold
      </Heading>
    </article>
  ),
};

// Semantic (`level`) and visual (`size`) split — level stays valid for heading-order
// while size tweaks the rendered magnitude to fit a compact layout.
export const AsOverride: Story = {
  args: { level: 1 },
  render: () => (
    <article style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Heading level={1}>Doc title (level 1)</Heading>
      <Heading level={2} as="h2" size="lg">
        Level 2 rendered smaller (as=h2, size=lg)
      </Heading>
      <Heading level={3} as="h3" size="xl">
        Level 3 rendered larger (as=h3, size=xl)
      </Heading>
    </article>
  ),
};

export const WithBodyText: Story = {
  args: { level: 1 },
  render: () => (
    <article style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 520 }}>
      <Heading level={1}>Getting started</Heading>
      <Text>
        ps1ui ships a Terminal / Mono design system built on JetBrains Mono. Every component is a
        thin wrapper around a native element, styled with CSS custom properties.
      </Text>

      <Heading level={2} style={{ marginTop: 16 }}>
        Installation
      </Heading>
      <Text>
        Add <Text as="strong">@ps1ui/core</Text> to your project and import the compiled stylesheet
        once at your entry point.
      </Text>

      <Heading level={3} style={{ marginTop: 12 }}>
        Requirements
      </Heading>
      <Text>React 18 or 19. Tokens rely on CSS variables and JetBrains Mono Variable.</Text>
    </article>
  ),
};
