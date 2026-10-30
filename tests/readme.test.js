const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function readme() {
  const file = path.join(root, 'README.md');
  assert.ok(fs.existsSync(file), 'README.md exists');
  return fs.readFileSync(file, 'utf8');
}

// The body of the first "##" section whose heading matches `heading`.
function section(heading) {
  const text = readme();
  const parts = text.split(/^##\s+/m).slice(1);
  const found = parts.find((p) => heading.test(p.split('\n')[0]));
  assert.ok(found, `README.md has a section whose heading matches ${heading}`);
  return found;
}

function commands(text) {
  const blocks = [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  return blocks.flatMap((b) => b.split('\n')).map((l) => l.replace(/^\$\s*/, '').trim()).filter(Boolean);
}

test('the README says what the project is and where the calculator is published', () => {
  const text = readme();
  const intro = text.split(/^##\s+/m)[0];
  assert.match(intro, /^#\s+\S/m, 'README has a title');
  assert.match(intro, /calculator/i, 'the intro says it is a calculator');
  assert.match(
    text,
    /https:\/\/rock-ai-bot\.github\.io\/oe-bench\/?/,
    'README gives the published address',
  );
});

test('the README explains how to run the calculator on your own computer', () => {
  const body = section(/run.*(calculator|locally|computer)|get(ting)? started/i);
  assert.ok(commands(body).length > 0, 'the section gives exact commands in a code block');
  assert.match(body, /index\.html/, 'the section names the page to open');
});

test('the README explains how to run the tests with one command', () => {
  const body = section(/test/i);
  assert.ok(commands(body).includes('npm test'), 'the section gives `npm test` in a code block');
  assert.match(body, /npm ci/, 'the section says to install dependencies first with `npm ci`');
});

test('the README explains how the calculator is published and released', () => {
  const body = section(/publish|release/i);
  const dir = path.join(root, '.github', 'workflows');
  for (const f of ['pages.yml', 'release.yml', 'test.yml', 'commit-format.yml']) {
    assert.ok(fs.existsSync(path.join(dir, f)), `${f} exists`);
  }
  assert.match(body, /GitHub Pages|Pages/, 'mentions publishing to GitHub Pages');
  assert.match(body, /semantic-release|release/i, 'mentions releases');
  assert.match(body, /CHANGELOG\.md|changelog/i, 'mentions the changelog');
  assert.match(body, /\bmain\b/, 'says the workflows run on pushes to main');
});

test('the README explains how to change the calculator', () => {
  const body = section(/chang|contribut/i);
  assert.match(body, /pull request/i, 'mentions pull requests');
  assert.match(body, /Conventional Commit|commit message format|commit format/i, 'says titles follow the commit message format');
  assert.match(body, /feat|fix/, 'gives example types such as feat or fix');
  assert.match(body, /CI|checks?/, 'says CI must pass');
  assert.match(body, /merg/i, 'says CI must pass before merging');
});

test('every command in the README works in a fresh checkout', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const cmds = commands(readme());
  assert.ok(cmds.length > 0, 'README has commands');
  const allowed = [/^npm ci$/, /^npm test$/, /^npm run (\S+)$/, /^git clone \S+$/, /^cd \S+$/, /^(open|xdg-open|start) index\.html$/];
  for (const c of cmds) {
    assert.ok(allowed.some((re) => re.test(c)), `unrecognised command: ${c}`);
    const run = c.match(/^npm run (\S+)$/);
    if (run) assert.ok(pkg.scripts[run[1]], `package.json has the script ${run[1]}`);
  }
  assert.ok(cmds.some((c) => /^git clone https:\/\/github\.com\/rock-ai-bot\/oe-bench(\.git)?$/.test(c)), 'shows how to clone the repo');
});
