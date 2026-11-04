import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const readme = () => readFile(new URL('README.md', root), 'utf8');

// The text under a `## ` heading matching `title`, up to the next `## ` heading.
function section(md, title) {
  const parts = md.split(/^## /m).slice(1);
  const found = parts.find((p) => title.test(p.split('\n')[0]));
  assert.ok(found, `README.md needs a section titled ${title}`);
  return found;
}

const codeBlocks = (md) => [...md.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]);

test('README says what the project is in a sentence or two', async () => {
  const md = await readme();
  const intro = md.split(/^## /m)[0].replace(/^# .*\n/, '').trim();
  assert.match(intro, /calculator/i);
  const sentences = intro.split(/(?<=[.!?])\s+/).filter(Boolean);
  assert.ok(sentences.length >= 1 && sentences.length <= 3, `intro has ${sentences.length} sentences`);
});

test('README gives the address where the calculator is published', async () => {
  assert.match(await readme(), /https:\/\/rock-ai-bot\.github\.io\/oe-bench\/?/);
});

test('README has a section on running the calculator locally with exact commands', async () => {
  const s = section(await readme(), /run.*(calculator|locally)|locally/i);
  const commands = codeBlocks(s).join('\n');
  assert.match(commands, /git clone https:\/\/github\.com\/rock-ai-bot\/oe-bench/);
  assert.match(commands, /python3 -m http\.server/);
  assert.match(s, /http:\/\/localhost:\d+/);
  assert.match(s, /index\.html/);
});

test('README has a section on running the tests with the exact command', async () => {
  const s = section(await readme(), /test/i);
  assert.ok(codeBlocks(s).some((b) => /^npm test$/m.test(b)), 'a code block with `npm test`');
  assert.match(s, /Node(\.js)?\s*(version\s*)?26/i, 'names the Node version the tests need');
});

test('README explains how the calculator is published and released', async () => {
  const s = section(await readme(), /publish|release/i);
  assert.match(s, /pages\.yml|pages workflow/i);
  assert.match(s, /release\.yml|release workflow/i);
  assert.match(s, /push(es)? to `?main`?|merge[sd]? (in)?to `?main`?/i);
  assert.match(s, /GitHub Pages/);
  assert.match(s, /CHANGELOG\.md/);
  assert.match(s, /semantic-release|version|tag/i);
  assert.match(s, /feat/);
  assert.match(s, /fix/);
});

test('README explains how to change the calculator: PR title format and CI', async () => {
  const s = section(await readme(), /chang/i);
  assert.match(s, /pull request/i);
  assert.match(s, /title/i);
  assert.match(s, /Conventional Commits?/i);
  assert.match(s, /type\(scope\)?: |<type>/i);
  assert.match(s, /CI/);
  assert.match(s, /must pass|has to pass|passing/i);
  assert.match(s, /before (you )?merg/i);
});

test('every command in the README is one that works in a fresh checkout', async () => {
  const md = await readme();
  const allowed = [
    /^git clone https:\/\/github\.com\/rock-ai-bot\/oe-bench(\.git)?$/,
    /^cd oe-bench$/,
    /^npm test$/,
    /^python3 -m http\.server \d+( --bind 127\.0\.0\.1)?$/,
    /^git (checkout|switch) -b \S+$/,
  ];
  const lines = codeBlocks(md).flatMap((b) => b.split('\n')).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  assert.ok(lines.length > 0, 'README has command code blocks');
  for (const line of lines) {
    assert.ok(allowed.some((re) => re.test(line)), `unverified command in README: ${line}`);
  }
});

test('files the README refers to exist', async () => {
  const md = await readme();
  for (const file of ['index.html', '.github/workflows/pages.yml', '.github/workflows/release.yml', '.github/workflows/test.yml', '.github/workflows/commits.yml']) {
    if (md.includes(file)) assert.ok(existsSync(new URL(file, root)), `${file} is mentioned but missing`);
  }
});
