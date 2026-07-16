// Internal-link helper. Astro auto-prefixes `base` for static asset URLs but
// NOT for `<a href>` attributes (see CLAUDE.md "Base path"), so every internal
// link routes through this. `path` is base-relative without a leading slash
// and — because astro.config sets `trailingSlash: "always"` — page paths must
// end with "/" (e.g. `href("components/button/")`).
export function href(path = ""): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
