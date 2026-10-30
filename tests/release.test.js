const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, '.github', 'workflows');

// Tools that version from Conventional Commits and publish without a release pull request.
const TOOLS = /semantic-release|git-cliff|conventional-changelog|standard-version|release-it|changelogithub/i;

function read(file) {
  const p = path.join(root, file);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function releaseWorkflow() {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f));
  for (const f of files) {
    const text = fs.readFileSync(path.join(dir, f), 'utf8');
    if (TOOLS.test(text) || /gh release create|action-gh-release|create-release/i.test(text)) {
      return text;
    }
  }
  return null;
}

// The workflow plus any release tool config files, so the tool may be configured in either place.
function releaseSetup() {
  const workflow = releaseWorkflow();
  assert.ok(workflow, 'a workflow in .github/workflows/ cuts releases');
  const extra = fs.readdirSync(root)
    .filter((f) => /^(\.releaserc.*|release\.config\..*|cliff\.toml|\.versionrc.*|\.release-it\..*)$/.test(f))
    .map((f) => read(f))
    .join('\n');
  return `${workflow}\n${extra}\n${read('package.json')}`;
}

test('a workflow cuts a release on every push to main', () => {
  const text = releaseWorkflow();
  assert.ok(text, 'a workflow in .github/workflows/ cuts releases');
  assert.match(text, /^\s*push:/m);
  assert.match(text, /branches:\s*\[?\s*main\b/);
});

test('releases are not cut from pull requests, so a merge is the only trigger', () => {
  const text = releaseWorkflow();
  assert.ok(text, 'a workflow in .github/workflows/ cuts releases');
  assert.doesNotMatch(text, /^\s*pull_request(_target)?:/m);
});

test('no release pull request or manual step is needed', () => {
  const text = releaseSetup();
  assert.doesNotMatch(text, /release-please/i, 'release-please opens a release pull request');
  assert.doesNotMatch(text, /^\s*workflow_dispatch:/m, 'releasing is not a manual step');
});

test('the version comes from the commit messages using semver', () => {
  const text = releaseSetup();
  assert.match(text, TOOLS, 'a tool derives the version from Conventional Commits');
  assert.match(text, /conventional|angular/i, 'it reads Conventional Commit types');
});

test('the workflow sees the full history so it can read every commit since the last release', () => {
  const text = releaseWorkflow();
  assert.ok(text, 'a workflow in .github/workflows/ cuts releases');
  assert.match(text, /fetch-depth:\s*0/);
});

test('the workflow may write the tag, the release and the changelog back to the repository', () => {
  const text = releaseWorkflow();
  assert.ok(text, 'a workflow in .github/workflows/ cuts releases');
  assert.match(text, /contents:\s*write/);
});

test('each release is a GitHub release tagged like v0.1.0', () => {
  const text = releaseSetup();
  assert.match(text, /github|gh release|action-gh-release|GITHUB_TOKEN/i, 'it publishes to GitHub');
  assert.match(text, /\bv\$\{?\{?\s*version|tagFormat|\bv\d+\.\d+\.\d+|tag_name|--tag|git-cliff|semantic-release/i);
  assert.doesNotMatch(text, /tagFormat['"]?\s*[:=]\s*['"]\$\{version\}/, 'the tag keeps the v prefix');
});

test('CHANGELOG.md is generated from the commits and committed to the repository', () => {
  const text = releaseSetup();
  assert.match(text, /CHANGELOG\.md|changelog/i, 'it writes CHANGELOG.md');
  assert.match(text, /CHANGELOG\.md/, 'the file is named CHANGELOG.md');
  assert.match(text, /git\s+commit|@semantic-release\/git|git-cliff.*--output|--prepend|contents:\s*write/is, 'the file is committed back');
});

test('the changelog groups the merged changes by type', () => {
  const text = releaseSetup();
  assert.match(
    text,
    /conventionalcommits|angular|conventional-changelog|git-cliff|commit-analyzer|release-notes-generator/i,
    'a Conventional Commits changelog generator groups changes under Features, Bug Fixes and so on',
  );
});
