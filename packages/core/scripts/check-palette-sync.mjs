import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const stripComments = (source) => source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const tokensCss = stripComments(readFileSync(path.join(root, "src/styles/tokens.css"), "utf-8"));
const themeTs = stripComments(readFileSync(path.join(root, ".storybook/ps1uiTheme.ts"), "utf-8"));

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const MALFORMED_HEX =
  /#[0-9a-fA-F]{9,}|#[0-9a-fA-F]{5}(?![0-9a-fA-F])|#[0-9a-fA-F]{7}(?![0-9a-fA-F])/g;
const extract = (source) => new Set([...source.matchAll(HEX)].map((m) => m[0].toLowerCase()));
const findMalformed = (source, file) =>
  [...source.matchAll(MALFORMED_HEX)].map((m) => ({ file, hex: m[0] }));

const malformed = [
  ...findMalformed(tokensCss, "tokens.css"),
  ...findMalformed(themeTs, "ps1uiTheme.ts"),
];
if (malformed.length > 0) {
  for (const { file, hex } of malformed) {
    console.error(`${file}: malformed hex literal ${hex} (must be 3/4/6/8 digits)`);
  }
  process.exit(1);
}

const tokensHexes = extract(tokensCss);
const themeHexes = extract(themeTs);

const orphaned = [...themeHexes].filter((h) => !tokensHexes.has(h));

if (orphaned.length > 0) {
  console.error(
    "ps1uiTheme.ts references hex(es) not declared in tokens.css:",
    orphaned.join(", "),
  );
  console.error("Update tokens.css or fix ps1uiTheme.ts so both files share the same palette.");
  process.exit(1);
}

console.log("theme hex subset check ok (semantic slot mapping is not verified)");
