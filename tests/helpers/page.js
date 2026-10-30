// A tiny stand-in for a browser, so the tests can load index.html fresh, run
// its scripts and click its buttons using only Node's built-in modules.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');
const VOID = new Set(['meta', 'br', 'input', 'img', 'link', 'hr', 'base', 'col', 'area', 'source', 'wbr']);
const RAW = new Set(['script', 'style', 'title', 'textarea']);
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

const decode = (s) => s.replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m]);

class Node {
  constructor() {
    this.parent = null;
  }
}

class Text extends Node {
  constructor(data) {
    super();
    this.nodeType = 3;
    this.data = data;
  }
  get textContent() {
    return this.data;
  }
}

class Element extends Node {
  constructor(tag, attrs = {}) {
    super();
    this.nodeType = 1;
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.ownerDocument = null;
  }
  get id() {
    return this.attrs.id || '';
  }
  get className() {
    return this.attrs.class || '';
  }
  get value() {
    return this.attrs.value || '';
  }
  set value(v) {
    this.attrs.value = String(v);
  }
  get childNodes() {
    return this.children;
  }
  get textContent() {
    return this.children.map((c) => c.textContent).join('');
  }
  set textContent(v) {
    this.children = [];
    if (v !== '') this.appendChild(new Text(String(v)));
  }
  get innerText() {
    return this.textContent;
  }
  set innerText(v) {
    this.textContent = v;
  }
  set innerHTML(html) {
    this.children = [];
    parseInto(this, String(html));
  }
  get innerHTML() {
    return this.textContent;
  }
  appendChild(node) {
    node.parent = this;
    this.children.push(node);
    return node;
  }
  getAttribute(name) {
    return name in this.attrs ? this.attrs[name] : null;
  }
  setAttribute(name, value) {
    this.attrs[name] = String(value);
  }
  hasAttribute(name) {
    return name in this.attrs;
  }
  addEventListener(type, fn) {
    (this.listeners[type] = this.listeners[type] || []).push(fn);
  }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
  }
  dispatchEvent(event) {
    event.target = event.target || this;
    for (let el = this; el; el = el.parent) {
      if (!(el instanceof Element)) break;
      event.currentTarget = el;
      for (const fn of [...(el.listeners[event.type] || [])]) fn.call(el, event);
      const inline = el.attrs['on' + event.type];
      if (inline) new Function('event', inline).call(el, event);
      if (event.stopped || !event.bubbles) break;
    }
    return true;
  }
  click() {
    return this.dispatchEvent({
      type: 'click',
      bubbles: true,
      preventDefault() {},
      stopPropagation() {
        this.stopped = true;
      },
    });
  }
  get descendants() {
    return this.children.flatMap((c) => (c instanceof Element ? [c, ...c.descendants] : []));
  }
  closest(sel) {
    for (let el = this; el instanceof Element; el = el.parent) if (matches(el, sel)) return el;
    return null;
  }
  contains(other) {
    for (let el = other; el; el = el.parent) if (el === this) return true;
    return false;
  }
  querySelectorAll(sel) {
    return this.descendants.filter((el) => matches(el, sel));
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
}

