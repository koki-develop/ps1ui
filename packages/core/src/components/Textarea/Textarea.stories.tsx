import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label/Label";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Textarea } from "./Textarea";

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  argTypes: {
    disabled: { control: "boolean" },
    rows: { control: { type: "number", min: 1 } },
  },
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "notes",
    placeholder: "write your thoughts…",
  },
};

export const Filled: Story = {
  args: {
    "aria-label": "notes",
    defaultValue: "the quick brown fox\njumps over\nthe lazy dog",
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "notes",
    defaultValue: "the quick brown fox\njumps over\nthe lazy dog",
    disabled: true,
  },
};

export const Rows: Story = {
  args: {
    "aria-label": "notes",
    rows: 6,
    placeholder: "write your thoughts…",
  },
};

export const WithLabel: Story = {
  render: () => (
    <Stack gap="sm">
      <Label htmlFor="notes-with-label">Notes</Label>
      <Textarea id="notes-with-label" placeholder="write your thoughts…" />
    </Stack>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Stack gap="sm">
      <Label htmlFor="invalid-notes">Notes</Label>
      <Textarea
        id="invalid-notes"
        aria-invalid="true"
        aria-describedby="invalid-notes-hint"
        defaultValue=""
      />
      <Text as="span" id="invalid-notes-hint" variant="accent" size="xs">
        notes cannot be empty
      </Text>
    </Stack>
  ),
};
