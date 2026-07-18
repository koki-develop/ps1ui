import { createElement } from "react";
import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cx } from "../../utils/cx";

export type ButtonVariant = "primary" | "secondary";

type ButtonOwnProps<E extends ElementType> = {
  /** Element or component to render instead of the native <button> — e.g. "a" or a router Link. */
  as?: E;
  /** Visual style: "primary" for the main action, "secondary" for supporting actions. */
  variant?: ButtonVariant;
};

// Deliberate exception to the general "use ComponentProps<'tag'>" rule other components follow —
// same reasoning as Anchor / Text: with a polymorphic `as` prop TypeScript cannot correctly
// narrow the `ref` prop's type against the resolved element E. Button accepts both string tags
// (`as="a"`) and React component types (`as={NextLink}`) so consumers can render a link that
// looks like a button; a loose ref type would silently accept mismatched refs, so dropping ref
// from the prop type is safer than a misleading loose type.
/**
 * Props for {@link Button}. Derived from the props of the rendered element `E`,
 * so what's accepted follows the `as` target.
 *
 * `disabled` and polymorphism: `disabled` only exists on form elements, so
 * `<Button as="a" href="…" disabled>` is a type error (`ComponentPropsWithoutRef<"a">`
 * has no `disabled` — locked in by `Button.test-d.tsx`). This is intentional and
 * matches the ARIA Authoring Practices: links are not disabled. When the action is
 * unavailable, render a native `<Button disabled>` (or no link at all) instead of a
 * link. Untyped JS callers and `as={Component}` escapes that pass `disabled` anyway
 * get a leaked no-op attribute — no visual or behavioral disabling happens.
 *
 * `type` on the native tag: when rendering a native <button>, `type` defaults to
 * "button" (not the browser's implicit "submit"), so a Button inside a <form>
 * never submits implicitly — pass type="submit" explicitly to submit.
 */
export type ButtonProps<E extends ElementType = "button"> = ButtonOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof ButtonOwnProps<E>>;

export function Button<E extends ElementType = "button">({
  as,
  variant = "primary",
  className,
  ...rest
}: ButtonProps<E>) {
  const tag: ElementType = as ?? "button";
  const classes = cx("ps1ui-button", `ps1ui-button--${variant}`, className);
  const props: Record<string, unknown> = { ...rest, className: classes };
  // `type="button"` is a defensive default so a native <button> inside a <form> never
  // submits implicitly. It only makes sense on the native tag — <a>, <NextLink>, and
  // other host/component targets have no such attribute, and stamping one on them
  // would leak an invalid attribute through to the DOM. Explicit callers still win.
  if (tag === "button" && props.type === undefined) {
    props.type = "button";
  }
  return createElement(tag, props);
}
