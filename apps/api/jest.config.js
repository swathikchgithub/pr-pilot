/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coveragePathIgnorePatterns: ["\\.spec\\.ts$", "\\.module\\.ts$", "main\\.ts$"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^@pr-pilot/types$": "<rootDir>/../../../packages/types/src/index.ts",
  },
};
