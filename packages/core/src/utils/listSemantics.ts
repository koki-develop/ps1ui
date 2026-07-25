import type { ElementType } from "react";

// Safari's accessibility tree drops list semantics ("list, N items") when a
// list element computes `list-style-type: none` — which base.css's reset
// applies to every list in the canvas. `List` restores the announcement by
// stamping an explicit `role="list"` on the element it renders (see List.tsx,
// and the "sets role=list by default" test in List.test.tsx for the full
// account).
//
// The tag set below tracks that reset exactly: base.css resets `ol, ul, menu`,
// and all three have an implicit ARIA role of `list`, so all three lose it the
// same way. Keep the two in sync — a tag reset there but missing here is a
// silent Safari-only regression, which is precisely how <menu> was missed the
// first time round.
//
// The layout primitives reach the same <ul>/<ol> through their `as` prop —
// `<Grid as="ul">` for a card grid, `<Stack as="ul">` for a row of items — so
// they need the same defence, or opting into real list markup would announce
// worse than the `role="list"`-on-a-<div>` spelling it replaces.
//
// Returned rather than applied so the caller can spread it BEFORE `...rest`:
// a caller-supplied `role` then wins, exactly as it does on `List`. Non-list
// tags get `undefined`, which React omits from the DOM — no branch at the call
// site, and no `role` attribute where one isn't wanted.
const LIST_TAGS = new Set(["ul", "ol", "menu"]);

export function listRoleFor(tag: ElementType): "list" | undefined {
  return typeof tag === "string" && LIST_TAGS.has(tag) ? "list" : undefined;
}
