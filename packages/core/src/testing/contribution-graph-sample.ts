// Deterministic ContributionDay sample generator shared by ContributionGraph
// stories and VRT tests. Kept in `testing/` so it stays out of dist per
// `src/testing/**` never shipping (see the package's CLAUDE.md).
//
// The docs site (packages/site) also renders a sample graph on its
// contribution-graph page; because `testing/**` isn't a published export it
// keeps its own copy of these helpers. That's the tightest legal deduplication
// — the shared boundary here (core/stories + core/vrt) is the one that
// mattered because those two files WOULD drift on any tweak to the generator
// while the site's copy is a naturally-independent build-time asset.

import type { ContributionDay } from "../components/ContributionGraph/ContributionGraph";

/**
 * Mulberry32 — small, well-distributed enough for a visual sample. Seeded
 * so stories, per-story a11y checks, and VRT baselines stay identical across
 * CI runs (a moving PRNG would flake every one of them).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate `count` contiguous days ending on `endIso` (YYYY-MM-DD, inclusive).
 * Weekends are quieter than weekdays so the sample reads like plausible
 * activity. The end date is passed explicitly (not derived from `new Date()`)
 * so callers stay deterministic across builds.
 */
export function makeSampleDays(endIso: string, count: number, seed: number): ContributionDay[] {
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
    const raw = rand();
    const c = raw < (weekend ? 0.55 : 0.25) ? 0 : Math.floor(rand() * 12);
    days.push({ date: iso, count: c });
  }
  return days;
}
