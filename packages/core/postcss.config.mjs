import postcssImport from "postcss-import";
import autoprefixer from "autoprefixer";

export default {
  plugins: [
    postcssImport({
      // Only inline explicit relative paths (starting with `./` or `../`).
      // Bare specifiers stay as raw @import so the consumer's bundler
      // resolves them against its own node_modules — postcss-import would
      // also break the relative url() paths those packages ship. First-party
      // imports MUST use `./` — a bare `@import "foo.css"` will be left raw
      // and fail at consumer build time.
      filter: (path) => path.startsWith("."),
    }),
    autoprefixer(),
  ],
};
