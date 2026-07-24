import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label/Label";
import { Radio } from "../Radio/Radio";
import { Stack } from "../Stack/Stack";
import { RadioGroup } from "./RadioGroup";

const meta = {
  title: "Components/RadioGroup",
  component: RadioGroup,
  argTypes: {
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { "aria-label": "favourite fruit" },
  render: (args) => (
    <RadioGroup {...args}>
      <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Radio value="apple" />
        apple
      </Label>
      <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Radio value="banana" />
        banana
      </Label>
      <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <Radio value="cherry" />
        cherry
      </Label>
    </RadioGroup>
  ),
};

export const WithDefaultValue: Story = {
  args: { "aria-label": "favourite fruit", defaultValue: "banana" },
  render: Default.render,
};

export const Disabled: Story = {
  args: { "aria-label": "favourite fruit", defaultValue: "apple", disabled: true },
  render: Default.render,
};

export const WithLabelledBy: Story = {
  render: () => (
    <Stack gap="sm">
      <Label id="grp-label">favourite fruit</Label>
      <RadioGroup aria-labelledby="grp-label" defaultValue="apple">
        <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Radio value="apple" />
          apple
        </Label>
        <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Radio value="banana" />
          banana
        </Label>
      </RadioGroup>
    </Stack>
  ),
};
