# @ps1ui/core

For engineers who think in monospace.

Docs and live examples: [koki-develop.github.io/ps1ui](https://koki-develop.github.io/ps1ui/)

## Install

React 19 is a peer dependency — install it alongside the package.

```bash
pnpm add @ps1ui/core react react-dom
```

## Getting Started

Import the stylesheet once at your app's entry point. The JS entry ships no styles — the CSS brings the design tokens, the dark canvas, and every component's styles.

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

Browse the full component catalog at [koki-develop.github.io/ps1ui/components/](https://koki-develop.github.io/ps1ui/components/).

## License

[MIT](./LICENSE)
