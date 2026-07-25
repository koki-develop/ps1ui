import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { isSlotFilled } from "./slots";

type Case = { label: string; node: ReactNode; expected: boolean };

describe("isSlotFilled", () => {
  const cases: Case[] = [
    // The excluded set: what an omitted prop and the two conditional idioms produce.
    { label: "undefined (prop omitted)", node: undefined, expected: false },
    { label: "null (`cond ? x : null`)", node: null, expected: false },
    { label: "false (`cond && x`)", node: false, expected: false },
    { label: "true (boolean, for symmetry with false)", node: true, expected: false },
    // Everything else fills the slot.
    { label: "a string", node: "★", expected: true },
    { label: "the empty string — see slots.ts", node: "", expected: true },
    { label: "zero — renders the digit, a legitimate count", node: 0, expected: true },
    { label: "a number", node: 42, expected: true },
    { label: "an element", node: <span>★</span>, expected: true },
    { label: "an array of elements", node: [<span key="a">★</span>], expected: true },
    { label: "an empty array — see slots.ts", node: [], expected: true },
  ];

  test.for(cases)("$label → $expected", ({ node, expected }) => {
    expect(isSlotFilled(node)).toBe(expected);
  });
});
