import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
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
      const cells = Array.from(
        screen.getByTestId("g").element().querySelectorAll(".ps1ui-contribution-graph__cell"),
      );
      // Data has counts 0..20 → maxCount=20. Quartile bucketing:
      //   count=0                    → level 0
      //   ceil((count/20)*4) in 1..4 → level for count>0
      // Some concrete anchors to lock the algorithm:
      // count=0  → 0, count=1 → 1, count=5 → 1, count=6 → 2, count=10 → 2,
      // count=11 → 3, count=15 → 3, count=16 → 4, count=20 → 4.
      const expected = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4] as const;
      for (let i = 0; i < SAMPLE.length; i++) {
        expect(cells[i]!.getAttribute("data-date")).toBe(SAMPLE[i]!.date);
        expect(cells[i]!.getAttribute("data-level")).toBe(String(expected[i]));
      }
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

    test("default tooltip: plural, singular, and no-activity phrasings", async () => {
      const days: ContributionDay[] = [
        { date: "2025-11-10", count: 10 }, // plural
        { date: "2025-11-11", count: 1 }, // singular
        { date: "2025-11-12", count: 0 }, // zero
      ];
      const screen = await render(
        <ContributionGraph data={days} data-testid="g" showLegend={false} />,
      );
      const wrapper = screen.getByTestId("g").element();
      expect(wrapper.querySelector('[data-date="2025-11-10"] title')?.textContent).toBe(
        "10 contributions on November 10th.",
      );
      expect(wrapper.querySelector('[data-date="2025-11-11"] title')?.textContent).toBe(
        "1 contribution on November 11th.",
      );
      expect(wrapper.querySelector('[data-date="2025-11-12"] title')?.textContent).toBe(
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
      const cell = screen.getByTestId("g").element().querySelector(`[data-date="${date}"] title`);
      expect(cell?.textContent).toBe(expected);
    });

    test("labelForDay overrides the default tooltip", async () => {
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
      expect(cell?.querySelector("title")?.textContent).toBe("2025-01-05::3");
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

    test("scroller gains tabindex=0 when its SVG overflows the container", async () => {
      // 12-month year of days is ~53 columns × 14px = 742px wide, comfortably
      // wider than the 200px parent below, so useScrollableFocus's initial
      // measurement resolves to tabIndex=0.
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
      const scroller = screen
        .getByTestId("g")
        .element()
        .querySelector<HTMLDivElement>(".ps1ui-contribution-graph__scroller")!;
      expect(scroller.tabIndex).toBe(0);
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

    test("caller aria-label overrides the default", async () => {
      const screen = await render(
        <ContributionGraph data={SAMPLE} aria-label="Commits in 2025" data-testid="g" />,
      );
      await expect
        .element(screen.getByTestId("g"))
        .toHaveAttribute("aria-label", "Commits in 2025");
    });

    test("defaults role=img and aria-label when none is supplied", async () => {
      const screen = await render(<ContributionGraph data={SAMPLE} data-testid="g" />);
      const el = screen.getByTestId("g");
      await expect.element(el).toHaveAttribute("role", "img");
      await expect.element(el).toHaveAttribute("aria-label", "Contribution graph");
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
  });
});
