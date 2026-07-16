import { beforeEach } from "vitest";

// VRT project setup: block every test until JetBrains Mono Variable is
// resident. Without this, the first captures of a fresh browser session can
// race the webfont load (`document.fonts.check` is `false` at the first
// test's start on every engine) and bake the fallback monospace into a
// baseline or an actual — Stable Screenshot Detection can't save us when the
// font is still downloading across consecutive frames. `document.fonts.load`
// starts the face loading even though nothing is rendered yet (the
// @fontsource @font-face rule is already injected — VRT files import
// styles.css at module scope), and awaiting it + `document.fonts.ready`
// guarantees the first capture uses the same glyphs as every later one.
beforeEach(async () => {
  await document.fonts.load('16px "JetBrains Mono Variable"');
  await document.fonts.ready;
  // fonts.load() resolves with an empty list (never rejects) when the family
  // matches no @font-face rule — e.g. after a webfont swap that forgets this
  // file. Fail loudly instead of letting the gate silently become a no-op.
  if (!document.fonts.check('16px "JetBrains Mono Variable"')) {
    throw new Error(
      'vrt-setup: "JetBrains Mono Variable" is not loadable — update this file if the webfont changed',
    );
  }
});
