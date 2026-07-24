"use client";

import { useLayoutEffect, type ComponentProps } from "react";
import { cx } from "../../utils/cx";
import { useScrollableFocus } from "../../utils/useScrollableFocus";

// Intensity buckets driving the cell color. Internal — callers supply raw
// counts and the component quartile-buckets them; nothing in the public API
// takes or returns a level.
type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionDay = {
  /** ISO date string in YYYY-MM-DD form. */
  date: string;
  /** Activity count for the day (0 for none). Drives both the color intensity and the tooltip. */
  count: number;
};

export type ContributionGraphWeekStart = "sunday" | "monday";

export type ContributionGraphProps = ComponentProps<"div"> & {
  /** Sorted days to render (ascending by date). Gaps are allowed — each day lands at its actual weekday and columns spanning purely-missing days simply render empty. */
  data: ContributionDay[];
  /** First day of each week column. */
  weekStartsOn?: ContributionGraphWeekStart;
  /** Cell side length in pixels. */
  cellSize?: number;
  /** Gap between cells in pixels. */
  cellGap?: number;
  /** Cell corner radius in pixels. */
  cellRadius?: number;
  /** Render month labels above the grid. */
  showMonthLabels?: boolean;
  /** Render weekday labels beside the grid. */
  showWeekdayLabels?: boolean;
  /** Render a Less/More legend under the grid. */
  showLegend?: boolean;
  /** Tooltip text for a cell. Defaults to "N contributions on Month Nth." — "No contributions" when count is zero, singular when count is one. */
  labelForDay?: (day: ContributionDay) => string;
};

// SVG label metrics — chosen so ~12px text at font-size:xs never clips.
const MONTH_LABEL_HEIGHT = 16;
const WEEKDAY_LABEL_WIDTH = 28;
// Rendered width of a 3-letter month abbreviation at font-size-xs
// (JetBrains Mono ~7px per glyph → ~21px, rounded up for safety). Used as
// the pixel-clip threshold: a month label whose text would spill past the
// SVG's right edge is suppressed — with one exception, the leftmost label
// always emits since users need the starting month context. Under the old
// week-count heuristic (MIN_COLS_FOR_MONTH_LABEL=3) short graphs rendered
// an empty month row even when their first month clearly fit.
const MONTH_LABEL_APPROX_WIDTH = 24;

const WEEKDAY_NAMES_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const WEEKDAY_NAMES_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const SHORT_MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

// Rows carrying a visible weekday label. GitHub's convention: every-other row
// so labels don't crowd — Mon/Wed/Fri on Sunday-start, Tue/Thu/Sat on Monday-start.
const LABELED_WEEKDAY_ROWS = [1, 3, 5] as const;

const LEVELS: readonly ContributionLevel[] = [0, 1, 2, 3, 4];

// Local-time date parsing — `new Date("YYYY-MM-DD")` would resolve as UTC and
// shift day-of-week in negative-UTC-offset zones. Callers keyed the grid on
// local-calendar days, so we mirror that.
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

function normalizedDow(date: Date, weekStartsOn: ContributionGraphWeekStart): number {
  const raw = date.getDay();
  return weekStartsOn === "monday" ? (raw + 6) % 7 : raw;
}

// Whole-day distance between two local calendar dates. Reconstructs UTC
// timestamps from Y/M/D so the subtraction never crosses a DST discontinuity
// — a naive (b.getTime() - a.getTime()) / 86_400_000 can drift by ±1 hour
// on either side of a spring-forward / fall-back, flipping Math.round into
// the wrong day bucket.
function daysBetween(a: Date, b: Date): number {
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bUtc - aUtc) / (24 * 60 * 60 * 1000));
}

// English ordinal suffix — 1st / 2nd / 3rd / 4th, with the 11th/12th/13th
// exception band. Used by the default tooltip formatter.
function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

// Quartile bucketing off the data set's peak count. Level 0 is reserved for
// "no activity" so a busy day still lights up on a sparse graph — the same
// intent GitHub's own graph reads with. All-zero data collapses to level 0
// everywhere (nothing to color-rank against).
function levelFor(count: number, maxCount: number): ContributionLevel {
  if (count <= 0 || maxCount <= 0) return 0;
  const bucket = Math.ceil((count / maxCount) * 4);
  return Math.max(1, Math.min(4, bucket)) as ContributionLevel;
}

