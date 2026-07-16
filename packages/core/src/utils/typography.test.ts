import { describe, expect, test } from "vitest";
import { fontSizeToVar, weightToValue, type FontSizeToken, type FontWeight } from "./typography";

const SIZE_TOKENS = [
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
] as const satisfies readonly FontSizeToken[];

const WEIGHTS = ["regular", "medium", "semibold", "bold"] as const satisfies readonly FontWeight[];

// Mirror of weightToValue's contract as a table so the test proves the
// numeric mapping (not just "the function returns a number"). A future
// weight added to `FontWeight` fails the `satisfies` check below until this
// table catches up.
const WEIGHT_VALUE: Record<FontWeight, number> = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

describe("fontSizeToVar", () => {
  test.for(SIZE_TOKENS.map((v) => ({ v })))(
    "fontSizeToVar($v) → var(--ps1ui-font-size-$v)",
    ({ v }) => {
      expect(fontSizeToVar(v)).toBe(`var(--ps1ui-font-size-${v})`);
    },
  );
});

describe("weightToValue", () => {
  test.for(WEIGHTS.map((v) => ({ v, expected: WEIGHT_VALUE[v] })))(
    "weightToValue($v) → $expected",
    ({ v, expected }) => {
      expect(weightToValue(v)).toBe(expected);
    },
  );

  test("returns discrete 100-step numeric values suitable for CSS font-weight", () => {
    // font-weight accepts a 1–1000 numeric value per CSS Fonts Level 4.
    // We commit to a fixed 4-step scale — this test locks the contract so
    // a well-meaning refactor can't accidentally promote intermediate
    // values (e.g. 450 for "medium") and quietly shift every typography
    // baseline.
    for (const v of WEIGHTS) {
      const n = weightToValue(v);
      expect(Number.isInteger(n)).toBe(true);
      expect(n % 100).toBe(0);
      expect(n).toBeGreaterThanOrEqual(400);
      expect(n).toBeLessThanOrEqual(700);
    }
  });
});
