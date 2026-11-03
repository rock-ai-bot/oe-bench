import { test } from 'node:test';
import assert from 'node:assert/strict';

const { isConventional, findInvalid } = await import('../scripts/check-conventional-commits.mjs');

test('feat: add a square root key passes', () => {
  assert.equal(isConventional('feat: add a square root key'), true);
});

test('Add a square root key fails', () => {
  assert.equal(isConventional('Add a square root key'), false);
});

test('scopes and breaking-change markers pass', () => {
  assert.equal(isConventional('fix(keypad): ignore double tap'), true);
  assert.equal(isConventional('feat!: drop the old display'), true);
});

test('an unknown type or empty description fails', () => {
  assert.equal(isConventional('stuff: add a key'), false);
  assert.equal(isConventional('feat:'), false);
  assert.equal(isConventional('feat:add a key'), false);
});

test('GitHub merge commits are ignored', () => {
  const merge = 'Merge 0123456789abcdef0123456789abcdef01234567 into main';
  assert.deepEqual(findInvalid([merge, 'feat: add a square root key']), []);
});

test('every invalid title or commit is reported', () => {
  const bad = findInvalid(['feat: ok', 'Add a square root key', 'fix: also ok', 'wip']);
  assert.deepEqual(bad, ['Add a square root key', 'wip']);
});
