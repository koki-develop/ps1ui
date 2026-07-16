import { describe, expect, test } from "vitest";
import {
  BREAKPOINTS,
  resolveResponsive,
  withResponsiveBase,
  type Breakpoint,
  type Responsive,
} from "./responsive";

describe("BREAKPOINTS", () => {
  test("orders breakpoints narrowest → widest starting from base", () => {
    expect(BREAKPOINTS).toEqual(["base", "sm", "md", "lg", "xl"]);
  });

  test("length matches the Breakpoint union arity", () => {
    // `satisfies` on the const array already pins this at compile-time; the
    // runtime assertion catches an accidental value-side drift (adding a
    // breakpoint literal without updating the type, or vice versa).
    const expected: Breakpoint[] = ["base", "sm", "md", "lg", "xl"];
    expect(BREAKPOINTS.length).toBe(expected.length);
  });
});

describe("resolveResponsive", () => {
  const identity = (v: string | number): string | number => v;

  describe("undefined", () => {
    test("returns an empty record", () => {
      expect(resolveResponsive(undefined, "--_x", identity)).toEqual({});
    });
  });

  describe("scalar", () => {
    test("number scalar emits only `${prefix}-base`", () => {
      expect(resolveResponsive(3, "--_x", identity)).toEqual({ "--_x-base": 3 });
    });

    test("string scalar emits only `${prefix}-base`", () => {
      expect(resolveResponsive("md", "--_x", identity)).toEqual({ "--_x-base": "md" });
    });

    test("boolean scalar is passed through the transform", () => {
      const boolTransform = (v: boolean): string => (v ? "wrap" : "nowrap");
      expect(resolveResponsive<boolean>(true, "--_x", boolTransform)).toEqual({
        "--_x-base": "wrap",
      });
      expect(resolveResponsive<boolean>(false, "--_x", boolTransform)).toEqual({
        "--_x-base": "nowrap",
      });
    });
  });

  describe("responsive object", () => {
    test("full object emits one entry per breakpoint", () => {
      const value: Responsive<number> = { base: 1, sm: 2, md: 3, lg: 4, xl: 5 };
      expect(resolveResponsive(value, "--_x", identity)).toEqual({
        "--_x-base": 1,
        "--_x-sm": 2,
        "--_x-md": 3,
        "--_x-lg": 4,
        "--_x-xl": 5,
      });
    });

    test("partial object skips undefined breakpoints", () => {
      const value: Responsive<number> = { base: 1, md: 3 };
      expect(resolveResponsive(value, "--_x", identity)).toEqual({
        "--_x-base": 1,
        "--_x-md": 3,
      });
    });

    test("object without base emits only the specified breakpoints", () => {
      const value: Responsive<string> = { md: "row" };
      expect(resolveResponsive(value, "--_x", identity)).toEqual({ "--_x-md": "row" });
    });

    test("empty object emits no properties", () => {
      // `{}` is a legal Responsive<T> shape — no breakpoints defined —
      // and must round-trip to no emitted CSS variables so the
      // component's stylesheet default is preserved.
      expect(resolveResponsive({} as Responsive<number>, "--_x", identity)).toEqual({});
    });

    test("transform is applied per entry, not to the object", () => {
      const value: Responsive<string> = { base: "sm", md: "lg" };
      const wrap = (v: string): string => `var(--ps1ui-space-${v})`;
      expect(resolveResponsive(value, "--_x", wrap)).toEqual({
        "--_x-base": "var(--ps1ui-space-sm)",
        "--_x-md": "var(--ps1ui-space-lg)",
      });
    });

    test("preserves the canonical breakpoint ordering in the output object", () => {
      // Not strictly a behavioural contract (spread order into React's
      // style prop is not observable), but easy to keep and lets a
      // future reader inspect the object in a predictable order.
      const value: Responsive<number> = { xl: 5, base: 1, md: 3 };
      const keys = Object.keys(resolveResponsive(value, "--_x", identity));
      expect(keys).toEqual(["--_x-base", "--_x-md", "--_x-xl"]);
    });
  });

  describe("non-responsive object rejection", () => {
    test("plain object with non-breakpoint keys is treated as a scalar", () => {
      // Someone passing an unrelated object as the scalar value is nonsense
      // in practice, but we should not mistake it for a Responsive object.
      // We treat it as a scalar so the transform gets called with it.
      const stringify = (v: unknown): string => JSON.stringify(v);
      // Deliberate `unknown` cast — the type system prevents this at
      // compile time; we're testing runtime robustness.
      const value = { foo: 1 } as unknown as Responsive<unknown>;
      expect(resolveResponsive(value, "--_x", stringify)).toEqual({
        "--_x-base": '{"foo":1}',
      });
    });

    test("array scalar is passed through the transform", () => {
      const value = [1, 2, 3] as unknown as Responsive<unknown>;
      const stringify = (v: unknown): string => JSON.stringify(v);
      expect(resolveResponsive(value, "--_x", stringify)).toEqual({
        "--_x-base": "[1,2,3]",
      });
    });

    test("null scalar is passed through the transform", () => {
      const value = null as unknown as Responsive<unknown>;
      const stringify = (v: unknown): string => String(v);
      expect(resolveResponsive(value, "--_x", stringify)).toEqual({
        "--_x-base": "null",
      });
    });

    test("React-element-like object (has $$typeof) is treated as scalar", () => {
      // React elements carry a `$$typeof` symbol/property. Our type guard
      // must not mistake them for a Responsive object even if they have
      // no non-breakpoint own keys. Simulated because a real React element
      // would fail the transform anyway.
      const fakeElement = {
        $$typeof: Symbol.for("react.element"),
      } as unknown as Responsive<unknown>;
      const passthrough = (v: unknown): string => (typeof v === "object" ? "el" : "scalar");
      expect(resolveResponsive(fakeElement, "--_x", passthrough)).toEqual({
        "--_x-base": "el",
      });
    });

    // Host objects (Date, Map, Set, URL, class instances) have a non-plain
    // prototype AND — for the ones tested here — zero enumerable own keys.
    // Without the prototype gate the guard would treat them as empty
    // Responsive objects (`[].every(...)` is vacuously `true`), silently
    // emitting no CSS variables and dropping the caller's value. The
    // prototype check routes them through the scalar path where the
    // transform sees the actual value.
    test("Date instance is treated as scalar (has zero own enumerable keys)", () => {
      const date = new Date(0) as unknown as Responsive<unknown>;
      const passthrough = (v: unknown): string => (v instanceof Date ? "date" : "other");
      expect(resolveResponsive(date, "--_x", passthrough)).toEqual({
        "--_x-base": "date",
      });
    });

    test("Map instance is treated as scalar", () => {
      const map = new Map<string, number>() as unknown as Responsive<unknown>;
      const passthrough = (v: unknown): string => (v instanceof Map ? "map" : "other");
      expect(resolveResponsive(map, "--_x", passthrough)).toEqual({
        "--_x-base": "map",
      });
    });

    test("Set instance is treated as scalar", () => {
      const set = new Set<number>() as unknown as Responsive<unknown>;
      const passthrough = (v: unknown): string => (v instanceof Set ? "set" : "other");
      expect(resolveResponsive(set, "--_x", passthrough)).toEqual({
        "--_x-base": "set",
      });
    });

    test("URL instance is treated as scalar", () => {
      const url = new URL("https://example.com/") as unknown as Responsive<unknown>;
      const passthrough = (v: unknown): string => (v instanceof URL ? "url" : "other");
      expect(resolveResponsive(url, "--_x", passthrough)).toEqual({
        "--_x-base": "url",
      });
    });

    test("class instance with no own enumerable keys is treated as scalar", () => {
      // A user-defined class instance with only methods on the prototype
      // (no own enumerable data) — same trap as the built-in host objects.
      class Empty {
        method() {
          return "x";
        }
      }
      const instance = new Empty() as unknown as Responsive<unknown>;
      const passthrough = (v: unknown): string => (v instanceof Empty ? "instance" : "other");
      expect(resolveResponsive(instance, "--_x", passthrough)).toEqual({
        "--_x-base": "instance",
      });
    });

    test("class instance whose enumerable own keys happen to match breakpoints is still treated as scalar", () => {
      // Pathological but instructive: even if a class instance's own keys
      // pass the `every` check, its prototype guarantees it's not a plain
      // Responsive shape. Locks the prototype gate in.
      class Faker {
        base = 1;
        md = 3;
      }
      const instance = new Faker() as unknown as Responsive<unknown>;
      const passthrough = (v: unknown): string => (v instanceof Faker ? "faker" : "other");
      expect(resolveResponsive(instance, "--_x", passthrough)).toEqual({
        "--_x-base": "faker",
      });
    });

    test("object created via Object.create(null) is treated as scalar", () => {
      // `Object.create(null)` has no prototype at all — differs from
      // Object.prototype, so the guard rejects it as a Responsive shape.
      // Callers who genuinely want a prototype-less responsive value
      // should use a literal `{ base: X }` instead.
      const proto: null = null;
      const nullProto = Object.create(proto) as unknown as Responsive<unknown>;
      const passthrough = (v: unknown): string => (v === nullProto ? "null-proto" : "other");
      expect(resolveResponsive(nullProto, "--_x", passthrough)).toEqual({
        "--_x-base": "null-proto",
      });
    });
  });
});

