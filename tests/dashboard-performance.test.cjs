const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, ...globals, require: (name) => {
    if (name in mocks) return mocks[name];
    if (name === 'react/jsx-runtime') return require(name);
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return exports.default;
}

test('a full year retains unchanged month references after edits, moves, additions and deletion', () => {
  const group = load('utils/groupTransactionsByMonth.ts', {});
  const rows = Array.from({ length: 1000 }, (_, i) => ({ _id: String(i), transactionDate: `2026-${String(i % 10 + 1).padStart(2, '0')}-15`, amount: 10 }));
  const initial = group(rows);
  const changed = { ...rows[0], amount: 25 };
  const editedRows = [changed, ...rows.slice(1)];
  const edited = group(editedRows, initial);
  assert.notEqual(edited[0], initial[0]);
  for (let i = 1; i < 12; i++) assert.equal(edited[i], initial[i]);
  const moved = group([{ ...changed, transactionDate: '2026-02-15' }, ...rows.slice(1)], edited);
  assert.notEqual(moved[0], edited[0]);
  assert.notEqual(moved[1], edited[1]);
  assert.equal(moved[2], edited[2]);
  assert.equal(moved.flat().length, 1000);
  const added = group([...editedRows, { _id: 'new', transactionDate: '2026-10-31', amount: 50 }], edited);
  assert.equal(added[9].length, edited[9].length + 1);
  assert.equal(added[0], edited[0]);
  const deleted = group(editedRows.slice(1), edited);
  assert.equal(deleted[0].length, edited[0].length - 1);
  assert.equal(deleted[1], edited[1]);
  assert.equal(rows[0].amount, 10);
});

function deferredHarness(withObserver = true) {
  let visible = false;
  let effect;
  let callback;
  let observed;
  let disconnected = 0;
  let options;
  const element = {};
  class Observer {
    constructor(cb, opts) { callback = cb; options = opts; }
    observe(node) { observed = node; }
    disconnect() { disconnected++; }
  }
  const Component = load('components/deferred-chart/index.tsx', {
    react: {
      useRef: () => ({ current: element }),
      useState: () => [visible, (value) => { visible = value; }],
      useEffect: (run) => { effect = run; },
    },
  }, withObserver ? { IntersectionObserver: Observer } : {});
  const chart = require('react').createElement('div', { 'data-chart': true });
  const render = () => Component({ children: chart, height: 350 });
  const initial = render();
  const cleanup = effect();
  return { initial, render, chart, cleanup, element, get observed() { return observed; }, get options() { return options; }, get disconnected() { return disconnected; }, intersect: (value) => callback([{ isIntersecting: value }]) };
}

test('offscreen charts reserve space and mount only on intersection, then remain mounted', () => {
  const harness = deferredHarness();
  assert.notEqual(harness.initial.props.children, harness.chart);
  assert.equal(harness.initial.props.style.minHeight, 350);
  assert.equal(harness.observed, harness.element);
  assert.equal(harness.options.rootMargin, '250px');
  harness.intersect(false);
  assert.notEqual(harness.render().props.children, harness.chart);
  harness.intersect(true);
  assert.equal(harness.render().props.children, harness.chart);
  assert.equal(harness.disconnected, 1);
  harness.intersect(false);
  assert.equal(harness.render().props.children, harness.chart);
  harness.cleanup();
  assert.equal(harness.disconnected, 2);
});

test('charts still load when IntersectionObserver is unavailable', () => {
  const harness = deferredHarness(false);
  assert.equal(harness.render().props.children, harness.chart);
});
