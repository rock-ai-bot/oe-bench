const { test } = require('node:test');
const assert = require('node:assert');
const { loadPage } = require('./helpers/page');

// Every test loads the page afresh, as a reload would, then presses the keys.
const typed = (...keys) => {
  const page = loadPage();
  page.press(...keys);
  return page.display();
};

test('the page has a C button', () => {
  assert.ok(loadPage().button('C'), 'button "C"');
});

test('7 2 C shows 0', () => {
  assert.strictEqual(typed('7', '2', 'C'), '0');
});

test('7 2 C 5 shows 5, with no leftover digits', () => {
  assert.strictEqual(typed('7', '2', 'C', '5'), '5');
});

test('1 . 5 C shows 0', () => {
  assert.strictEqual(typed('1', '.', '5', 'C'), '0');
});

test('1 . 5 C 2 shows 2: the next number starts without a point', () => {
  assert.strictEqual(typed('1', '.', '5', 'C', '2'), '2');
});

test('1 . 5 C . 2 shows 0.2: the point is allowed again after C', () => {
  assert.strictEqual(typed('1', '.', '5', 'C', '.', '2'), '0.2');
});

test('C on a display that shows 0 leaves it at 0', () => {
  assert.strictEqual(typed('C'), '0');
});

test('C C after typing 7 shows 0', () => {
  assert.strictEqual(typed('7', 'C', 'C'), '0');
});

test('C then 7 2 shows 72: pressing C on 0 does not disturb typing', () => {
  assert.strictEqual(typed('C', '7', '2'), '72');
});

test('the display shows only the number after C, with no extra text', () => {
  const page = loadPage();
  page.press('7', '2', 'C');
  assert.strictEqual(page.displayTexts().length, 1);
  assert.strictEqual(page.display(), '0');
});

test('the number keys still type numbers after C was used', () => {
  assert.strictEqual(typed('9', 'C', '3', '.', '1', '4'), '3.14');
  assert.strictEqual(typed('4', 'C', '0', '7'), '7');
});
