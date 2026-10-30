const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '.releaserc.json'), 'utf8'));
const logger = { log() {}, error() {}, warn() {} };

// Options of a plugin as configured in .releaserc.json, so the tests exercise the real setup.
function options(name) {
  const entry = config.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  assert.ok(entry, `${name} is configured`);
  return Array.isArray(entry) ? entry[1] : {};
}

const commit = (message, i) => ({
  hash: `${i}`.repeat(40),
  message,
  subject: message.split('\n')[0],
  body: '',
  author: { name: 'a', email: 'a@example.com' },
  committer: { name: 'a', email: 'a@example.com' },
  committerDate: '2026-01-01T00:00:00Z',
});

async function analyze(messages) {
  const { analyzeCommits } = await import('@semantic-release/commit-analyzer');
  return analyzeCommits(options('@semantic-release/commit-analyzer'), {
    cwd: process.cwd(),
    commits: messages.map(commit),
    logger,
  });
}

test('a feat: commit raises the minor version', async () => {
  assert.strictEqual(await analyze(['feat: add square root']), 'minor');
});

test('a fix: commit raises the patch version', async () => {
  assert.strictEqual(await analyze(['fix: round results']), 'patch');
});

test('feat: wins over fix: when both are merged', async () => {
  assert.strictEqual(await analyze(['fix: round results', 'feat: add square root']), 'minor');
});

test('a commit that is neither feat: nor fix: publishes no release', async () => {
  assert.strictEqual(await analyze(['docs: update readme', 'chore: tidy']), null);
});

test('the release notes group the changes by type', async () => {
  const { generateNotes } = await import('@semantic-release/release-notes-generator');
  const notes = await generateNotes(options('@semantic-release/release-notes-generator'), {
    cwd: process.cwd(),
    commits: [commit('feat: add square root', 1), commit('fix: round results', 2)],
    lastRelease: {},
    nextRelease: { version: '0.1.0', gitTag: 'v0.1.0' },
    options: { repositoryUrl: 'https://github.com/rock-ai-bot/oe-bench' },
    logger,
  });
  assert.match(notes, /### Features\s+\* add square root/);
  assert.match(notes, /### Bug Fixes\s+\* round results/);
  assert.ok(notes.indexOf('Features') < notes.indexOf('Bug Fixes'));
});
