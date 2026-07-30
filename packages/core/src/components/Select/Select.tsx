import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

// Ultra-thin native wrapper, exactly like Input / Textarea: one element, every
// prop (className, style, ref and all native attributes) spread onto the
// <select> itself. The disclosure marker is painted by the control's own
// background — see Select.css's header for why that, and not a wrapper
// element, is what makes the control freely sizable.
export type SelectProps = ComponentProps<"select">;

export function Select({ className, multiple, size, ...rest }: SelectProps) {
  // HTML renders a <select> as a drop-down only while its display size is 1 and
  // it is not `multiple`; anything else is a list box, which has no popup to
  // disclose and so must carry neither the marker nor the inline space reserved
  // for it. CSS can't express "size greater than 1" — attribute selectors
  // compare strings, so `[size="10"]` and `[size="1"]` are equally opaque to it
  // — so the mode is resolved here and published as a modifier class.
  const listbox = multiple === true || (size !== undefined && size > 1);

  return (
    <select
      {...rest}
      multiple={multiple}
      size={size}
      className={cx("ps1ui-select", listbox && "ps1ui-select--listbox", className)}
    />
  );
}
