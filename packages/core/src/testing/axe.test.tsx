import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "./axe";

test("resolves silently when the container is accessible", async () => {
  const screen = await render(
    <button type="button" aria-label="close">
      x
    </button>,
  );
  await expectNoAxeViolations(screen.container);
});

test("throws an Error listing every violation with rule id and helpUrl", async () => {
  const screen = await render(
    <div>
      <img src="broken.png" />
      <button type="button" />
    </div>,
  );
  let caught: unknown;
  try {
    await expectNoAxeViolations(screen.container);
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(Error);
  const message = (caught as Error).message;
  expect(message).toContain("accessibility violation");
  expect(message).toMatch(/image-alt/);
  expect(message).toMatch(/button-name/);
  expect(message).toContain("https://dequeuniversity.com/rules/axe/");
});

test("honours a caller-supplied rules override that disables a rule", async () => {
  const screen = await render(<img src="broken.png" />);
  await expectNoAxeViolations(screen.container, {
    rules: { "image-alt": { enabled: false } },
  });
});
