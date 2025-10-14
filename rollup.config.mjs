import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const dev = process.env.ROLLUP_WATCH;

const plugins = [
  typescript({
    declaration: false,
  }),
  nodeResolve(),
  json(),
  commonjs(),
  ...(dev ? [] : [terser()]),
];

export default [
  {
    input: "src/kb-alert-badge.ts",
    output: {
      dir: "dist",
      format: "es",
      inlineDynamicImports: true,
      entryFileNames: "kb-alert-badge.js",
    },
    plugins,
  },
];

