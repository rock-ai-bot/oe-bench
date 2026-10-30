const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('the calculator page is a plain file that opens with no server', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<html[\s>]/i);
  assert.doesNotMatch(html, /<script[^>]+src=["']\//i, 'no root-absolute assets: file:// and project pages break');
});

test('the calculator page shows the heading "Calculator"', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  assert.ok(h1, 'page has an <h1>');
  assert.strictEqual(h1[1].trim(), 'Calculator');
});

test('one command, npm test, runs the project tests', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts && pkg.scripts.test, 'package.json has a test script');
});
