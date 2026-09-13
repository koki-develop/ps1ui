// Keeps tokens.css's `@supports not (color: light-dark(...))` fallback block
// (see its header comment) in lockstep with the `light-dark(LIGHT, DARK)`
// token pairs declared on `:root`.
//
// Browsers without `light-dark()` support treat every `light-dark(...)` value
// as invalid at computed-value time — `background` falls back to
// `transparent`, `color` to `inherit` — so the whole palette silently
// disappears rather than merely failing to theme-switch. The fallback block
// re-declares each such token to its DARK literal so those browsers still get
// the dark palette. This script is a STRUCTURAL check (PostCSS AST
// walk), not a manual audit: it fails the build if a token gains/loses its
// `light-dark()` pair, or the fallback drifts from the dark side, without
// someone remembering to update the other half by hand.
//
// The fallback only covers tokens.css, so the check also asserts that no other
// first-party stylesheet uses `light-dark()` at all — a pair written directly
// in a component's CSS would have no fallback and would silently vanish in the
// same browsers. Components take colors from `--ps1ui-*` tokens only (see
// CLAUDE.md), and this makes that convention structural.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";

const root = path.resolve(import.meta.dirname, "..");
const tokensPath = path.join(root, "src/styles/tokens.css");
const source = readFileSync(tokensPath, "utf-8");
const ast = postcss.parse(source, { from: tokensPath });

// -- No light-dark() outside tokens.css --------------------------------------

const listCssFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listCssFiles(full);
    return name.endsWith(".css") ? [full] : [];
  });

const strayLightDark = listCssFiles(path.join(root, "src"))
  .filter((file) => file !== tokensPath)
  .filter((file) => /light-dark\(/.test(readFileSync(file, "utf-8")))
  .map((file) => path.relative(root, file));

if (strayLightDark.length > 0) {
  console.error(
    "check-light-dark-fallback: light-dark() is used outside src/styles/tokens.css, where the @supports fallback cannot cover it:",
  );
  for (const file of strayLightDark) console.error(`  - ${file}`);
  console.error("");
  console.error("Declare the pair as a --ps1ui-* token in tokens.css and reference it with var().");
  process.exit(1);
}

const LIGHT_DARK_RE = /^light-dark\((.*)\)$/is;
const FALLBACK_SUPPORTS_PARAMS = "not (color: light-dark(#000, #fff))";

// Split a `light-dark(A, B)` argument string on the TOP-LEVEL comma only —
// either side may itself contain `var(...)` / `color-mix(..., ...)` with
// commas of its own.
const splitTopLevelArgs = (argString) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < argString.length; i++) {
    const ch = argString[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(argString.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(argString.slice(start).trim());
  return parts;
};

const normalize = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();

const errors = [];

// -- Collect every light-dark() token declared on the top-level :root -------
// ("top-level" = a direct child of the stylesheet root, so the fallback
// block's own nested `:root { … }` inside @supports is NOT revisited here).

const darkSideByProp = new Map(); // prop -> normalized dark-side value

for (const node of ast.nodes) {
  if (node.type !== "rule" || node.selector.trim() !== ":root") continue;
  node.walkDecls((decl) => {
    const match = LIGHT_DARK_RE.exec(decl.value.trim());
    if (!match) return;
    const args = splitTopLevelArgs(match[1]);
    if (args.length !== 2) {
      console.error(
        `check-light-dark-fallback: ${decl.prop}'s light-dark() call has ${args.length} top-level argument(s), expected 2 (LIGHT, DARK)`,
      );
      process.exit(1);
    }
    darkSideByProp.set(decl.prop, normalize(args[1]));
  });
}

// -- Collect the fallback block's declarations -------------------------------

const fallbackByProp = new Map(); // prop -> normalized value
let fallbackBlockFound = false;

ast.walkAtRules("supports", (atRule) => {
  if (normalize(atRule.params) !== FALLBACK_SUPPORTS_PARAMS) return;
  atRule.walkRules((rule) => {
    if (rule.selector.trim() !== ":root") return;
    fallbackBlockFound = true;
    rule.walkDecls((decl) => {
      fallbackByProp.set(decl.prop, normalize(decl.value));
    });
  });
});

if (!fallbackBlockFound) {
  console.error(
    `check-light-dark-fallback: tokens.css has no \`@supports ${FALLBACK_SUPPORTS_PARAMS} { :root { … } }\` fallback block`,
  );
  process.exit(1);
}

// -- Compare -----------------------------------------------------------------

for (const [prop, darkValue] of darkSideByProp) {
  if (!fallbackByProp.has(prop)) {
    errors.push(`${prop}: no fallback declared (dark side is \`${darkValue}\`)`);
    continue;
  }
  const fallbackValue = fallbackByProp.get(prop);
  if (fallbackValue !== darkValue) {
    errors.push(`${prop}: fallback is \`${fallbackValue}\`, but the dark side is \`${darkValue}\``);
  }
}

for (const prop of fallbackByProp.keys()) {
  if (!darkSideByProp.has(prop)) {
    errors.push(
      `${prop}: declared inside the fallback block but is not a light-dark() token on :root`,
    );
  }
}

if (errors.length > 0) {
  console.error(
    "check-light-dark-fallback: tokens.css's @supports fallback block is out of sync with its light-dark() token pairs:",
  );
  for (const err of errors) console.error(`  - ${err}`);
  console.error("");
  console.error(
    "Every `light-dark(LIGHT, DARK)` token on :root needs exactly one matching `<prop>: DARK;`",
  );
  console.error(
    "declaration inside the `@supports not (color: light-dark(#000, #fff)) { :root { … } }` block",
  );
  console.error(
    "(see tokens.css's comment above it), and the fallback block must declare nothing else.",
  );
  process.exit(1);
}

console.log(
  `check-light-dark-fallback ok (${darkSideByProp.size} light-dark() token(s) have a matching @supports fallback; no light-dark() outside tokens.css)`,
);
