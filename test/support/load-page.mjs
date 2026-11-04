// Loads index.html the way a browser would, in a tiny DOM, so tests can press
// the page's buttons and read what it shows. Each call is a freshly loaded page.
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const VOID = new Set(['meta', 'link', 'br', 'hr', 'img', 'input']);

class Node {
  constructor(tag, attrs = {}) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = [];
    this.parent = null;
    this.listeners = {};
  }
  get textContent() {
    return this.children.map((c) => (typeof c === 'string' ? c : c.textContent)).join('');
  }
  set textContent(value) {
    this.children = [String(value)];
  }
  get innerText() { return this.textContent; }
  set innerText(value) { this.textContent = value; }
  get id() { return this.attrs.id ?? ''; }
  get className() { return this.attrs.class ?? ''; }
  get value() { return this.attrs.value ?? ''; }
  get dataset() {
    const out = {};
    for (const [k, v] of Object.entries(this.attrs)) {
      if (k.startsWith('data-')) out[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = v;
    }
    return out;
  }
  get classList() {
    const node = this;
    const list = () => node.className.split(/\s+/).filter(Boolean);
    return { contains: (c) => list().includes(c) };
  }
  getAttribute(name) { return this.attrs[name] ?? null; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  appendChild(child) {
    if (typeof child !== 'string') child.parent = this;
    this.children.push(child);
    return child;
  }
  get elements() { return this.children.filter((c) => typeof c !== 'string'); }
  all() { return this.elements.flatMap((c) => [c, ...c.all()]); }
  matches(selector) {
    return selector.split(',').some((part) => matchesCompound(this, part.trim()));
  }
  closest(selector) {
    for (let n = this; n; n = n.parent) if (n.tag && n.matches(selector)) return n;
    return null;
  }
  querySelectorAll(selector) {
    return this.all().filter((n) =>
      selector.split(',').some((part) => matchesChain(n, part.trim().split(/\s+/), this)));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== fn);
  }
  dispatchEvent(event) {
    event.target ??= this;
    for (let n = this; n; n = n.parent) {
      event.currentTarget = n;
      for (const fn of [...(n.listeners[event.type] ?? [])]) fn.call(n, event);
      const inline = n.attrs?.['on' + event.type];
      if (inline && n.runInline) n.runInline(inline, event);
      if (!event.bubbles || event.cancelBubble) break;
    }
    return true;
  }
  click() {
    this.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() { this.cancelBubble = true; } });
  }
}

function matchesCompound(node, sel) {
  if (!node.tag) return false;
  const re = /^([a-z][\w-]*)?|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/gi;
  let rest = sel;
  while (rest) {
    re.lastIndex = 0;
    const m = re.exec(rest);
    if (!m || m[0] === '') return false;
    const [, tag, id, cls, attr, val] = m;
    if (tag && tag !== node.tag) return false;
    if (id && node.id !== id) return false;
    if (cls && !node.classList.contains(cls)) return false;
    if (attr && (node.attrs[attr] === undefined || (val !== undefined && node.attrs[attr] !== val))) return false;
    rest = rest.slice(m[0].length);
  }
  return true;
}

function matchesChain(node, chain, scope) {
  if (!matchesCompound(node, chain.at(-1))) return false;
  if (chain.length === 1) return true;
  for (let p = node.parent; p && p !== scope.parent; p = p.parent) {
    if (matchesChain(p, chain.slice(0, -1), scope)) return true;
  }
  return false;
}

function parse(html) {
  const doc = new Node('#document');
  const stack = [doc];
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-z][\w-]*)\s*>|<([a-z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|([^<]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const top = stack.at(-1);
    if (m[1]) {
      const i = stack.findLastIndex((n) => n.tag === m[1].toLowerCase());
      if (i > 0) stack.length = i;
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      const attrs = {};
      for (const a of m[3].matchAll(/([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
      }
      const node = new Node(tag, attrs);
      top.appendChild(node);
      if (tag === 'script' || tag === 'style') {
        const end = html.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
        node.appendChild(html.slice(re.lastIndex, end));
        re.lastIndex = html.indexOf('>', end) + 1;
      } else if (!VOID.has(tag) && !m[0].endsWith('/>')) {
        stack.push(node);
      }
    } else if (m[4]) {
      top.appendChild(m[4]);
    }
  }
  return doc;
}

export async function loadPage() {
  const html = await readFile(new URL('index.html', root), 'utf8');
  const doc = parse(html);
  const body = doc.querySelector('body');
  const document = Object.assign(doc, {
    body,
    readyState: 'loading',
    getElementById: (id) => doc.all().find((n) => n.id === id) ?? null,
    createElement: (tag) => new Node(tag.toLowerCase()),
    createTextNode: (text) => String(text),
  });
  const window = { document, addEventListener: (...a) => document.addEventListener(...a) };
  Object.assign(window, { window, self: window, globalThis: window, console });
  const context = vm.createContext(Object.assign(window, { document }));

  for (const script of doc.querySelectorAll('script')) {
    const type = script.attrs.type;
    if (type && type !== 'text/javascript') continue;
    const code = script.attrs.src
      ? await readFile(new URL(script.attrs.src, root), 'utf8')
      : script.textContent;
    vm.runInContext(code, context, { filename: script.attrs.src ?? 'index.html' });
  }
  document.readyState = 'interactive';
  document.dispatchEvent({ type: 'DOMContentLoaded', bubbles: false });
  document.readyState = 'complete';
  window.dispatchEvent?.({ type: 'load' });

  const ignored = new Set(['h1', 'button', 'script', 'style', 'title']);
  const buttons = () => body.querySelectorAll('button');

  return {
    // Press the button labelled exactly `label`, as a user would click it.
    press(label) {
      const matching = buttons().filter((b) => b.textContent.trim() === label);
      assert(matching.length === 1, `expected exactly one button labelled "${label}", found ${matching.length}`);
      matching[0].click();
    },
    // The visible text of the display: the one non-button, non-heading element holding text.
    // Returned exactly as the page renders it, so stray spaces or text show up.
    display() {
      const holders = body.all().filter((n) =>
        !ignored.has(n.tag) && !n.closest('button') && !n.closest('h1') &&
        n.children.some((c) => typeof c === 'string' && c.trim() !== ''));
      assert(holders.length === 1, `expected one display with visible text, found ${holders.length}`);
      return holders[0].textContent;
    },
    buttonLabels: () => buttons().map((b) => b.textContent.trim()),
  };
}

function assert(ok, message) {
  if (!ok) throw new Error(message);
}
