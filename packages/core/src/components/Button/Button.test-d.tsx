// Type-level regression tests for Button's polymorphic prop derivation.
// Verified by `pnpm typecheck` (tsc --noEmit): each `@ts-expect-error` line
// FAILS the build if the marked expression stops being a type error — i.e.
// if a future ButtonProps change starts accepting props the rendered element
// doesn't have. Not a runtime test: excluded from Vitest (doesn't match the
// `*.test.tsx` include) and from coverage (`src/**/*.test-d.tsx` exclude in
// vitest.config.ts).

import { Button } from "./Button";

// `disabled` only exists on form elements. Rendering as a link must reject it —
// links are not disabled (ARIA APG); see the ButtonProps JSDoc.
export const linkRejectsDisabled = (
  <Button
    as="a"
    href="/x"
    // @ts-expect-error `disabled` does not exist on ComponentPropsWithoutRef<"a">
    disabled
  >
    x
  </Button>
);

// Control case: the native button still accepts `disabled`. If ButtonProps
// regressed to rejecting it everywhere, this line would error and fail typecheck.
export const nativeButtonAcceptsDisabled = <Button disabled>x</Button>;

// The `as` target's own props flow through: `href` is valid on "a"…
export const linkAcceptsHref = (
  <Button as="a" href="/x">
    x
  </Button>
);

// …and invalid on the default native button.
export const buttonRejectsHref = (
  // @ts-expect-error `href` does not exist on ComponentPropsWithoutRef<"button">
  <Button href="/x">x</Button>
);
