// Test-only helper. Not re-exported from src/index.ts, so it never reaches the
// published bundle.
//
// A real focus change (e.g. userEvent.tab()) followed immediately by a
// getComputedStyle read can observe a stale value on the Playwright Firefox
// provider: the style recalc triggered by the new :focus-visible match hasn't
// been flushed yet, especially under the CPU load of running three browser
// engines concurrently. Awaiting two animation frames guarantees at least one
// full render pass has completed, closing that specific gap. This does NOT
// help every Firefox timing flake — e.g. Space-key checkbox/button
// activation flakes on Firefox regardless (see Checkbox.test.tsx's
// "Space toggles checked state when focused" comment) because that's a
// different mechanism (event-sequence differences in Firefox's native
// Space-activation handling, not a render-timing gap this can close).
export async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
