const { test } = require('node:test');
const assert = require('node:assert');
const { isConventional } = require('../scripts/check-commit-message.js');

test('a message in Conventional Commit format passes', () => {
  assert.strictEqual(isConventional('feat: add a square root key'), true);
  assert.strictEqual(isConventional('fix(keypad): handle zero'), true);
  assert.strictEqual(isConventional('feat!: drop the old keypad'), true);
});

test('a message not in Conventional Commit format fails', () => {
  assert.strictEqual(isConventional('Add a square root key'), false);
  assert.strictEqual(isConventional('feat:no space'), false);
  assert.strictEqual(isConventional('unknown: add a key'), false);
  assert.strictEqual(isConventional(''), false);
});

test("GitHub's own merge commit is ignored", () => {
  const merge = 'Merge 0123456789abcdef0123456789abcdef01234567 into 89abcdef0123456789abcdef0123456789abcdef';
  assert.strictEqual(isConventional(merge), true);
});

test('only the real merge commit format is ignored', () => {
  assert.strictEqual(isConventional('Merge branch main into feature'), false);
});
