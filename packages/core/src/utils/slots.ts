import type { ReactNode } from "react";

/**
 * Whether a `ReactNode` handed to an optional slot (`leading` / `trailing`)
 * should open that slot.
 *
 * The naive test — `node !== undefined` — is wrong for the two ways a slot is
 * most often passed conditionally in React:
 *
 *   <Text leading={hasIcon && <Icon />}>…</Text>   // false when hasIcon is false
 *   <Text leading={hasIcon ? <Icon /> : null}>…</Text>
 *
 * Neither produces `undefined`, so both would open a slot: an empty wrapper
 * element plus — because the slots sit in a flex row — a `gap` before the
 * label that the caller never asked for. A visible artifact conjured out of a
 * value that means "nothing here".
 *
 * So the excluded set is exactly the values those idioms and an omitted prop
 * produce: `null`, `undefined`, and both booleans. Everything else opens the
 * slot, including `0` — which renders the digit and is a legitimate count
 * adornment, and is precisely why a blanket falsiness check would be wrong
 * here.
 *
 * This is deliberately not a general "would React render anything?" predicate.
 * `""` and `[]` render nothing too, but no conditional idiom produces them by
 * accident, and excluding `""` would make `leading={label}` drop its layout as
 * `label` empties out.
 */
export function isSlotFilled(node: ReactNode): boolean {
  return node != null && typeof node !== "boolean";
}
