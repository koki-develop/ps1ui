// Post-build checks for the unbundled dist layout (tsdown `unbundle: true` —
// one output module per source module). Three invariants, each guarding a
// regression that local `pnpm test` (which runs against src/) cannot see:
//
// 1. Importing dist/index.mjs actually registers every extension language
//    refractor.ts intends to register — catches OUR build dropping the
//    `refractor.register(...)` calls (e.g. tsdown tree-shaking the module).
//
// 2. The emitted refractor module is matched by a package.json `sideEffects`
//    glob. Node executing check #1 can't catch this one: consumer bundlers
//    (webpack/rollup/rolldown) skip modules marked side-effect-free whose
//    exports are unused, so a glob that silently stops matching (file moved/
//    renamed, glob typo) means consumer bundles drop the registrations and
//    CodeBlock silently falls back to raw text — while everything here still
//    passes at runtime.
//
// 3. Every source module that carries a `"use client"` directive still has it
//    as the first statement of its dist module. Rolldown only guarantees
//    directive preservation for entry modules or under preserveModules (which
//    `unbundle: true` enables) — this pins that behavior so a bundling-mode or
//    upstream change can't silently strip the RSC boundary markers.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];

// --- shared helpers ---------------------------------------------------------

const stripComments = (source) => source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(p) : [p];
  });

const distFiles = walk(path.join(root, "dist"))
  .filter((p) => p.endsWith(".mjs"))
  .map((p) => path.relative(root, p).split(path.sep).join("/"));

// --- 1. registrations survive our own build ---------------------------------

// Read the source to discover which extension languages we intend to register,
// so the check stays in sync with refractor.ts without duplicating the list.
// Strip comments first so `"refractor"` phrases inside comments don't pollute
// the import-path matches.
const refractorSource = stripComments(
  readFileSync(path.join(root, "src/components/CodeBlock/refractor.ts"), "utf-8"),
);

const extensions = [...refractorSource.matchAll(/from\s+"refractor\/([\w-]+)"/g)]
  .map((m) => m[1])
  .filter((n) => n !== "core" && n !== "all");

// Importing dist/index.mjs pulls in every module of the unbundled graph,
// including the refractor module's top-level register calls.
await import(pathToFileURL(path.join(root, "dist/index.mjs")).href);

const { refractor } = await import("refractor");
const missingLangs = extensions.filter((name) => !refractor.registered(name));

if (missingLangs.length > 0) {
  failures.push(
    "extension languages are NOT registered after importing dist/index.mjs:\n" +
      missingLangs.map((n) => `  - ${n}`).join("\n") +
      "\nOur build dropped the refractor.register(...) calls (tree-shaking regression).",
  );
}

// --- 2. sideEffects globs still match the emitted refractor module ----------

// Minimal npm-sideEffects (micromatch) glob semantics: `**/` spans zero or
// more whole path segments; `*` / `?` (and a mid-segment `**`, which
// micromatch demotes to `*`) never cross a `/`.
const globToRegExp = (glob) =>
  new RegExp(
    "^" +
      glob
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*\/|\*+|\?/g, (m) =>
          m === "**/" ? "(?:[^/]+/)*" : m === "?" ? "[^/]" : "[^/]*",
        ) +
      "$",
  );

const sideEffects = JSON.parse(readFileSync(path.join(root, "package.json"), "utf-8")).sideEffects;
const sideEffectMatchers = sideEffects.map(globToRegExp);

const registrationModules = distFiles.filter((p) =>
  readFileSync(path.join(root, p), "utf-8").includes("refractor.register("),
);

if (registrationModules.length === 0) {
  failures.push("no dist module contains refractor.register(...) calls at all");
}
for (const mod of registrationModules) {
  if (!sideEffectMatchers.some((re) => re.test(mod))) {
    failures.push(
      `${mod} contains refractor.register(...) but is not matched by any package.json sideEffects glob\n` +
        `  sideEffects: ${JSON.stringify(sideEffects)}\n` +
        "  Consumer bundlers will treat it as pure and drop the registrations.",
    );
  }
}

// --- 3. "use client" directives survive into dist ----------------------------

const hasUseClient = (source) => /^\s*["']use client["'];?/.test(stripComments(source));

const srcClientModules = walk(path.join(root, "src"))
  .filter((p) => /\.(ts|tsx)$/.test(p) && !/\.(test|stories|vrt\.test|test-d)\.tsx?$/.test(p))
  .filter((p) => hasUseClient(readFileSync(p, "utf-8")));

for (const srcPath of srcClientModules) {
  const rel = path.relative(path.join(root, "src"), srcPath).split(path.sep).join("/");
  const distRel = `dist/${rel.replace(/\.tsx?$/, ".mjs")}`;
  let ok = false;
  try {
    ok = hasUseClient(readFileSync(path.join(root, distRel), "utf-8"));
  } catch {
    // missing file → ok stays false
  }
  if (!ok) {
    failures.push(
      `src/${rel} declares "use client" but ${distRel} is missing the directive (or the file). ` +
        "The RSC client boundary would be lost for consumers.",
    );
  }
}

// --- report ------------------------------------------------------------------

if (failures.length > 0) {
  console.error("check-dist-registrations FAILED:");
  for (const f of failures) console.error(`\n${f}`);
  process.exit(1);
}

console.log(
  `check-dist-registrations ok (${extensions.length} extension languages registered, ` +
    `${registrationModules.length} registration module(s) covered by sideEffects, ` +
    `${srcClientModules.length} "use client" module(s) preserved in dist)`,
);