function defaultLabelForDay(day: ContributionDay): string {
  const d = parseISODate(day.date);
  const dateText = `${FULL_MONTH_NAMES[d.getMonth()]!} ${ordinal(d.getDate())}`;
  if (day.count <= 0) return `No contributions on ${dateText}.`;
  return `${day.count} contribution${day.count === 1 ? "" : "s"} on ${dateText}.`;
}

// Shared <rect> renderer for both the grid cells and the legend swatches so
// future changes (stroke, path switch, size-var adoption) can't drift
// between the two. Grid cells carry a date + title; legend swatches don't.
type CellProps = {
  x: number;
  y: number;
  size: number;
  radius: number;
  level: ContributionLevel;
  date?: string;
  title?: string;
};

function Cell({ x, y, size, radius, level, date, title }: CellProps) {
  return (
    <rect
      x={x}
      y={y}
      width={size}
      height={size}
      rx={radius}
      ry={radius}
      className="ps1ui-contribution-graph__cell"
      data-level={level}
      data-date={date}
    >
      {title !== undefined ? <title>{title}</title> : null}
    </rect>
  );
}

export function ContributionGraph({
  data,
  weekStartsOn = "sunday",
  cellSize = 11,
  cellGap = 3,
  cellRadius = 2,
  showMonthLabels = true,
  showWeekdayLabels = true,
  showLegend = true,
  labelForDay = defaultLabelForDay,
  className,
  ...rest
}: ContributionGraphProps) {
  const step = cellSize + cellGap;
  const padTop = showMonthLabels ? MONTH_LABEL_HEIGHT : 0;
  const padLeft = showWeekdayLabels ? WEEKDAY_LABEL_WIDTH : 0;
  const gridHeight = 7 * step - cellGap;

  // Grid layout — each day's slot is (startDow + daysSinceFirst), so a cell
  // always lands at its actual weekday even when data has gaps. numWeeks is
  // derived from the DATE-RANGE span (not the array length) so the SVG width
  // matches the last day's actual column — a naive `data.length` count on
  // non-contiguous input yields a fractional numWeeks and a viewBox narrower
  // than the last rect's right edge, cutting the tail cell off silently.
  //
  // Trailing empties always fill out to a complete Sun–Sat (or Mon–Sun) week
  // so `startDow + spanDays + trailing` is an exact multiple of 7 by
  // construction — see the derivation in ContributionGraph.test.tsx's
  // "layout math" describe.
  let numWeeks = 0;
  let startDow = 0;
  let maxCount = 0;
  // Precomputed slot index per data entry so the render pass and the month-
  // label pass share one source of truth for positioning.
  let daySlots: number[] = [];
  if (data.length > 0) {
    const first = parseISODate(data[0]!.date);
    const last = parseISODate(data[data.length - 1]!.date);
    startDow = normalizedDow(first, weekStartsOn);
    const endDow = normalizedDow(last, weekStartsOn);
    const trailing = 6 - endDow;
    const spanDays = daysBetween(first, last) + 1;
    numWeeks = (startDow + spanDays + trailing) / 7;
    daySlots = Array.from<number>({ length: data.length });
    for (let i = 0; i < data.length; i++) {
      const day = data[i]!;
      daySlots[i] = startDow + daysBetween(first, parseISODate(day.date));
      if (day.count > maxCount) maxCount = day.count;
    }
  }

  const gridWidth = numWeeks > 0 ? numWeeks * step - cellGap : 0;
  const svgWidth = padLeft + gridWidth;
  const svgHeight = padTop + gridHeight;

  const weekdayNames = weekStartsOn === "monday" ? WEEKDAY_NAMES_MON : WEEKDAY_NAMES_SUN;

  // Month labels — walk the sorted data, and every time we enter a new
  // column, check if that column's topmost day (the first one we see, since
  // dates ascend) is in a new month. The leftmost emitted label always
  // renders so the caller's `showMonthLabels` intent is honored even on
  // narrow ranges; later labels are suppressed only if their text would
  // clip past the SVG's right edge in pixels.
  type MonthLabel = { key: string; x: number; text: string };
  const monthLabels: MonthLabel[] = [];
  let currentCol = -1;
  let lastMonth = -1;
  for (let i = 0; i < data.length; i++) {
    const slot = daySlots[i]!;
    const col = Math.floor(slot / 7);
    if (col === currentCol) continue;
    currentCol = col;
    const month = parseISODate(data[i]!.date).getMonth();
    if (month === lastMonth) continue;
    const x = padLeft + col * step;
    const isLeftmost = monthLabels.length === 0;
    const fits = x + MONTH_LABEL_APPROX_WIDTH <= svgWidth;
    if (isLeftmost || fits) {
      monthLabels.push({
        key: `${col}-${month}`,
        x,
        text: SHORT_MONTH_NAMES[month]!,
      });
    }
    lastMonth = month;
  }

  const legendSwatchesWidth = LEVELS.length * step - cellGap;

  // Wrap the SVG in a horizontal-scroll container so a full year fits inside
  // narrow viewports (mobile) instead of pushing its parent wider. Same
  // contract as CodeBlock: `useScrollableFocus` makes the scroller keyboard-
  // reachable ONLY while its content actually overflows, and keeps it in the
  // tab order while it holds focus (see the hook's header). The scroller is
  // an internal implementation detail — the caller's ref/id/style spread onto
  // the outer wrapper via {...rest}, matching `ComponentProps<"div">`.
  //
  // The hook's `contentRef` is constrained to HTMLElement (Table uses it for
  // its <table>); our content is an SVGSVGElement, so we mirror CodeBlock's
  // pattern instead: manual re-measure keyed on the content's intrinsic
  // width, which is a pure function of the layout inputs below.
  const { scrollerRef, tabIndex, measure } = useScrollableFocus<HTMLDivElement>();
  useLayoutEffect(() => measure(), [measure, svgWidth]);

  return (
    <div
      aria-label="Contribution graph"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- role="img" is the ARIA idiom for SVG data-viz wrappers; the native <img> tag only accepts a `src` URL and cannot contain the SVG grid + HTML legend this component composes.
      role="img"
      {...rest}
      className={cx("ps1ui-contribution-graph", className)}
    >
      <div
        className="ps1ui-contribution-graph__scroller"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe scrollable-region-focusable requires the scroller be keyboard-reachable when its SVG overflows; useScrollableFocus gates this on measured overflow so narrow graphs stay out of the tab order.
        tabIndex={tabIndex}
        ref={scrollerRef}
        onBlur={measure}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="ps1ui-contribution-graph__svg"
          aria-hidden="true"
        >
          {showMonthLabels &&
            monthLabels.map((label) => (
              <text
                key={label.key}
                x={label.x}
                y={MONTH_LABEL_HEIGHT - 5}
                className="ps1ui-contribution-graph__month"
              >
                {label.text}
              </text>
            ))}
          {showWeekdayLabels &&
            LABELED_WEEKDAY_ROWS.map((row) => (
              <text
                key={row}
                x={padLeft - 4}
                y={padTop + row * step + cellSize - 1}
                textAnchor="end"
                className="ps1ui-contribution-graph__weekday"
              >
                {weekdayNames[row]!}
              </text>
            ))}
          {data.map((day, i) => {
            const slot = daySlots[i]!;
            const col = Math.floor(slot / 7);
            const row = slot % 7;
            return (
              <Cell
                key={day.date}
                x={padLeft + col * step}
                y={padTop + row * step}
                size={cellSize}
                radius={cellRadius}
                level={levelFor(day.count, maxCount)}
                date={day.date}
                title={labelForDay(day)}
              />
            );
          })}
        </svg>
      </div>
      {showLegend && (
        <div className="ps1ui-contribution-graph__legend" aria-hidden="true">
          <span className="ps1ui-contribution-graph__legend-label">Less</span>
          <svg
            width={legendSwatchesWidth}
            height={cellSize}
            viewBox={`0 0 ${legendSwatchesWidth} ${cellSize}`}
            className="ps1ui-contribution-graph__legend-swatches"
          >
            {LEVELS.map((lvl) => (
              <Cell
                key={lvl}
                x={lvl * step}
                y={0}
                size={cellSize}
                radius={cellRadius}
                level={lvl}
              />
            ))}
          </svg>
          <span className="ps1ui-contribution-graph__legend-label">More</span>
        </div>
      )}
    </div>
  );
}
