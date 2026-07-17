import type { Meta, StoryObj } from "@storybook/react-vite";

import { Anchor } from "../Anchor/Anchor";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Details } from "./Details";

const meta = {
  title: "Components/Details",
  component: Details,
  argTypes: {
    open: { control: "boolean" },
  },
} satisfies Meta<typeof Details>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    summary: "Components",
    style: { maxWidth: 320 },
    children: <Text as="p">A collapsed section. Click the header to expand.</Text>,
  },
};

export const Open: Story = {
  args: {
    summary: "Components",
    open: true,
    style: { maxWidth: 320 },
    children: (
      <Stack direction="column" gap="xs">
        <Anchor href="#anchor">Anchor</Anchor>
        <Anchor href="#button">Button</Anchor>
        <Anchor href="#card">Card</Anchor>
        <Anchor href="#checkbox">Checkbox</Anchor>
      </Stack>
    ),
  },
};

export const RichSummary: Story = {
  args: {
    style: { maxWidth: 360 },
    summary: (
      <>
        <Text as="span" weight="semibold">
          $ ls
        </Text>{" "}
        <Text as="span" variant="muted">
          — 4 items
        </Text>
      </>
    ),
    children: (
      <Text as="p" variant="muted">
        Any ReactNode is fine — the summary is a slot, not a string prop.
      </Text>
    ),
  },
};

// Exclusive accordion: <details name="…"> groups form a single-open set,
// where opening one auto-closes the others. Ships native since Chrome 120 /
// Firefox 127 / Safari 17.2 — no JS required.
export const ExclusiveAccordion: Story = {
  args: { summary: "" },
  render: () => (
    <Stack direction="column" gap="sm" style={{ maxWidth: 360 }}>
      <Details name="faq" summary="Is this JS-free?">
        <Text as="p">Yes — Details wraps the native disclosure element.</Text>
      </Details>
      <Details name="faq" summary="Does it hydrate?">
        <Text as="p">
          No hydration is required. The open/close state is managed by the browser.
        </Text>
      </Details>
      <Details name="faq" summary="Can I control it?">
        <Text as="p">
          The `open` prop and `onToggle` handler are native attributes — pass them through directly.
        </Text>
      </Details>
    </Stack>
  ),
};
