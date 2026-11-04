import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8').catch(() => '');

// The release workflow is whichever workflow runs on push to main and is not
// one of the existing ones; any release tool is fine.
const existing = ['test.yml', 'commits.yml', 'pages.yml'];
async function releaseWorkflow() {
  const files = (await readdir(new URL('.github/workflows/', root))).filter(
    (f) => /\.ya?ml$/.test(f) && !existing.includes(f),
  );
  for (const f of files) {
    const yml = await read(`.github/workflows/${f}`);
    if (/release/i.test(yml)) return yml;
  }
  return '';
}

// Everything that configures the release: the workflow, release tool config
// files and package.json.
async function releaseSetup() {
  const files = await readdir(root);
  const configs = files.filter((f) =>
    /^(\.releaserc.*|release\.config\..*|\.versionrc.*|cliff\.toml|release-it\.json|\.release-it\..*|package\.json)$/.test(f),
  );
  const parts = [await releaseWorkflow()];
  for (const f of configs) parts.push(await read(f));
  return parts.join('\n');
}

test('a release workflow runs on every push to main', async () => {
  const yml = await releaseWorkflow();
  assert.notEqual(yml, '', 'add a workflow that releases');
  assert.match(yml, /^\s*push:\s*\n\s*branches:\s*(\[\s*main\s*\]|\n\s*-\s*main)/m);
  assert.doesNotMatch(yml, /^\s*pull_request:/m, 'releasing must not wait on a PR');
});

test('releasing needs no release PR or manual step', async () => {
  const yml = await releaseWorkflow();
  assert.notEqual(yml, '', 'add a workflow that releases');
  assert.doesNotMatch(yml, /release-please/i, 'release-please opens a release PR');
  assert.doesNotMatch(yml, /workflow_dispatch/, 'no manual trigger');
  assert.doesNotMatch(yml, /gh pr create|create-pull-request/, 'no release PR');
  assert.doesNotMatch(yml, /environment:/, 'no approval gate');
});

test('the release workflow can push tags and create GitHub releases', async () => {
  const yml = await releaseWorkflow();
  assert.match(yml, /contents:\s*write/);
  assert.match(yml, /GITHUB_TOKEN/);
  assert.match(yml, /fetch-depth:\s*0/, 'full history is needed to read commit messages');
});

test('a feat: change raises the minor version and a fix: change raises the patch version', async () => {
  const setup = await releaseSetup();
  assert.match(setup, /semantic-release|conventional-changelog|release-it|git-cliff|commit-and-tag-version|standard-version|changesets|conventionalcommits/i,
    'version bumps must come from conventional commits');
  assert.match(setup, /\bfeat\b/);
  assert.match(setup, /\bfix\b/);
  assert.match(setup, /minor/);
  assert.match(setup, /patch/);
});

test('releases are tagged like v0.1.0 and published as GitHub releases', async () => {
  const setup = await releaseSetup();
  assert.match(setup, /tagFormat|tag[-_]?(name|prefix)|tag_format|v\$\{version\}|v\{\{\s*version\s*\}\}|github-release|@semantic-release\/github|gh release create|action-gh-release/i);
  assert.match(setup, /\bv(\$\{version\}|\{\{\s*version\s*\}\}|\$VERSION|\$\{\{[^}]*version[^}]*\}\})|\bv\d+\.\d+\.\d+/i,
    'tags must be prefixed with v');
});

test('CHANGELOG.md is generated from the commits, grouped by type', async () => {
  const setup = await releaseSetup();
  assert.match(setup, /CHANGELOG\.md/);
  assert.match(setup, /changelog/i);
  assert.match(setup, /Features/i, 'feat changes are listed under their own heading');
  assert.match(setup, /Bug Fixes/i, 'fix changes are listed under their own heading');
});

test('the changelog is committed back without triggering another release', async () => {
  const setup = await releaseSetup();
  assert.match(setup, /\[skip ci\]|\[ci skip\]|skip-ci|chore\(release\)/i);
});
