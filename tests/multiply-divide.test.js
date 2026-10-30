const { test } = require('node:test');
const assert = require('node:assert');
const { loadPage } = require('./helpers/page');

// Every test loads the page afresh, as a reload would, then presses the keys.
const typed = (...keys) => {
  const page = loadPage();
  page.press(...keys);
  return page.display();
};

test('the page has a button for each of × and ÷', () => {
  const page = loadPage();
  for (const label of ['×', '÷']) {
    assert.ok(page.button(label), `button "${label}"`);
  }
});

test('3 × 4 = shows 12', () => {
  assert.strictEqual(typed('3', '×', '4', '='), '12');
});

test('7 × 0 = shows 0', () => {
  assert.strictEqual(typed('7', '×', '0', '='), '0');
});

test('10 ÷ 2 = shows 5', () => {
  assert.strictEqual(typed('1', '0', '÷', '2', '='), '5');
});

test('1 ÷ 4 = shows 0.25', () => {
  assert.strictEqual(typed('1', '÷', '4', '='), '0.25');
});

test('1 ÷ 3 = shows 0.3333: at most four decimal places', () => {
  assert.strictEqual(typed('1', '÷', '3', '='), '0.3333');
});

test('10 ÷ 0 = shows Error', () => {
  assert.strictEqual(typed('1', '0', '÷', '0', '='), 'Error');
});

test('after Error, a digit starts a new number: 5 shows 5', () => {
  assert.strictEqual(typed('1', '0', '÷', '0', '=', '5'), '5');
});

test('after Error, C shows 0', () => {
  assert.strictEqual(typed('1', '0', '÷', '0', '=', 'C'), '0');
});

test('after Error, the calculator still calculates: 5 + 1 = shows 6', () => {
  assert.strictEqual(typed('1', '0', '÷', '0', '=', '5', '+', '1', '='), '6');
});

test('after Error and C, the calculator still calculates: 2 × 3 = shows 6', () => {
  assert.strictEqual(typed('1', '0', '÷', '0', '=', 'C', '2', '×', '3', '='), '6');
});

test('adding and subtracting still work', () => {
  assert.strictEqual(typed('1', '+', '1', '='), '2');
  assert.strictEqual(typed('5', '-', '3', '='), '2');
});

test('2 × 3 = × 4 = shows 24: × after a result continues from it', () => {
  assert.strictEqual(typed('2', '×', '3', '=', '×', '4', '='), '24');
});
