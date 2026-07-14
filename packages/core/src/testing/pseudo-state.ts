// `cdp()` currently only lives on the `@vitest/browser/context` runtime entry;
// `vitest/browser` (which the deprecation warning suggests) does not re-export it
// at runtime in 4.x. Revisit when vitest v5 consolidates the entry points.
import { cdp } from "@vitest/browser/context";

// Chromium DevTools Protocol supports many more (target, checked, indeterminate, ...),
// but this ships the ones needed for interactive-state a11y regression tests.
export type PseudoClass = "hover" | "active" | "focus" | "focus-visible" | "focus-within";

// vitest/browser types `CDPSession` as an opaque interface — the real object at
// runtime is a Playwright CDPSession with `.send`. Declare a minimal shape here.
type CDPSessionShape = { send(method: string, params?: object): Promise<object> };

type NodeRef = { nodeId: number };
type IframeNode = { node: { contentDocument?: { nodeId: number } } };
type QuerySelectorResponse = { nodeId: number };

/**
 * Run `fn` while the element matched by `selector` inside the Vitest tester iframe
 * has the given pseudo-classes forced on via CDP `CSS.forcePseudoState`. The forced
 * state is released in a `finally` block so it never leaks into later tests.
 *
 * Requires the Playwright + Chromium provider (the vitest config here pins both).
 */
export async function withForcedPseudoState(
  selector: string,
  states: readonly PseudoClass[],
  fn: () => Promise<void>,
): Promise<void> {
  const session = cdp() as unknown as CDPSessionShape;
  await session.send("DOM.enable");
  await session.send("CSS.enable");

  // Test code runs INSIDE the Vitest tester iframe, but the CDP session is bound
  // to the top-level orchestrator page (see @vitest/browser orchestrator.ts —
  // iframe carries [data-vitest] and is same-origin). Walk: top document →
  // iframe node → contentDocument → target. `pierce: true` on getDocument makes
  // the tester frame's nodes addressable from this top-page session.
  const { root } = (await session.send("DOM.getDocument", {
    depth: -1,
    pierce: true,
  })) as { root: { nodeId: number } };
  const { nodeId: iframeNodeId } = (await session.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: "iframe[data-vitest]",
  })) as QuerySelectorResponse;
  if (!iframeNodeId) throw new Error("vitest tester iframe not found via CDP");

  const iframe = (await session.send("DOM.describeNode", {
    nodeId: iframeNodeId,
  })) as IframeNode;
  const docNodeId = iframe.node.contentDocument?.nodeId;
  if (!docNodeId) throw new Error("tester iframe has no contentDocument in CDP tree");

  const { nodeId } = (await session.send("DOM.querySelector", {
    nodeId: docNodeId,
    selector,
  })) as NodeRef;
  if (!nodeId) throw new Error(`pseudo-state target not found: ${selector}`);

  await session.send("CSS.forcePseudoState", {
    nodeId,
    forcedPseudoClasses: [...states],
  });
  try {
    await fn();
  } finally {
    await session.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
  }
}
