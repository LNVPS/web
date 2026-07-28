import { plugin } from "bun";
import { transformAsync } from "@babel/core";

// `bun test` does not go through Vite, so the message ids that
// babel-plugin-formatjs injects at build time (vite.config.ts:9-20) are absent
// and `formatMessage` throws on a descriptor with no id. Run the same plugin
// over our own sources so a test sees the ids the browser sees.
plugin({
  name: "formatjs-ids",
  setup(build) {
    build.onLoad({ filter: /^(?!.*node_modules).*\.tsx?$/ }, async (args) => {
      const source = await Bun.file(args.path).text();
      if (!source.includes("formatMessage") && !source.includes("defineMessages"))
        return { contents: source, loader: args.path.endsWith("x") ? "tsx" : "ts" };
      const out = await transformAsync(source, {
        filename: args.path,
        babelrc: false,
        configFile: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: [
          ["formatjs", { idInterpolationPattern: "[sha512:contenthash:base64:6]" }],
        ],
      });
      return {
        contents: out?.code ?? source,
        loader: args.path.endsWith("x") ? "tsx" : "ts",
      };
    });
  },
});
