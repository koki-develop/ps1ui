import type { Meta, StoryObj } from "@storybook/react-vite";

import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Th } from "../Th/Th";
import { Tr } from "../Tr/Tr";
import { Thead } from "./Thead";

// Thead is a child-only helper that only makes sense inside <Table>, so its
// stories render inside Table rather than standalone (mirrors ListItem's
// stories, which render inside List).
const meta = {
  title: "Components/Thead",
  component: Thead,
} satisfies Meta<typeof Thead>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InsideTable: Story = {
  args: {
    children: (
      <Tr>
        <Th scope="col">Prop</Th>
        <Th scope="col">Type</Th>
      </Tr>
    ),
  },
  render: (args) => (
    <Table style={{ maxWidth: 480 }}>
      <Thead {...args} />
      <Tbody>
        <Tr>
          <Td>ordered</Td>
          <Td>boolean</Td>
        </Tr>
      </Tbody>
    </Table>
  ),
};
