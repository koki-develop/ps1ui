import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { Button } from "./Button";

test("renders as a button by default", async () => {
  const screen = await render(<Button>Click me</Button>);
  const button = screen.getByRole("button", { name: "Click me" });
  await expect.element(button).toBeVisible();
  await expect.element(button).toHaveAttribute("type", "button");
});

test("applies the primary variant class by default", async () => {
  const screen = await render(<Button>Primary</Button>);
  const button = screen.getByRole("button", { name: "Primary" });
  await expect.element(button).toHaveClass("ps1ui-button");
  await expect.element(button).toHaveClass("ps1ui-button--primary");
});

test("applies the secondary variant class when specified", async () => {
  const screen = await render(<Button variant="secondary">Secondary</Button>);
  const button = screen.getByRole("button", { name: "Secondary" });
  await expect.element(button).toHaveClass("ps1ui-button--secondary");
});

test("merges caller-supplied className", async () => {
  const screen = await render(<Button className="extra">Merged</Button>);
  const button = screen.getByRole("button", { name: "Merged" });
  await expect.element(button).toHaveClass("ps1ui-button");
  await expect.element(button).toHaveClass("extra");
});

test("fires onClick when clicked", async () => {
  const onClick = vi.fn();
  const screen = await render(<Button onClick={onClick}>Tap</Button>);
  await screen.getByRole("button", { name: "Tap" }).click();
  expect(onClick).toHaveBeenCalledTimes(1);
});
