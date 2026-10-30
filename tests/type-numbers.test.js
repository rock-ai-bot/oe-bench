const { test } = require('node:test');
const assert = require('node:assert');
const { loadPage } = require('./helpers/page');

// Every test loads the page afresh, as a reload would: the C key comes later.
const typed = (...keys) => {
  const page = loadPage();
  page.press(...keys);
  return page.display();
};

test('the page has a button for each of 0 1 2 3 4 5 6 7 8 9 and .', () => {
  const page = loadPage();
  for (const label of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.']) {
    assert.ok(page.button(label), `button "${label}"`);
  }
});

test('the display is visible text above the buttons', () => {
  const page = loadPage();
  const display = page.displayElement();
  assert.ok(display, 'the page has visible text for a display');
  const all = page.document.documentElement.descendants;
  assert.ok(
    all.indexOf(display) < all.indexOf(page.button('0')),
    'the display comes before the buttons',
  );
});

test('the display shows 0 when the page first opens', () => {
  assert.strictEqual(loadPage().display(), '0');
});

test('pressing 7 shows 7', () => {
  assert.strictEqual(typed('7'), '7');
});

test('pressing 7 then 2 shows 72', () => {
  assert.strictEqual(typed('7', '2'), '72');
});

test('0 then 7 shows 7, with no leading zero', () => {
  assert.strictEqual(typed('0', '7'), '7');
});

test('0 then 0 shows 0, with no leading zero', () => {
  assert.strictEqual(typed('0', '0'), '0');
});

test('0 . 5 shows 0.5', () => {
  assert.strictEqual(typed('0', '.', '5'), '0.5');
});

test('3 . 1 4 shows 3.14', () => {
  assert.strictEqual(typed('3', '.', '1', '4'), '3.14');
});

test('pressing . first shows 0.', () => {
  assert.strictEqual(typed('.'), '0.');
});

test('pressing . then 5 shows 0.5', () => {
  assert.strictEqual(typed('.', '5'), '0.5');
});

test('1 . . 5 shows 1.5: a number takes only one point', () => {
  assert.strictEqual(typed('1', '.', '.', '5'), '1.5');
});

test('1 . 5 . 2 shows 1.52: a second point is ignored', () => {
  assert.strictEqual(typed('1', '.', '5', '.', '2'), '1.52');
});

test('the display shows what was typed and nothing else', () => {
  const page = loadPage();
  assert.strictEqual(page.display(), '0');
  page.press('1', '.', '5');
  assert.strictEqual(page.display(), '1.5', 'no extra text or spaces around the number');
  assert.strictEqual(page.displayTexts().length, 1, 'no other visible text besides the heading and keys');
});

test('reloading the page starts again from 0', () => {
  loadPage().press('7', '2');
  assert.strictEqual(loadPage().display(), '0');
});
