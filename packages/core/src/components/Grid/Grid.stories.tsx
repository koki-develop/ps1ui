import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "../Card/Card";
import { PS1Root } from "../PS1Root/PS1Root";
import { Text } from "../Text/Text";
import { Grid } from "./Grid";

const meta = {
  title: "Components/Grid",
  component: Grid,
  argTypes: {
    columns: { control: { type: "number", min: 1, max: 12, step: 1 } },
    gap: {
      control: { type: "select" },
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
    },
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

// Compact Card padding for demo cells — Card's default --ps1ui-space-xl
// (24px) is too heavy at higher column counts.
const cell = (label: string, extra?: CSSProperties) => (
  <Card key={label} style={{ padding: 12, textAlign: "center", ...extra }}>
    {label}
  </Card>
);

// Fixed 480 px stage for every demo. At columns=12 tracks get tight
// (~28 px each after gap subtraction) — that IS the primitive's real
// behaviour (`minmax(0, 1fr)` collapses tracks below content width),
// showing it here rather than papering over it with per-story stage
// math tells consumers what they should expect.
const STAGE_WIDTH = 480;

export const Default: Story = {
  args: { columns: 3 },
  render: (args) => (
    <Grid {...args} style={{ ...args.style, width: STAGE_WIDTH }}>
      {["one", "two", "three", "four", "five", "six"].map((l) => cell(l))}
    </Grid>
  ),
};

export const Columns: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[1, 2, 3, 4, 6, 12].map((n) => (
        <div key={n}>
          <Text as="div" variant="muted" size="xs" style={{ marginBottom: 4 }}>
            columns={n}
          </Text>
          <Grid columns={n} style={{ width: STAGE_WIDTH }}>
            {Array.from({ length: n }, (_, i) => cell(String(i + 1)))}
          </Grid>
        </div>
      ))}
    </div>
  ),
};

export const Gaps: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {(["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const).map((g) => (
        <div key={g}>
          <Text as="div" variant="muted" size="xs" style={{ marginBottom: 4 }}>
            gap=&quot;{g}&quot;
          </Text>
          <Grid columns={4} gap={g} style={{ width: STAGE_WIDTH }}>
            {[1, 2, 3, 4].map((n) => cell(String(n)))}
          </Grid>
        </div>
      ))}
    </div>
  ),
};

// Responsive columns example. Wrapped in PS1Root so @container queries in
// Grid.css have a containment ancestor to resolve against. Resize the
// preview panel to see the column count switch between breakpoints.
export const ResponsiveColumns: Story = {
  render: () => (
    <PS1Root>
      <Grid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap="md">
        {["one", "two", "three", "four"].map((l) => cell(l))}
      </Grid>
    </PS1Root>
  ),
};

// Responsive gap example — gap grows on wider contexts.
export const ResponsiveGap: Story = {
  render: () => (
    <PS1Root>
      <Grid columns={3} gap={{ base: "xs", md: "md", xl: "xl" }}>
        {["one", "two", "three"].map((l) => cell(l))}
      </Grid>
    </PS1Root>
  ),
};

export const AsList: Story = {
  render: () => (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-list pattern; Grid is intentionally a bare <div>.
    <Grid columns={3} gap="lg" role="list" aria-label="cards" style={{ width: STAGE_WIDTH }}>
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- child role must be listitem to keep the WAI-ARIA list→listitem parent-child requirement axe checks; documents the labelled-list pattern. */}
      <Card role="listitem" style={{ padding: 12, textAlign: "center" }}>
        one
      </Card>
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see comment above. */}
      <Card role="listitem" style={{ padding: 12, textAlign: "center" }}>
        two
      </Card>
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see comment above. */}
      <Card role="listitem" style={{ padding: 12, textAlign: "center" }}>
        three
      </Card>
    </Grid>
  ),
};
