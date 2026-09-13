<h1 align="center">
@ps1ui/core
</h1>

<p align="center">
<i>For engineers who think in monospace.</i>
</p>

<p align="center">
<a href="https://koki-develop.github.io/ps1ui/">Documentation</a> | <a href="https://koki-develop.github.io/ps1ui/getting-started/">Getting Started</a> | <a href="https://koki-develop.github.io/ps1ui/components/">Components</a> | <a href="https://koki-develop.github.io/ps1ui/storybook/">Storybook</a>
</p>

## Install

React 19 is a peer dependency — install it alongside the package.

```bash
pnpm add @ps1ui/core react react-dom
```

## Getting Started

Import the stylesheet once at your app's entry point. The JS entry ships no styles — the CSS brings the design tokens, the canvas, and every component's styles.

```tsx
import "@ps1ui/core/styles.css";
```

Wrap your tree in `PS1Root`. It establishes the container-query context that responsive props resolve against — without it, responsive props silently fall back to their `base` values.

```tsx
import "@ps1ui/core/styles.css";
import { PS1Root, Button, Heading } from "@ps1ui/core";

export function App() {
  return (
    <PS1Root>
      <Heading level={1}>Hello, PS1 UI</Heading>
      <Button variant="primary">Click me</Button>
    </PS1Root>
  );
}
```

Browse the full component catalog at [koki-develop.github.io/ps1ui/components](https://koki-develop.github.io/ps1ui/components/).

## Theming

Dark is the default. Put `data-ps1ui-theme="light"` on `<html>` to theme the whole page, or `"system"` to follow the OS instead. To theme just part of a page, wrap that subtree in `<PS1Root theme="light">` — a themed `PS1Root` paints its own canvas and text color too, so the subtree is self-contained, and nesting `PS1Root`s with different themes works as expected.

### Embedding with components.css

`components.css` doesn't set the document's `color-scheme`, so embedded ps1ui components follow whatever `color-scheme` the host page already has — light if the host declares none. Put `data-ps1ui-theme="dark"` on `<html>` or a wrapper to get dark ps1ui inside a light host.

Theming needs Chrome 123+, Firefox 120+, or Safari 17.5+ — the versions that support `light-dark()`. Below that floor, ps1ui still renders, but with a fixed dark palette and no `data-ps1ui-theme` switching.

If your bundler minifies CSS with Lightning CSS (Vite's default) below that baseline, it downlevels `light-dark()` into a `prefers-color-scheme`-only fallback, and per-subtree `PS1Root theme` stops working (whole-page `<html>` theming and `"system"` are unaffected). Fix it by raising the CSS target:

```ts
// vite.config.ts
export default defineConfig({
  build: { cssTarget: ["chrome123", "firefox120", "safari17.5"] },
});
```

## License

[MIT](./LICENSE)
