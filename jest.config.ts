import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Path to the Next.js app to load next.config and .env files in the test environment.
  dir: "./",
});

const config: Config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jest-environment-jsdom",
  // Resolve CJS-first; fall back to the `import` condition only for ESM-only
  // packages (HeroUI v3). See jest.resolver.cjs for why this beats enabling
  // `import` globally (which drags every dual-build dep into ESM).
  resolver: "<rootDir>/jest.resolver.cjs",
  // SWC rewrites "@/*" in static imports, but jest.mock("@/...") strings are
  // resolved by jest itself, so map the alias here too. (tsconfig has no
  // baseUrl, so next/jest doesn't add this automatically.)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  collectCoverageFrom: [
    "components/**/*.{ts,tsx}",
    "utilities/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
};

// next/jest injects a transformIgnorePatterns that ignores ~all of node_modules
// (everything but geist/next). Because transformIgnorePatterns is OR-matched, we
// can't widen it by appending — a file is skipped if it matches ANY entry. So
// build next/jest's config, then REPLACE transformIgnorePatterns with ours so
// HeroUI v3 + react-aria ESM actually get compiled to CJS for jest.
export default async () => {
  const finalConfig = await createJestConfig(config)();
  finalConfig.transformIgnorePatterns = [
    "/node_modules/(?!(@heroui|react-aria|react-aria-components|@react-aria|@react-stately|@react-types|@internationalized|tailwind-variants|@swc/helpers)/)",
    "^.+\\.module\\.(css|sass|scss)$",
  ];
  return finalConfig;
};
