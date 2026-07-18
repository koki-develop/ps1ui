// Bridge between the Vite-SSR module graph (src/lib/props.ts) and the Astro
// config module graph (astro.config.mjs). The two graphs never share module
// instances, but `Symbol.for` is a process-global registry — so props.ts
// registers its shutdown hook on globalThis under a module-private key, and
// the config's build/server-done hooks reach it through
// `closePropsExtraction`. Both sides import this one module and only ever
// touch the slot through these functions, so the key cannot drift and the
// close-predecessor-first behavior cannot be bypassed.
const PROPS_EXTRACTION_CLOSE_KEY = Symbol.for("ps1ui.propsExtraction.close");
const PROCESS_HOOKS_KEY = Symbol.for("ps1ui.propsExtraction.processHooks");

type CloseHook = (() => void) | undefined;

/** Close the props-extraction tsgo child if one is running. */
export function closePropsExtraction(): void {
  (globalThis as Record<symbol, CloseHook>)[PROPS_EXTRACTION_CLOSE_KEY]?.();
}

/** Register the current module instance's shutdown hook, closing any predecessor's first. */
export function registerPropsExtractionClose(close: () => void): void {
  // A previous incarnation of the props module (Vite SSR reload during
  // `astro dev`) may have left its tsgo child running — close it before
  // taking over the hook, so edits to props.ts don't accumulate orphans.
  closePropsExtraction();
  (globalThis as Record<symbol, CloseHook>)[PROPS_EXTRACTION_CLOSE_KEY] = close;

  // Fallback shutdown for plain-Node usage of the props module (the Astro
  // integration is the primary path). Registered once per PROCESS, not per
  // module instance: the listeners go through the globalThis slot so they
  // always close the LIVE instance, and re-registering per SSR reload would
  // accumulate listeners until Node's MaxListenersExceededWarning.
  const globals = globalThis as Record<symbol, boolean | undefined>;
  if (!globals[PROCESS_HOOKS_KEY]) {
    globals[PROCESS_HOOKS_KEY] = true;
    process.once("beforeExit", closePropsExtraction);
    process.once("exit", closePropsExtraction);
  }
}
