import next from "eslint-config-next";

const customRules = {
  "@typescript-eslint/no-explicit-any": "error",
  "react-hooks/exhaustive-deps": "warn",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true },
  ],
  "@typescript-eslint/no-empty-interface": [
    "error",
    { allowSingleExtends: true },
  ],
  "@typescript-eslint/no-empty-object-type": "error",
  // TanStack Table / React Hook Form return non-memoizable APIs; allow at project level
  "react-hooks/incompatible-library": "off",
  // Preserve manual memoization when deps use optional chaining
  "react-hooks/preserve-manual-memoization": "warn",
};

const configs = [...next];
const tsConfigIndex = configs.findIndex(
  (c) => c.plugins && c.plugins["@typescript-eslint"]
);
if (tsConfigIndex >= 0) {
  configs[tsConfigIndex] = {
    ...configs[tsConfigIndex],
    rules: { ...configs[tsConfigIndex].rules, ...customRules },
  };
} else {
  configs.push({ rules: customRules });
}

export default configs;
