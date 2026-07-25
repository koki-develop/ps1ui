// Type-level regression tests for the library-wide polymorphic `as` contract.
// Verified by `pnpm typecheck` (tsc --noEmit): each `@ts-expect-error` line FAILS
// the build if the marked expression stops being a type error. Not a runtime test:
// excluded from Vitest (doesn't match the `*.test.tsx` include) and from coverage
// (`src/**/*.test-d.tsx` exclude in vitest.config.ts).
//
// Every `as`-bearing component derives its props the same way — see the canonical
// write-up on `TextProps` in components/Text/Text.tsx:
//
//   <Name>Props<E> = <Name>OwnProps<E> & Omit<ComponentProps<E>, keyof <Name>OwnProps<E>>
//
// Two properties of that shape are load-bearing and neither is obvious from
// reading the alias, so both are pinned here for all nine components:
//
//   1. `ref` is typed against the element `as` resolved to. This is the reason the
//      library uses `ComponentProps` rather than `ComponentPropsWithoutRef` — an
//      earlier revision assumed TypeScript could not narrow it and dropped `ref`
//      from the polymorphic prop types entirely. The negative cases below (a ref
//      for the wrong element) are the ones that would have justified that; they
//      error, so the exclusion is unnecessary.
//   2. The `as` target's own attributes flow through, and the default tag's do not
//      accept the target's. `Button.test-d.tsx` covers the one semantic carve-out
//      on top of this (`disabled` must stay rejected on `as="a"`).

import { Anchor } from "./components/Anchor/Anchor";
import { Badge } from "./components/Badge/Badge";
import { Button } from "./components/Button/Button";
import { Container } from "./components/Container/Container";
import { Grid } from "./components/Grid/Grid";
import { GridItem } from "./components/GridItem/GridItem";
import { Heading } from "./components/Heading/Heading";
import { Stack } from "./components/Stack/Stack";
import { Text } from "./components/Text/Text";

// A function component that is NOT a host element — the `as={Component}` escape
// hatch (a router Link, a motion.div) the ElementType-constrained components support.
function Custom(props: { className?: string; "data-custom"?: string }) {
  return <div {...props} />;
}

// ---------------------------------------------------------------------------
// 1. ref is typed against the resolved element

// Layout primitives default to <div> and keep the ref they had before `as` existed.
export const stackDefaultRef = <Stack ref={(n: HTMLDivElement | null) => void n} />;
export const gridDefaultRef = <Grid ref={(n: HTMLDivElement | null) => void n} />;
export const gridItemDefaultRef = <GridItem ref={(n: HTMLDivElement | null) => void n} />;
export const containerDefaultRef = <Container ref={(n: HTMLDivElement | null) => void n} />;

// …and re-type it when `as` moves them off <div>. <ul>/<li> carry their own DOM
// interfaces; <nav>/<main> have none, so plain HTMLElement is their exact ref
// type here rather than a widening.
export const stackNavRef = <Stack as="nav" ref={(n: HTMLElement | null) => void n} />;
export const gridListRef = <Grid as="ul" ref={(n: HTMLUListElement | null) => void n} />;
export const gridItemLiRef = <GridItem as="li" ref={(n: HTMLLIElement | null) => void n} />;
export const containerMainRef = <Container as="main" ref={(n: HTMLElement | null) => void n} />;

// The typography / control primitives narrow the same way off their own defaults.
export const textDefaultRef = <Text ref={(n: HTMLParagraphElement | null) => void n} />;
export const textSpanRef = <Text as="span" ref={(n: HTMLSpanElement | null) => void n} />;
export const headingDefaultRef = (
  <Heading level={1} ref={(n: HTMLHeadingElement | null) => void n} />
);
export const anchorDefaultRef = <Anchor href="/x" ref={(n: HTMLAnchorElement | null) => void n} />;
export const anchorSpanRef = <Anchor as="span" ref={(n: HTMLSpanElement | null) => void n} />;
export const badgeDefaultRef = <Badge ref={(n: HTMLSpanElement | null) => void n} />;
export const badgeLinkRef = (
  <Badge as="a" href="/x" ref={(n: HTMLAnchorElement | null) => void n} />
);
export const buttonDefaultRef = <Button ref={(n: HTMLButtonElement | null) => void n} />;
export const buttonLinkRef = (
  <Button as="a" href="/x" ref={(n: HTMLAnchorElement | null) => void n} />
);

