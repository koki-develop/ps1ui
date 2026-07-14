// Verifies that every canonical language name listed in KNOWN_LANGS
// (src/components/CodeBlock/refractor.ts) is actually registered by refractor at
// runtime once refractor.ts has been loaded — i.e. present in refractor's `common`
// bundle OR added by our own `refractor.register(...)` calls.
//
// Catches drift when refractor bumps a minor version and adds/removes a language
// from its common bundle: the CodeBlockLanguage type would silently advertise a
// name that refractor.registered() returns false for, producing a silent raw-text
// fallback in consumer apps.

import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const rawSource = readFileSync(path.join(root, "src/components/CodeBlock/refractor.ts"), "utf-8");

// Strip both // and /* … */ comments so quoted strings that happen to appear
// inside a comment (e.g. `"refractor"` in an explanatory phrase) don't get
// mistaken for array entries.
const source = rawSource.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

// Extract KNOWN_LANGS entries — the canonical names surfaced via CodeBlockLanguage.
const knownMatch = source.match(/const\s+KNOWN_LANGS\s*=\s*\[([\s\S]*?)\]\s*as\s+const;/);
if (!knownMatch) {
  console.error("check-languages: could not locate KNOWN_LANGS in refractor.ts");
  process.exit(1);
}
const known = [...knownMatch[1].matchAll(/"([\w-]+)"/g)].map((m) => m[1]);

// Extract extension imports so we can mirror the runtime registration order.
// Skip `refractor/core` and `refractor/all` which are not language grammars.
const extensionImports = [...source.matchAll(/from\s+"refractor\/([\w-]+)"/g)]
  .map((m) => m[1])
  .filter((n) => n !== "core" && n !== "all");

const { refractor } = await import("refractor");
for (const ext of extensionImports) {
  const mod = await import(`refractor/${ext}`);
  refractor.register(mod.default);
}

const missing = known.filter((name) => !refractor.registered(name));

if (missing.length > 0) {
  console.error("check-languages: KNOWN_LANGS lists names refractor does not register:");
  for (const name of missing) console.error(`  - ${name}`);
  console.error("");
  console.error(
    "These names appear in CodeBlockLanguage autocomplete but refractor.registered() returns false at runtime,",
  );
  console.error(
    "so <CodeBlock language={...}> silently falls back to raw text. Either remove them from KNOWN_LANGS,",
  );
  console.error(
    "add a matching refractor.register(...) call in refractor.ts, or verify refractor still ships them in its common bundle.",
  );
  process.exit(1);
}

console.log(`check-languages ok (${known.length} language names verified registered)`);
