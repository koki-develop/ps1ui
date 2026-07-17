import type { Meta, StoryObj } from "@storybook/react-vite";

import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Th } from "../Th/Th";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Td } from "./Td";

// Td is a child-only helper that only makes sense inside <Table>, so its
// stories render inside Table rather than standalone (mirrors ListItem's
// stories, which render inside List).
const meta = {
  title: "Components/Td",
  component: Td,
} satisfies Meta<typeof Td>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InsideTable: Story = {
  args: { children: "ordered" },
  render: (args) => (
    <Table style={{ maxWidth: 480 }}>
      <Thead>
        <Tr>
          <Th scope="col">Prop</Th>
          <Th scope="col">Type</Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr>
          <Td {...args} />
          <Td>boolean</Td>
        </Tr>
      </Tbody>
    </Table>
  ),
};

export const SpanningColumns: Story = {
  args: { colSpan: 2, children: "Deprecated — use the responsive props instead" },
  render: (args) => (
    <Table style={{ maxWidth: 480 }}>
      <Thead>
        <Tr>
          <Th scope="col">Prop</Th>
          <Th scope="col">Type</Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr>
          <Td>gap</Td>
          <Td>GridGap</Td>
        </Tr>
        <Tr>
          <Td {...args} />
        </Tr>
      </Tbody>
    </Table>
  ),
};
