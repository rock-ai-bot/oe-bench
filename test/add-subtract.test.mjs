import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './support/load-page.mjs';

// Every example starts from a freshly loaded page.
async function typed(...keys) {
  const page = await loadPage();
  for (const key of keys) page.press(key);
  return page.display();
}

test('the page has one +, one - and one = button, labelled as written', async () => {
  const page = await loadPage();
  for (const key of ['+', '-', '=']) {
    assert.equal(page.buttonLabels().filter((l) => l === key).length, 1, `button "${key}"`);
  }
});

test('1 + 1 = shows 2', async () => {
  assert.equal(await typed('1', '+', '1', '='), '2');
});

test('12 + 30 = shows 42', async () => {
  assert.equal(await typed('1', '2', '+', '3', '0', '='), '42');
});

test('0.1 + 0.2 = shows 0.3, with no floating-point noise', async () => {
  assert.equal(await typed('0', '.', '1', '+', '0', '.', '2', '='), '0.3');
});

test('1.5 + 1.25 = shows 2.75', async () => {
  assert.equal(await typed('1', '.', '5', '+', '1', '.', '2', '5', '='), '2.75');
});

test('5 - 3 = shows 2', async () => {
  assert.equal(await typed('5', '-', '3', '='), '2');
});

test('3 - 5 = shows -2', async () => {
  assert.equal(await typed('3', '-', '5', '='), '-2');
});

test('1 + 1 = + 5 = shows 7, a result carries on into the next sum', async () => {
  assert.equal(await typed('1', '+', '1', '=', '+', '5', '='), '7');
});

test('1 + 1 = - 5 = shows -3, a result carries on into a subtraction', async () => {
  assert.equal(await typed('1', '+', '1', '=', '-', '5', '='), '-3');
});

test('5 + C 3 = shows 3, C forgets a half-finished sum', async () => {
  assert.equal(await typed('5', '+', 'C', '3', '='), '3');
});

test('1 + 1 = C shows 0, C after a result clears it', async () => {
  assert.equal(await typed('1', '+', '1', '=', 'C'), '0');
});
