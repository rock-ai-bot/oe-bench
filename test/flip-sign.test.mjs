import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './support/load-page.mjs';

// Every example starts from a freshly loaded page.
async function typed(...keys) {
  const page = await loadPage();
  for (const key of keys) page.press(key);
  return page.display();
}

test('the page has one ± button, labelled as written', async () => {
  const page = await loadPage();
  assert.equal(page.buttonLabels().filter((l) => l === '±').length, 1);
});

test('5 ± shows -5', async () => {
  assert.equal(await typed('5', '±'), '-5');
});

test('5 ± ± shows 5, flipping again goes back', async () => {
  assert.equal(await typed('5', '±', '±'), '5');
});

test('5 ± 3 shows -53, typing continues after a flip', async () => {
  assert.equal(await typed('5', '±', '3'), '-53');
});

test('1 . 5 ± shows -1.5', async () => {
  assert.equal(await typed('1', '.', '5', '±'), '-1.5');
});

test('± on 0 leaves 0, never -0', async () => {
  assert.equal(await typed('±'), '0');
});

test('5 + 3 ± = shows 2, ± works on the second number', async () => {
  assert.equal(await typed('5', '+', '3', '±', '='), '2');
});

test('5 ± + 3 = shows -2, ± works on the first number', async () => {
  assert.equal(await typed('5', '±', '+', '3', '='), '-2');
});

test('1 + 1 = ± shows -2, ± flips a result', async () => {
  assert.equal(await typed('1', '+', '1', '=', '±'), '-2');
});

test('5 - 3 = still shows 2, subtracting still works', async () => {
  assert.equal(await typed('5', '-', '3', '='), '2');
});

test('1 + 1 = still shows 2, adding still works', async () => {
  assert.equal(await typed('1', '+', '1', '='), '2');
});
