import type { Meta, StoryObj } from "@storybook/react-vite";

import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Th } from "./Th";

// Th is a child-only helper that only makes sense inside <Table>, so its
// stories render inside Table rather than standalone (mirrors ListItem's
// stories, which render inside List).
const meta = {
  title: "Components/Th",
  component: Th,
} satisfies Meta<typeof Th>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ColumnHeader: Story = {
  args: { scope: "col", children: "Prop" },
  render: (args) => (
    <Table style={{ maxWidth: 480 }}>
      <Thead>
        <Tr>
          <Th {...args} />
          <Th scope="col">Type</Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr>
          <Td>ordered</Td>
          <Td>boolean</Td>
        </Tr>
      </Tbody>
    </Table>
  ),
};

// A th in the body with scope="row" — the header styling (surface background,
// weight) marks the row's label cell.
export const RowHeader: Story = {
  args: { scope: "row", children: "Button" },
  render: (args) => (
    <Table style={{ maxWidth: 480 }}>
      <Thead>
        <Tr>
          <Th scope="col">Component</Th>
          <Th scope="col">Element</Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr>
          <Th {...args} />
          <Td>button</Td>
        </Tr>
        <Tr>
          <Th scope="row">Anchor</Th>
          <Td>a</Td>
        </Tr>
      </Tbody>
    </Table>
  ),
};
