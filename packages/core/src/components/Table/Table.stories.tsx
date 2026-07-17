import type { Meta, StoryObj } from "@storybook/react-vite";

import { Code } from "../Code/Code";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Th } from "../Th/Th";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Table } from "./Table";

const meta = {
  title: "Components/Table",
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  args: {
    style: { maxWidth: 480 },
    children: (
      <>
        <Thead>
          <Tr>
            <Th scope="col">Prop</Th>
            <Th scope="col">Type</Th>
            <Th scope="col">Default</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>ordered</Td>
            <Td>boolean</Td>
            <Td>false</Td>
          </Tr>
          <Tr>
            <Td>className</Td>
            <Td>string</Td>
            <Td>—</Td>
          </Tr>
          <Tr>
            <Td>children</Td>
            <Td>ReactNode</Td>
            <Td>—</Td>
          </Tr>
        </Tbody>
      </>
    ),
  },
};

// Row headers via `scope="row"` — the th styling (surface background, weight)
// applies to body-row headers exactly as it does in the thead.
export const RowHeaders: Story = {
  args: {
    style: { maxWidth: 480 },
    children: (
      <>
        <Thead>
          <Tr>
            <Th scope="col">Component</Th>
            <Th scope="col">Element</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Th scope="row">Button</Th>
            <Td>button</Td>
          </Tr>
          <Tr>
            <Th scope="row">Anchor</Th>
            <Td>a</Td>
          </Tr>
        </Tbody>
      </>
    ),
  },
};

// The wrapper measures overflow and exposes the scroller with tabIndex=0, so
// the wide table is keyboard-reachable and scrolls horizontally instead of
// bursting the layout open.
export const HorizontalScroll: Story = {
  render: () => (
    <div style={{ maxWidth: 320 }}>
      <Table>
        <Thead>
          <Tr>
            <Th scope="col">Prop</Th>
            <Th scope="col">Type</Th>
            <Th scope="col">Description</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>language</Td>
            <Td>CodeBlockLanguage</Td>
            <Td>Prism grammar used to tokenize the snippet for highlighting</Td>
          </Tr>
          <Tr>
            <Td>code</Td>
            <Td>string</Td>
            <Td>Alternative to children for wrapped-JSX boundaries</Td>
          </Tr>
        </Tbody>
      </Table>
    </div>
  ),
};

// Cells compose with other primitives — the props-table use case this
// component exists for pairs identifiers in <Code> with prose descriptions.
export const WithInlineCode: Story = {
  args: {
    style: { maxWidth: 480 },
    children: (
      <>
        <Thead>
          <Tr>
            <Th scope="col">Prop</Th>
            <Th scope="col">Description</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>
              <Code>ordered</Code>
            </Td>
            <Td>Renders an ol with a numeric counter marker</Td>
          </Tr>
          <Tr>
            <Td>
              <Code>ref</Code>
            </Td>
            <Td>Forwarded to the underlying element</Td>
          </Tr>
        </Tbody>
      </>
    ),
  },
};
