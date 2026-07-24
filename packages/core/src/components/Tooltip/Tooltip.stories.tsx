import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button/Button";
import { Stack } from "../Stack/Stack";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  argTypes: {
    placement: {
      control: { type: "inline-radio" },
      options: ["top", "bottom", "left", "right"],
    },
    open: { control: "boolean" },
    delay: { control: "number" },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

// Stories pin `open` so the panel is present at story-load. Storybook's
// a11y addon (parameters.a11y.test = "error") only scans the initial post-
// mount DOM — leaving open unset would render the trigger alone and axe
// would never see the tooltip surface.
const stagePadding = { padding: 80 };

export const Default: Story = {
  args: {
    content: "Delete this row",
    placement: "top",
    open: true,
    children: <Button>Delete</Button>,
  },
  render: (args) => (
    <div style={stagePadding}>
      <Tooltip {...args} />
    </div>
  ),
};

export const Placements: Story = {
  args: { content: "Hint", open: true, children: <Button>trigger</Button> },
  render: () => (
    <Stack direction="row" gap="xl" style={{ padding: 80 }}>
      {(["top", "bottom", "left", "right"] as const).map((placement) => (
        <Tooltip key={placement} content={placement} open placement={placement}>
          <Button>{placement}</Button>
        </Tooltip>
      ))}
    </Stack>
  ),
};

export const RichContent: Story = {
  args: {
    content: (
      <>
        Press <strong>Enter</strong> to confirm
      </>
    ),
    open: true,
    children: <Button>Save</Button>,
  },
  render: (args) => (
    <div style={stagePadding}>
      <Tooltip {...args} />
    </div>
  ),
};

// Interactive: the tooltip is UNCONTROLLED, driven by real hover/focus.
// Included so a reader can verify the show/hide behaviour by moving the
// pointer; the a11y check on this story exercises the closed state.
export const Interactive: Story = {
  args: {
    content: "Deletes the current selection",
    children: <Button>Delete</Button>,
  },
  render: (args) => (
    <div style={stagePadding}>
      <Tooltip {...args} />
    </div>
  ),
};
