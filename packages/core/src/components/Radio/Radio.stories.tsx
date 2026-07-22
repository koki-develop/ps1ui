import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label/Label";
import { Text } from "../Text/Text";
import { Radio } from "./Radio";

const meta = {
  title: "Components/Radio",
  component: Radio,
  argTypes: {
    disabled: { control: "boolean" },
    defaultChecked: { control: "boolean" },
  },
} satisfies Meta<typeof Radio>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "option a",
    value: "a",
  },
};

export const Checked: Story = {
  args: {
    "aria-label": "option a",
    value: "a",
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "option a",
    value: "a",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    "aria-label": "option a",
    value: "a",
    disabled: true,
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Radio id="r-a" name="pick" value="a" />
      <Label htmlFor="r-a">option a</Label>
    </div>
  ),
};

export const NestedInLabel: Story = {
  render: () => (
    <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Radio name="pick" value="a" />
      option a
    </Label>
  ),
};

export const Invalid: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Radio
          id="r-invalid"
          name="pick"
          value="a"
          aria-invalid="true"
          aria-describedby="r-invalid-hint"
        />
        <Label htmlFor="r-invalid">option a</Label>
      </div>
      <Text as="span" id="r-invalid-hint" variant="accent" size="xs">
        please pick one option
      </Text>
    </div>
  ),
};
