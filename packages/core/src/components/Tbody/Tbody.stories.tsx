import type { Meta, StoryObj } from "@storybook/react-vite";

import { Table } from "../Table/Table";
import { Td } from "../Td/Td";
import { Th } from "../Th/Th";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Tbody } from "./Tbody";

// Tbody is a child-only helper that only makes sense inside <Table>, so its
// stories render inside Table rather than standalone (mirrors ListItem's
// stories, which render inside List).
const meta = {
  title: "Components/Tbody",
  component: Tbody,
} satisfies Meta<typeof Tbody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InsideTable: Story = {
  args: {
    children: (
      <>
        <Tr>
          <Td>ordered</Td>
          <Td>boolean</Td>
        </Tr>
        <Tr>
          <Td>className</Td>
          <Td>string</Td>
        </Tr>
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
      <Tbody {...args} />
    </Table>
  ),
};
