import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Acme Corp")).toBe("acme-corp");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugify("Acme & Co. 2026!")).toBe("acme-co-2026");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Weird Name--  ")).toBe("weird-name");
  });
});
