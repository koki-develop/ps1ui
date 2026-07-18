import type { Meta, StoryObj } from "@storybook/react-vite";

import { CodeBlock } from "./CodeBlock";

const meta = {
  title: "Components/CodeBlock",
  component: CodeBlock,
} satisfies Meta<typeof CodeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

const TS = `import { useState } from "react";

export function Counter({ initial = 0 }: { initial?: number }) {
  const [count, setCount] = useState(initial);
  return (
    <button type="button" onClick={() => setCount((n) => n + 1)}>
      clicked {count} times
    </button>
  );
}`;

const TSX = `<Card>
  <Text as="p" variant="muted">welcome to ps1ui</Text>
  <Button variant="primary">try it</Button>
</Card>`;

const BASH = `#!/usr/bin/env bash
set -euo pipefail

for file in "$@"; do
  echo "processing: $file"
  # skip empty files
  [ -s "$file" ] || continue
  wc -l "$file"
done`;

const JSON_TEXT = `{
  "name": "@ps1ui/core",
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.mts",
      "default": "./dist/index.mjs"
    }
  }
}`;

const MARKDOWN = `# ps1ui

> For engineers who think in monospace.

- **mono** — JetBrains Mono everywhere
- **dark** — surface-first palette

\`\`\`ts
import { Button } from "@ps1ui/core";
\`\`\``;

const DIFF = `- const greeting = "hello";
+ const greeting = "hello, world";
  console.log(greeting);`;

const DOCKER = `FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
COPY --from=builder /app/dist /srv
CMD ["node", "/srv/index.mjs"]`;

const YAML = `name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: pnpm install
      - run: pnpm test`;

const CSS_CODE = `.ps1ui-codeblock {
  background: var(--ps1ui-color-surface);
  border: 1px solid var(--ps1ui-color-border);
  border-radius: var(--ps1ui-radius-lg);
  padding: 12px 16px;
  overflow-x: auto;
}`;

export const Default: Story = {
  args: {
    language: "typescript",
    children: TS,
    style: { maxWidth: 560 },
  },
};

export const Tsx: Story = {
  args: { language: "tsx", children: TSX, style: { maxWidth: 560 } },
};

export const Bash: Story = {
  args: { language: "bash", children: BASH, style: { maxWidth: 560 } },
};

export const Json: Story = {
  args: { language: "json", children: JSON_TEXT, style: { maxWidth: 560 } },
};

export const Markdown: Story = {
  args: { language: "markdown", children: MARKDOWN, style: { maxWidth: 560 } },
};

export const Diff: Story = {
  args: { language: "diff", children: DIFF, style: { maxWidth: 560 } },
};

export const Docker: Story = {
  args: { language: "docker", children: DOCKER, style: { maxWidth: 560 } },
};

export const Yaml: Story = {
  args: { language: "yaml", children: YAML, style: { maxWidth: 560 } },
};

export const Css: Story = {
  args: { language: "css", children: CSS_CODE, style: { maxWidth: 560 } },
};

export const NoLanguage: Story = {
  args: {
    children: "no language specified — rendered as plain text without any tokenization.",
    style: { maxWidth: 560 },
  },
};

export const UnknownLanguage: Story = {
  args: {
    language: "cobol-1999",
    children: "unknown language — falls back to raw text just like the no-language case.",
    style: { maxWidth: 560 },
  },
};

export const LongLine: Story = {
  args: {
    language: "typescript",
    children: `const veryLongIdentifier = { field: "with a value that keeps going and going and going past the container edge so the block has to scroll horizontally" };`,
    style: { maxWidth: 360 },
  },
};
