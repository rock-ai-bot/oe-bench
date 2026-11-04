import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadPage } from './support/load-page.mjs';
import { loadStyles, px } from './support/styles.mjs';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const OPERATORS = ['+', '-', '×', '÷', '='];

async function styled() {
  const page = await loadPage();
  const styles = await loadStyles(page.document);
  const button = (label) => {
    const found = page.document.querySelectorAll('button').filter((b) => b.textContent.trim() === label);
    assert.equal(found.length, 1, `expected one "${label}" button`);
    return found[0];
  };
  const keysBox = page.document.getElementById('keys');
  const displayBox = page.document.getElementById('display');
  return { page, styles, button, keysBox, displayBox };
}

const colour = (s, node) => s.styles.value(node, 'background-color', 'background')?.toLowerCase();

test('the page has styling rules for the calculator', async () => {
  const { styles } = await styled();
  assert.ok(styles.ruleCount > 0, 'index.html (or a stylesheet it links) has no CSS rules');
});

test('the page sets a viewport for phones', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<meta[^>]+name="viewport"[^>]+width=device-width/i);
});

test('the calculator is centred on the page', async () => {
  const { styles, displayBox } = await styled();
  const chain = [];
  for (let n = displayBox.parent; n; n = n.parent) if (n.tag && n.tag !== '#document') chain.push(n);
  const centred = chain.some((n) => {
    const margin = styles.value(n, 'margin') ?? '';
    const autoMargins = /auto/.test(margin) || styles.value(n, 'margin-left') === 'auto';
    const box = styles.value(n, 'display');
    const flexCentred = /flex|grid/.test(box ?? '') &&
      [styles.value(n, 'justify-content'), styles.value(n, 'justify-items'), styles.value(n, 'align-items'), styles.value(n, 'place-items')]
        .some((v) => /center/.test(v ?? ''));
    return (autoMargins && styles.value(n, 'max-width') !== undefined) || flexCentred;
  });
  assert.ok(centred, 'no element around the display centres it (auto margins with a max-width, or flex/grid centring)');
});

test('the display stands out from the keys', async () => {
  const s = await styled();
  const displayBg = colour(s, s.displayBox);
  assert.ok(displayBg, 'the display has no background colour');
  assert.notEqual(displayBg, colour(s, s.button('7')), 'the display looks the same as a key');
  const displaySize = px(s.styles.value(s.displayBox, 'font-size'));
  const keySize = px(s.styles.value(s.button('7'), 'font-size')) ?? 16;
  assert.ok(displaySize > keySize, 'the display text is not larger than the key text');
});

test('digits, operators and C each have their own colour', async () => {
  const s = await styled();
  const digitColours = new Set(DIGITS.map((d) => colour(s, s.button(d))));
  const operatorColours = new Set(OPERATORS.map((o) => colour(s, s.button(o))));
  const clear = colour(s, s.button('C'));
  assert.equal(digitColours.size, 1, 'all digits should share one colour');
  assert.equal(operatorColours.size, 1, 'all operators (+ - × ÷ =) should share one colour');
  const [digit] = digitColours;
  const [operator] = operatorColours;
  assert.ok(digit && operator && clear, 'digits, operators and C must all have a background colour');
  assert.equal(new Set([digit, operator, clear]).size, 3, 'digits, operators and C must be three different colours');
});

test('the keys are laid out as a grid of four columns', async () => {
  const s = await styled();
  assert.equal(s.styles.value(s.keysBox, 'display'), 'grid');
  const columns = s.styles.value(s.keysBox, 'grid-template-columns') ?? '';
  const count = /repeat\(\s*(\d+)/.exec(columns)?.[1] ?? columns.trim().split(/\s+/).length;
  assert.equal(Number(count), 4);
});

test('the operators sit together in the fourth column, the digits do not', async () => {
  const s = await styled();
  const column = (label) => (s.styles.value(s.button(label), 'grid-column') ?? '').trim();
  for (const o of OPERATORS) assert.match(column(o), /^4(\s*\/.*)?$/, `${o} is not placed in column 4`);
  for (const d of DIGITS) assert.doesNotMatch(column(d), /^4(\s*\/.*)?$/, `${d} must not be in the operator column`);
});

test('the keys are large enough to press on a phone', async () => {
  const s = await styled();
  for (const label of s.page.buttonLabels()) {
    const height = px(s.styles.value(s.button(label), 'min-height', 'height'));
    assert.ok(height >= 44, `the ${label} key is under 44px tall`);
  }
});

test('nothing is fixed wider than a narrow phone screen', async () => {
  const s = await styled();
  const columns = s.styles.value(s.keysBox, 'grid-template-columns') ?? '';
  assert.match(columns, /fr|%|minmax/, 'key columns must flex with the screen width');
  for (const width of s.styles.pixelWidths()) assert.ok(width <= 320, `a fixed width of ${width}px runs off a 320px screen`);
});

test('the heading and every key label are unchanged', async () => {
  const { page } = await styled();
  assert.deepEqual(page.buttonLabels(), [
    '7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'C', '±', '+', '-', '×', '÷', '=',
  ]);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<h1[^>]*>\s*Calculator\s*<\/h1>/);
});

test('the keys still work: 7 + 8 = shows 15', async () => {
  const { page } = await styled();
  for (const key of ['7', '+', '8', '=']) page.press(key);
  assert.equal(page.display(), '15');
});
