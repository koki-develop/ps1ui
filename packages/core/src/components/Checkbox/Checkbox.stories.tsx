import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label/Label";
import { Text } from "../Text/Text";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  argTypes: {
    disabled: { control: "boolean" },
    defaultChecked: { control: "boolean" },
    indeterminate: { control: "boolean" },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "agree to terms",
  },
};

export const Checked: Story = {
  args: {
    "aria-label": "agree to terms",
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "agree to terms",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    "aria-label": "agree to terms",
    disabled: true,
    defaultChecked: true,
  },
};

export const Indeterminate: Story = {
  args: {
    "aria-label": "select all",
    indeterminate: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Checkbox id="cb-terms" />
      <Label htmlFor="cb-terms">agree to the terms and conditions</Label>
    </div>
  ),
};

export const NestedInLabel: Story = {
  render: () => (
    <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Checkbox />
      subscribe to the newsletter
    </Label>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Checkbox id="cb-invalid" aria-invalid="true" aria-describedby="cb-invalid-hint" />
        <Label htmlFor="cb-invalid">agree to the terms and conditions</Label>
      </div>
      <Text as="span" id="cb-invalid-hint" variant="accent" size="xs">
        acceptance is required to continue
      </Text>
    </div>
  ),
};
