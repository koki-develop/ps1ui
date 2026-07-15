// Visual regression baseline for Container. Container's ink is purely
// structural (width capping + centering + horizontal padding), so each
// baseline pins a Card marker inside the container to make padding and
// outer bounds visible. A regression on the container-size tokens or on
// the --ps1ui-space-* padding scale would surface as a diff. Routing the
// marker through <Card> (instead of a hand-rolled surface style) means a
// Card token drift also shifts the baselines — the demo surface stays
// coupled to the real Card visual language.

import "../../styles/styles.css";

import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Card } from "../Card/Card";
import { Container, type ContainerSize } from "./Container";

const SIZES = ["sm", "md", "lg", "xl", "full"] as const satisfies readonly ContainerSize[];

// Fixed stage width chosen so the frame is wider than `sm` (640) but
// narrower than `md`/`lg`/`xl` (768/1024/1280). Effect:
//   size=sm   → capped at 640, centered in 700 → visible left/right gutters
//   size=md/lg/xl → parent (700) narrower than max-width → fills stage
//   size=full → fills stage (max-width: none)
// This isolates the sm-vs-larger difference in a single baseline width
// without inflating every PNG to 1400px+ to differentiate xl.
const STAGE_WIDTH = 700;

const marker = (label: string): ReactNode => <Card style={{ padding: 12 }}>{label}</Card>;

type Case = { name: string; node: () => ReactNode };

const CASES: readonly Case[] = [
  ...SIZES.map(
    (size): Case => ({
      name: `size-${size}`,
      node: () => <Container size={size}>{marker(`size=${size}`)}</Container>,
    }),
  ),
  {
    name: "px-none",
    node: () => (
      <Container size="full" px="none">
        {marker("px=none")}
      </Container>
    ),
  },
];

describe("Container VRT", () => {
  test.for(CASES)("$name", async ({ name, node }) => {
    const screen = await render(<VrtFrame width={STAGE_WIDTH}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
