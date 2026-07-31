"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { cx } from "../../utils/cx";
import { Tooltip } from "../Tooltip/Tooltip";

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
  /** Text for a cell — used both as the cell's accessible name and as its hover/focus tooltip. Defaults to "N contributions on Month Nth." — "No contributions" when count is zero, singular when count is one. */
  labelForDay?: (day: ContributionDay) => string;
};

// SVG label metrics — chosen so ~12px text at font-size:xs never clips.
const MONTH_LABEL_HEIGHT = 16;
const WEEKDAY_LABEL_WIDTH = 28;
// Ink box a month label occupies, measured from its (left-anchored) origin.
// Font metrics don't scale with cellSize, so this is a constant on purpose.
// 24 is an upper bound on the real thing: a 3-letter abbreviation at
// font-size-xs measures 21.60–22.25px across chromium/firefox/webkit, both
// with the bundled JetBrains Mono and on every rung of the fallback stack
// `--ps1ui-font-mono` degrades to (a consumer importing only components.css
// never loads the fontsource face, so the fallback path is a real one).
// Used for the right-edge clip: a label may touch the SVG's edge, so the box
// alone is the whole test there.
const MONTH_LABEL_APPROX_WIDTH = 24;
// Minimum distance between two label origins. Clearing the ink box is enough
// to stop overprinting but not enough to READ as two labels — the tightest
// spacing the box alone permits is 24px (labels land on column multiples), and
// against a 22.25px worst case that is 1.75px of whitespace, well under a
// space glyph. The extra 4px buys a legible gap; it is also the largest addend
// that leaves every existing story / VRT fixture byte-identical (at +6 the
// full-year capture, whose months sit exactly 28px apart at cellSize=5, starts
// dropping alternate labels).
const MONTH_LABEL_MIN_ADVANCE = MONTH_LABEL_APPROX_WIDTH + 4;

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

// Rows in the grid — one per weekday, mirroring the visual layout (and the
// row axis GitHub's own graph exposes to assistive tech).
const ROW_COUNT = 7;

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
// exception band. Used by the default label formatter.
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
// between the two. Grid cells carry the grid semantics (role, accessible
// name, column position, roving tab stop); legend swatches are decorative
// and sit inside an aria-hidden container, so they take none of it.
type CellProps = {
  x: number;
  y: number;
  size: number;
  radius: number;
  level: ContributionLevel;
  date?: string;
  label?: string;
  colIndex?: number;
  tabIndex?: number;
  onFocus?: (event: FocusEvent<SVGRectElement>) => void;
  onBlur?: (event: FocusEvent<SVGRectElement>) => void;
  onKeyDown?: (event: ReactKeyboardEvent<SVGRectElement>) => void;
};

