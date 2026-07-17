// Resolve a --ps1ui-* color token to its computed rgb() string via a throwaway
// probe. Both `color` and `background-color` computed values normalize to the
// same rgb() form, so a single probe on the `color` property is enough to
// compare against either — callers pass the token name and the returned string
// is directly comparable to `getComputedStyle(el).color` or `.backgroundColor`
// on the element under test. Keeps token hexes single-sourced in tokens.css
// instead of duplicated as magic rgb() literals in tests.
export function resolveColorToken(name: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  try {
    return getComputedStyle(probe).color;
  } finally {
    probe.remove();
  }
}
