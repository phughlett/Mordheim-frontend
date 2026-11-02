const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const source = fs.readFileSync(require.resolve("../app/routes/home.tsx"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
});

function visitHome({ token = null, search = "", hash = "" } = {}) {
  const effects = [];
  const redirects = [];
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require(id) {
      if (id === "react") return { ...React, useEffect: (effect) => effects.push(effect) };
      if (id === "../features/auth/auth") return { getToken: () => token };
      return require(id);
    },
    URLSearchParams,
    window: { location: { search, hash, replace: (target) => redirects.push(target) } },
  });
  const html = renderToStaticMarkup(React.createElement(exports.default));
  for (const effect of effects) effect();
  return { html, redirects };
}

test("signed-in home visitors go to the roster app", () => {
  assert.deepEqual(visitHome({ token: "saved-session" }).redirects, ["/app"]);
});

test("signed-in home redirects preserve query parameters and fragments", () => {
  assert.deepEqual(
    visitHome({ token: "saved-session", search: "?share=example", hash: "#roster" }).redirects,
    ["/app?share=example#roster"],
  );
});

test("signed-out visitors and prerendered HTML retain the public information page", () => {
  const { html, redirects } = visitHome();
  assert.deepEqual(redirects, []);
  assert.match(html, /Mordheim warband rosters, ready for the next battle/);
});

test("legacy share links still open the app without a saved session", () => {
  assert.deepEqual(visitHome({ search: "?share=example" }).redirects, ["/app?share=example"]);
});