function Cell({
  x,
  y,
  size,
  radius,
  level,
  date,
  label,
  colIndex,
  tabIndex,
  onFocus,
  onBlur,
  onKeyDown,
}: CellProps) {
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
      role={date === undefined ? undefined : "gridcell"}
      aria-label={label}
      aria-colindex={colIndex}
      tabIndex={tabIndex}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
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
  "aria-label": ariaLabel = "Contribution graph",
  ...rest
}: ContributionGraphProps) {
  const step = cellSize + cellGap;
  const padTop = showMonthLabels ? MONTH_LABEL_HEIGHT : 0;
  const padLeft = showWeekdayLabels ? WEEKDAY_LABEL_WIDTH : 0;
  const gridHeight = ROW_COUNT * step - cellGap;

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
  // Reverse lookups used by keyboard navigation: slot → data index resolves
  // "the cell one column right / one row down", and date → data index turns
  // an event target back into the day it represents.
  const indexBySlot = new Map<number, number>();
  const indexByDate = new Map<string, number>();
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
      const slot = startDow + daysBetween(first, parseISODate(day.date));
      daySlots[i] = slot;
      indexBySlot.set(slot, i);
      indexByDate.set(day.date, i);
      if (day.count > maxCount) maxCount = day.count;
    }
  }

  const gridWidth = numWeeks > 0 ? numWeeks * step - cellGap : 0;
  const svgWidth = padLeft + gridWidth;
  const svgHeight = padTop + gridHeight;

  const weekdayNames = weekStartsOn === "monday" ? WEEKDAY_NAMES_MON : WEEKDAY_NAMES_SUN;

  // Month labels — collected, then laid out.
  //
  // Collection walks the sorted data, and every time we enter a new column,
  // checks if that column's topmost day (the first one we see, since dates
  // ascend) is in a new month.
  type MonthLabel = { key: string; x: number; text: string };
  const monthCandidates: MonthLabel[] = [];
  let currentCol = -1;
  let lastMonth = -1;
  for (let i = 0; i < data.length; i++) {
    const slot = daySlots[i]!;
    const col = Math.floor(slot / ROW_COUNT);
    if (col === currentCol) continue;
    currentCol = col;
    const month = parseISODate(data[i]!.date).getMonth();
    if (month === lastMonth) continue;
    monthCandidates.push({
      key: `${col}-${month}`,
      x: padLeft + col * step,
      text: SHORT_MONTH_NAMES[month]!,
    });
    lastMonth = month;
  }

  // Layout runs RIGHT TO LEFT, placing a label only if it clears the nearest
  // obstacle to its right. That obstacle is the SVG's right edge until a label
  // has been placed, and the placed label's origin after — two thresholds,
  // because the two obstacles are different in kind: touching the viewBox edge
  // is fine, touching the next label is not (see the constants above).
  //
  // The direction is what decides who loses a collision, and it has to be the
  // EARLIER label. Two full months sit ~4+ columns apart and rarely collide;
  // the pair that reliably does is a leading partial month against the
  // transition that follows it, one column over — data starting mid-month puts
  // e.g. "Jul" over a 2-day sliver and "Aug" 14px to its right, and they
  // overprint. Of those two the sliver is the less informative, and dropping it
  // also keeps the remaining labels where they were rather than shifting the
  // whole ruler left.
  const monthLabels: MonthLabel[] = [];
  let rightBoundary = svgWidth;
  let clearance = MONTH_LABEL_APPROX_WIDTH;
  for (let i = monthCandidates.length - 1; i >= 0; i--) {
    const label = monthCandidates[i]!;
    if (label.x + clearance > rightBoundary) continue;
    monthLabels.push(label);
    rightBoundary = label.x;
    clearance = MONTH_LABEL_MIN_ADVANCE;
  }
  monthLabels.reverse();
  // Fallback: with every candidate rejected the month row would render empty
  // despite `showMonthLabels` being opted in — the regression the old
  // MIN_COLS_FOR_MONTH_LABEL=3 heuristic caused. Since the leftmost candidate
  // always sits at x=padLeft, "every candidate rejected" reduces exactly to
  // `gridWidth < MONTH_LABEL_APPROX_WIDTH`: one column at the default cell
  // size, but also several columns of very small ones, and never a single
  // column of cellSize >= 24.
  //
  // Two knowing trades here, both scoped to that sub-24px-wide graph:
  //   - The label is wider than the grid it annotates. With the legend on (the
  //     default) the wrapper hugs the legend row instead, which is wider still,
  //     so the text is fully visible; with `showLegend={false}` the scroller
  //     clips it mid-glyph. A cut-off month still beats a blank row, and
  //     widening the SVG to fit a label would make the graph's intrinsic size
  //     stop meaning "the grid".
  //   - The starting month is preferred even though it may be the same leading
  //     sliver the pass above would have dropped. That rule fires because a
  //     BETTER label was visible beside it; here nothing else renders, and the
  //     leftmost column is the one a reader anchors on.
  if (monthLabels.length === 0 && monthCandidates.length > 0) {
    monthLabels.push(monthCandidates[0]!);
  }

  const legendSwatchesWidth = LEVELS.length * step - cellGap;

  // Cells bucketed by weekday row. `data` ascends, so each bucket comes out
  // ordered left-to-right by column already — which is exactly the DOM order
  // a `role="row"` needs.
  const rows: number[][] = Array.from({ length: ROW_COUNT }, () => []);
  for (let i = 0; i < data.length; i++) {
    rows[daySlots[i]! % ROW_COUNT]!.push(i);
  }

  // ---------------------------------------------------------------------
  // Active-day tracking
  //
  // The tooltip is driven by two independent channels — pointer hover and
  // keyboard focus — kept in separate state so releasing one doesn't cancel
  // the other (moving the mouse away while a cell is focused must leave the
  // focused cell's tooltip up). Hover wins when both are live: the pointer is
  // the more recent expression of intent.
  //
  // `dismissedDate` implements Escape (WCAG 1.4.13 "Dismissible"): it pins
  // the one day whose tooltip the user explicitly closed, and releases only
  // when a DIFFERENT day becomes active — so returning to that cell later
  // shows the tooltip again rather than leaving a permanently-silent cell
  // behind. "A different day", specifically: releasing on any change at all
  // would include the pointer slipping onto the month-label band or an empty
  // slot, and a few pixels of jitter would then resurrect the very tooltip
  // the user just dismissed.
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const [dismissedDate, setDismissedDate] = useState<string | null>(null);
  const activeDate = hoveredDate ?? focusedDate;

  const releaseDismissalOnNewDay = useCallback((date: string | null) => {
    if (date === null) return;
    setDismissedDate((prev) => (prev !== null && prev !== date ? null : prev));
  }, []);

  // Roving tabindex (APG "Grid"): the grid holds exactly ONE tab stop, and
  // arrow keys move focus between cells. `tabbableDate` is the remembered
  // stop; it falls back to the first day whenever it points at a date the
  // current `data` no longer contains, so a data swap can never strand the
  // graph without a tab stop.
  const [tabbableDate, setTabbableDate] = useState<string | null>(null);
  const rovingDate =
    tabbableDate !== null && indexByDate.has(tabbableDate) ? tabbableDate : (data[0]?.date ?? null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // `svgRef.current!` follows useScrollableFocus's precedent: React populates
  // refs during commit, and every call site here runs from a layout effect or
  // a DOM event on the mounted tree, so it always holds a live element. The
  // querySelector CAN still come back null — a caller that swaps `data` while
  // a cell is active leaves the previous day's date pointing at nothing.
  const cellElementFor = useCallback(
    (date: string): SVGRectElement | null =>
      svgRef.current!.querySelector<SVGRectElement>(`[data-date="${CSS.escape(date)}"]`),
    [],
  );

  // The Tooltip anchors to a live DOM node rather than a date string, so it
  // is resolved here (post-commit, when the cell is guaranteed mounted) and
  // held in state. Re-resolving on every `data` change is what keeps a
  // detached node — whose getBoundingClientRect() is an all-zero box at the
  // viewport origin — from ever reaching Tooltip.
  const [anchor, setAnchor] = useState<Element | null>(null);
  useLayoutEffect(() => {
    setAnchor(activeDate === null ? null : cellElementFor(activeDate));
  }, [activeDate, data, cellElementFor]);

  const open = anchor !== null && activeDate !== null && activeDate !== dismissedDate;

  // Escape is bound on the document, not on the grid, because the tooltip can
  // be open from hover alone — and a hovering user has focus somewhere else
  // entirely, so a keydown handler on the cells would never see the key.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissedDate(activeDate);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, activeDate]);

  // Hover is hit-tested by POINTER COORDINATE, not by event target, and is
  // bound on the SVG rather than per cell.
  //
  // Each day owns a whole `step × step` block — its rect plus the gap that
  // follows it — so the grid has no dead pixels. Target-based hit testing
  // reported "background" for the `cellGap` between two cells, and since
  // mousemove samples every ~10ms a normal sweep lands in that gap most
  // crossings: the tooltip would blink off and back on between every pair of
  // days. It also widens the effective hover target from `cellSize` to `step`,
  // which matters at the 11px default.
  //
  // Focus and keyboard are bound per cell instead — those events can only ever
  // originate from a cell, so delegation would buy nothing and cost a "was
  // that really a cell?" guard on every call.
  const dayAtPointer = (event: MouseEvent<SVGSVGElement>): string | null => {
    const box = svgRef.current!.getBoundingClientRect();
    // The viewBox is 1:1 with the SVG's intrinsic size, but a consumer
    // stylesheet may scale the element — normalising through the rendered box
    // keeps the mapping honest either way.
    const x = ((event.clientX - box.left) * svgWidth) / box.width - padLeft;
    const y = ((event.clientY - box.top) * svgHeight) / box.height - padTop;
    // The month-label band (negative y) has to be rejected outright: row -1 of
    // column 1 is slot 6, a real cell, so it would wrap into the previous
    // column's bottom row. The weekday-label band (negative x) needs no such
    // guard — its slots come out negative and simply miss the map.
    if (y < 0) return null;
    const index = indexBySlot.get(Math.floor(x / step) * ROW_COUNT + Math.floor(y / step));
    return index === undefined ? null : data[index]!.date;
  };

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const date = dayAtPointer(event);
    if (date === hoveredDate) return;
    setHoveredDate(date);
    releaseDismissalOnNewDay(date);
  };

  const handleMouseLeave = () => {
    setHoveredDate(null);
  };

  const handleCellFocus = (date: string) => {
    setFocusedDate(date);
    setTabbableDate(date);
    releaseDismissalOnNewDay(date);
  };

  const handleCellBlur = (event: FocusEvent<SVGRectElement>) => {
    // Arrowing between cells fires blur-then-focus as two separate tasks;
    // clearing unconditionally would tear the tooltip down and rebuild it on
    // every step. Focus landing on another cell of THIS grid is handled by
    // that cell's own focus event instead — scoped by containment, because a
    // bare `data-date` check would also match a second ContributionGraph on
    // the page and leave this one's tooltip stuck open forever.
    const next = event.relatedTarget;
    if (next instanceof Element && svgRef.current!.contains(next)) return;
    setFocusedDate(null);
  };

  // Walks one step at a time in (column, row) space until it finds a day or
  // runs off the grid, so a gap in the data is stepped over rather than
  // stopping navigation dead. Vertical moves stay inside their column and
  // horizontal moves inside their row — wrapping would silently jump the
  // user a week forward or back.
  const seek = (col: number, row: number, dCol: number, dRow: number): number | undefined => {
    let c = col + dCol;
    let r = row + dRow;
    while (c >= 0 && c < numWeeks && r >= 0 && r < ROW_COUNT) {
      const found = indexBySlot.get(c * ROW_COUNT + r);
      if (found !== undefined) return found;
      c += dCol;
      r += dRow;
    }
    return undefined;
  };

  const handleCellKeyDown = (event: ReactKeyboardEvent<SVGRectElement>, index: number) => {
    const slot = daySlots[index]!;
    const col = Math.floor(slot / ROW_COUNT);
    const row = slot % ROW_COUNT;
    const rowCells = rows[row]!;

    let next: number | undefined;
    switch (event.key) {
      case "ArrowRight":
        next = seek(col, row, 1, 0);
        break;
      case "ArrowLeft":
        next = seek(col, row, -1, 0);
        break;
      case "ArrowDown":
        next = seek(col, row, 0, 1);
        break;
      case "ArrowUp":
        next = seek(col, row, 0, -1);
        break;
      // APG: Home/End jump within the row, Ctrl+Home/End to the whole grid's
      // first/last cell.
      case "Home":
        next = event.ctrlKey ? 0 : rowCells[0];
        break;
      case "End":
        next = event.ctrlKey ? data.length - 1 : rowCells[rowCells.length - 1];
        break;
      default:
        return;
    }
    // preventDefault unconditionally for the keys we claim: letting ArrowDown
    // scroll the page (or Home jump to the document top) after the grid has
    // decided the move is a no-op would read as the graph losing the key.
    event.preventDefault();
    if (next === undefined) return;
    const nextDate = data[next]!.date;
    setTabbableDate(nextDate);
    cellElementFor(nextDate)?.focus();
  };

  const isEmpty = data.length === 0;

  // Same formatter, same string, for both channels — the tooltip a sighted
  // user reads and the accessible name a screen-reader user hears can never
  // drift apart.
  const activeIndex = activeDate === null ? undefined : indexByDate.get(activeDate);
  const activeLabel = activeIndex === undefined ? "" : labelForDay(data[activeIndex]!);

  return (
    <div {...rest} className={cx("ps1ui-contribution-graph", className)}>
      {/* The scroller keeps a full year inside narrow viewports (mobile)
          instead of pushing its parent wider — same contract as Table and
          CodeBlock. Unlike those two it needs no tabIndex of its own: the
          grid's roving tab stop means the scrollable region always contains
          a focusable cell, which is what axe's scrollable-region-focusable
          actually asks for, and arrowing between cells scrolls them into
          view natively. */}
      <div className="ps1ui-contribution-graph__scroller">
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- the SVG does carry an interactive role (`grid`, or `img` only when there is nothing to navigate); the rule cannot see through the conditional expression on `role` below. */}
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="ps1ui-contribution-graph__svg"
          // An empty graph is not a grid — `role="grid"` with no rows is
          // malformed, and there is nothing to navigate. It degrades to the
          // labelled image the whole component used to be.
          role={isEmpty ? "img" : "grid"}
          aria-label={ariaLabel}
          aria-rowcount={isEmpty ? undefined : ROW_COUNT}
          aria-colcount={isEmpty ? undefined : numWeeks}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Month and weekday labels are aria-hidden: every cell's accessible
              name already spells out its full date, so exposing them again as
              headers would make screen readers announce the month twice. They
              also must stay out of the accessibility tree for `role="grid"`,
              which only permits rows as children. */}
          {showMonthLabels &&
            monthLabels.map((label) => (
              <text
                key={label.key}
                x={label.x}
                y={MONTH_LABEL_HEIGHT - 5}
                className="ps1ui-contribution-graph__month"
                aria-hidden="true"
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
                aria-hidden="true"
              >
                {weekdayNames[row]!}
              </text>
            ))}
          {rows.map((cells, row) =>
            // A weekday with no days in range contributes no row at all —
            // `aria-rowindex` on the rows that do exist carries the position,
            // which is exactly the case aria-rowindex exists for.
            cells.length === 0 ? null : (
              <g
                key={row}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<tr>` is HTML; inside an <svg> the only grouping element is <g>, so the ARIA role is the sole way to express a grid row here.
                role="row"
                aria-rowindex={row + 1}
              >
                {cells.map((i) => {
                  const day = data[i]!;
                  const col = Math.floor(daySlots[i]! / ROW_COUNT);
                  return (
                    <Cell
                      key={day.date}
                      x={padLeft + col * step}
                      y={padTop + row * step}
                      size={cellSize}
                      radius={cellRadius}
                      level={levelFor(day.count, maxCount)}
                      date={day.date}
                      label={labelForDay(day)}
                      colIndex={col + 1}
                      tabIndex={day.date === rovingDate ? 0 : -1}
                      onFocus={() => handleCellFocus(day.date)}
                      onBlur={handleCellBlur}
                      onKeyDown={(event) => handleCellKeyDown(event, i)}
                    />
                  );
                })}
              </g>
            ),
          )}
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
      {/* Anchor mode: the "trigger" is whichever of N cells is active, which
          is not a single element Tooltip could clone. The panel is
          aria-hidden because its text is verbatim the active cell's own
          accessible name — wiring it up as a description instead would make
          a screen reader read every day twice. */}
      <Tooltip anchor={anchor} open={open} content={activeLabel} aria-hidden="true" />
    </div>
  );
}