function matches(el, selectorList) {
  return selectorList.split(',').some((raw) => {
    const sel = raw.trim();
    const re = /^([a-zA-Z][\w-]*)?((?:[#.][\w-]+|\[[\w-]+(?:=["']?[^\]"']*["']?)?\])*)$/;
    const m = sel.match(re);
    if (!m) return false;
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    for (const part of m[2].match(/[#.][\w-]+|\[[^\]]+\]/g) || []) {
      if (part[0] === '#' && el.id !== part.slice(1)) return false;
      if (part[0] === '.' && !el.className.split(/\s+/).includes(part.slice(1))) return false;
      if (part[0] === '[') {
        const [, name, value] = part.match(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/);
        if (!el.hasAttribute(name) || (value !== undefined && el.attrs[name] !== value)) return false;
      }
    }
    return true;
  });
}

function parseAttrs(s) {
  const attrs = {};
  const re = /([^\s=\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(s))) attrs[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
}

function parseInto(parent, html) {
  const stack = [parent];
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+|<)/gi;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[1]) {
      const i = stack.map((e) => e.tagName).lastIndexOf(m[1].toUpperCase());
      if (i > 0) stack.length = i;
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      const el = new Element(tag, parseAttrs(m[3].replace(/\/\s*$/, '')));
      top.appendChild(el);
      if (RAW.has(tag)) {
        const end = html.toLowerCase().indexOf('</' + tag, re.lastIndex);
        const stop = end === -1 ? html.length : end;
        const body = html.slice(re.lastIndex, stop);
        if (body) el.appendChild(new Text(tag === 'script' || tag === 'style' ? body : decode(body)));
        re.lastIndex = stop;
      } else if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) {
        stack.push(el);
      }
    } else if (m[4]) {
      top.appendChild(new Text(decode(m[4])));
    }
  }
}

// Load index.html as a browser would on a fresh visit: a new page, new state.
function loadPage() {
  const file = path.join(root, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const documentElement = new Element('html');
  parseInto(documentElement, html);

  const listeners = {};
  const document = {
    documentElement,
    readyState: 'loading',
    get body() {
      return documentElement.querySelector('body');
    },
    get head() {
      return documentElement.querySelector('head');
    },
    getElementById: (id) => documentElement.querySelector('#' + id),
    querySelector: (s) => documentElement.querySelector(s),
    querySelectorAll: (s) => documentElement.querySelectorAll(s),
    createElement: (tag) => new Element(tag),
    createTextNode: (t) => new Text(t),
    addEventListener(type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    removeEventListener() {},
  };
  const window = { document, console, setTimeout, clearTimeout, setInterval, clearInterval };
  window.window = window.self = window.globalThis = window;
  window.addEventListener = (type, fn) => document.addEventListener('w:' + type, fn);
  window.removeEventListener = () => {};
  window.location = { href: pathToFileURL(file) };
  const context = vm.createContext(window);

  for (const script of documentElement.querySelectorAll('script')) {
    const type = script.attrs.type;
    if (type && !/javascript|module/i.test(type)) continue;
    const code = script.attrs.src
      ? fs.readFileSync(path.join(root, script.attrs.src), 'utf8')
      : script.textContent;
    vm.runInContext(code, context, { filename: script.attrs.src || 'index.html' });
  }

  document.readyState = 'interactive';
  for (const fn of listeners.DOMContentLoaded || []) fn({ type: 'DOMContentLoaded' });
  document.readyState = 'complete';
  for (const fn of listeners.load || []) fn({ type: 'load' });
  for (const fn of listeners['w:load'] || []) fn({ type: 'load' });
  return new Page(document);
}

function pathToFileURL(p) {
  return require('node:url').pathToFileURL(p).href;
}

const IGNORED = new Set(['H1', 'BUTTON', 'SCRIPT', 'STYLE', 'TITLE']);

class Page {
  constructor(document) {
    this.document = document;
  }

  buttons() {
    return this.document.querySelectorAll('button');
  }

  button(label) {
    const found = this.buttons().filter((b) => b.textContent === label);
    if (found.length !== 1) {
      throw new assert.AssertionError({
        message: `expected exactly one button labelled "${label}", found ${found.length}`,
      });
    }
    return found[0];
  }

  press(...labels) {
    for (const label of labels) this.button(label).click();
  }

  // Every piece of visible text outside the heading and the buttons.
  displayTexts() {
    const out = [];
    const walk = (el) => {
      if (IGNORED.has(el.tagName)) return;
      for (const child of el.children) {
        if (child instanceof Text) {
          if (child.data.trim() !== '') out.push({ el, text: el.textContent });
        } else {
          walk(child);
        }
      }
    };
    walk(this.document.body);
    return out.filter((t, i) => out.findIndex((u) => u.el === t.el) === i);
  }

  // The display's exact text: not trimmed, so extra spaces or text show up.
  display() {
    const texts = this.displayTexts();
    if (texts.length !== 1) {
      throw new assert.AssertionError({
        message: `expected one visible-text display, found ${texts.length}`,
      });
    }
    return texts[0].text;
  }

  displayElement() {
    return this.displayTexts()[0] && this.displayTexts()[0].el;
  }
}

const assert = require('node:assert');

module.exports = { loadPage };
