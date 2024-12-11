import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

"extends", ["eslint:recommended", "prettier"]

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  
];