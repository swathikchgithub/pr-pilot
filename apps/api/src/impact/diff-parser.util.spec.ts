import { extractChangedFiles } from "./diff-parser.util";

const SAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index 123..456 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -10,3 +10,4 @@
+  logAttempt();
diff --git a/src/db.ts b/src/db.ts
index 789..abc 100644
--- a/src/db.ts
+++ b/src/db.ts
@@ -1,2 +1,3 @@
+  connect();
`;

describe("extractChangedFiles", () => {
  it("extracts every changed filename from a multi-file unified diff", () => {
    expect(extractChangedFiles(SAMPLE_DIFF)).toEqual(["src/auth.ts", "src/db.ts"]);
  });

  it("returns an empty array for a diff with no file headers", () => {
    expect(extractChangedFiles("not a diff")).toEqual([]);
  });

  it("dedupes a filename that appears twice", () => {
    const diff = "+++ b/src/auth.ts\n+++ b/src/auth.ts\n";
    expect(extractChangedFiles(diff)).toEqual(["src/auth.ts"]);
  });
});
