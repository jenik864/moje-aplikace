import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
test("Feature screens never render literal text or explicit spaces directly inside native layouts", () => {
  const errors = [];
  for (const dir of [
    "src/build",
    "src/mind",
    "src/business",
    "src/profile",
    "src/scroll",
  ])
    for (const name of readdirSync(dir).filter((v) => v.endsWith(".tsx"))) {
      const source = ts.createSourceFile(
        name,
        readFileSync(`${dir}/${name}`, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function checkChildren(children) {
        for (const child of children) {
          if (ts.isJsxFragment(child)) checkChildren(child.children);
          if (ts.isJsxText(child) && child.text.trim())
            errors.push(`${name}: ${child.text}`);
          if (
            ts.isJsxExpression(child) &&
            child.expression &&
            (ts.isStringLiteral(child.expression) ||
              ts.isNumericLiteral(child.expression))
          )
            errors.push(`${name}: ${child.expression.getText(source)}`);
        }
      }
      function visit(node) {
        if (
          ts.isJsxElement(node) &&
          ["View", "Pressable", "ScrollView"].includes(
            node.openingElement.tagName.getText(source),
          )
        )
          checkChildren(node.children);
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  assert.deepEqual(errors, []);
});
