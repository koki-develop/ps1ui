import type { Meta, StoryObj } from "@storybook/react-vite";

import { List } from "../List/List";
import { ListItem } from "./ListItem";

// ListItem is a child-only helper that only makes sense inside <List>, so
// its stories render inside List rather than standalone (mirrors GridItem's
// stories, which render inside Grid).
const meta = {
  title: "Components/ListItem",
  component: ListItem,
} satisfies Meta<typeof ListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InsideUnorderedList: Story = {
  args: { children: "install the package" },
  render: (args) => (
    <List style={{ maxWidth: 360 }}>
      <ListItem {...args} />
      <ListItem>import the styles entry</ListItem>
      <ListItem>wrap your tree in PS1Root</ListItem>
    </List>
  ),
};

export const InsideOrderedList: Story = {
  args: { children: "parse the argv" },
  render: (args) => (
    <List ordered style={{ maxWidth: 360 }}>
      <ListItem {...args} />
      <ListItem>resolve the config</ListItem>
      <ListItem>dispatch the command</ListItem>
    </List>
  ),
};

export const WithClassNameOverride: Story = {
  args: { children: "an item with a caller-supplied className", className: "demo-highlight" },
  render: (args) => (
    <>
      <style>{`.demo-highlight { color: var(--ps1ui-color-primary); }`}</style>
      <List style={{ maxWidth: 360 }}>
        <ListItem>default item</ListItem>
        <ListItem {...args} />
        <ListItem>another default item</ListItem>
      </List>
    </>
  ),
};
