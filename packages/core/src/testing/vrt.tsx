import type { ReactNode } from "react";

// Wrapper that establishes a deterministic capture region for VRT tests:
// - dark canvas background (var(--ps1ui-color-bg)) so components with
//   `background: transparent` (e.g. Anchor, Button secondary variant) render
//   against the same colour they'd see on a real ps1ui page, regardless of
//   the tester iframe's ambient html bg painting.
// - 20 px padding so `:focus-visible` box-shadows / outline rings don't get
//   clipped at the frame edge. Component focus rings currently top out at
//   3–4 px + 2 px offset; 20 px keeps ample headroom.
// - `display: inline-block` so the frame is tight to the component: a
//   default block frame would balloon each PNG with empty canvas.
//
// The frame carries `data-testid="vrt-frame"` — always the screenshot target.
// Callers put the component-under-test inside and give it (typically)
// `data-testid="vrt-target"` so pseudo-state selectors have a stable hook.
//
// Optional `width` renders an inner sizing `<div style={{ width }}>` so
// callers can pin the child's box without wrapping it in an extra element
// themselves. The outer div stays `inline-block` so the PNG stays tight
// (padding + child width, nothing extra).
export type VrtFrameProps = {
  width?: number | string;
  children: ReactNode;
};

export function VrtFrame({ width, children }: VrtFrameProps) {
  const inner = width !== undefined ? <div style={{ width }}>{children}</div> : children;
  return (
    <div
      data-testid="vrt-frame"
      style={{
        background: "var(--ps1ui-color-bg)",
        padding: 20,
        display: "inline-block",
      }}
    >
      {inner}
    </div>
  );
}
