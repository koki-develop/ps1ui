// Tooltip demos live in a React file (not inline in tooltip.astro) so that
// the whole trigger + Tooltip composition renders inside a SINGLE React
// island. Nesting a React component inside another React component from
// `.astro` template syntax turns each into its own island: the outer
// component then receives its children as an Astro slot, not a live
// ReactElement, which breaks Tooltip's `cloneElement(children, ...)` — the
// event handlers + ref + aria-describedby it injects have nowhere to land.
//
// Rendered with `client:load` from tooltip.astro so the panel actually
// opens on hover/focus. This is the "proven needed" exception to
// packages/site/CLAUDE.md § "No `client:*` unless proven needed": a
// static tooltip is inert, defeating the demo.

import { Button, Stack, Tooltip } from "@ps1ui/core";

export function TooltipBasicDemo() {
  return (
    <Tooltip content="Delete this row">
      <Button>Delete</Button>
    </Tooltip>
  );
}

export function TooltipPlacementDemo() {
  return (
    <Stack direction="row" gap="md">
      <Tooltip content="tip" placement="top">
        <Button>top</Button>
      </Tooltip>
      <Tooltip content="tip" placement="bottom">
        <Button>bottom</Button>
      </Tooltip>
      <Tooltip content="tip" placement="left">
        <Button>left</Button>
      </Tooltip>
      <Tooltip content="tip" placement="right">
        <Button>right</Button>
      </Tooltip>
    </Stack>
  );
}

export function TooltipDelayDemo() {
  return (
    <Tooltip content="Fires after a second of dwell" delay={1000}>
      <Button>slow</Button>
    </Tooltip>
  );
}
