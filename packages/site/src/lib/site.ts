import type { Responsive, SpaceScale } from "@ps1ui/core";

// Site-wide horizontal gutter for every top-level <Container>. Header, footer,
// and page content only align because they share this value — never inline the
// px object at a call site.
export const CONTAINER_PX: Responsive<SpaceScale> = { base: "lg", md: "xl" };

// Single source for the install command shown on the landing page and the
// Getting Started page.
export const INSTALL_COMMAND = "pnpm add @ps1ui/core react react-dom";
