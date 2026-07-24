import "../../styles/styles.css";

import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import {
  ContributionGraph,
  type ContributionDay,
  type ContributionGraphWeekStart,
} from "./ContributionGraph";

// A hand-authored 3-week window (2025-01-05 Sun → 2025-01-25 Sat = 21 days).
// Chosen so it starts on Sunday and ends on Saturday — the "no leading /
// trailing empties" case, easy to reason about; other tests widen or shift
// the range to exercise the padding paths.
function makeSampleDays(): ContributionDay[] {
  const start = new Date(2025, 0, 5); // Sun Jan 5 2025
  const days: ContributionDay[] = [];
  for (let i = 0; i < 21; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    // Counts 0..20 give a max of 20 — enough spread to hit every level 0..4
    // via the quartile bucketing.
    days.push({ date: iso, count: i });
  }
  return days;
}

const SAMPLE = makeSampleDays();

// A range that ends mid-week: 8 days (Sun→Sun of next week). Two columns,
// one trailing-empties fill for the second column.
const TWO_COLS: ContributionDay[] = SAMPLE.slice(0, 8);

// A range starting mid-week (Wed) so the first column has leading empties.
const STARTS_WEDNESDAY: ContributionDay[] = [
  { date: "2025-01-08", count: 1 }, // Wed
  { date: "2025-01-09", count: 2 }, // Thu
  { date: "2025-01-10", count: 3 }, // Fri
  { date: "2025-01-11", count: 4 }, // Sat
];

// SAMPLE is 21 contiguous days starting on a Sunday, so its slot arithmetic is
// trivial: data index i sits at col=floor(i/7), row=i%7. The keyboard tests
// below lean on that — e.g. Jan 5 (i=0) is col 0/row 0, Jan 12 (i=7) is the
// cell directly to its right, Jan 6 (i=1) the one directly below.
const JAN_05 = "2025-01-05"; // col 0, row 0 — first day
const JAN_06 = "2025-01-06"; // col 0, row 1 — one below JAN_05
const JAN_12 = "2025-01-12"; // col 1, row 0 — one right of JAN_05
const JAN_19 = "2025-01-19"; // col 2, row 0 — last day of row 0
const JAN_25 = "2025-01-25"; // col 2, row 6 — last day overall

// The <svg> carries the grid role and its accessible name; the wrapper <div>
// is plain layout chrome.
function grid(wrapper: Element): Element {
  return wrapper.querySelector("svg.ps1ui-contribution-graph__svg")!;
}

function cellFor(wrapper: Element, date: string): SVGRectElement {
  return wrapper.querySelector<SVGRectElement>(`[data-date="${date}"]`)!;
}

// The panel is portaled to <body>, so it is never inside the render container.
function tooltipPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

function focusedDate(): string | null {
  return document.activeElement?.getAttribute("data-date") ?? null;
}

// Hover is hit-tested purely from clientX/clientY, so a dispatched mousemove at
// an exact coordinate is both sufficient and far more precise than aiming at an
// element's centre — which is the only thing `userEvent.hover` can do, and
// which WebKit won't do at all for an SVG <text>. Tests that care about a
// specific POINT (the inter-cell gap, the label band) use this; tests that just
// need "the pointer is on this cell" use the real `userEvent.hover`.
function movePointerTo(wrapper: Element, clientX: number, clientY: number): void {
  grid(wrapper).dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX, clientY }));
}

function centerOf(el: Element): [number, number] {
  const box = el.getBoundingClientRect();
  return [box.left + box.width / 2, box.top + box.height / 2];
}

// A point inside the month-label band — above the grid origin, so it must
// resolve to "no day". padLeft is 28 and padTop 16 at default sizes (the same
// constants the layout-math tests above pin).
function monthLabelPoint(wrapper: Element): [number, number] {
  const box = grid(wrapper).getBoundingClientRect();
  return [box.left + 28 + 5, box.top + 5];
}

