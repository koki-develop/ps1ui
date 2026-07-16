import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../Button/Button";
import { Card } from "../Card/Card";
import { PS1Root } from "../PS1Root/PS1Root";
import { Text } from "../Text/Text";
import { Stack } from "./Stack";

const meta = {
  title: "Components/Stack",
  component: Stack,
  argTypes: {
    direction: {
      control: { type: "inline-radio" },
      options: ["row", "column"],
    },
    gap: {
      control: { type: "select" },
      options: ["none", "xs", "sm", "md", "lg", "xl", "2xl"],
    },
    align: {
      control: { type: "select" },
      options: [undefined, "start", "center", "end", "stretch", "baseline"],
    },
    justify: {
      control: { type: "select" },
      options: [undefined, "start", "center", "end", "between", "around", "evenly"],
    },
    wrap: { control: "boolean" },
  },
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

// Demo cell — a Card compressed to a tighter padding so the layout axis
// under test (gap, align, justify) stays visible without each cell
// dominating the frame at Card's default `--ps1ui-space-xl` (24px) padding.
// A `min-width` keeps rows sized consistently across labels of different
// lengths.
const cellStyle: CSSProperties = {
  padding: 12,
  minWidth: 40,
  textAlign: "center",
};

const cell = (label: string, extra?: CSSProperties) => (
  <Card key={label} style={{ ...cellStyle, ...extra }}>
    {label}
  </Card>
);

// Fixed-width label column used in Gaps / Align / Justify demos. Kept as
// a constant so every row lines up its label column identically.
const labelWidth = 72;

export const Default: Story = {
  render: (args) => <Stack {...args}>{["one", "two", "three"].map((l) => cell(l))}</Stack>,
};

export const Row: Story = {
  args: { direction: "row" },
  render: (args) => <Stack {...args}>{["one", "two", "three"].map((l) => cell(l))}</Stack>,
};

export const Gaps: Story = {
  // The inner Stack's `gap` is what varies per row; the outer row-Stack
  // holds label + inner Stack at a fixed gap so the label column stays
  // pinned regardless of which gap value is being demonstrated. Without
  // this split the label itself would become a flex item of the varied
  // gap and shift right as the gap grew.
  render: () => (
    <Stack gap="lg">
      {(["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const).map((g) => (
        <Stack key={g} direction="row" gap="md" align="center">
          <Text style={{ width: labelWidth }}>{g}</Text>
          <Stack direction="row" gap={g}>
            {[1, 2, 3].map((n) => cell(String(n)))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Align: Story = {
  // Cell heights are chosen to sit ABOVE Card's default vertical padding
  // (12 top + 12 bottom = 24) so the content stays inside the padding box
  // even at the smallest cell. Using values under 40 would push text out
  // of the padding and the demo would read as "boxes are broken", not
  // "align differs".
  render: () => (
    <Stack gap="md">
      {(["start", "center", "end", "stretch", "baseline"] as const).map((a) => (
        <Stack key={a} direction="row" gap="md" align="center" style={{ minHeight: 120 }}>
          <Text style={{ width: labelWidth }}>{a}</Text>
          <Stack direction="row" gap="sm" align={a} style={{ minHeight: 100 }}>
            {/* Different heights so the cross-axis alignment is observable. */}
            {cell("a", { height: 48 })}
            {cell("b", { height: 96 })}
            {cell("c", { height: 72 })}
          </Stack>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Justify: Story = {
  // Same 2-layer pattern as Gaps: the inner Stack's `justify` varies; the
  // outer row-Stack holds the label at a fixed position so the label
  // doesn't get distributed by justify itself.
  render: () => (
    <Stack gap="md">
      {(["start", "center", "end", "between", "around", "evenly"] as const).map((j) => (
        <Stack key={j} direction="row" gap="md" align="center">
          <Text style={{ width: labelWidth }}>{j}</Text>
          <Stack
            direction="row"
            gap="sm"
            justify={j}
            style={{
              width: 480,
              border: "1px dashed var(--ps1ui-color-border)",
              padding: 6,
              borderRadius: 4,
            }}
          >
            {[1, 2, 3].map((n) => cell(String(n)))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  ),
};

export const Wrap: Story = {
  render: () => (
    <Stack
      direction="row"
      wrap
      gap="sm"
      style={{ width: 260, border: "1px dashed var(--ps1ui-color-border)", padding: 6 }}
    >
      {Array.from({ length: 8 }, (_, i) => cell(String(i + 1)))}
    </Stack>
  ),
};

// Responsive direction — mobile-first column layout that flips to row on
// wider contexts. Wrapped in PS1Root so @container queries in Stack.css
// have a containment ancestor. Resize the preview panel to see the flip.
export const ResponsiveDirection: Story = {
  render: () => (
    <PS1Root>
      <Stack direction={{ base: "column", md: "row" }} gap={{ base: "sm", md: "lg" }}>
        {["one", "two", "three"].map((l) => cell(l))}
      </Stack>
    </PS1Root>
  ),
};

// Responsive alignment — cross-axis alignment adapts to context width.
export const ResponsiveAlign: Story = {
  render: () => (
    <PS1Root>
      <Stack
        direction="row"
        gap="md"
        align={{ base: "start", md: "center", xl: "end" }}
        style={{ minHeight: 100 }}
      >
        {cell("a", { height: 48 })}
        {cell("b", { height: 96 })}
        {cell("c", { height: 72 })}
      </Stack>
    </PS1Root>
  ),
};

export const AsToolbar: Story = {
  render: () => (
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-toolbar pattern; Stack is intentionally a bare <div>.
    <Stack direction="row" gap="sm" role="toolbar" aria-label="editor actions">
      <Button variant="secondary">bold</Button>
      <Button variant="secondary">italic</Button>
      <Button variant="secondary">underline</Button>
    </Stack>
  ),
};
