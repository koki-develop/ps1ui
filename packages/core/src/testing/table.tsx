import type { ReactElement } from "react";
import { Tbody } from "../components/Tbody/Tbody";
import { Td } from "../components/Td/Td";
import { Th } from "../components/Th/Th";
import { Thead } from "../components/Thead/Thead";
import { Tr } from "../components/Tr/Tr";

// The canonical "component props" table body shared by the Table-family
// tests: Table.test.tsx renders it as the fixture under test, and each child
// component's a11y test renders it inside a full <Table> so axe sees the
// same complete, valid structure everywhere. One definition keeps the
// canonical markup a single contract — a structural change (new attribute,
// renamed class) lands in one place instead of five drifting copies.
// Bespoke trees (bare-element interop comparisons, overflow fixtures,
// row-header a11y) stay local to their tests on purpose.
export const PROPS_TABLE_CHILDREN: ReactElement = (
  <>
    <Thead>
      <Tr>
        <Th scope="col">Prop</Th>
        <Th scope="col">Type</Th>
      </Tr>
    </Thead>
    <Tbody>
      <Tr>
        <Td>ordered</Td>
        <Td>boolean</Td>
      </Tr>
      <Tr>
        <Td>className</Td>
        <Td>string</Td>
      </Tr>
    </Tbody>
  </>
);
