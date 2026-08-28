import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [
          [
            "formatjs",
            {
              idInterpolationPattern: "[sha512:contenthash:base64:6]",
            },
          ],
        ],
      },
    }),
  ],
  assetsInclude: ["**/*.md"],
  build: {
    // flag-icons ships ~500 small SVGs. Inlining them as data URIs would add
    // several hundred kB to the render-blocking stylesheet for the two or
    // three flags a page actually shows, so they stay as fetched files.
    assetsInlineLimit: (filePath) =>
      filePath.includes("flag-icons") ? false : undefined,
  },
  ssr: {
    // By default Vite externalises node_modules in SSR builds. We only need
    // to force-inline packages that ship un-transpiled ESM or use Vite-
    // specific features (e.g. ?no-inline import suffixes).
    noExternal: ["react-intl", "@formatjs/intl", "@scure/base"],
  },
});
