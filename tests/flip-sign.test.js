const { test } = require('node:test');
const assert = require('node:assert');
const { loadPage } = require('./helpers/page');

// Every test loads the page afresh, as a reload would, then presses the keys.
const typed = (...keys) => {
  const page = loadPage();
  page.press(...keys);
  return page.display();
};

test('the page has a ± button', () => {
  const page = loadPage();
  assert.ok(page.button('±'), 'button "±"');
});

test('5 ± shows -5', () => {
  assert.strictEqual(typed('5', '±'), '-5');
});

test('5 ± ± shows 5: flipping again goes back', () => {
  assert.strictEqual(typed('5', '±', '±'), '5');
});

test('5 ± 3 shows -53: typing continues after a flip', () => {
  assert.strictEqual(typed('5', '±', '3'), '-53');
});

test('1 . 5 ± shows -1.5', () => {
  assert.strictEqual(typed('1', '.', '5', '±'), '-1.5');
});

test('± on 0 leaves 0, never -0', () => {
  assert.strictEqual(typed('±'), '0');
  assert.strictEqual(typed('0', '±'), '0');
  assert.strictEqual(typed('±', '±'), '0');
});

test('5 + 3 ± = shows 2: ± flips the second number', () => {
  assert.strictEqual(typed('5', '+', '3', '±', '='), '2');
});

test('5 ± + 3 = shows -2: ± flips the first number', () => {
  assert.strictEqual(typed('5', '±', '+', '3', '='), '-2');
});

test('1 + 1 = ± shows -2: ± flips a result', () => {
  assert.strictEqual(typed('1', '+', '1', '=', '±'), '-2');
});

test('5 - 3 = still shows 2, and 5 + 3 = still shows 8', () => {
  assert.strictEqual(typed('5', '-', '3', '='), '2');
  assert.strictEqual(typed('5', '+', '3', '='), '8');
});

test('5 + ± 3 = shows 2: ± while waiting for the second number makes it negative', () => {
  assert.strictEqual(typed('5', '+', '±', '3', '='), '2');
});

test('5 + ± 0 3 = shows 2: the pending sign survives a leading zero', () => {
  assert.strictEqual(typed('5', '+', '±', '0', '3', '='), '2');
});

test('5 + ± 0 . 3 = shows 4.7: the pending sign survives a leading zero before the point', () => {
  assert.strictEqual(typed('5', '+', '±', '0', '.', '3', '='), '4.7');
});
