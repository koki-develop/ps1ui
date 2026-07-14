import { describe, expect, test } from "vitest";
import { cx, type ClassValue } from "./cx";

type Case = { label: string; args: ClassValue[]; expected: string };

describe("cx", () => {
  const cases: Case[] = [
    { label: "no arguments → empty string", args: [], expected: "" },
    { label: "single string is returned as-is", args: ["a"], expected: "a" },
    { label: "two strings are joined with a single space", args: ["a", "b"], expected: "a b" },
    {
      label: "many strings are joined in order",
      args: ["a", "b", "c", "d"],
      expected: "a b c d",
    },
    { label: "drops false", args: ["a", false, "b"], expected: "a b" },
    { label: "drops null", args: ["a", null, "b"], expected: "a b" },
    { label: "drops undefined", args: ["a", undefined, "b"], expected: "a b" },
    {
      label: "drops mixed falsy values while preserving order",
      args: [false, "a", null, "b", undefined, "c"],
      expected: "a b c",
    },
    {
      label: "all-falsy input collapses to an empty string",
      args: [false, null, undefined],
      expected: "",
    },
  ];

  test.for(cases)("$label", ({ args, expected }) => {
    expect(cx(...args)).toBe(expected);
  });
});
