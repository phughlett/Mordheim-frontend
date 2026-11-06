const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const previous = { ts: require.extensions[".ts"], tsx: require.extensions[".tsx"] };
const compile = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
require.extensions[".ts"] = compile;
require.extensions[".tsx"] = compile;
const { ExampleWarband, ExampleWarbandPrintSheet, exampleWarband } = require("../app/features/roster/components/example-warband.tsx");
const { getRosterExperienceTotal, getAdvanceThresholds } = require("../app/features/roster/experience-rules.ts");
const { fieldingSummary } = require("../app/features/roster/fielding-summary.ts");
require.extensions[".ts"] = previous.ts;
require.extensions[".tsx"] = previous.tsx;

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
      if (id === "../features/roster/components/example-warband") return { ExampleWarband };
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

test("Welcome page exposes a complete read-only example without an account", () => {
  const { html, redirects } = visitHome();
  assert.deepEqual(redirects, []);
  assert.match(html, /href="#example-warband"/);
  assert.match(html, /class="landing-button landing-button-secondary" href="#example-warband">See an Example Warband/);
  assert.match(html, /id="example-warband"/);
  assert.match(html, /The Lantern Guard/);
  assert.match(html, /Reikland Mercenaries after 14 battles/);
  assert.match(html, /fictional, read-only example/);
  assert.match(html, /Build your own warband/);
  const example = renderToStaticMarkup(React.createElement(ExampleWarband));
  assert.equal((example.match(/class="example-warrior"/g) ?? []).length, 8);
  assert.equal((example.match(/<details[^>]* open=""/g) ?? []).length, 1);
  assert.equal((example.match(/<progress /g) ?? []).length, 8);
  assert.equal((example.match(/<caption>/g) ?? []).length, 8);
  assert.match(example, /Learned skills/);
  assert.match(example, /Characteristic advances/);
  assert.match(example, /Leg Wound/);
  assert.match(example, /Hand Injury/);
  assert.match(example, /Hardened/);
  assert.match(example, /Warband stash/);
  assert.match(example, /<button[^>]*>Export PDF \/ Print<\/button>/);
  assert.match(example, /Save as PDF/);
  assert.doesNotMatch(example, /<input|<form|contenteditable|draggable/i);
});

test("example PDF includes all records independently of the collapsed screen view", () => {
  const html = renderToStaticMarkup(React.createElement(ExampleWarbandPrintSheet));
  assert.match(html, /class="print-sheet"/);
  assert.equal((html.match(/class="print-member"/g) ?? []).length, 8);
  for (const member of exampleWarband.members) {
    assert.ok(html.includes(member.name));
    for (const skill of member.skills) assert.ok(html.includes(skill));
    for (const injury of member.injuries) assert.ok(html.includes(injury.name));
    assert.ok(html.includes(member.advances));
  }
  assert.match(html, /Warband stash/);
  assert.match(html, /Healing herbs/);
  assert.match(html, /Fictional example/);
  assert.match(html, /<dt>Rating<\/dt><dd>287<\/dd>/);
  assert.doesNotMatch(html, /<details|<button/);
});

test("veteran roster has multiple skills per Hero, tracked injuries, and consistent totals", () => {
  const { members } = exampleWarband;
  const heroes = members.filter((member) => member.role === "Hero");
  assert.equal(heroes.length, 5);
  assert.ok(heroes.every((hero) => hero.skills.length >= 3 && hero.equipment.includes("armour")));
  assert.equal(heroes.flatMap((hero) => hero.injuries).length, 3);
  assert.equal(members.filter((member) => member.role === "Henchman").reduce((total, member) => total + member.groupSize, 0), 7);
  assert.deepEqual(fieldingSummary(members), { totalFielded: 12, routThreshold: 3 });
  assert.equal(getRosterExperienceTotal(members), 227);
  const html = renderToStaticMarkup(React.createElement(ExampleWarband));
  assert.match(html, /<dt>Rating<\/dt><dd>287<\/dd>/);
  assert.match(html, /<dt>Treasury<\/dt><dd>146 /);
  assert.match(html, /<dt>Wyrdstone<\/dt><dd>4 /);
  assert.equal(members.find((member) => member.id === "lantern-marta").stats.M, "3");
  assert.equal(members.find((member) => member.id === "lantern-jakob").stats.WS, "2");
});

test("sample skills and characteristic advances fit the earned XP thresholds", () => {
  const startingXp = [20, 8, 8, 0, 0, 0, 0, 0];
  const characteristicAdvances = [5, 5, 4, 5, 4, 3, 2, 2];
  exampleWarband.members.forEach((member, index) => {
    const earned = getAdvanceThresholds(member.role)
      .filter((threshold) => threshold > startingXp[index] && threshold <= Number(member.experience));
    assert.equal(member.skills.length + characteristicAdvances[index], earned.length, member.name);
  });
});
