// Shared Refractor singleton. `refractor` (as opposed to `refractor/core`) ships with
// ~36 "checked" languages pre-registered — see refractor/lib/common.js. We layer a
// curated set of additional languages on top so common ecosystem grammars work out of
// the box. Static imports on purpose: only CodeBlock consumers pay for them (this
// module is its own side-effectful dist chunk — see package.json `sideEffects`),
// and lazy `import()` registration would make highlighting async (unhighlighted
// first paint, no SSR story) for a few KB per grammar. Keep this list intentional.
import { refractor } from "refractor";

import dart from "refractor/dart";
import docker from "refractor/docker";
import graphql from "refractor/graphql";
import jsx from "refractor/jsx";
import nginx from "refractor/nginx";
import powershell from "refractor/powershell";
import shellSession from "refractor/shell-session";
import toml from "refractor/toml";
import tsx from "refractor/tsx";
import zig from "refractor/zig";

refractor.register(dart);
refractor.register(docker);
refractor.register(graphql);
refractor.register(jsx);
refractor.register(nginx);
refractor.register(powershell);
refractor.register(shellSession);
refractor.register(toml);
refractor.register(tsx);
refractor.register(zig);

// Canonical display names of every language the singleton has registered AND
// makes sense to expose to consumers. Kept as an `as const` tuple purely so
// `CodeBlockLanguage` can derive from it — the array itself is intentionally
// unexported (tree-shakes to nothing in consumer bundles).
//
// If you add/remove a `refractor.register(...)` above OR alter what refractor's
// `common` bundle registers, update this list to match. `scripts/check-languages.mjs`
// enforces the invariant that every name here is actually registered at runtime.
//
// Deliberately EXCLUDED even though refractor registers them:
//   - `clike`, `markup-templating` — base grammars other languages extend; passing
//     them as the top-level language produces near-empty highlighting.
//
// Aliases (e.g. `ts` → `typescript`, `html` → `markup`) are NOT listed here; they
// still resolve at runtime via refractor's alias table and pass through the type
// via the `(string & {})` escape hatch on `CodeBlockProps["language"]`.
const KNOWN_LANGS = [
  // from refractor/lib/common.js (registered by `import { refractor } from "refractor"`)
  "arduino",
  "bash",
  "basic",
  "c",
  "cpp",
  "csharp",
  "css",
  "diff",
  "go",
  "ini",
  "java",
  "javascript",
  "json",
  "kotlin",
  "less",
  "lua",
  "makefile",
  "markdown",
  "markup",
  "objectivec",
  "perl",
  "php",
  "python",
  "r",
  "regex",
  "ruby",
  "rust",
  "sass",
  "scss",
  "sql",
  "swift",
  "typescript",
  "vbnet",
  "yaml",
  // registered above
  "dart",
  "docker",
  "graphql",
  "jsx",
  "nginx",
  "powershell",
  "shell-session",
  "toml",
  "tsx",
  "zig",
] as const;

export type CodeBlockLanguage = (typeof KNOWN_LANGS)[number];

export { refractor };
