import type { ReactNode } from "react";
import type { Theme } from "./theme";

// Wrapper that establishes a deterministic capture region for VRT tests:
// - canvas background (var(--ps1ui-color-bg)) so components with
//   `background: transparent` (e.g. Anchor, Button secondary variant) render
//   against the same colour they'd see on a real ps1ui page, regardless of
//   the tester iframe's ambient html bg painting. The token is a
//   `light-dark()` pair (see tokens.css), so it follows whichever `theme`
//   the frame is given rather than always painting dark.
// - canvas text color (var(--ps1ui-color-fg)) for the same reason `color` is
//   declared on `ThemedCanvas` (`src/testing/theme.tsx`) and on
//   `.ps1ui-root[data-ps1ui-theme]` in PS1Root.css: `color` is inherited, and
//   `data-ps1ui-theme` below only ever sets `color-scheme` — it does not by
//   itself repaint `color` on this element. Without an explicit declaration
//   here, a descendant reading `color: inherit` (e.g. Anchor `subtle` at
//   rest) would inherit whatever the tester's real `<body>` resolved `color`
//   to under the OUTER (dark, by default) scope, even inside a `theme="light"`
//   frame — silently wrong, and invisible to anything that isn't a pixel
//   diff. Declaring `color` here re-resolves the token fresh under this
//   frame's own `color-scheme`, matching what a themed subtree looks like on
//   a real page.
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
// `theme` is required (not optional): it is the theme boundary for the
// capture — `data-ps1ui-theme` on this same div both scopes `color-scheme`
// for every token the captured subtree resolves and drives the frame's own
// background/color above, so every screenshot is deliberately, visibly one
// theme or the other rather than silently defaulting to dark.
//
// Optional `width` renders an inner sizing `<div style={{ width }}>` so
// callers can pin the child's box without wrapping it in an extra element
// themselves. The outer div stays `inline-block` so the PNG stays tight
// (padding + child width, nothing extra).
export type VrtFrameProps = {
  theme: Theme;
  width?: number | string;
  children: ReactNode;
};

export function VrtFrame({ theme, width, children }: VrtFrameProps) {
  const inner = width !== undefined ? <div style={{ width }}>{children}</div> : children;
  return (
    <div
      data-testid="vrt-frame"
      data-ps1ui-theme={theme}
      style={{
        background: "var(--ps1ui-color-bg)",
        color: "var(--ps1ui-color-fg)",
        padding: 20,
        display: "inline-block",
      }}
    >
      {inner}
    </div>
  );
}
