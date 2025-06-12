import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default [
  {
    input: "cli/index.ts",
    output: {
      file: "dist/cli.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: [
      nodeResolve({ preferBuiltins: true }),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist/types",
      }),
    ],
    external: ["fs", "path", "typescript"],
  },
];
