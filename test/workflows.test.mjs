import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const workflow = (name) => readFile(new URL(`.github/workflows/${name}`, root), 'utf8');

test('tests workflow runs on every pull request and every push to main', async () => {
  const yml = await workflow('test.yml');
  assert.match(yml, /^\s*pull_request:/m);
  assert.match(yml, /^\s*push:\s*\n\s*branches:\s*\[\s*main\s*\]|^\s*push:\s*\n\s*branches:\s*\n\s*-\s*main/m);
  assert.doesNotMatch(yml, /pull_request:\s*\n\s*(branches|paths)/, 'no filters on pull_request');
  assert.match(yml, /npm test/);
});

test('tests workflow uses the same Node version as local', async () => {
  const yml = await workflow('test.yml');
  const major = process.versions.node.split('.')[0];
  const m = yml.match(/node-version:\s*['"]?v?(\d+)/);
  assert.ok(m, 'node-version must be set');
  assert.equal(m[1], major);
});

test('commit workflow checks the PR title and every commit on every pull request', async () => {
  const yml = await workflow('commits.yml');
  assert.match(yml, /^\s*pull_request:/m);
  assert.match(yml, /github\.event\.pull_request\.title/);
  assert.match(yml, /check-conventional-commits/);
  assert.match(yml, /fetch-depth:\s*0/);
});

test('pages workflow publishes on every push to main using GitHub Actions', async () => {
  const yml = await workflow('pages.yml');
  assert.match(yml, /^\s*push:/m);
  assert.match(yml, /main/);
  assert.doesNotMatch(yml, /^\s*pull_request:/m);
  assert.match(yml, /actions\/upload-pages-artifact@/);
  assert.match(yml, /actions\/deploy-pages@/);
  assert.match(yml, /pages:\s*write/);
  assert.match(yml, /id-token:\s*write/);
});

test('workflows do not change repository settings', async () => {
  const yml = await workflow('pages.yml');
  assert.doesNotMatch(yml, /configure-pages[\s\S]*enablement:\s*true/);
});
