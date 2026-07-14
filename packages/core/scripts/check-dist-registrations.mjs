// Post-build check: import dist/index.mjs and verify that every extension
// language refractor.ts intends to register actually IS registered after the
// import. This catches the class of regression where tsdown/rolldown tree-shakes
// `refractor.register(...)` calls out of the bundle because the package
// `sideEffects` field marks their source module as side-effect-free.
//
// Runs after `pnpm build:js` / `pnpm build:css`. Failure here means the shipped
// bundle silently returns raw text for the affected languages in consumer apps
// even though local `pnpm test` (which runs against src/) reports success.

import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");

// Read the source to discover which extension languages we intend to register,
// so the check stays in sync with refractor.ts without duplicating the list.
// Strip comments first so `"refractor"` phrases inside comments don't pollute
// the import-path matches.
const source = readFileSync(path.join(root, "src/components/CodeBlock/refractor.ts"), "utf-8")
  .replace(/\/\/.*$/gm, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

const extensions = [...source.matchAll(/from\s+"refractor\/([\w-]+)"/g)]
  .map((m) => m[1])
  .filter((n) => n !== "core" && n !== "all");

// Importing dist/index.mjs runs its top-level statements, which include the
// refractor.register(...) calls IF tree-shaking preserved them.
const distPath = path.join(root, "dist/index.mjs");
await import(pathToFileURL(distPath).href);

const { refractor } = await import("refractor");
const missing = extensions.filter((name) => !refractor.registered(name));

if (missing.length > 0) {
  console.error(
    "check-dist-registrations: extension languages are NOT registered after importing dist/index.mjs:",
  );
  for (const name of missing) console.error(`  - ${name}`);
  console.error("");
  console.error(
    "This means tsdown/rolldown dropped the refractor.register(...) calls during our build,",
  );
  console.error(
    "so consumer bundles that import @ps1ui/core will silently fall back to raw text for these languages.",
  );
  console.error(
    "Root cause is usually the `sideEffects` field in package.json — refractor.ts must be marked side-effectful",
  );
  console.error(
    'so its top-level register calls survive tree-shaking (e.g. `"**/CodeBlock/refractor.ts"` in the sideEffects array).',
  );
  process.exit(1);
}

console.log(
  `check-dist-registrations ok (${extensions.length} extension languages verified registered in dist)`,
);
