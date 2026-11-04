import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './support/load-page.mjs';

// Every example starts from a freshly loaded page.
async function typed(...keys) {
  const page = await loadPage();
  for (const key of keys) page.press(key);
  return page.display();
}

test('the page has one C button, labelled as written', async () => {
  const page = await loadPage();
  assert.equal(page.buttonLabels().filter((l) => l === 'C').length, 1);
});

test('7 2 C shows 0', async () => {
  assert.equal(await typed('7', '2', 'C'), '0');
});

test('7 2 C 5 shows 5, with no leftover digits', async () => {
  assert.equal(await typed('7', '2', 'C', '5'), '5');
});

test('1 . 5 C shows 0', async () => {
  assert.equal(await typed('1', '.', '5', 'C'), '0');
});

test('1 . 5 C 2 shows 2, the next number starts without a point', async () => {
  assert.equal(await typed('1', '.', '5', 'C', '2'), '2');
});

test('1 . C . 5 shows 0.5, a point can be typed again after C', async () => {
  assert.equal(await typed('1', '.', 'C', '.', '5'), '0.5');
});

test('C on the display already showing 0 leaves it at 0', async () => {
  assert.equal(await typed('C'), '0');
});

test('C pressed twice in a row still shows 0, and typing works after', async () => {
  const page = await loadPage();
  for (const key of ['7', 'C', 'C']) page.press(key);
  assert.equal(page.display(), '0');
  page.press('3');
  assert.equal(page.display(), '3');
});

test('C then 0 then 7 shows 7, with no leading zero', async () => {
  assert.equal(await typed('9', 'C', '0', '7'), '7');
});
