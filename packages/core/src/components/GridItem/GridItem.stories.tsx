import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../Card/Card";
import { Grid } from "../Grid/Grid";
import { PS1Root } from "../PS1Root/PS1Root";
import { Text } from "../Text/Text";
import { GridItem } from "./GridItem";

const meta = {
  title: "Components/GridItem",
  component: GridItem,
  argTypes: {
    colSpan: { control: { type: "number", min: 1, max: 12, step: 1 } },
  },
} satisfies Meta<typeof GridItem>;

export default meta;

type Story = StoryObj<typeof meta>;

// Compact Card padding for demo cells — Card's default --ps1ui-space-xl
// (24px) is too heavy at higher column counts.
const cell = (label: string, extra?: CSSProperties) => (
  <Card key={label} style={{ padding: 12, textAlign: "center", ...extra }}>
    {label}
  </Card>
);

// Fixed 480 px stage matching Grid.stories.tsx so demos read consistently
// against the Grid page.
const STAGE_WIDTH = 480;

export const Default: Story = {
  args: { colSpan: 2 },
  render: (args) => (
    <Grid columns={4} style={{ width: STAGE_WIDTH }}>
      <GridItem {...args}>{cell("hero")}</GridItem>
      <GridItem>{cell("2")}</GridItem>
      <GridItem>{cell("3")}</GridItem>
      <GridItem>{cell("4")}</GridItem>
      <GridItem>{cell("5")}</GridItem>
    </Grid>
  ),
};

// One row per span count so the effect on a 6-column Grid is unambiguous.
export const Spans: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2, 3, 4, 6].map((n) => (
        <div key={n}>
          <Text as="div" variant="muted" size="xs" style={{ marginBottom: 4 }}>
            colSpan={n}
          </Text>
          <Grid columns={6} style={{ width: STAGE_WIDTH }}>
            <GridItem colSpan={n}>{cell(`span ${n}`)}</GridItem>
            {Array.from({ length: Math.max(0, 6 - n) }, (_, i) => (
              <GridItem key={i}>{cell(String(i + 1))}</GridItem>
            ))}
          </Grid>
        </div>
      ))}
    </div>
  ),
};

// Responsive colSpan example. Wrapped in PS1Root so @container queries in
// GridItem.css have a containment ancestor (the parent Grid) to resolve
// against. Resize the preview panel to see the hero widen at md and lg.
export const ResponsiveColSpan: Story = {
  render: () => (
    <PS1Root>
      <Grid columns={4} gap="md">
        <GridItem colSpan={{ base: 4, md: 2, lg: 4 }}>{cell("hero")}</GridItem>
        <GridItem>{cell("a")}</GridItem>
        <GridItem>{cell("b")}</GridItem>
        <GridItem>{cell("c")}</GridItem>
        <GridItem>{cell("d")}</GridItem>
      </Grid>
    </PS1Root>
  ),
};

// Common landing-page pattern: a wide hero + a supporting sidebar cell,
// then a strip of equal-width cards below.
export const HeroPlusSidebar: Story = {
  render: () => (
    <Grid columns={4} gap="md" style={{ width: STAGE_WIDTH }}>
      <GridItem colSpan={3}>{cell("hero", { minHeight: 80 })}</GridItem>
      <GridItem>{cell("side", { minHeight: 80 })}</GridItem>
      <GridItem>{cell("1")}</GridItem>
      <GridItem>{cell("2")}</GridItem>
      <GridItem>{cell("3")}</GridItem>
      <GridItem>{cell("4")}</GridItem>
    </Grid>
  ),
};
