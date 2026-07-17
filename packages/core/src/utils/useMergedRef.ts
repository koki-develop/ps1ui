"use client";

import { useCallback } from "react";
import type { Ref, RefCallback } from "react";

// Attach one ref and return the matching detach step. React 19 callback refs
// may return their own cleanup — when they do, honoring it (instead of the
// legacy call-with-null) is part of the ref contract: a caller that returns a
// cleanup writes `(node) => { …use node…; return () => {…}; }` and its body is
// never written to tolerate `node === null`.
function attach<T>(ref: Ref<T> | undefined, node: T | null): () => void {
  if (typeof ref === "function") {
    const cleanup = ref(node);
    return typeof cleanup === "function" ? cleanup : () => ref(null);
  }
  if (ref != null) {
    ref.current = node;
    return () => {
      ref.current = null;
    };
  }
  return () => {};
}

// Merge an internal ref with the caller's forwarded ref so both receive the
// DOM node (Checkbox / CodeBlock / Table all need an internal handle next to
// the public one). The returned callback itself returns a cleanup, so React 19
// drives detachment through it — each merged ref is detached the way it was
// attached (its own cleanup, call-with-null, or `current = null`).
export function useMergedRef<T>(a: Ref<T> | undefined, b: Ref<T> | undefined): RefCallback<T> {
  return useCallback(
    (node: T | null) => {
      const detachA = attach(a, node);
      const detachB = attach(b, node);
      return () => {
        detachA();
        detachB();
      };
    },
    [a, b],
  );
}
