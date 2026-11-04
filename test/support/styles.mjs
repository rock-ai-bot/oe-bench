// Reads the page's CSS (<style> elements and linked stylesheets) and works out
// the value a property ends up with on an element, from the page's own rules
// outside any @media block. Pseudo-classes and pseudo-elements are ignored.
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

function parseRules(css) {
  const rules = [];
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  let start = 0;
  let head = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) head = text.slice(start, i).trim();
      depth++;
      if (depth === 1) start = i + 1;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        const body = text.slice(start, i);
        if (!head.startsWith('@')) rules.push({ selector: head, body });
        start = i + 1;
      }
    }
  }
  return rules;
}

function declarations(body) {
  const out = {};
  for (const part of body.split(';')) {
    const at = part.indexOf(':');
    if (at === -1) continue;
    out[part.slice(0, at).trim().toLowerCase()] = part.slice(at + 1).replace(/!important/i, '').trim();
  }
  return out;
}

function specificity(selector) {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length;
  const classes = (selector.match(/\.[\w-]+|\[[^\]]*\]/g) ?? []).length;
  const tags = (selector.replace(/\[[^\]]*\]/g, '').match(/(^|[\s>+~])[a-z][\w-]*/gi) ?? []).length;
  return ids * 100 + classes * 10 + tags;
}

export async function loadStyles(document) {
  const sources = [];
  for (const node of document.all()) {
    if (node.tag === 'style') sources.push(node.textContent);
    if (node.tag === 'link' && /stylesheet/i.test(node.attrs.rel ?? '') && node.attrs.href) {
      sources.push(await readFile(new URL(node.attrs.href, root), 'utf8'));
    }
  }
  const matched = [];
  let order = 0;
  for (const css of sources) {
    for (const rule of parseRules(css)) {
      const decls = declarations(rule.body);
      for (const raw of rule.selector.split(',')) {
        const selector = raw.trim().replace(/\s*>\s*/g, ' ');
        if (!selector || /[:*+~]/.test(selector)) continue;
        let nodes;
        try { nodes = document.querySelectorAll(selector); } catch { continue; }
        matched.push({ nodes, decls, weight: specificity(selector), order: order++ });
      }
    }
  }
  matched.sort((a, b) => a.weight - b.weight || a.order - b.order);
  return {
    ruleCount: matched.length,
    // The winning value of the first of `properties` that any rule sets on `node`.
    value(node, ...properties) {
      for (const property of properties) {
        let found;
        for (const rule of matched) {
          if (rule.nodes.includes(node) && property in rule.decls) found = rule.decls[property];
        }
        if (found !== undefined) return found;
      }
      return undefined;
    },
    // Every width-like pixel value set anywhere in the page's own rules.
    pixelWidths() {
      return matched.flatMap((r) => ['width', 'min-width']
        .map((p) => r.decls[p]).filter((v) => v !== undefined)
        .map((v) => /^(\d+(?:\.\d+)?)px$/.exec(v)?.[1]).filter(Boolean).map(Number));
    },
  };
}

// A length in pixels, taking 1rem and 1em as 16px; undefined if it is not a plain length.
export function px(value) {
  const m = /^(\d+(?:\.\d+)?)(px|rem|em)$/.exec(value ?? '');
  if (!m) return undefined;
  return m[2] === 'px' ? Number(m[1]) : Number(m[1]) * 16;
}
