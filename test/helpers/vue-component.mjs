import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { compileScript, parse } from '@vue/compiler-sfc';
import ts from 'typescript';
import * as vue from 'vue';
import * as content from '../../packages/content-core/src/index.js';

const root = fileURLToPath(new URL('../../', import.meta.url));

// Compile the real SFC scripts and templates, then mount them with a small host
// renderer. Only uni-app lifecycle/network boundaries are supplied by each test.
export function componentHarness(mocks = {}, globals = {}) {
  const cache = new Map();
  const context = vm.createContext({ console, ...globals });
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    let source = readFileSync(filename, 'utf8');
    if (filename.endsWith('.vue')) {
      const isCustomElement = (tag) => /^[a-z]/.test(tag);
      const { descriptor, errors } = parse(source, { filename, templateParseOptions: { isCustomElement } });
      assert.deepEqual(errors, []);
      source = compileScript(descriptor, {
        id: filename,
        inlineTemplate: true,
        templateOptions: { compilerOptions: { isCustomElement } }
      }).content;
    }
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    const require = (id) => {
      if (id in mocks) return mocks[id];
      if (id === 'vue') return vue;
      if (id === '@vquan/content-core') return content;
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), /\.[cm]?[jt]s$|\.vue$/.test(id) ? id : `${id}.ts`));
      throw new Error(`Unexpected component import ${id}`);
    };
    vm.runInContext(`(function(require,module,exports){${code}\n})`, context, { filename })(require, module, module.exports);
    return module.exports;
  }

  function node(tag, text = '') {
    return { tag, text, children: [], parent: null, props: {}, listeners: {}, value: '',
      addEventListener(name, handler) { (this.listeners[name] ??= []).push(handler); }
    };
  }
  function remove(child) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = null;
  }
  const renderer = vue.createRenderer({
    createElement: node, createText: (text) => node('#text', text), createComment: (text) => node('#comment', text),
    insert(child, parent, anchor) {
      remove(child);
      child.parent = parent;
      const index = anchor ? parent.children.indexOf(anchor) : -1;
      parent.children.splice(index < 0 ? parent.children.length : index, 0, child);
    },
    remove,
    setText: (child, value) => { child.text = value; },
    setElementText: (child, value) => { child.text = value; child.children = []; },
    patchProp: (child, key, oldValue, value) => { child.props[key] = value; },
    parentNode: (child) => child.parent,
    nextSibling: (child) => child.parent?.children[child.parent.children.indexOf(child) + 1] ?? null
  });

  function mount(filename, props = {}) {
    const container = node('root');
    const app = renderer.createApp(load(filename).default, props);
    app.mount(container);
    function all(predicate, parent = container) {
      return parent.children.flatMap((child) => [...(predicate(child) ? [child] : []), ...all(predicate, child)]);
    }
    function find(predicate) { const match = all(predicate)[0]; assert.ok(match, 'Expected a matching rendered element'); return match; }
    async function fire(target, name, detail = {}, native = {}) {
      const event = { ...native, detail, target, stopPropagation() {}, preventDefault() {} };
      const handler = target.props[`on${name[0].toUpperCase()}${name.slice(1)}`];
      for (const fn of Array.isArray(handler) ? handler : handler ? [handler] : []) fn(event);
      for (const fn of target.listeners[name] ?? []) fn(event);
      await vue.nextTick();
    }
    return { all, find, fire, close: () => app.unmount() };
  }
  return { load, mount };
}

export const hasClass = (name) => (node) => (node.props.class ?? '').split(' ').includes(name);
