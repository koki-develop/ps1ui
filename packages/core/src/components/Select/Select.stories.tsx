import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label/Label";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Select } from "./Select";

const meta = {
  title: "Components/Select",
  component: Select,
  argTypes: {
    disabled: { control: "boolean" },
    multiple: { control: "boolean" },
    size: { control: "number" },
  },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

const LANGUAGES = (
  <>
    <option value="go">Go</option>
    <option value="rust">Rust</option>
    <option value="ts">TypeScript</option>
  </>
);

export const Default: Story = {
  args: {
    "aria-label": "language",
    children: LANGUAGES,
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "language",
    defaultValue: "rust",
    disabled: true,
    children: LANGUAGES,
  },
};

export const Grouped: Story = {
  args: {
    "aria-label": "language",
    children: (
      <>
        <optgroup label="systems">
          <option value="rust">Rust</option>
          <option value="zig">Zig</option>
        </optgroup>
        <optgroup label="scripting">
          <option value="ts">TypeScript</option>
          <option value="rb">Ruby</option>
        </optgroup>
      </>
    ),
  },
};

// `multiple` (and any `size` above 1) renders an in-page list box instead of a
// drop-down — no popup to disclose, so the ▾ glyph and its reserved padding
// are both dropped.
export const Multiple: Story = {
  args: {
    "aria-label": "languages",
    multiple: true,
    size: 4,
    defaultValue: ["go", "ts"],
    children: LANGUAGES,
  },
};

export const Sized: Story = {
  args: {
    "aria-label": "language",
    size: 3,
    children: LANGUAGES,
  },
};

// The marker is part of the control's own background, so `width` / `max-width`
// on the Select are ordinary props — nothing has to be routed through a
// wrapping container to keep the arrow in place.
export const CustomWidth: Story = {
  args: {
    "aria-label": "language",
    style: { width: 160 },
    children: LANGUAGES,
  },
};

export const WithLabel: Story = {
  render: () => (
    <Stack gap="sm">
      <Label htmlFor="language-with-label">language</Label>
      <Select id="language-with-label">{LANGUAGES}</Select>
    </Stack>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Stack gap="sm">
      <Label htmlFor="invalid-language">language</Label>
      <Select id="invalid-language" aria-invalid="true" aria-describedby="invalid-language-hint">
        <option value="">choose a language…</option>
        {LANGUAGES}
      </Select>
      <Text as="span" id="invalid-language-hint" variant="accent" size="xs">
        please choose a language
      </Text>
    </Stack>
  ),
};
