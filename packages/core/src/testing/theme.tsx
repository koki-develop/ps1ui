import type { ReactNode } from "react";
import type { PS1RootTheme } from "../components/PS1Root/PS1Root";

// The two themes that actually get painted. `PS1RootTheme` also allows
// "system", but that value resolves to whichever of these two the OS/browser
// prefers — it never produces a third distinct paint, so it would only
// duplicate one of the cases below without adding coverage. Contrast and VRT
// tests therefore cross every color-dependent case with exactly these two.
export const THEMES = ["dark", "light"] as const satisfies readonly PS1RootTheme[];

export type Theme = (typeof THEMES)[number];

export type ThemedCanvasProps = {
  theme: Theme;
  children: ReactNode;
};

// Shared page-canvas wrapper for contrast fixtures. Sets `data-ps1ui-theme`
// directly rather than rendering a `<PS1Root theme={theme}>`: PS1Root also
// carries `container-type: inline-size` (see PS1Root.tsx), which contrast
// fixtures have no use for and which is actively hazardous when a fixture is
// later dropped inside a VRT `VrtFrame` — an `inline-block` frame collapsing
// its query-container child's intrinsic size to 0 (see
// `.claude/rules/responsive.md`). The attribute alone gives every
// `light-dark()` token in tokens.css the `color-scheme` it resolves against,
// which is all a themed fixture needs for tokens substituted directly on a
// descendant (e.g. Badge's `--_badge-base: var(--ps1ui-color-primary)`) —
// `light-dark()` re-resolves at the element where the substitution happens,
// using THAT element's own (inherited) `color-scheme`.
//
// `color` is the one property that does NOT get this for free: several
// components (e.g. Anchor's `.ps1ui-anchor--subtle { color: inherit; }`)
// read their resting colour via `color: inherit` rather than a fresh
// `light-dark()` substitution. `color` is itself an inherited property, so
// without an explicit declaration here, a descendant inheriting `color`
// would pick up whatever the real `<body>` resolved it to under the
// document's OUTER (dark, by default — see tokens.css's `:root`) scope,
// even though this subtree's `color-scheme` is correctly scoped to `theme`.
// Declaring `color` here — the same thing Card.css does for its own surface
// — gives that chain a value that's actually resolved fresh under this
// subtree's `color-scheme`, matching what a themed subtree looks like on a
// real page (where `color` is normally set once, high up, under the
// matching scheme).
export function ThemedCanvas({ theme, children }: ThemedCanvasProps) {
  return (
    <div
      data-ps1ui-theme={theme}
      style={{
        background: "var(--ps1ui-color-bg)",
        color: "var(--ps1ui-color-fg)",
        padding: 20,
      }}
    >
      {children}
    </div>
  );
}
