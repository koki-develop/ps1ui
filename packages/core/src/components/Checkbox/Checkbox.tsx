import { useCallback, useLayoutEffect, useRef, type ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type CheckboxProps = Omit<ComponentProps<"input">, "type"> & {
  indeterminate?: boolean;
};

export function Checkbox({
  className,
  indeterminate = false,
  ref: forwardedRef,
  ...rest
}: CheckboxProps) {
  const localRef = useRef<HTMLInputElement>(null);

  // useLayoutEffect syncs .indeterminate before paint, avoiding a ✓-glyph flash on mount.
  useLayoutEffect(() => {
    localRef.current!.indeterminate = indeterminate;
  }, [indeterminate]);

  const mergedRef = useCallback(
    (node: HTMLInputElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  return (
    <input {...rest} ref={mergedRef} type="checkbox" className={cx("ps1ui-checkbox", className)} />
  );
}
