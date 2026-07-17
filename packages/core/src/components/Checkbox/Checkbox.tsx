"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { cx } from "../../utils/cx";
import { useMergedRef } from "../../utils/useMergedRef";

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

  // Both the indeterminate sync above and the caller get the <input> node.
  const mergedRef = useMergedRef(localRef, forwardedRef);

  return (
    <input {...rest} ref={mergedRef} type="checkbox" className={cx("ps1ui-checkbox", className)} />
  );
}
