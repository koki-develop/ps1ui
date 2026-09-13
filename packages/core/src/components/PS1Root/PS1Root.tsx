import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type PS1RootTheme = "light" | "dark" | "system";

export type PS1RootProps = ComponentProps<"div"> & {
  /** Color theme for this subtree. A themed root also paints the subtree's canvas and text color. Omit to inherit the ancestor's theme (dark under styles.css; the host's `color-scheme` under components.css) — or, when a passthrough `data-ps1ui-theme` attribute is given directly, to defer to that instead. */
  theme?: PS1RootTheme;
};

// PS1Root establishes the app-level responsive containment context.
//
// Wrap your app's tree in `<PS1Root>` once, at the top level. Responsive props
// on descendant ps1ui components (`Grid columns={{ base: 1, md: 3 }}` and
// friends) query their nearest ancestor with CSS `container-type: inline-size`
// — this component provides that ancestor. Without a PS1Root (or a
// `queryContainer`-opted-in Container / Grid / Stack in between), responsive
// props silently fall back to their `base` value only.
//
// PS1Root is the one primitive that is a query container unconditionally: it
// is a full-width block-level wrapper, so the intrinsic-size loss that makes
// containment opt-in everywhere else (see `.ps1ui-stack--query-container` in
// Stack.css) has nothing to collapse here.
//
// A side effect of `container-type: inline-size` per CSS Containment L2:
// `contain: layout` is implied, which makes PS1Root the containing block for
// `position: fixed` descendants. For overlays that must anchor to the viewport
// (Modal, Tooltip, Popover) render them via React Portal to `document.body`
// so they escape PS1Root's containment. Raw `position: fixed` inside PS1Root
// scrolls with the page instead of pinning to the viewport.
//
// `theme` is sugar for the `data-ps1ui-theme` attribute (see tokens.css) —
// setting it here scopes the color theme to this subtree. The attribute
// itself only ever sets `color-scheme`, and every `light-dark()` token
// resolves against whichever `color-scheme` is in effect on the consuming
// element — that's what makes theming scoped per subtree and nesting work
// with no extra rules. A `theme`-bearing PS1Root is a themed region, though,
// not just a switch: it also paints its own canvas and text color (PS1Root.css)
// so the subtree is self-contained even where a descendant reads `color:
// inherit` or has no background of its own. An untheme'd PS1Root stays
// ink-free — a pure containment wrapper. For a whole-page theme, put the
// attribute on `<html>` directly instead of relying on a top-level PS1Root:
// `base.css` paints the canvas (`background`/`color`) on `html`, which sits
// outside any PS1Root, so a PS1Root-only theme would leave the page's own
// background/overscroll area on the default theme.
//
// The attribute is spread AFTER `...rest`, and only when `theme` is actually
// given: `theme` is `undefined` whenever the prop is omitted, and
// `data-ps1ui-theme={undefined}` set directly (as a JSX attribute) makes
// React drop the attribute outright — including a passthrough
// `data-ps1ui-theme` the caller supplied via `rest` (e.g. a foreign embedder
// theming this element the same way `components.css` documents for a bare
// attribute). Conditionally spreading it in means an unset `theme` leaves
// whatever `rest` provided untouched, while a set `theme` still wins over a
// caller-supplied `data-ps1ui-theme` in `rest` (later spread wins).
export function PS1Root({ className, theme, ...rest }: PS1RootProps) {
  return (
    <div
      {...rest}
      {...(theme !== undefined ? { "data-ps1ui-theme": theme } : undefined)}
      className={cx("ps1ui-root", className)}
    />
  );
}
