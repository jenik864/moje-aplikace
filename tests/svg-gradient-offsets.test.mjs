import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import ts from "typescript";

test("SVG gradient stops use number strings accepted by the native SVG parser", () => {
  const invalid = [];
  let checked = 0;
  for (const file of readdirSync("src", { recursive: true }).filter((p) =>
    p.endsWith(".tsx"),
  )) {
    const source = ts.createSourceFile(
      file,
      readFileSync(`src/${file}`, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node) {
      if (
        (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
        node.tagName.getText(source) === "Stop"
      ) {
        for (const prop of node.attributes.properties) {
          if (
            ts.isJsxAttribute(prop) &&
            prop.name.getText(source) === "offset" &&
            prop.initializer &&
            ts.isStringLiteral(prop.initializer)
          ) {
            checked++;
            const value = prop.initializer.text;
            const percent = value.endsWith("%");
            if (
              !/^\d+(?:\.\d+)?%?$/.test(value) ||
              parseFloat(value) > (percent ? 100 : 1)
            )
              invalid.push(`${file}: ${value}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.ok(checked > 0);
  assert.deepEqual(
    invalid,
    [],
    "Leading decimal strings such as .55 cause repeated warnings on native",
  );
});
