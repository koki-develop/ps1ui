---
paths:
  - "**/*.test.tsx"
  - "**/*.stories.tsx"
  - "**/src/testing/**"
---

# Test authoring

## Structure

Group each `<Component>.test.tsx` into 5 describe axes (skip inapplicable ones): rendering / class composition / passthrough / interaction / a11y.

Use `test.for(...)` with `$field` name templates for every enumerable axis, and declare source arrays with `satisfies` so the compiler catches drift:

```ts
const VARIANTS = ["primary", "secondary"] as const satisfies readonly ButtonVariant[];
```

- Keyboard tests: `import { userEvent } from "vitest/browser"` + `await userEvent.keyboard("{Enter}")` — dispatching a raw `KeyboardEvent` won't trigger native button behavior.
- Don't call `render()` twice in one test — both trees coexist on the shared page and strict-mode locators trip on duplicate testids. Split into two tests.

## Three layers of a11y coverage

- **Unit** (`*.test.tsx`) — semantic a11y (ARIA, labels, state changes). CSS is not loaded here, so no color-contrast. Use `expectNoAxeViolations` (`src/testing/axe.ts`; thin axe-core wrapper, options as 2nd arg) for dynamic states unreachable from a static story.
- **Contrast** (`*.contrast.test.tsx`) — imports `styles.css` and wraps variants in bg tokens so axe computes real ratios. **A new (fg-token, bg-token) pair not covered by `Text.contrast.test.tsx` needs its own contrast test.**
- **Storybook stories** — visual a11y; axe runs per story and violations fail the test (`parameters.a11y.test: "error"`). Add a story for any visually-distinct combination. Both `@storybook/addon-vitest` and `@storybook/addon-a11y` must stay in `.storybook/main.ts`'s `addons` — dropping one silently disables its checks.

`src/testing/**` is intentionally not re-exported from `src/index.ts` — it must never ship in `dist/`.

## Forced colors (Windows High Contrast)

Forced-colors mode strips `box-shadow` and repaints backgrounds; border colors survive. A single grouped `@media (forced-colors: active)` rule in `src/styles/components.css` restores focus outlines — **a new box-shadow-focus component must add its class to that selector**. All forced-colors tests live in `src/styles/forced-colors.test.tsx` (emulation is page-global; Browser Mode isolates per file). Assert geometry only, never colors.
