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
  ssr: {
    // By default Vite externalises node_modules in SSR builds. We only need
    // to force-inline packages that ship un-transpiled ESM or use Vite-
    // specific features (e.g. ?no-inline import suffixes).
    noExternal: ["react-intl", "@formatjs/intl", "@scure/base"],
  },
});
