// Post-build check: enforce the structural invariant between the three CSS entries.
//
//   dist/base.css        → ambient env + reset (element/pseudo/attribute selectors)
//   dist/components.css  → component visuals only — every top-level selector must
//                          be `:root` (from tokens.css) or start with `.ps1ui-`
//   dist/styles.css      → base + components (full canvas)
//
// If the reset accidentally leaks into components.css, consumers embedding
// PS1 UI components into a foreign design system get UA-margin wipes and
// form-control font takeovers that fight the host system. This script fails
// the build in that case.
//
// This is a STRUCTURAL check (PostCSS AST walk over allowed selector prefixes),
// not a marker-string grep — a grep for a couple of reset-only declarations
// false-positives the moment a real component legitimately uses one of those
// properties (e.g. a Button setting per-component -webkit-tap-highlight-color,
// or a FileInput styling ::file-selector-button) and only catches leaks that
// happen to include those specific strings.

import { readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";

const root = path.resolve(import.meta.dirname, "..");

// Split a selector-list into individual selectors, respecting nesting.
// PostCSS's Rule#selector is the comma-joined form; PostCSS ships
// postcss-selector-parser but pulling it in for the tiny split we need
// is overkill — we split on commas that aren't inside parens/brackets.
const splitSelectors = (selectorList) => {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < selectorList.length; i++) {
    const ch = selectorList[i];
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(selectorList.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(selectorList.slice(start).trim());
  return parts.filter(Boolean);
};

const isAllowedComponentsSelector = (selector) => {
  const first = selector.trim();
  // Everything a component rule needs starts with `.ps1ui-` — either the
  // class alone, a compound selector rooted at the class, or a descendant/
  // combinator selector whose leftmost simple selector is the class.
  if (first.startsWith(".ps1ui-")) return true;
  // :root { ... } from tokens.css lives in components.css too.
  if (first === ":root") return true;
  return false;
};

const walkTopLevelRules = (rootAst) => {
  // Top-level = direct children of the root, OR direct children of a top-level
  // @media / @supports (nested at-rules can hold Rules that should also be
  // checked; keyframes' nested rules are keyframe selectors, not real
  // selectors, so we skip them).
  const rules = [];
  const visit = (container) => {
    container.each((node) => {
      if (node.type === "rule") {
        rules.push(node);
      } else if (node.type === "atrule") {
        if (node.name === "media" || node.name === "supports" || node.name === "layer") {
          visit(node);
        }
        // @font-face, @import, @keyframes, @property etc. don't hold component
        // selectors — skip.
      }
    });
  };
  visit(rootAst);
  return rules;
};

const load = (name) => readFileSync(path.join(root, "dist", name), "utf-8");
const errors = [];

// -- components.css: every top-level selector must be allowed ---------------

const componentsCss = load("components.css");
const componentsAst = postcss.parse(componentsCss);
const violations = new Map(); // selector -> line

for (const rule of walkTopLevelRules(componentsAst)) {
  const selectors = splitSelectors(rule.selector);
  for (const sel of selectors) {
    if (!isAllowedComponentsSelector(sel)) {
      const line = rule.source?.start?.line ?? 0;
      if (!violations.has(sel)) violations.set(sel, line);
    }
  }
}

if (violations.size > 0) {
  errors.push(
    `dist/components.css contains ${violations.size} selector(s) that don't start with \`.ps1ui-\` or \`:root\` — a global reset has leaked in:`,
  );
  for (const [sel, line] of violations) {
    errors.push(`    line ${line}: ${sel}`);
  }
}

// -- base.css / styles.css: the reset MUST be present ----------------------
// Structural check: base.css must contain at least one rule whose selector
// starts with `*` (the universal selector — the reset's box-model rule),
// and styles.css must contain the same. If both are missing, base.css has
// been gutted; if styles.css is missing it, the composition broke.

const hasUniversalRule = (css) => {
  const ast = postcss.parse(css);
  let found = false;
  ast.walkRules((rule) => {
    if (splitSelectors(rule.selector).some((s) => s.startsWith("*"))) {
      found = true;
      return false;
    }
    return undefined;
  });
  return found;
};

if (!hasUniversalRule(load("base.css"))) {
  errors.push("dist/base.css is missing the reset — no rule with a `*`-rooted selector found");
}
if (!hasUniversalRule(load("styles.css"))) {
  errors.push(
    "dist/styles.css is missing the reset — base.css's `*` rule didn't transitively inline",
  );
}

// -- Report ---------------------------------------------------------------

if (errors.length > 0) {
  console.error("check-css-split: CSS split invariant violated:");
  for (const err of errors) console.error(`  - ${err}`);
  console.error("");
  console.error(
    "Reset rules must live in base.css only. components.css is the embed-into-a-foreign-DS",
  );
  console.error(
    "entry and must not carry global resets, or it will collide with the host system's styling.",
  );
  process.exit(1);
}

console.log(
  "check-css-split ok (dist/components.css contains only :root and .ps1ui-* selectors; reset present in dist/base.css and dist/styles.css)",
);
