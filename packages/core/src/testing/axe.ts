import axe from "axe-core";

// Test-only helper. Not re-exported from src/index.ts, so it never reaches the
// published bundle. Complements @storybook/addon-a11y, which only exercises
// the initial (post-mount) render of each story; use this to run axe against
// dynamic states unreachable from a static story — e.g. after a click, in an
// error/loading state, or in a Browser Mode test that has no matching story.

type RunOptions = axe.RunOptions;
type Result = axe.Result;
type ElementContext = axe.ElementContext;

function formatViolations(violations: Result[]): string {
  const header = `Found ${violations.length} accessibility violation${violations.length === 1 ? "" : "s"}:`;
  const details = violations.map((v, i) => {
    const impact = v.impact ?? "unknown";
    const heading = `\n${i + 1}. [${impact}] ${v.id}: ${v.help}`;
    const link = `   ${v.helpUrl}`;
    const nodes = v.nodes
      .map((node) => {
        const target = node.target.join(" ");
        const summary = node.failureSummary?.replace(/\n\s+/g, "\n        ") ?? "";
        return `   - ${target}\n     ${summary}`;
      })
      .join("\n");
    return `${heading}\n${link}\n${nodes}`;
  });
  return `${header}${details.join("\n")}`;
}

export async function expectNoAxeViolations(
  container: ElementContext,
  options?: RunOptions,
): Promise<void> {
  const results = await axe.run(container, {
    resultTypes: ["violations"],
    ...options,
  });
  if (results.violations.length > 0) {
    throw new Error(formatViolations(results.violations));
  }
}
