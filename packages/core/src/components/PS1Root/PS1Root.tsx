import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type PS1RootProps = ComponentProps<"div">;

// PS1Root establishes the app-level responsive containment context.
//
// Wrap your app's tree in `<PS1Root>` once, at the top level. Responsive props
// on descendant ps1ui components (`Grid columns={{ base: 1, md: 3 }}` and
// friends) query their nearest ancestor with CSS `container-type: inline-size`
// — this component provides that ancestor. Without a PS1Root (or another
// containment ancestor like Container / Grid / Stack), responsive props
// silently fall back to their `base` value only.
//
// A side effect of `container-type: inline-size` per CSS Containment L2:
// `contain: layout` is implied, which makes PS1Root the containing block for
// `position: fixed` descendants. For overlays that must anchor to the viewport
// (Modal, Tooltip, Popover) render them via React Portal to `document.body`
// so they escape PS1Root's containment. Raw `position: fixed` inside PS1Root
// scrolls with the page instead of pinning to the viewport.
export function PS1Root({ className, ...rest }: PS1RootProps) {
  return <div {...rest} className={cx("ps1ui-root", className)} />;
}
