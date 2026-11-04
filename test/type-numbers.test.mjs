import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPage } from './support/load-page.mjs';

// Every example starts from a freshly loaded page.
async function typed(...keys) {
  const page = await loadPage();
  for (const key of keys) page.press(key);
  return page.display();
}

test('the page has a button for each of 0-9 and the point, labelled as written', async () => {
  const page = await loadPage();
  const keys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'];
  for (const key of keys) {
    assert.equal(page.buttonLabels().filter((l) => l === key).length, 1, `button "${key}"`);
  }
});

test('the display shows 0 when the page first opens', async () => {
  assert.equal(await typed(), '0');
});

test('pressing 7 shows 7', async () => {
  assert.equal(await typed('7'), '7');
});

test('pressing 7 then 2 shows 72', async () => {
  assert.equal(await typed('7', '2'), '72');
});

test('0 then 7 shows 7, with no leading zero', async () => {
  assert.equal(await typed('0', '7'), '7');
});

test('0 then 0 shows 0', async () => {
  assert.equal(await typed('0', '0'), '0');
});

test('0 . 5 shows 0.5', async () => {
  assert.equal(await typed('0', '.', '5'), '0.5');
});

test('3 . 1 4 shows 3.14', async () => {
  assert.equal(await typed('3', '.', '1', '4'), '3.14');
});

test('pressing . first shows 0.', async () => {
  assert.equal(await typed('.'), '0.');
});

test('pressing . first, then 5, shows 0.5', async () => {
  assert.equal(await typed('.', '5'), '0.5');
});

test('1 . . 5 shows 1.5, a number takes only one point', async () => {
  assert.equal(await typed('1', '.', '.', '5'), '1.5');
});

test('1 . 5 . 2 shows 1.52, a second point is ignored', async () => {
  assert.equal(await typed('1', '.', '5', '.', '2'), '1.52');
});

test('the display shows only what was typed: no extra text or spaces', async () => {
  const page = await loadPage();
  assert.equal(page.display(), '0');
  for (const key of ['4', '.', '2']) page.press(key);
  assert.equal(page.display(), '4.2');
  assert.equal(page.display(), page.display().trim());
});
