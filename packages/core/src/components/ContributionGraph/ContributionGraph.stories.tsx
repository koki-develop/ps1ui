import type { Meta, StoryObj } from "@storybook/react-vite";

import { makeSampleDays } from "../../testing/contribution-graph-sample";
import { ContributionGraph, type ContributionDay } from "./ContributionGraph";

const YEAR = makeSampleDays("2025-12-31", 365, 42);

// A compact 12-week slice for stories that don't need a full year.
const QUARTER: ContributionDay[] = YEAR.slice(-7 * 12);

const meta = {
  title: "Components/ContributionGraph",
  component: ContributionGraph,
  argTypes: {
    weekStartsOn: {
      control: { type: "inline-radio" },
      options: ["sunday", "monday"],
    },
  },
} satisfies Meta<typeof ContributionGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: YEAR },
};

export const MondayStart: Story = {
  args: { data: YEAR, weekStartsOn: "monday" },
};

export const CompactQuarter: Story = {
  args: { data: QUARTER },
};

export const LargerCells: Story = {
  args: { data: QUARTER, cellSize: 16, cellGap: 4, cellRadius: 3 },
};

export const NoLabels: Story = {
  args: {
    data: QUARTER,
    showMonthLabels: false,
    showWeekdayLabels: false,
    showLegend: false,
  },
};

export const CustomTooltip: Story = {
  args: {
    data: QUARTER,
    labelForDay: (day) =>
      day.count > 0
        ? `${day.date} → ${day.count} commit${day.count === 1 ? "" : "s"}`
        : `${day.date} → no activity`,
  },
};

// A degenerate range — one week — pins the trailing-empties fill path.
export const SingleWeek: Story = {
  args: {
    data: [
      { date: "2025-01-05", count: 0 },
      { date: "2025-01-06", count: 2 },
      { date: "2025-01-07", count: 4 },
      { date: "2025-01-08", count: 8 },
      { date: "2025-01-09", count: 12 },
      { date: "2025-01-10", count: 1 },
      { date: "2025-01-11", count: 0 },
    ],
  },
};

// Constrained parent — verifies the horizontal-scroll wrapper absorbs a wide
// year inside a narrow viewport instead of pushing the parent wider.
export const InsideNarrowParent: Story = {
  args: { data: YEAR },
  decorators: [
    (Story) => (
      <div style={{ width: 320, border: "1px dashed var(--ps1ui-color-border)", padding: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: { data: [] },
};
