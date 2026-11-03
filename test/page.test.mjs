import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('the page has a Calculator heading', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const headings = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].trim());
  assert.deepEqual(headings, ['Calculator']);
});

test('the page is plain static files that need no server or build', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.doesNotMatch(html, /(src|href)="\//, 'asset paths must be relative so the page works under /<repository>/');
});
