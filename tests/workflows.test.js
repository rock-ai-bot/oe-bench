const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..', '.github', 'workflows');

function workflows() {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => ({ file: f, text: fs.readFileSync(path.join(dir, f), 'utf8') }));
}

function find(predicate, what) {
  const found = workflows().find((w) => predicate(w.text));
  assert.ok(found, `a workflow in .github/workflows/ ${what}`);
  return found.text;
}

test('a workflow runs the tests on pull requests and pushes to main', () => {
  const text = find((t) => /npm test/.test(t), 'runs `npm test`');
  assert.match(text, /^\s*pull_request:/m);
  assert.match(text, /^\s*push:/m);
  assert.match(text, /branches:\s*\[?\s*main\b/);
});

test('the test workflow uses the same Node version as local', () => {
  const text = find((t) => /npm test/.test(t), 'runs `npm test`');
  const local = process.versions.node;
  const major = local.split('.')[0];
  const m = text.match(/node-version:\s*['"]?([\d.x]+)['"]?/);
  assert.ok(m, 'workflow sets node-version');
  assert.ok(
    m[1] === local || m[1] === major || local.startsWith(m[1] + '.'),
    `workflow node-version ${m[1]} matches local ${local}`,
  );
});

test('a workflow checks PR titles and commit messages on every pull request', () => {
  const text = find((t) => /check-commit-message/.test(t), 'runs scripts/check-commit-message.js');
  assert.match(text, /^\s*pull_request(_target)?:/m);
  assert.match(text, /title/i, 'checks the PR title');
  assert.match(text, /commit/i, 'checks the commits');
});

test('a workflow publishes the page to GitHub Pages on every push to main', () => {
  const text = find((t) => /deploy-pages/.test(t), 'uses actions/deploy-pages');
  assert.match(text, /^\s*push:/m);
  assert.match(text, /branches:\s*\[?\s*main\b/);
  assert.match(text, /upload-pages-artifact|upload-artifact/);
  assert.match(text, /pages:\s*write/);
  assert.match(text, /id-token:\s*write/);
});
