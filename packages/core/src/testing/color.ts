// Resolve a --ps1ui-* color token to its computed rgb() string via a throwaway
// probe. Both `color` and `background-color` computed values normalize to the
// same rgb() form, so a single probe on the `color` property is enough to
// compare against either — callers pass the token name and the returned string
// is directly comparable to `getComputedStyle(el).color` or `.backgroundColor`
// on the element under test. Keeps token hexes single-sourced in tokens.css
// instead of duplicated as magic rgb() literals in tests.
export function resolveColorToken(name: string): string {
  return resolveColorTokenIn(document.body, name);
}

// Same probe technique as resolveColorToken, but appended inside a caller-given
// container instead of always `document.body`. Needed for anything theme-aware:
// a `light-dark()` token resolves against the `color-scheme` in effect on the
// element that substitutes the `var()`, so a probe parked under a themed
// subtree (e.g. a `<PS1Root theme="light">`) resolves differently than one
// parked at the document body — resolveColorToken alone can't observe that.
export function resolveColorTokenIn(container: Element, name: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  container.appendChild(probe);
  try {
    return getComputedStyle(probe).color;
  } finally {
    probe.remove();
  }
}
