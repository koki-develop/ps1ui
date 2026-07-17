import type { Meta, StoryObj } from "@storybook/react-vite";

import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Th } from "../Th/Th";
import { Thead } from "../Thead/Thead";
import { Tr } from "./Tr";

// Tr is a child-only helper that only makes sense inside <Table>, so its
// stories render inside Table rather than standalone (mirrors ListItem's
// stories, which render inside List).
const meta = {
  title: "Components/Tr",
  component: Tr,
} satisfies Meta<typeof Tr>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InsideTable: Story = {
  args: {
    children: (
      <>
        <Td>ordered</Td>
        <Td>boolean</Td>
      </>
    ),
  },
  render: (args) => (
    <Table style={{ maxWidth: 480 }}>
      <Thead>
        <Tr>
          <Th scope="col">Prop</Th>
          <Th scope="col">Type</Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr {...args} />
        <Tr>
          <Td>className</Td>
          <Td>string</Td>
        </Tr>
      </Tbody>
    </Table>
  ),
};
