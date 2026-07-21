// Registry of every documented @ps1ui/core component. Single source of truth
// for the docs sidebar, the /components/ index, and each component page's
// header (name + description via `componentBySlug`). Adding a component page
// means adding an entry here + a matching src/pages/components/<slug>.astro.

export type ComponentMeta = {
  slug: string;
  name: string;
  description: string;
  /**
   * Child-only helpers documented on this page (e.g. GridItem on Grid's page).
   * They get their own auto-generated props table but no sidebar entry or page
   * — see the child-only-helper exception in this package's CLAUDE.md.
   */
  childComponents?: string[];
};

export type ComponentGroup = {
  title: string;
  items: ComponentMeta[];
};

export const COMPONENT_GROUPS: ComponentGroup[] = [
  {
    title: "Layout",
    items: [
      {
        slug: "ps1root",
        name: "PS1Root",
        description: "App-level wrapper that establishes the responsive containment context.",
      },
      {
        slug: "container",
        name: "Container",
        description: "Centers content with a max-width and horizontal padding.",
      },
      {
        slug: "stack",
        name: "Stack",
        description: "One-dimensional flex layout with direction, gap, and alignment.",
      },
      {
        slug: "grid",
        name: "Grid",
        description: "Equal-column CSS grid with responsive column counts.",
        childComponents: ["GridItem"],
      },
    ],
  },
  {
    title: "Typography",
    items: [
      {
        slug: "heading",
        name: "Heading",
        description: "Semantic h1–h6 with a level-driven size and weight scale.",
      },
      {
        slug: "text",
        name: "Text",
        description: "Body text with variants, sizes, weights, and truncation.",
      },
      {
        slug: "anchor",
        name: "Anchor",
        description: "Inline link with primary and subtle variants.",
      },
    ],
  },
  {
    title: "Forms",
    items: [
      {
        slug: "button",
        name: "Button",
        description: "Primary and secondary actions; renders as any element via the as prop.",
      },
      {
        slug: "input",
        name: "Input",
        description: "Single-line text input.",
      },
      {
        slug: "textarea",
        name: "Textarea",
        description: "Multi-line text input.",
      },
      {
        slug: "checkbox",
        name: "Checkbox",
        description: "Checkbox input with indeterminate support.",
      },
      {
        slug: "label",
        name: "Label",
        description: "Form label for associating text with controls.",
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        slug: "card",
        name: "Card",
        description: "Bordered surface for grouping related content.",
      },
      {
        slug: "code",
        name: "Code",
        description: "Inline code chip for identifiers and short fragments in running text.",
      },
      {
        slug: "codeblock",
        name: "CodeBlock",
        description: "Syntax-highlighted code powered by Prism grammars.",
      },
      {
        slug: "details",
        name: "Details",
        description: "Collapsible section built on the native <details>/<summary> element.",
      },
      {
        slug: "list",
        name: "List",
        description: "Ordered or unordered <ul>/<ol> with plain-text markers.",
        childComponents: ["ListItem"],
      },
      {
        slug: "table",
        name: "Table",
        description: "Semantic <table> with box-drawing-style grid borders and horizontal scrolling.",
        childComponents: ["Thead", "Tbody", "Tr", "Th", "Td"],
      },
    ],
  },
];

const ALL_COMPONENTS: ComponentMeta[] = COMPONENT_GROUPS.flatMap((g) => g.items);

export function componentBySlug(slug: string): ComponentMeta {
  const meta = ALL_COMPONENTS.find((c) => c.slug === slug);
  if (!meta) throw new Error(`Unknown component slug: ${slug}`);
  return meta;
}
