---
name: new-component
description: Add a new component to @ps1ui/core, including its @ps1ui/site docs page. Use when creating or scaffolding a new component.
---

# Adding a component

## packages/core

1. Create `src/components/<Name>/` with `<Name>.tsx`, `<Name>.css`, `<Name>.test.tsx`, `<Name>.stories.tsx`, `<Name>.vrt.test.tsx`. Follow an existing component for conventions (Button for interactive, Text for typography).
2. Re-export the component AND its prop/variant types from `src/index.ts` — that file is the public API surface.
3. Decide the conditional extras:
   - New (fg-token, bg-token) pair not covered by `Text.contrast.test.tsx` → add a `<Name>.contrast.test.tsx`.
   - Box-shadow focus ring → add the class to the grouped `@media (forced-colors: active)` selector in `src/styles/components.css`.
   - Responsive props → follow `.claude/rules/responsive.md`; add the class to the grouped stretch selector in `components.css`, and add the component's directory to that rule's `paths` frontmatter.
   - Client-only hooks → `"use client"` at the top of the module (`check:dist` verifies it survives the build).
4. Run `pnpm build` and `pnpm test run` — the structural checks name anything missed.

## packages/site

5. Add the component's entry to `src/lib/components.ts` (drives sidebar, index, page headers) AND a matching `src/pages/components/<slug>.astro` page using the `ComponentPage` layout + `Demo` blocks. Demos render statically — avoid demos that need client JS to look right.
   - **Exception — child-only helpers.** A component that only makes sense as a child of another primitive (e.g. `GridItem` inside `Grid`) skips the registry entry and its own page; document it with `Demo` blocks on the parent's page instead. Sidebar carries one entry per top-level primitive, so a child helper listed separately reads as an independent choice and fragments the story.

## VRT

6. The PR stays VRT-red (missing `-linux.png` baselines) — expected. Never generate linux baselines locally; merge and let `main`'s auto-heal commit them.