describe("withResponsiveBase", () => {
  test("undefined → scalar default", () => {
    expect(withResponsiveBase(undefined, "lg")).toBe("lg");
  });

  test("scalar value passes through untouched", () => {
    expect(withResponsiveBase("sm", "lg")).toBe("sm");
  });

  test("object with base passes through untouched", () => {
    const value: Responsive<string> = { base: "sm", md: "xl" };
    // A deep structural check — must be the same shape, not a fresh copy
    // that omits any of the caller's keys.
    expect(withResponsiveBase(value, "lg")).toEqual({ base: "sm", md: "xl" });
  });

  test("object without base gains a base entry set to defaultValue", () => {
    const value: Responsive<string> = { md: "xl" };
    expect(withResponsiveBase(value, "lg")).toEqual({ base: "lg", md: "xl" });
  });

  test("object with explicit undefined base is treated as missing and overridden", () => {
    const value: Responsive<string> = { base: undefined, md: "xl" };
    // Conceptually a caller who wrote `{ base: undefined, md: "xl" }` meant
    // "no base override" — we treat that the same as omitting base and
    // supply the default. Contract locked in here so future refactors
    // don't silently flip this to "explicit undefined stays undefined".
    expect(withResponsiveBase(value, "lg")).toEqual({ base: "lg", md: "xl" });
  });

  test("object with only base preserves that base and injects no other keys", () => {
    const value: Responsive<string> = { base: "md" };
    expect(withResponsiveBase(value, "lg")).toEqual({ base: "md" });
  });

  test("empty object gains a base entry set to defaultValue", () => {
    // `{}` counts as an object without base — same as `{ md: X }` with no
    // md. Should get `base = default`.
    expect(withResponsiveBase({} as Responsive<string>, "lg")).toEqual({ base: "lg" });
  });

  test("full 5-breakpoint object passes through untouched", () => {
    const value: Responsive<string> = { base: "sm", sm: "md", md: "lg", lg: "xl", xl: "xl" };
    expect(withResponsiveBase(value, "3xl")).toEqual(value);
  });

  test("numeric scalar and default supported", () => {
    expect(withResponsiveBase<number>(undefined, 1)).toBe(1);
    expect(withResponsiveBase<number>(3, 1)).toBe(3);
    expect(withResponsiveBase<number>({ md: 3 }, 1)).toEqual({ base: 1, md: 3 });
  });

  test("output composes cleanly with resolveResponsive", () => {
    // End-to-end proof that the intended pipeline (withResponsiveBase then
    // resolveResponsive) emits the expected inline-style vars for the
    // Heading-style level-default pattern.
    const value = withResponsiveBase<string>({ md: "2xl" }, "3xl");
    const vars = resolveResponsive(value, "--_heading-size", (v) => `var(--ps1ui-font-size-${v})`);
    expect(vars).toEqual({
      "--_heading-size-base": "var(--ps1ui-font-size-3xl)",
      "--_heading-size-md": "var(--ps1ui-font-size-2xl)",
    });
  });
});
