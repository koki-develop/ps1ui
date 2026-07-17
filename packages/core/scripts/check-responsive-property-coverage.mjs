// Structural enforcement of the responsive-prop inheritance invariant:
// every `resolveResponsive(x, "PREFIX", ...)` call in a component's .tsx
// must have a matching `@property PREFIX-{base,sm,md,lg,xl}` block with
// `inherits: false` in that component's .css. Without this, CSS custom
// property inheritance leaks a parent primitive's per-breakpoint value
// into a nested descendant of the same primitive — see packages/core/
// CLAUDE.md § "Non-inheriting input variables (load-bearing)" and any
// component's "does not inherit outer's per-breakpoint input vars"
// describe block for the runtime symptom.
//
// Also flags ORPHAN @property blocks — declared with the internal `--_`
// prefix but not emitted by any resolveResponsive call in the sibling
// .tsx. Those signal dead registrations left over after an axis was
// removed from the component.
//
// Runs against src/ (pre-build) so the check fires before build; the
// mapping from resolveResponsive calls to @property blocks is 1:1 per
// component directory (Stack.tsx ↔ Stack.css, Container.tsx ↔ Container.css,
// etc.).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";

const root = path.resolve(import.meta.dirname, "..");
const componentsDir = path.join(root, "src", "components");
const BREAKPOINTS = ["base", "sm", "md", "lg", "xl"];

// Enumerate all `resolveResponsive(_, "PREFIX", ...)` calls in a source file
// and return the set of literal PREFIX strings. Regex covers double or single
// quotes; the prefix argument must be a string literal (the convention across
// the codebase — a computed prefix couldn't be enumerated by any static
// check anyway).
const extractPrefixes = (sourceCode) => {
  const prefixes = new Set();
  const re = /resolveResponsive\s*\(\s*[^,]+,\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(sourceCode)) !== null) {
    prefixes.add(m[1]);
  }
  return prefixes;
};

// Enumerate every `@property --NAME { ... }` block, returning
// name → { inherits: boolean | undefined }.
const extractRegisteredProperties = (cssCode) => {
  const registered = new Map();
  const ast = postcss.parse(cssCode);
  ast.walkAtRules("property", (atRule) => {
    const propName = atRule.params.trim();
    let inherits;
    atRule.walkDecls((decl) => {
      if (decl.prop === "inherits") inherits = decl.value.trim() === "true";
    });
    registered.set(propName, { inherits });
  });
  return registered;
};

const errors = [];

const componentDirs = readdirSync(componentsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(componentsDir, d.name));

for (const dir of componentDirs) {
  const name = path.basename(dir);
  const tsxPath = path.join(dir, `${name}.tsx`);
  const cssPath = path.join(dir, `${name}.css`);
  if (!existsSync(tsxPath) || !existsSync(cssPath)) continue;

  const tsx = readFileSync(tsxPath, "utf-8");
  const prefixes = extractPrefixes(tsx);
  if (prefixes.size === 0) {
    // Component uses no responsive props — @property blocks would be
    // orphans; check that no --_ @property is registered either.
    const registered = extractRegisteredProperties(readFileSync(cssPath, "utf-8"));
    for (const [propName] of registered) {
      if (propName.startsWith("--_")) {
        errors.push(
          `${name}.css: orphan \`@property ${propName}\` — ${name}.tsx makes no resolveResponsive calls, so no input-var registration is needed`,
        );
      }
    }
    continue;
  }

  const registered = extractRegisteredProperties(readFileSync(cssPath, "utf-8"));

  // Every emitted prefix needs all 5 breakpoint names registered with
  // inherits: false.
  for (const prefix of prefixes) {
    for (const bp of BREAKPOINTS) {
      const varName = `${prefix}-${bp}`;
      const entry = registered.get(varName);
      if (!entry) {
        errors.push(
          `${name}.css: missing \`@property ${varName} { syntax: "*"; inherits: false; }\` — emitted by resolveResponsive(_, "${prefix}", ...) in ${name}.tsx`,
        );
      } else if (entry.inherits !== false) {
        errors.push(
          `${name}.css: \`@property ${varName}\` has \`inherits: ${entry.inherits ?? "unset"}\` — must be \`false\` to block ancestor cascade`,
        );
      }
    }
  }

  // Orphan check: every --_ @property block must belong to some emitted prefix.
  for (const [propName] of registered) {
    if (!propName.startsWith("--_")) continue;
    const matchesEmittedPrefix = [...prefixes].some((prefix) =>
      BREAKPOINTS.some((bp) => propName === `${prefix}-${bp}`),
    );
    if (!matchesEmittedPrefix) {
      errors.push(
        `${name}.css: orphan \`@property ${propName}\` — no resolveResponsive prefix in ${name}.tsx produces this variable name`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("check-responsive-property-coverage: invariant violated:");
  for (const err of errors) console.error(`  - ${err}`);
  console.error("");
  console.error("Every `resolveResponsive(_, PREFIX, ...)` call in a component's .tsx must have");
  console.error("matching `@property PREFIX-{base,sm,md,lg,xl}` blocks with `inherits: false` in");
  console.error(
    "the sibling .css. See packages/core/CLAUDE.md § 'Non-inheriting input variables'.",
  );
  process.exit(1);
}

console.log(
  "check-responsive-property-coverage ok (all resolveResponsive prefixes have matching @property blocks with inherits: false)",
);
