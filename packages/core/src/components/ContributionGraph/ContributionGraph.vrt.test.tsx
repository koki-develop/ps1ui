// Visual regression baselines for ContributionGraph. Each capture pins a
// distinct rendering path:
//   - `full-year`: the standard case — 53 weeks with month + weekday labels
//     and legend, exercises the intensity ramp end-to-end.
//   - `monday-start`: same data, weekStartsOn=monday — pins the row-shifted
//     layout (Sunday drops to row 6) and the Tue/Thu/Sat weekday labels.
//   - `minimal`: labels + legend suppressed — a bare grid, catches drift
//     between the labeled and unlabeled paths.
//   - `larger-cells`: non-default cellSize/cellGap/cellRadius, ensures the
//     size props actually reach the SVG geometry.
//   - `narrow-viewport-scrolls`: a full year forced into a mobile-width
//     column, pinning the horizontal-scroll behaviour so the graph never
//     spills its parent.
//   - `wide-parent-hugs-graph`: a small graph inside a wide parent — the
//     wrapper hugs the SVG's intrinsic width so the legend sits at the
//     graph's right edge, not the container's far edge. Regression cover
//     for the width-var / max-width dance in the root selector.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { makeSampleDays, mulberry32 } from "../../testing/contribution-graph-sample";
import { VrtFrame } from "../../testing/vrt";
import { ContributionGraph, type ContributionDay } from "./ContributionGraph";

// A quarter (~12 weeks) — narrow enough to fit inside the 374px-wide VRT
// content area at default cellSize.
const QUARTER = makeSampleDays("2025-12-31", 7 * 12, 42);
// A shorter slice for the larger-cells capture so the wider grid still fits.
const TWO_MONTHS = makeSampleDays("2025-12-31", 7 * 8, 42);

describe("ContributionGraph VRT", () => {
  test("full-year (fits at compact cell size)", async () => {
    // A true 53-week year is wider than the 374px VRT frame at default sizes,
    // so this fits into the frame by shrinking cellSize/cellGap. Still 365
    // days end-to-end — the point is to see labels flow across all 12 months.
    const year = makeSampleDays("2025-12-31", 365, 7);
    const screen = await render(
      <VrtFrame>
        <ContributionGraph data={year} cellSize={5} cellGap={2} cellRadius={1} />
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("full-year");
  });

  test("monday-start", async () => {
    const screen = await render(
      <VrtFrame>
        <ContributionGraph data={QUARTER} weekStartsOn="monday" />
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("monday-start");
  });

  test("minimal (no labels, no legend)", async () => {
    const screen = await render(
      <VrtFrame>
        <ContributionGraph
          data={QUARTER}
          showMonthLabels={false}
          showWeekdayLabels={false}
          showLegend={false}
        />
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("minimal");
  });

  test("larger-cells", async () => {
    const screen = await render(
      <VrtFrame>
        <ContributionGraph data={TWO_MONTHS} cellSize={16} cellGap={4} cellRadius={3} />
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("larger-cells");
  });

  test("wide-parent-hugs-graph", async () => {
    // Small 4-week graph (svgWidth ≈ 81px at default cellSize) inside a 360px
    // parent. Before the width-var fix, the wrapper stretched to 360px and
    // the align-self:flex-end legend flew to the far right, detached from
    // the grid. This capture pins the wrapper hugging the SVG so the legend
    // right-aligns to the graph itself.
    const start = new Date(2025, 0, 5); // Sun Jan 5 2025
    const days: ContributionDay[] = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const r = mulberry32(3 + i)();
      days.push({ date: iso, count: r < 0.4 ? 0 : Math.floor(r * 10) });
    }
    const screen = await render(
      <VrtFrame width={360}>
        <ContributionGraph data={days} />
      </VrtFrame>,
    );
    await expect
      .element(screen.getByTestId("vrt-frame"))
      .toMatchScreenshot("wide-parent-hugs-graph");
  });

  test("narrow-viewport-scrolls", async () => {
    // Full year at default cellSize would need ~742px; the frame's content is
    // pinned to 300px so the internal scroller crops the SVG at the parent's
    // width instead of pushing it wider. Baseline captures the clipped left
    // portion — the SVG stops at the scroller's right edge.
    const year = makeSampleDays("2025-12-31", 365, 7);
    const screen = await render(
      <VrtFrame width={300}>
        <ContributionGraph data={year} />
      </VrtFrame>,
    );
    await expect
      .element(screen.getByTestId("vrt-frame"))
      .toMatchScreenshot("narrow-viewport-scrolls");
  });
});
