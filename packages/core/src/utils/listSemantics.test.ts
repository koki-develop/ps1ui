import { describe, expect, test } from "vitest";
import { listRoleFor } from "./listSemantics";

describe("listRoleFor", () => {
  // Exactly the tag set base.css resets (`ol, ul, menu { list-style: none }`).
  // Declared here as the mirror of that rule so a tag added to one side and
  // not the other shows up as a failing test rather than a Safari-only
  // regression nobody can see locally.
  test.for([{ tag: "ul" as const }, { tag: "ol" as const }, { tag: "menu" as const }])(
    "$tag → 'list' (restores the semantic base.css's reset strips)",
    ({ tag }) => {
      expect(listRoleFor(tag)).toBe("list");
    },
  );

  // `undefined` rather than "" or a thrown error: the call sites spread the
  // result straight into createElement's props, and React omits an undefined
  // attribute entirely — so a non-list tag ends up with no `role` at all.
  // `li` is here deliberately: an item inside a real <ul>/<ol>/<menu> keeps
  // its implicit `listitem` role, so stamping one would be redundant (this
  // matches ListItem, which likewise stamps nothing).
  test.for([
    { tag: "div" as const },
    { tag: "nav" as const },
    { tag: "main" as const },
    { tag: "li" as const },
    { tag: "dl" as const },
  ])("$tag → undefined (no role is stamped)", ({ tag }) => {
    expect(listRoleFor(tag)).toBeUndefined();
  });

  test("a component `as` target is not a list tag", () => {
    const Custom = () => null;
    expect(listRoleFor(Custom)).toBeUndefined();
  });
});
