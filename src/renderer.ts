// SolidJS universal renderer that mirrors the node tree in JS and streams
// mutations to the engine as batched ops (see the engine's host API docs).
import { createRenderer } from "solid-js/universal";
import { host, on } from "./host";

export interface VNode {
  id: number;
  tag: string;
  parent: VNode | null;
  children: VNode[];
  text?: string;
  handlers?: Record<string, (e: PointerEventData) => void>;
}

export interface PointerEventData {
  type: string;
  /** Pointer position in widget coordinates (DIPs). */
  x: number;
  y: number;
  deltaY?: number;
  button?: number;
  target: number;
  stopPropagation(): void;
}

type Op = [number, ...unknown[]];
let queue: Op[] = [];
let scheduled = false;
let nextId = 1;

/** Sends queued mutations to the engine. Called automatically on a microtask. */
export function flush() {
  scheduled = false;
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  host.ops(JSON.stringify(batch));
}

function push(op: Op) {
  queue.push(op);
  if (!scheduled) {
    scheduled = true;
    Promise.resolve().then(flush);
  }
}

export const root: VNode = { id: 0, tag: "root", parent: null, children: [] };

const byId = new Map<number, WeakRef<VNode>>();
const finalizer =
  typeof FinalizationRegistry !== "undefined"
    ? new FinalizationRegistry<number>((id) => {
        byId.delete(id);
        push([5, id]);
      })
    : null;

function make(tag: string): VNode {
  const node: VNode = { id: nextId++, tag, parent: null, children: [] };
  if (typeof WeakRef !== "undefined") byId.set(node.id, new WeakRef(node));
  finalizer?.register(node, node.id);
  push([0, node.id, tag]);
  return node;
}

function serialize(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  const t = typeof v;
  if (t === "string" || t === "boolean") return v;
  if (t === "number") return Number.isFinite(v as number) ? v : null;
  if (Array.isArray(v)) return v.map(serialize);
  if (t === "object") {
    const out: Record<string, unknown> = {};
    for (const k in v as object) {
      const s = serialize((v as any)[k]);
      if (s !== null) out[k] = s;
    }
    return out;
  }
  return null;
}

const renderer = createRenderer<VNode>({
  createElement: make,
  createTextNode(value: string) {
    const node = make("#text");
    node.text = String(value);
    push([2, node.id, node.text]);
    return node;
  },
  replaceText(node, value) {
    node.text = String(value);
    push([2, node.id, node.text]);
  },
  isTextNode(node) {
    return node.tag === "#text";
  },
  setProperty(node, name, value) {
    if (name === "ref" || name === "children") return;
    if (name.length > 2 && name.startsWith("on") && name[2] === name[2].toUpperCase()) {
      const type = name.slice(2).toLowerCase();
      (node.handlers ??= {})[type] = value as any;
      push([1, node.id, name, typeof value === "function"]);
      return;
    }
    push([1, node.id, name, serialize(value)]);
  },
  insertNode(parent, node, anchor) {
    if (node.parent) {
      const siblings = node.parent.children;
      const i = siblings.indexOf(node);
      if (i >= 0) siblings.splice(i, 1);
    }
    node.parent = parent;
    const kids = parent.children;
    const at = anchor ? kids.indexOf(anchor) : -1;
    if (at >= 0) kids.splice(at, 0, node);
    else kids.push(node);
    push([3, parent.id, node.id, at >= 0 ? anchor!.id : -1]);
  },
  removeNode(parent, node) {
    const kids = parent.children;
    const i = kids.indexOf(node);
    if (i >= 0) kids.splice(i, 1);
    node.parent = null;
    push([4, parent.id, node.id]);
  },
  getParentNode(node) {
    return node.parent ?? undefined;
  },
  getFirstChild(node) {
    return node.children[0];
  },
  getNextSibling(node) {
    const p = node.parent;
    if (!p) return undefined;
    return p.children[p.children.indexOf(node) + 1];
  },
});

export const {
  render,
  effect,
  memo,
  createComponent,
  createElement,
  createTextNode,
  insertNode,
  insert,
  spread,
  setProp,
  mergeProps,
  use,
} = renderer;

// Pointer events from the engine, bubbled through the JS mirror tree.
on("pointer", (e: { type: string; target: number; x: number; y: number; deltaY?: number; button?: number }) => {
  let node = byId.get(e.target)?.deref() ?? null;
  let stopped = false;
  const event: PointerEventData = { ...e, stopPropagation: () => (stopped = true) };
  while (node && !stopped) {
    const h = node.handlers?.[e.type];
    if (h) h(event);
    node = node.parent;
  }
});
