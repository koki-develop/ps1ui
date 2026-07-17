import type { Meta, StoryObj } from "@storybook/react-vite";

import { Anchor } from "../Anchor/Anchor";
import { ListItem } from "../ListItem/ListItem";
import { List } from "./List";

const meta = {
  title: "Components/List",
  component: List,
  argTypes: {
    ordered: { control: "boolean" },
  },
} satisfies Meta<typeof List>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unordered: Story = {
  args: {
    style: { maxWidth: 360 },
    children: (
      <>
        <ListItem>install the package</ListItem>
        <ListItem>import the styles entry</ListItem>
        <ListItem>wrap your tree in PS1Root</ListItem>
      </>
    ),
  },
};

export const Ordered: Story = {
  args: {
    ordered: true,
    style: { maxWidth: 360 },
    children: (
      <>
        <ListItem>parse the argv</ListItem>
        <ListItem>resolve the config</ListItem>
        <ListItem>dispatch the command</ListItem>
        <ListItem>write the exit code</ListItem>
      </>
    ),
  },
};

// Long items wrap to a second line — the marker column stays fixed and
// wrapped text stays flush with the item's content edge, not underneath
// the marker.
export const WrappingItems: Story = {
  args: {
    style: { maxWidth: 320 },
    children: (
      <>
        <ListItem>
          a first item whose content is deliberately long enough to wrap onto a second line so the
          hanging indent is visible
        </ListItem>
        <ListItem>a shorter second item for contrast</ListItem>
      </>
    ),
  },
};

// Nested ordered list — inner counter starts at 1 (independent scope) and
// indents further than the outer's content column.
export const NestedOrdered: Story = {
  args: {
    ordered: true,
    style: { maxWidth: 360 },
    children: (
      <>
        <ListItem>build the package</ListItem>
        <ListItem>
          run the checks
          <List ordered>
            <ListItem>typecheck</ListItem>
            <ListItem>unit tests</ListItem>
            <ListItem>visual regression</ListItem>
          </List>
        </ListItem>
        <ListItem>publish</ListItem>
      </>
    ),
  },
};

export const WithAnchors: Story = {
  args: {
    style: { maxWidth: 360 },
    children: (
      <>
        <ListItem>
          <Anchor href="#anchor">Anchor</Anchor>
        </ListItem>
        <ListItem>
          <Anchor href="#button">Button</Anchor>
        </ListItem>
        <ListItem>
          <Anchor href="#card">Card</Anchor>
        </ListItem>
      </>
    ),
  },
};
