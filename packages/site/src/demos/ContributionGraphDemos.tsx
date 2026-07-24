// ContributionGraph demos live in a React file (not inline in
// contribution-graph.astro) for two reasons:
//
//   1. `labelForDay` is a FUNCTION prop. Astro serialises island props to
//      JSON, so a function passed from `.astro` template syntax cannot survive
//      the boundary — the custom-label demo has to be authored inside the
//      island itself.
//   2. The sample data is generated in here rather than passed down, so none
//      of it is serialised into the page. A year is 365 objects per demo;
//      handing five of those across the island boundary would add tens of
//      kilobytes of inline JSON to the HTML for data the component can rebuild
//      deterministically. The generator is seeded, so Astro's server render and
//      the browser's hydration produce byte-identical output.
//
// Rendered with `client:visible` from contribution-graph.astro. This is the
// "proven needed" exception to packages/site/CLAUDE.md § "No `client:*` unless
// proven needed": the graph's tooltip and its arrow-key grid navigation are
// both client behaviour, and a static graph demonstrates neither. `visible`
// rather than `load` because the page stacks five graphs — deferring each to
// its own scroll position keeps the initial hydration cost off the critical
// path.

import { ContributionGraph, type ContributionDay } from "@ps1ui/core";

// Deterministic sample data — fixed end date so the page snapshot doesn't
// change on every rebuild.
//
// The same generator lives in @ps1ui/core's `src/testing/contribution-graph-
// sample.ts` (shared between stories + VRT), but `src/testing/**` intentionally
// never ships in dist (see packages/core/CLAUDE.md), so this file — which
// imports @ps1ui/core through its public dist exports — can't reach it. The
// duplication here is the tightest legal solution short of publishing the
// sample-data generator as a public API, which would be a worse trade
// (permanent public-API surface for a docs-only helper).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeDays(endIso: string, count: number, seed: number): ContributionDay[] {
  const rand = mulberry32(seed);
  const end = new Date(
    Number(endIso.slice(0, 4)),
    Number(endIso.slice(5, 7)) - 1,
    Number(endIso.slice(8, 10)),
  );
  const days: ContributionDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const r = rand();
    const c = r < (weekend ? 0.55 : 0.25) ? 0 : Math.floor(rand() * 12);
    days.push({ date: iso, count: c });
  }
  return days;
}

const year = makeDays("2025-12-31", 365, 42);
const quarter = makeDays("2025-12-31", 7 * 12, 42);
const twoMonths = makeDays("2025-12-31", 7 * 8, 42);

export function ContributionGraphBasicDemo() {
  return <ContributionGraph data={year} />;
}

export function ContributionGraphMondayStartDemo() {
  return <ContributionGraph data={quarter} weekStartsOn="monday" />;
}

export function ContributionGraphLargerCellsDemo() {
  return <ContributionGraph data={twoMonths} cellSize={16} cellGap={4} cellRadius={3} />;
}

export function ContributionGraphNoLabelsDemo() {
  return (
    <ContributionGraph
      data={quarter}
      showMonthLabels={false}
      showWeekdayLabels={false}
      showLegend={false}
    />
  );
}

export function ContributionGraphCustomLabelDemo() {
  return (
    <ContributionGraph
      data={quarter}
      labelForDay={(day) =>
        day.count > 0
          ? `${day.date} → ${day.count} commit${day.count === 1 ? "" : "s"}`
          : `${day.date} → no activity`
      }
    />
  );
}
