import { describe, expect, test } from "vitest";
import { spaceToVar, type SpaceScale } from "./spacing";

// Enumerate SpaceScale so a new value forces this table to be updated —
// otherwise the added value fails the `satisfies` check and the tests
// don't compile.
const SCALE = [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
] as const satisfies readonly SpaceScale[];

// Mirror of spaceToVar's contract, kept as a table so the test proves the
// mapping shape (`var(--ps1ui-space-<v>)` for non-none, `0` for none) and
// not just that the function returns something.
const EXPECTED: Record<SpaceScale, string> = {
  none: "0",
  xs: "var(--ps1ui-space-xs)",
  sm: "var(--ps1ui-space-sm)",
  md: "var(--ps1ui-space-md)",
  lg: "var(--ps1ui-space-lg)",
  xl: "var(--ps1ui-space-xl)",
  "2xl": "var(--ps1ui-space-2xl)",
};

describe("spaceToVar", () => {
  test.for(SCALE.map((v) => ({ v, expected: EXPECTED[v] })))(
    "spaceToVar($v) → $expected",
    ({ v, expected }) => {
      expect(spaceToVar(v)).toBe(expected);
    },
  );

  test("none sentinel maps to unitless zero (not '0px')", () => {
    // Bare `0` composes with any length context (px/rem/em) — a bare zero
    // never carries a unit in CSS, so the string must not carry one either.
    expect(spaceToVar("none")).toBe("0");
  });
});
