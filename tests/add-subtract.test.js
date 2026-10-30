const { test } = require('node:test');
const assert = require('node:assert');
const { loadPage } = require('./helpers/page');

// Every test loads the page afresh, as a reload would, then presses the keys.
const typed = (...keys) => {
  const page = loadPage();
  page.press(...keys);
  return page.display();
};

test('the page has a button for each of + - and =', () => {
  const page = loadPage();
  for (const label of ['+', '-', '=']) {
    assert.ok(page.button(label), `button "${label}"`);
  }
});

test('1 + 1 = shows 2', () => {
  assert.strictEqual(typed('1', '+', '1', '='), '2');
});

test('1 2 + 3 0 = shows 42', () => {
  assert.strictEqual(typed('1', '2', '+', '3', '0', '='), '42');
});

test('0 . 1 + 0 . 2 = shows 0.3: no floating-point noise', () => {
  assert.strictEqual(typed('0', '.', '1', '+', '0', '.', '2', '='), '0.3');
});

test('1 . 5 + 1 . 2 5 = shows 2.75', () => {
  assert.strictEqual(typed('1', '.', '5', '+', '1', '.', '2', '5', '='), '2.75');
});

test('5 - 3 = shows 2', () => {
  assert.strictEqual(typed('5', '-', '3', '='), '2');
});

test('3 - 5 = shows -2', () => {
  assert.strictEqual(typed('3', '-', '5', '='), '-2');
});

test('1 + 1 = + 5 = shows 7: + after a result continues from it', () => {
  assert.strictEqual(typed('1', '+', '1', '=', '+', '5', '='), '7');
});

test('1 + 1 = - 5 = shows -3: - after a result continues from it', () => {
  assert.strictEqual(typed('1', '+', '1', '=', '-', '5', '='), '-3');
});

test('5 + C 3 = shows 3: C forgets a half-finished sum', () => {
  assert.strictEqual(typed('5', '+', 'C', '3', '='), '3');
});

test('1 + 1 = C shows 0: C after a result clears it', () => {
  assert.strictEqual(typed('1', '+', '1', '=', 'C'), '0');
});

test('the display shows only the result after =, with no extra text', () => {
  const page = loadPage();
  page.press('1', '+', '1', '=');
  assert.strictEqual(page.displayTexts().length, 1);
  assert.strictEqual(page.display(), '2');
});
