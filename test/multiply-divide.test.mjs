import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './support/load-page.mjs';

// Every example starts from a freshly loaded page.
async function typed(...keys) {
  const page = await loadPage();
  for (const key of keys) page.press(key);
  return page.display();
}

test('the page has one × and one ÷ button, labelled as written', async () => {
  const page = await loadPage();
  for (const key of ['×', '÷']) {
    assert.equal(page.buttonLabels().filter((l) => l === key).length, 1, `button "${key}"`);
  }
});

test('3 × 4 = shows 12', async () => {
  assert.equal(await typed('3', '×', '4', '='), '12');
});

test('7 × 0 = shows 0', async () => {
  assert.equal(await typed('7', '×', '0', '='), '0');
});

test('10 ÷ 2 = shows 5', async () => {
  assert.equal(await typed('1', '0', '÷', '2', '='), '5');
});

test('1 ÷ 4 = shows 0.25, a fraction is shown without trailing zeros', async () => {
  assert.equal(await typed('1', '÷', '4', '='), '0.25');
});

test('1 ÷ 3 = shows 0.3333, at most four decimal places', async () => {
  assert.equal(await typed('1', '÷', '3', '='), '0.3333');
});

test('10 ÷ 0 = shows Error', async () => {
  assert.equal(await typed('1', '0', '÷', '0', '='), 'Error');
});

test('10 ÷ 0 = 5 shows 5, a digit after Error starts a new number', async () => {
  assert.equal(await typed('1', '0', '÷', '0', '=', '5'), '5');
});

test('10 ÷ 0 = C shows 0, C clears Error', async () => {
  assert.equal(await typed('1', '0', '÷', '0', '=', 'C'), '0');
});

test('10 ÷ 0 = 2 × 3 = shows 6, the calculator keeps working after Error', async () => {
  assert.equal(await typed('1', '0', '÷', '0', '=', '2', '×', '3', '='), '6');
});

test('10 ÷ 0 = C 8 ÷ 2 = shows 4, the calculator keeps working after clearing Error', async () => {
  assert.equal(await typed('1', '0', '÷', '0', '=', 'C', '8', '÷', '2', '='), '4');
});

test('3 × 4 = + 1 = shows 13, a result carries on into the next sum', async () => {
  assert.equal(await typed('3', '×', '4', '=', '+', '1', '='), '13');
});

test('1 + 1 = still shows 2, adding still works', async () => {
  assert.equal(await typed('1', '+', '1', '='), '2');
});

test('5 - 3 = still shows 2, subtracting still works', async () => {
  assert.equal(await typed('5', '-', '3', '='), '2');
});
