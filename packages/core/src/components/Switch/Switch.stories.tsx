import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../Label/Label";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Switch } from "./Switch";

const meta = {
  title: "Components/Switch",
  component: Switch,
  argTypes: {
    disabled: { control: "boolean" },
    defaultChecked: { control: "boolean" },
  },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "enable notifications",
  },
};

export const Checked: Story = {
  args: {
    "aria-label": "enable notifications",
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "enable notifications",
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    "aria-label": "enable notifications",
    disabled: true,
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  render: () => (
    <Stack direction="row" gap="sm" align="center">
      <Switch id="sw-notifications" />
      <Label htmlFor="sw-notifications">enable notifications</Label>
    </Stack>
  ),
};

export const NestedInLabel: Story = {
  render: () => (
    <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Switch />
      run builds on push
    </Label>
  ),
};

// A Switch lines up with Checkbox and Radio on the same 16px control height,
// so the three read as one family when a form mixes them.
export const AlignedWithSiblings: Story = {
  render: () => (
    <Stack gap="sm">
      <Stack direction="row" gap="sm" align="center">
        <Switch id="sw-align-telemetry" defaultChecked />
        <Label htmlFor="sw-align-telemetry">send telemetry</Label>
      </Stack>
      <Stack direction="row" gap="sm" align="center">
        <Switch id="sw-align-beta" />
        <Label htmlFor="sw-align-beta">join the beta channel</Label>
      </Stack>
    </Stack>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Stack gap="xs">
      <Stack direction="row" gap="sm" align="center">
        <Switch id="sw-invalid" aria-invalid="true" aria-describedby="sw-invalid-hint" />
        <Label htmlFor="sw-invalid">enable two-factor authentication</Label>
      </Stack>
      <Text as="span" id="sw-invalid-hint" variant="accent" size="xs">
        required before the account can be published
      </Text>
    </Stack>
  ),
};