// The negative direction — a ref for an element `as` did NOT resolve to. Each of
// these is the exact mismatch the dropped-`ref` design was meant to prevent.
//
// Scope note, so nobody "completes" this list and finds it won't compile: React
// types `RefCallback<T>` through the bivariance hack (`{ bivarianceHack(instance:
// T | null): … }["bivarianceHack"]`), so a ref for a SUBTYPE of the resolved
// element is accepted by design — and every HTML*Element is a subtype of
// HTMLElement. Tags with no dedicated DOM interface (`nav`, `main`, `section`,
// `span`, …) therefore have no expressible negative case; the cases below all
// target tags whose interface carries members of its own. That bivariance is
// React's own contract, identical for a plain `<div ref={…} />` — nothing the
// polymorphic derivation introduces.
export const stackRejectsForeignRef = (
  // @ts-expect-error an HTMLAnchorElement ref does not fit the default <div>
  <Stack ref={(n: HTMLAnchorElement | null) => void n} />
);
export const stackListRejectsDivRef = (
  // @ts-expect-error an HTMLDivElement ref does not fit `as="ul"`
  <Stack as="ul" ref={(n: HTMLDivElement | null) => void n} />
);
export const gridListRejectsDivRef = (
  // @ts-expect-error an HTMLDivElement ref does not fit `as="ul"`
  <Grid as="ul" ref={(n: HTMLDivElement | null) => void n} />
);
export const gridItemLiRejectsDivRef = (
  // @ts-expect-error an HTMLDivElement ref does not fit `as="li"`
  <GridItem as="li" ref={(n: HTMLDivElement | null) => void n} />
);
export const containerFormRejectsDivRef = (
  // @ts-expect-error an HTMLDivElement ref does not fit `as="form"`
  <Container as="form" ref={(n: HTMLDivElement | null) => void n} />
);
export const textRejectsAnchorRef = (
  // @ts-expect-error an HTMLAnchorElement ref does not fit the default <p>
  <Text ref={(n: HTMLAnchorElement | null) => void n} />
);
export const headingRejectsAnchorRef = (
  // @ts-expect-error an HTMLAnchorElement ref does not fit h1–h6
  <Heading level={1} ref={(n: HTMLAnchorElement | null) => void n} />
);
export const anchorRejectsDivRef = (
  // @ts-expect-error an HTMLDivElement ref does not fit the default <a>
  <Anchor href="/x" ref={(n: HTMLDivElement | null) => void n} />
);
export const badgeLinkRejectsButtonRef = (
  // @ts-expect-error an HTMLButtonElement ref does not fit `as="a"`
  <Badge as="a" href="/x" ref={(n: HTMLButtonElement | null) => void n} />
);
export const buttonLinkRejectsButtonRef = (
  // @ts-expect-error an HTMLButtonElement ref does not fit `as="a"`
  <Button as="a" href="/x" ref={(n: HTMLButtonElement | null) => void n} />
);

// ---------------------------------------------------------------------------
// 2. the `as` target's attributes flow through — and only there

export const stackNavAcceptsAriaCurrent = <Stack as="nav" aria-label="primary" />;
export const stackAnchorAcceptsHref = <Stack as="a" href="/x" />;
export const stackRejectsHref = (
  // @ts-expect-error `href` does not exist on ComponentProps<"div">
  <Stack href="/x" />
);
export const gridListAcceptsOlAttrs = <Grid as="ol" start={3} />;
export const gridRejectsStart = (
  // @ts-expect-error `start` does not exist on ComponentProps<"div">
  <Grid start={3} />
);
export const gridItemLiAcceptsValue = <GridItem as="li" value={3} />;
export const gridItemRejectsValue = (
  // @ts-expect-error `value` does not exist on ComponentProps<"div">
  <GridItem value={3} />
);
export const containerFormAcceptsAction = <Container as="form" action="/submit" />;
export const containerRejectsAction = (
  // @ts-expect-error `action` does not exist on ComponentProps<"div">
  <Container action="/submit" />
);
export const badgeLinkAcceptsHref = <Badge as="a" href="/x" />;
export const badgeRejectsHref = (
  // @ts-expect-error `href` does not exist on ComponentProps<"span">
  <Badge href="/x" />
);

// ---------------------------------------------------------------------------
// 3. the `as={Component}` escape hatch — ElementType-constrained components only
//    (Text / Heading deliberately restrict `as` to a tag union; case 4 covers that)

export const stackAsComponent = <Stack as={Custom} data-custom="x" />;
export const gridAsComponent = <Grid as={Custom} data-custom="x" />;
export const gridItemAsComponent = <GridItem as={Custom} data-custom="x" />;
export const containerAsComponent = <Container as={Custom} data-custom="x" />;
export const anchorAsComponent = <Anchor as={Custom} data-custom="x" />;
export const badgeAsComponent = <Badge as={Custom} data-custom="x" />;
export const buttonAsComponent = <Button as={Custom} data-custom="x" />;

export const stackAsComponentRejectsHref = (
  // @ts-expect-error `href` does not exist on Custom's props
  <Stack as={Custom} href="/x" />
);

// ---------------------------------------------------------------------------
// 4. Text / Heading keep their restricted tag unions

export const textRejectsNonTextTag = (
  // @ts-expect-error "nav" is not a TextElement
  <Text as="nav" />
);
export const headingRejectsNonHeadingTag = (
  // @ts-expect-error "div" is not a HeadingElement
  <Heading level={1} as="div" />
);