describe("ContributionGraph", () => {
  describe("rendering", () => {
    test("renders a <div> wrapper containing a scroller with an <svg> grid", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const wrapper = screen.getByTestId("g").element();
      expect(wrapper.tagName.toLowerCase()).toBe("div");
      const scroller = wrapper.querySelector(".ps1ui-contribution-graph__scroller");
      expect(scroller).not.toBeNull();
      expect(scroller!.querySelector("svg.ps1ui-contribution-graph__svg")).not.toBeNull();
    });

    test("emits one <rect> per day", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const cells = screen
        .getByTestId("g")
        .element()
        .querySelectorAll(".ps1ui-contribution-graph__cell");
      expect(cells.length).toBe(SAMPLE.length);
    });

    test("annotates each cell with its date and auto-computed level", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      // Cells are grouped into weekday rows, so DOM order is row-major (every
      // Sunday, then every Monday, …) rather than data order — each day is
      // looked up by its own date instead of by array position.
      //
      // Data has counts 0..20 → maxCount=20. Quartile bucketing:
      //   count=0                    → level 0
      //   ceil((count/20)*4) in 1..4 → level for count>0
      // Some concrete anchors to lock the algorithm:
      // count=0  → 0, count=1 → 1, count=5 → 1, count=6 → 2, count=10 → 2,
      // count=11 → 3, count=15 → 3, count=16 → 4, count=20 → 4.
      const expected = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4] as const;
      for (let i = 0; i < SAMPLE.length; i++) {
        expect(cellFor(wrapper, SAMPLE[i]!.date).getAttribute("data-level")).toBe(
          String(expected[i]),
        );
      }
    });

    test("groups cells into weekday rows (DOM order is row-major, not data order)", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const dates = Array.from(
        screen.getByTestId("g").element().querySelectorAll("[data-date]"),
      ).map((c) => c.getAttribute("data-date"));
      // First three are the three Sundays, not Jan 5 / 6 / 7.
      expect(dates.slice(0, 3)).toEqual([JAN_05, JAN_12, JAN_19]);
      expect(dates.length).toBe(SAMPLE.length);
    });

    test("all-zero data renders every cell at level 0", async () => {
      const days: ContributionDay[] = SAMPLE.map((d) => ({ date: d.date, count: 0 }));
      const screen = await render(
        <ContributionGraph data={days} data-testid="g" showLegend={false} />,
      );
      const levels = Array.from(
        screen.getByTestId("g").element().querySelectorAll(".ps1ui-contribution-graph__cell"),
      ).map((c) => c.getAttribute("data-level"));
      expect(new Set(levels)).toEqual(new Set(["0"]));
    });

    test("default label: plural, singular, and no-activity phrasings", async () => {
      const days: ContributionDay[] = [
        { date: "2025-11-10", count: 10 }, // plural
        { date: "2025-11-11", count: 1 }, // singular
        { date: "2025-11-12", count: 0 }, // zero
      ];
      const screen = await render(
        <ContributionGraph data={days} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      expect(wrapper.querySelector('[data-date="2025-11-10"]')?.getAttribute("aria-label")).toBe(
        "10 contributions on November 10th.",
      );
      expect(wrapper.querySelector('[data-date="2025-11-11"]')?.getAttribute("aria-label")).toBe(
        "1 contribution on November 11th.",
      );
      expect(wrapper.querySelector('[data-date="2025-11-12"]')?.getAttribute("aria-label")).toBe(
        "No contributions on November 12th.",
      );
    });

    test.for<{ date: string; expected: string }>([
      // Ordinal edge cases — st / nd / rd / th plus the 11th / 12th / 13th
      // exception band. Each date is Nov-anchored to a real weekday so the
      // component parses it cleanly.
      { date: "2025-11-01", expected: "1 contribution on November 1st." },
      { date: "2025-11-02", expected: "1 contribution on November 2nd." },
      { date: "2025-11-03", expected: "1 contribution on November 3rd." },
      { date: "2025-11-04", expected: "1 contribution on November 4th." },
      { date: "2025-11-11", expected: "1 contribution on November 11th." },
      { date: "2025-11-12", expected: "1 contribution on November 12th." },
      { date: "2025-11-13", expected: "1 contribution on November 13th." },
      { date: "2025-11-21", expected: "1 contribution on November 21st." },
      { date: "2025-11-22", expected: "1 contribution on November 22nd." },
      { date: "2025-11-23", expected: "1 contribution on November 23rd." },
    ])("ordinal suffix for date=$date", async ({ date, expected }) => {
      const screen = await render(
        <ContributionGraph data={[{ date, count: 1 }]} data-testid="g" showLegend={false} />,
      );
      const cell = screen.getByTestId("g").element().querySelector(`[data-date="${date}"]`);
      expect(cell?.getAttribute("aria-label")).toBe(expected);
    });

    test("labelForDay overrides the default label", async () => {
      const screen = await render(
        <ContributionGraph
          data={[{ date: "2025-01-05", count: 3 }]}
          data-testid="g"
          showLegend={false}
          labelForDay={(day) => `${day.date}::${day.count}`}
        />,
      );
      const cell = screen
        .getByTestId("g")
        .element()
        .querySelector(".ps1ui-contribution-graph__cell");
      expect(cell?.getAttribute("aria-label")).toBe("2025-01-05::3");
    });

    test("renders legend swatches for every level 0–4", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const legend = screen
        .getByTestId("g")
        .element()
        .querySelector(".ps1ui-contribution-graph__legend");
      expect(legend).not.toBeNull();
      const swatches = legend!.querySelectorAll(".ps1ui-contribution-graph__cell");
      expect(swatches.length).toBe(5);
      expect(Array.from(swatches).map((s) => s.getAttribute("data-level"))).toEqual([
        "0",
        "1",
        "2",
        "3",
        "4",
      ]);
      expect(legend!.textContent).toContain("Less");
      expect(legend!.textContent).toContain("More");
    });

    test("empty data still renders the wrapper (for AT discoverability)", async () => {
      const screen = await render(<ContributionGraph data={[]} data-testid="g" />);
      const wrapper = screen.getByTestId("g").element();
      const cells = wrapper.querySelectorAll(
        "svg.ps1ui-contribution-graph__svg .ps1ui-contribution-graph__cell",
      );
      expect(cells.length).toBe(0);
    });
  });

  describe("layout math", () => {
    test("positions cells by (col, row) using startDow of the first day", async () => {
      // First day is Wed (dow=3, sunday-start). Its cell should sit at row 3, col 0.
      const screen = await render(
        <ContributionGraph data={STARTS_WEDNESDAY} data-testid="g" showLegend={false} />,
      );
      const cell = screen.getByTestId("g").element().querySelector('[data-date="2025-01-08"]');
      // cellSize=11, cellGap=3, padTop=16, padLeft=28
      // row 3 y = 16 + 3 * 14 = 58
      expect(cell?.getAttribute("y")).toBe("58");
      // col 0 x = 28
      expect(cell?.getAttribute("x")).toBe("28");
    });

    test("weekStartsOn=monday shifts Sunday to row 6", async () => {
      // 2025-01-05 is a Sunday. Under monday-start, Sunday's dow=6 → row 6.
      const oneSunday: ContributionDay[] = [{ date: "2025-01-05", count: 0 }];
      const screen = await render(
        <ContributionGraph
          data={oneSunday}
          weekStartsOn="monday"
          data-testid="g"
          showLegend={false}
        />,
      );
      const cell = screen.getByTestId("g").element().querySelector('[data-date="2025-01-05"]');
      // row 6 y = 16 + 6 * 14 = 100
      expect(cell?.getAttribute("y")).toBe("100");
    });

    test("cellSize / cellGap / cellRadius flow into rect geometry", async () => {
      const screen = await render(
        <ContributionGraph
          data={SAMPLE.slice(0, 1)}
          cellSize={20}
          cellGap={5}
          cellRadius={6}
          data-testid="g"
          showLegend={false}
        />,
      );
      const cell = screen
        .getByTestId("g")
        .element()
        .querySelector(".ps1ui-contribution-graph__cell");
      expect(cell?.getAttribute("width")).toBe("20");
      expect(cell?.getAttribute("height")).toBe("20");
      expect(cell?.getAttribute("rx")).toBe("6");
      expect(cell?.getAttribute("ry")).toBe("6");
    });

    test("computes numWeeks so the last cell fits in the last column", async () => {
      // 21 contiguous days Sun→Sat = exactly 3 weeks, no padding either side.
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const svg = screen
        .getByTestId("g")
        .element()
        .querySelector("svg.ps1ui-contribution-graph__svg")!;
      // padLeft 28 + 3 cols * 14 - 3 = 28 + 42 - 3 = 67
      expect(svg.getAttribute("width")).toBe("67");
    });

    test("pads the right side to a complete week when data ends mid-week", async () => {
      // TWO_COLS = 8 days starting Sun. Last day is next Sun (dow=0), so
      // trailing = 6 empty cells → 2 columns.
      const screen = await render(
        <ContributionGraph data={TWO_COLS} data-testid="g" showLegend={false} />,
      );
      const svg = screen
        .getByTestId("g")
        .element()
        .querySelector("svg.ps1ui-contribution-graph__svg")!;
      // padLeft 28 + 2 cols * 14 - 3 = 28 + 28 - 3 = 53
      expect(svg.getAttribute("width")).toBe("53");
    });

    test("non-contiguous data places each cell at its actual weekday (finding-2)", async () => {
      // Sparse data — Mon / Wed / Fri, skipping the other four days. Under
      // the previous index-based slotting these cells would have landed at
      // consecutive rows (dow of first + 0/1/2); the correct behaviour is
      // to place each at its own actual weekday computed from its date.
      const days: ContributionDay[] = [
        { date: "2025-01-06", count: 1 }, // Mon → row 1
        { date: "2025-01-08", count: 2 }, // Wed → row 3
        { date: "2025-01-10", count: 3 }, // Fri → row 5
      ];
      const screen = await render(
        <ContributionGraph data={days} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      // padTop=16, step=14 → row y = 16 + row*14.
      expect(wrapper.querySelector('[data-date="2025-01-06"]')?.getAttribute("y")).toBe("30");
      expect(wrapper.querySelector('[data-date="2025-01-08"]')?.getAttribute("y")).toBe("58");
      expect(wrapper.querySelector('[data-date="2025-01-10"]')?.getAttribute("y")).toBe("86");
    });

    test("numWeeks derives from the date range, not array length (finding-2)", async () => {
      // 3 sparse days spanning 14 real days. The previous
      // `(startDow + data.length + trailing) / 7` formula (data.length=3,
      // trailing=1 → 4/7 ≈ 0.57) yielded a fractional numWeeks and a viewBox
      // narrower than the last rect, cutting the tail cell off with no
      // scrollbar past it. The correct formula uses the actual date-range
      // span (spanDays=14 → numWeeks=2), so the SVG accommodates every rect.
      const days: ContributionDay[] = [
        { date: "2025-01-05", count: 1 }, // Sun
        { date: "2025-01-12", count: 2 }, // Sun (next week)
        { date: "2025-01-18", count: 3 }, // Sat (end of week 2)
      ];
      const screen = await render(
        <ContributionGraph data={days} data-testid="g" showLegend={false} />,
      );
      const svg = screen
        .getByTestId("g")
        .element()
        .querySelector("svg.ps1ui-contribution-graph__svg")!;
      // 2 weeks: svgWidth = 28 + 2*14 - 3 = 53.
      expect(svg.getAttribute("width")).toBe("53");
      // Jan 18 (Sat) is 13 days after Jan 5 → slot 13 → col 1, row 6.
      const last = screen.getByTestId("g").element().querySelector('[data-date="2025-01-18"]');
      expect(last?.getAttribute("x")).toBe("42"); // padLeft(28) + col(1)*step(14)
      expect(last?.getAttribute("y")).toBe("100"); // padTop(16) + row(6)*step(14)
    });
  });

  describe("month labels", () => {
    // Helper — build `count` contiguous days from `start`, all zero-count.
    function contiguousDays(start: Date, count: number): ContributionDay[] {
      const days: ContributionDay[] = [];
      for (let i = 0; i < count; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days.push({ date: iso, count: 0 });
      }
      return days;
    }

    test("emits one label per month whose transition sits inside the SVG's viewBox", async () => {
      // 60 days from Sun Jan 5 2025 span through early March. Jan emits as
      // the leftmost label; Feb transitions at col 4 (Feb 2 Sun), well inside
      // the 9-column viewBox and fits. Mar's transition falls at the last
      // column where the label text would clip the right edge — suppressed.
      const screen = await render(
        <ContributionGraph
          data={contiguousDays(new Date(2025, 0, 5), 60)}
          data-testid="g"
          showLegend={false}
        />,
      );
      const labels = Array.from(
        screen.getByTestId("g").element().querySelectorAll(".ps1ui-contribution-graph__month"),
      ).map((n) => n.textContent);
      expect(labels).toContain("Jan");
      expect(labels).toContain("Feb");
    });

    test("emits the leftmost month label even in very short graphs (finding-1 regression)", async () => {
      // 14 days = 2 columns. Under the previous week-count heuristic
      // (MIN_COLS_FOR_MONTH_LABEL=3) `col=0 + 3 <= 2` failed, and the
      // graph rendered an empty month row despite showMonthLabels being
      // opted-in. The leftmost-always-emits rule guarantees users always
      // see the starting month.
      const screen = await render(
        <ContributionGraph
          data={contiguousDays(new Date(2025, 0, 5), 14)}
          data-testid="g"
          showLegend={false}
        />,
      );
      const labels = Array.from(
        screen.getByTestId("g").element().querySelectorAll(".ps1ui-contribution-graph__month"),
      ).map((n) => n.textContent);
      expect(labels).toEqual(["Jan"]);
    });

    test("suppresses a later month label whose text would clip past the SVG viewBox", async () => {
      // 14 days from Sun Jan 26 2025 → Sat Feb 8 2025. numWeeks=2 →
      // svgWidth = padLeft(28) + 2*step(14) - gap(3) = 53. Col 1's topmost
      // day is Feb 2 (Sun); its label would render at x=42 with ~24px of
      // rendered text (`MONTH_LABEL_APPROX_WIDTH`), right edge ≈ 66 > 53 —
      // non-leftmost + doesn't fit → suppressed. Jan (leftmost) always
      // emits regardless.
      const screen = await render(
        <ContributionGraph
          data={contiguousDays(new Date(2025, 0, 26), 14)}
          data-testid="g"
          showLegend={false}
        />,
      );
      const labels = Array.from(
        screen.getByTestId("g").element().querySelectorAll(".ps1ui-contribution-graph__month"),
      ).map((n) => n.textContent);
      expect(labels).toEqual(["Jan"]);
    });

    test("showMonthLabels=false removes the month row", async () => {
      const screen = await render(
        <ContributionGraph
          data={SAMPLE}
          showMonthLabels={false}
          data-testid="g"
          showLegend={false}
        />,
      );
      const labels = screen
        .getByTestId("g")
        .element()
        .querySelectorAll(".ps1ui-contribution-graph__month");
      expect(labels.length).toBe(0);
    });
  });

  describe("weekday labels", () => {
    test.for<{ weekStartsOn: ContributionGraphWeekStart; expected: readonly string[] }>([
      { weekStartsOn: "sunday", expected: ["Mon", "Wed", "Fri"] },
      { weekStartsOn: "monday", expected: ["Tue", "Thu", "Sat"] },
    ])("weekStartsOn=$weekStartsOn shows labels $expected", async ({ weekStartsOn, expected }) => {
      const screen = await render(
        <ContributionGraph
          data={SAMPLE}
          weekStartsOn={weekStartsOn}
          data-testid="g"
          showLegend={false}
        />,
      );
      const labels = Array.from(
        screen.getByTestId("g").element().querySelectorAll(".ps1ui-contribution-graph__weekday"),
      ).map((n) => n.textContent);
      expect(labels).toEqual(Array.from(expected));
    });

    test("showWeekdayLabels=false removes the weekday column", async () => {
      const screen = await render(
        <ContributionGraph
          data={SAMPLE}
          showWeekdayLabels={false}
          data-testid="g"
          showLegend={false}
        />,
      );
      const labels = screen
        .getByTestId("g")
        .element()
        .querySelectorAll(".ps1ui-contribution-graph__weekday");
      expect(labels.length).toBe(0);
    });
  });

  describe("legend", () => {
    test("showLegend=false removes the legend row entirely", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const legend = screen
        .getByTestId("g")
        .element()
        .querySelector(".ps1ui-contribution-graph__legend");
      expect(legend).toBeNull();
    });
  });

  describe("scrollable overflow", () => {
    // The graph must not push a narrow parent wider than the viewport — a full
    // year is intentionally too wide to fit on mobile, and the scroller absorbs
    // the overflow instead. `overflow-x: auto` + `max-width: 100%` on the root
    // is the load-bearing invariant; the axe-triggered tabIndex is the
    // consequence, tested via the observable attribute.

    test("scroller carries overflow-x:auto so wide grids scroll horizontally", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const scroller = screen
        .getByTestId("g")
        .element()
        .querySelector<HTMLDivElement>(".ps1ui-contribution-graph__scroller")!;
      expect(getComputedStyle(scroller).overflowX).toBe("auto");
    });

    test("root wrapper caps at max-width: 100% so it never spills its parent", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const wrapper = screen.getByTestId("g").element();
      expect(getComputedStyle(wrapper).maxWidth).toBe("100%");
    });

    test("wrapper hugs its content inside a wide parent (keeps legend beside the grid)", async () => {
      // Parent is 1200px wide; without the hug, the flex column would stretch
      // to 1200 and the align-self:flex-end legend would fly to the far right,
      // detached from the graph. `width: fit-content` on the root pins the
      // wrapper to max(svgWidth, legendWidth) capped at parent, so the legend
      // right-aligns beside the graph. Assertion: the wrapper is materially
      // narrower than the 1200px parent and no wider than the union of its
      // own children — legend right edge sits at the wrapper's right edge.
      const screen = await render(
        <div style={{ width: 1200 }}>
          <ContributionGraph data={SAMPLE} data-testid="g" />
        </div>,
      );
      const wrapper = screen.getByTestId("g").element() as HTMLDivElement;
      const wrapperRect = wrapper.getBoundingClientRect();
      expect(wrapperRect.width).toBeLessThan(1200);
      // Every visible child must fit inside the wrapper's inline extent (no
      // overflow to the left of `align-self: flex-end` because the wrapper
      // is at least as wide as the legend row).
      const scroller = wrapper.querySelector<HTMLDivElement>(
        ".ps1ui-contribution-graph__scroller",
      )!;
      const legend = wrapper.querySelector<HTMLDivElement>(".ps1ui-contribution-graph__legend")!;
      expect(scroller.getBoundingClientRect().right).toBeLessThanOrEqual(wrapperRect.right + 0.5);
      expect(legend.getBoundingClientRect().right).toBeLessThanOrEqual(wrapperRect.right + 0.5);
      expect(legend.getBoundingClientRect().left).toBeGreaterThanOrEqual(wrapperRect.left - 0.5);
    });

    test("wrapper caps at parent width when the graph is wider than the viewport", async () => {
      // 12-month year is ~742px wide at default cell size, forced into a 200px
      // parent. `max-width: 100%` beats the intrinsic-width cue so the wrapper
      // stays at 200px and the internal scroller takes the overflow. Without
      // this cap the wrapper would spill the parent horizontally.
      const start = new Date(2025, 0, 1);
      const days: ContributionDay[] = [];
      for (let i = 0; i < 365; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days.push({ date: iso, count: 0 });
      }
      const screen = await render(
        <div style={{ width: 200 }}>
          <ContributionGraph data={days} data-testid="g" />
        </div>,
      );
      const wrapper = screen.getByTestId("g").element() as HTMLDivElement;
      expect(wrapper.getBoundingClientRect().width).toBe(200);
    });

    test("overflowing scroller stays out of the tab order — its cells are the tab stop", async () => {
      // Regression cover for dropping useScrollableFocus. axe's
      // scrollable-region-focusable is satisfied by a scrollable region that
      // CONTAINS focusable content, and the grid's roving tabindex guarantees
      // exactly that. Giving the scroller its own tabIndex on top would add a
      // second, redundant tab stop that swallows the arrow keys the grid
      // needs. 365 days ≈ 742px wide inside a 200px parent, so the region is
      // genuinely scrollable here.
      const start = new Date(2025, 0, 1);
      const days: ContributionDay[] = [];
      for (let i = 0; i < 365; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        days.push({ date: iso, count: 0 });
      }
      const screen = await render(
        <div style={{ width: 200 }}>
          <ContributionGraph data={days} data-testid="g" />
        </div>,
      );
      const wrapper = screen.getByTestId("g").element();
      const scroller = wrapper.querySelector<HTMLDivElement>(
        ".ps1ui-contribution-graph__scroller",
      )!;
      expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
      expect(scroller.hasAttribute("tabindex")).toBe(false);
      expect(scroller.querySelectorAll('[tabindex="0"]').length).toBe(1);
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-contribution-graph base class", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      await expect.element(screen.getByTestId("g")).toHaveClass("ps1ui-contribution-graph");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} className="extra" data-testid="g" />,
      );
      const el = screen.getByTestId("g");
      await expect.element(el).toHaveClass("ps1ui-contribution-graph");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, data-*, style)", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} id="year" data-testid="g" style={{ opacity: 0.75 }} />,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.id).toBe("year");
      expect(el.style.opacity).toBe("0.75");
    });

    test("caller aria-label names the grid, not the wrapper", async () => {
      // The name has to sit on the element carrying the role. It used to live
      // on the wrapper alongside role="img"; now that the SVG is the grid,
      // `aria-label` is intercepted from the passthrough and forwarded there.
      const screen = await render(
        <ContributionGraph data={SAMPLE} aria-label="Commits in 2025" data-testid="g" />,
      );
      const wrapper = screen.getByTestId("g").element();
      expect(wrapper.hasAttribute("aria-label")).toBe(false);
      expect(grid(wrapper).getAttribute("aria-label")).toBe("Commits in 2025");
    });

    test("defaults the grid's aria-label when none is supplied", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      expect(grid(screen.getByTestId("g").element()).getAttribute("aria-label")).toBe(
        "Contribution graph",
      );
    });
  });

  describe("grid semantics", () => {
    test("the SVG is the grid, sized by aria-rowcount / aria-colcount", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const g = grid(screen.getByTestId("g").element());
      expect(g.getAttribute("role")).toBe("grid");
      // 7 weekday rows always; SAMPLE spans exactly 3 week columns.
      expect(g.getAttribute("aria-rowcount")).toBe("7");
      expect(g.getAttribute("aria-colcount")).toBe("3");
    });

    test("emits one role=row per weekday, carrying its 1-based aria-rowindex", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const rows = Array.from(
        grid(screen.getByTestId("g").element()).querySelectorAll('[role="row"]'),
      );
      expect(rows.length).toBe(7);
      expect(rows.map((r) => r.getAttribute("aria-rowindex"))).toEqual([
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
      ]);
    });

    test("cells are gridcells inside their weekday row, indexed by column", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      // Row 0 (Sundays) holds one cell per week column, in column order.
      const row0 = grid(wrapper).querySelector('[role="row"][aria-rowindex="1"]')!;
      const cells = Array.from(row0.querySelectorAll('[role="gridcell"]'));
      expect(cells.map((c) => c.getAttribute("data-date"))).toEqual([JAN_05, JAN_12, JAN_19]);
      expect(cells.map((c) => c.getAttribute("aria-colindex"))).toEqual(["1", "2", "3"]);
    });

    test("a weekday with no days in range contributes no row", async () => {
      // Wed→Sat only: rows 0 (Sun), 1 (Mon), 2 (Tue) are empty and omitted, so
      // the surviving rows start at aria-rowindex 4 (Wed).
      const screen = await render(
        <ContributionGraph data={STARTS_WEDNESDAY} data-testid="g" showLegend={false} />,
      );
      const rows = Array.from(
        grid(screen.getByTestId("g").element()).querySelectorAll('[role="row"]'),
      );
      expect(rows.map((r) => r.getAttribute("aria-rowindex"))).toEqual(["4", "5", "6", "7"]);
    });

    test("month and weekday labels stay out of the accessibility tree", async () => {
      // `role="grid"` only permits rows as children, and each cell's name
      // already spells out its full date — exposing the labels would both
      // break the grid's required-children contract and double-announce.
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const wrapper = screen.getByTestId("g").element();
      const labels = wrapper.querySelectorAll(
        ".ps1ui-contribution-graph__month, .ps1ui-contribution-graph__weekday",
      );
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) expect(label.getAttribute("aria-hidden")).toBe("true");
    });

    test("empty data degrades to a labelled image (a grid with no rows is malformed)", async () => {
      const screen = await render(<ContributionGraph data={[]} data-testid="g" />);
      const g = grid(screen.getByTestId("g").element());
      expect(g.getAttribute("role")).toBe("img");
      expect(g.getAttribute("aria-label")).toBe("Contribution graph");
      expect(g.hasAttribute("aria-rowcount")).toBe(false);
      expect(g.hasAttribute("aria-colcount")).toBe(false);
    });

    test("legend swatches take none of the grid semantics", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const legend = screen
        .getByTestId("g")
        .element()
        .querySelector(".ps1ui-contribution-graph__legend")!;
      for (const swatch of legend.querySelectorAll(".ps1ui-contribution-graph__cell")) {
        expect(swatch.hasAttribute("role")).toBe(false);
        expect(swatch.hasAttribute("tabindex")).toBe(false);
        expect(swatch.hasAttribute("data-date")).toBe(false);
      }
    });
  });

  describe("interaction (tooltip)", () => {
    test("hovering a cell opens a tooltip carrying that day's label", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      await userEvent.hover(page.elementLocator(cellFor(wrapper, JAN_05)));
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      expect(tooltipPanel()!.textContent).toBe("No contributions on January 5th.");
    });

    test("sweeping to another cell swaps the text in the SAME panel", async () => {
      // The single-Tooltip design is the point: a per-cell Tooltip would tear
      // the panel down and rebuild it (and restart any open delay) on every
      // cell boundary crossed.
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} cellSize={20} />,
      );
      const wrapper = screen.getByTestId("g").element();
      await userEvent.hover(page.elementLocator(cellFor(wrapper, JAN_05)));
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      const first = tooltipPanel()!;
      await userEvent.hover(page.elementLocator(cellFor(wrapper, JAN_06)));
      await vi.waitFor(() =>
        expect(tooltipPanel()?.textContent).toBe("1 contribution on January 6th."),
      );
      expect(tooltipPanel()).toBe(first);
    });

    test("leaving the graph closes the tooltip", async () => {
      const screen = await render(
        <div>
          <span data-testid="outside">elsewhere</span>
          <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />
        </div>,
      );
      const wrapper = screen.getByTestId("g").element();
      await userEvent.hover(page.elementLocator(cellFor(wrapper, JAN_05)));
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      await userEvent.hover(screen.getByTestId("outside"));
      await vi.waitFor(() => expect(tooltipPanel()).toBeNull());
    });

    test("focusing a cell opens the tooltip, blurring closes it", { retry: 3 }, async () => {
      const screen = await render(
        <div>
          <button type="button" data-testid="after">
            after
          </button>
          <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />
        </div>,
      );
      const wrapper = screen.getByTestId("g").element();
      cellFor(wrapper, JAN_12).focus();
      await vi.waitFor(() =>
        expect(tooltipPanel()?.textContent).toBe("7 contributions on January 12th."),
      );
      (screen.getByTestId("after").element() as HTMLElement).focus();
      await vi.waitFor(() => expect(tooltipPanel()).toBeNull());
    });

    test("blurring to nothing at all closes the tooltip", { retry: 3 }, async () => {
      // The other blur path: focus leaves for no element (programmatic blur, a
      // click on non-focusable page background) so `relatedTarget` is null
      // rather than a sibling cell.
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      const cell = cellFor(wrapper, JAN_12);
      cell.focus();
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      cell.blur();
      await vi.waitFor(() => expect(tooltipPanel()).toBeNull());
    });

    test("Escape dismisses the tooltip while the pointer stays on the cell", async () => {
      // WCAG 1.4.13 "Dismissible". The key is bound on the document, not the
      // cells, because a hovering user's focus is somewhere else entirely.
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      await userEvent.hover(page.elementLocator(cellFor(wrapper, JAN_05)));
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      await userEvent.keyboard("{Escape}");
      await vi.waitFor(() => expect(tooltipPanel()).toBeNull());
    });

    test("moving to a different day after Escape shows the tooltip again", async () => {
      // Dismissal is pinned to the one day it was aimed at, so Escape can
      // never leave a permanently-silent cell behind.
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} cellSize={20} />,
      );
      const wrapper = screen.getByTestId("g").element();
      await userEvent.hover(page.elementLocator(cellFor(wrapper, JAN_05)));
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      await userEvent.keyboard("{Escape}");
      await vi.waitFor(() => expect(tooltipPanel()).toBeNull());
      await userEvent.hover(page.elementLocator(cellFor(wrapper, JAN_06)));
      await vi.waitFor(() =>
        expect(tooltipPanel()?.textContent).toBe("1 contribution on January 6th."),
      );
    });

    test("a stray move off the grid does not resurrect a dismissed tooltip", async () => {
      // Regression: the dismissal used to release on ANY change of active day,
      // null included. Nudging the pointer onto the month-label band and back
      // therefore wiped it, and the tooltip the user had just dismissed with
      // Escape reappeared — defeating WCAG 1.4.13 "Dismissible" with a few
      // pixels of jitter.
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const wrapper = screen.getByTestId("g").element();
      const onJan05 = centerOf(cellFor(wrapper, JAN_05));
      movePointerTo(wrapper, ...onJan05);
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      await userEvent.keyboard("{Escape}");
      await vi.waitFor(() => expect(tooltipPanel()).toBeNull());

      movePointerTo(wrapper, ...monthLabelPoint(wrapper));
      movePointerTo(wrapper, ...onJan05);
      // Still dismissed: the pointer never reached a different DAY.
      expect(tooltipPanel()).toBeNull();
    });

    test(
      "a second graph on the page does not keep this one's tooltip open",
      { retry: 3 },
      async () => {
        // Regression: blur used to hand off to "any element with data-date",
        // which a sibling ContributionGraph's roving cell also satisfies. Graph
        // A then skipped its own close and left its panel up for good — and the
        // docs site stacks five graphs on one page.
        const screen = await render(
          <>
            <ContributionGraph data={SAMPLE} data-testid="a" showLegend={false} />
            <ContributionGraph data={SAMPLE} data-testid="b" showLegend={false} />
          </>,
        );
        const a = screen.getByTestId("a").element();
        const b = screen.getByTestId("b").element();
        cellFor(a, JAN_05).focus();
        await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
        cellFor(b, JAN_12).focus();
        await vi.waitFor(() =>
          expect(tooltipPanel()?.textContent).toBe("7 contributions on January 12th."),
        );
        // Exactly one panel — graph A closed its own rather than stranding it.
        expect(document.querySelectorAll('[role="tooltip"]').length).toBe(1);
      },
    );

    test("labelForDay drives the tooltip and the accessible name from one string", async () => {
      const screen = await render(
        <ContributionGraph
          data={SAMPLE}
          data-testid="g"
          showLegend={false}
          labelForDay={(day) => `${day.date}::${day.count}`}
        />,
      );
      const wrapper = screen.getByTestId("g").element();
      const cell = cellFor(wrapper, JAN_05);
      await userEvent.hover(page.elementLocator(cell));
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      expect(tooltipPanel()!.textContent).toBe("2025-01-05::0");
      expect(cell.getAttribute("aria-label")).toBe("2025-01-05::0");
    });

    test("the panel is aria-hidden — its text duplicates the cell's own name", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      await userEvent.hover(page.elementLocator(cellFor(wrapper, JAN_05)));
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      expect(tooltipPanel()!.getAttribute("aria-hidden")).toBe("true");
    });

    test("moving onto the month-label band closes the tooltip", async () => {
      // The label band sits at negative y relative to the grid origin. Without
      // an explicit reject it would wrap into the previous column's bottom row
      // (row -1 of column 1 is slot 6, a real cell) and report the wrong day.
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const wrapper = screen.getByTestId("g").element();
      movePointerTo(wrapper, ...centerOf(cellFor(wrapper, JAN_05)));
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      movePointerTo(wrapper, ...monthLabelPoint(wrapper));
      await vi.waitFor(() => expect(tooltipPanel()).toBeNull());
    });

    test("moving onto a slot with no day closes the tooltip", async () => {
      // STARTS_WEDNESDAY leaves rows 0–2 (Sun/Mon/Tue) of its only column
      // empty. A slot is a legitimate hover target geometrically but has no
      // day behind it, so it must not leave the previous cell's tooltip up.
      const screen = await render(
        <ContributionGraph data={STARTS_WEDNESDAY} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      movePointerTo(wrapper, ...centerOf(cellFor(wrapper, "2025-01-08"))); // Wed, row 3
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      // Column 0, row 0 — Sunday, which this data set has no entry for.
      const box = grid(wrapper).getBoundingClientRect();
      movePointerTo(wrapper, box.left + 28 + 5, box.top + 16 + 5);
      await vi.waitFor(() => expect(tooltipPanel()).toBeNull());
    });

    test("the gap between two cells belongs to a day, not to the background", async () => {
      // Regression cover for the sweep flicker: hit-testing by event target
      // reported "background" for the `cellGap` between cells, so a pointer
      // crossing it blinked the tooltip off. Each day owns a full step × step
      // block, so a point inside the gap still resolves to its owning day.
      const screen = await render(
        <ContributionGraph
          data={SAMPLE}
          data-testid="g"
          showLegend={false}
          showMonthLabels={false}
          showWeekdayLabels={false}
        />,
      );
      const wrapper = screen.getByTestId("g").element();
      const box = cellFor(wrapper, JAN_05).getBoundingClientRect();
      // 1px past the cell's right edge — inside the 3px gap before the next
      // column, which the block model assigns to JAN_05 itself.
      movePointerTo(wrapper, box.right + 1, box.top + box.height / 2);
      await vi.waitFor(() =>
        expect(tooltipPanel()?.textContent).toBe("No contributions on January 5th."),
      );
    });
  });

  describe("keyboard navigation", () => {
    test("exactly one cell holds the tab stop, and it starts at the first day", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      const tabbable = wrapper.querySelectorAll('[data-date][tabindex="0"]');
      expect(tabbable.length).toBe(1);
      expect(tabbable[0]!.getAttribute("data-date")).toBe(JAN_05);
      // Every other cell is programmatically focusable only.
      expect(wrapper.querySelectorAll('[data-date][tabindex="-1"]').length).toBe(SAMPLE.length - 1);
    });

    test.for<{ key: string; from: string; expected: string }>([
      { key: "{ArrowRight}", from: JAN_05, expected: JAN_12 },
      { key: "{ArrowLeft}", from: JAN_12, expected: JAN_05 },
      { key: "{ArrowDown}", from: JAN_05, expected: JAN_06 },
      { key: "{ArrowUp}", from: JAN_06, expected: JAN_05 },
      // Home/End work along the row (weekday), Ctrl variants across the grid.
      { key: "{Home}", from: JAN_19, expected: JAN_05 },
      { key: "{End}", from: JAN_05, expected: JAN_19 },
      { key: "{Control>}{Home}{/Control}", from: JAN_12, expected: JAN_05 },
      { key: "{Control>}{End}{/Control}", from: JAN_12, expected: JAN_25 },
    ])(
      "$key from $from moves focus to $expected",
      { retry: 3 },
      async ({ key, from, expected }) => {
        const screen = await render(
          <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
        );
        const wrapper = screen.getByTestId("g").element();
        cellFor(wrapper, from).focus();
        await userEvent.keyboard(key);
        expect(focusedDate()).toBe(expected);
      },
    );

    test("arrow keys step over gaps rather than stopping dead", async () => {
      // Two Sundays a fortnight apart: col 1 of row 0 has no day at all, so
      // ArrowRight has to keep walking to col 2.
      const sparse: ContributionDay[] = [
        { date: JAN_05, count: 1 }, // col 0, row 0
        { date: JAN_19, count: 2 }, // col 2, row 0
      ];
      const screen = await render(
        <ContributionGraph data={sparse} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      cellFor(wrapper, JAN_05).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(focusedDate()).toBe(JAN_19);
    });

    test("vertical moves stay inside their column instead of wrapping a week", async () => {
      // One column only. ArrowRight from the bottom-most cell must be a no-op
      // — wrapping to the next row would silently jump the user a week.
      const oneColumn: ContributionDay[] = [
        { date: JAN_05, count: 1 }, // col 0, row 0
        { date: JAN_06, count: 2 }, // col 0, row 1
      ];
      const screen = await render(
        <ContributionGraph data={oneColumn} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      cellFor(wrapper, JAN_05).focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(focusedDate()).toBe(JAN_05);
      await userEvent.keyboard("{ArrowUp}");
      expect(focusedDate()).toBe(JAN_05);
    });

    test("an unclaimed key is left alone", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      cellFor(wrapper, JAN_05).focus();
      await userEvent.keyboard("{PageDown}");
      expect(focusedDate()).toBe(JAN_05);
    });

    test("the tab stop follows the focused cell", { retry: 3 }, async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      cellFor(wrapper, JAN_05).focus();
      await userEvent.keyboard("{ArrowRight}");
      await vi.waitFor(() => expect(cellFor(wrapper, JAN_12).tabIndex).toBe(0));
      expect(cellFor(wrapper, JAN_05).tabIndex).toBe(-1);
    });

    test("a data swap that drops the remembered stop falls back to the first day", async () => {
      // Without the fallback the graph would be left with no tab stop at all
      // — unreachable by keyboard until the caller happened to re-render.
      function Swappable() {
        const [days, setDays] = useState(SAMPLE);
        return (
          <>
            <button type="button" data-testid="swap" onClick={() => setDays(SAMPLE.slice(14))}>
              swap
            </button>
            <ContributionGraph data={days} data-testid="g" showLegend={false} />
          </>
        );
      }
      const screen = await render(<Swappable />);
      const wrapper = screen.getByTestId("g").element();
      cellFor(wrapper, JAN_05).focus();
      await vi.waitFor(() => expect(cellFor(wrapper, JAN_05).tabIndex).toBe(0));
      await screen.getByTestId("swap").click();
      // JAN_05 is gone; the stop lands on the new first day (JAN_19).
      await vi.waitFor(() => expect(cellFor(wrapper, JAN_19).tabIndex).toBe(0));
      expect(wrapper.querySelectorAll('[data-date][tabindex="0"]').length).toBe(1);
    });
  });

  describe("a11y", () => {
    test("no axe violations with default props", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} />);
      await expectNoAxeViolations(screen.container);
    });

    test("no axe violations with all labels/legend disabled", async () => {
      const screen = await render(
        <ContributionGraph
          data={SAMPLE}
          showMonthLabels={false}
          showWeekdayLabels={false}
          showLegend={false}
        />,
      );
      await expectNoAxeViolations(screen.container);
    });

    test("no axe violations with empty data", async () => {
      const screen = await render(<ContributionGraph data={[]} />);
      await expectNoAxeViolations(screen.container);
    });

    test("no axe violations with a focused cell and its tooltip open", { retry: 3 }, async () => {
      // The interactive state is the one a static story can't reach, and it is
      // where the grid contract actually gets exercised: focusable cells rule
      // out aria-hidden on any ancestor, and the portaled panel has to stay
      // clear of the accessibility tree.
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const wrapper = screen.getByTestId("g").element();
      cellFor(wrapper, JAN_05).focus();
      await vi.waitFor(() => expect(tooltipPanel()).not.toBeNull());
      await expectNoAxeViolations(screen.container);
      await expectNoAxeViolations(tooltipPanel()!);
    });

    test("no axe violations on a sparse graph (ragged rows)", async () => {
      // Skipped rows and non-contiguous aria-colindex values are exactly the
      // shape `aria-rowindex` / `aria-colindex` exist to describe — this pins
      // that the grid stays well-formed when data has holes.
      await render(<ContributionGraph data={STARTS_WEDNESDAY} data-testid="sparse" />);
      await expectNoAxeViolations(document.querySelector('[data-testid="sparse"]')!);
    });
  });
});
