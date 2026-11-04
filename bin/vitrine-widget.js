#!/usr/bin/env node
// vitrine-widget — build, pack and scaffold Vitrine widget packages.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";
import { buildWidget } from "../vite.js";

const sdkRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [, , command, ...rest] = process.argv;
const flags = Object.fromEntries(
  rest.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? true];
  }),
);
const positional = rest.filter((a) => !a.startsWith("--"));

function fail(msg) {
  console.error(`vitrine-widget: ${msg}`);
  process.exit(1);
}

function readManifest(root) {
  const file = join(root, "vitrine.json");
  if (!existsSync(file)) fail(`no vitrine.json in ${root}`);
  let m;
  try {
    m = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`vitrine.json: ${e.message}`);
  }
  if (!/^[a-z0-9]+(\.[a-z0-9-]+)+$/.test(m.id ?? "")) fail("vitrine.json: id must be reverse-DNS, e.g. dev.you.clocks");
  if (!/^\d+\.\d+\.\d+/.test(m.version ?? "")) fail("vitrine.json: version must be semver");
  if (!Array.isArray(m.widgets) || m.widgets.length === 0) fail("vitrine.json: widgets must be a non-empty array");
  for (const w of m.widgets) {
    if (!/^[a-z0-9-]+$/.test(w.id ?? "")) fail(`widget id "${w.id}" must match [a-z0-9-]+`);
    if (!w.entry || !existsSync(join(root, w.entry))) fail(`widget "${w.id}": entry ${w.entry} not found`);
  }
  const tag = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
  const ids = new Set(m.widgets.map((w) => w.id));
  for (const [lang, l] of Object.entries(m.locales ?? {})) {
    if (!tag.test(lang)) fail(`vitrine.json: locales: invalid language tag "${lang}"`);
    for (const id of Object.keys(l?.widgets ?? {})) {
      if (!ids.has(id)) fail(`vitrine.json: locales.${lang}: unknown widget "${id}"`);
    }
  }
  return m;
}

function copyInto(root, out, rel) {
  if (!rel) return;
  const src = join(root, rel);
  if (!existsSync(src)) fail(`missing file referenced by vitrine.json: ${rel}`);
  const dst = join(out, rel);
  mkdirSync(dirname(dst), { recursive: true });
  cpSync(src, dst);
}

async function build(root, { watch = false } = {}) {
  const m = readManifest(root);
  const out = join(root, "dist");
  if (!watch) rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const outManifest = { ...m, widgets: [] };
  for (const w of m.widgets) {
    const outDir = join(out, "widgets", w.id);
    console.log(`building ${m.id}/${w.id} …`);
    await buildWidget({ root, entry: w.entry, outDir, watch, minify: !flags["no-minify"] });
    copyInto(root, out, w.settings);
    copyInto(root, out, w.preview);
    outManifest.widgets.push({ ...w, entry: `widgets/${w.id}/index.js` });
  }
  for (const f of m.fonts ?? []) copyInto(root, out, f);
  if (typeof m.icon === "string") copyInto(root, out, m.icon);
  for (const f of ["README.md", "LICENSE", "icon.png"]) if (existsSync(join(root, f))) cpSync(join(root, f), join(out, f));
  writeFileSync(join(out, "vitrine.json"), JSON.stringify(outManifest, null, 2));
  return { manifest: m, out };
}

function listFiles(dir, base = dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files.push(...listFiles(p, base));
    else files.push(relative(base, p).split(sep).join("/"));
  }
  return files;
}

async function pack(root) {
  const { manifest, out } = await build(root);
  const entries = {};
  for (const f of listFiles(out)) entries[f] = readFileSync(join(out, f));
  const name = `${manifest.id.split(".").pop()}-${manifest.version}.vitrine`;
  const file = join(root, name);
  writeFileSync(file, zipSync(entries, { level: 9 }));
  console.log(`packed ${relative(process.cwd(), file) || name} (${Object.keys(entries).length} files)`);
}

function create(dir) {
  if (!dir) fail("usage: vitrine-widget create <folder> [--id=dev.you.widgets]");
  const target = resolve(dir);
  if (existsSync(target) && readdirSync(target).length > 0) fail(`${target} is not empty`);
  cpSync(join(sdkRoot, "template"), target, { recursive: true });
  const slug = basename(target).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const id = typeof flags.id === "string" ? flags.id : `dev.example.${slug}`;
  for (const f of ["vitrine.json", "package.json"]) {
    const p = join(target, f);
    writeFileSync(p, readFileSync(p, "utf8").replaceAll("__ID__", id).replaceAll("__SLUG__", slug));
  }
  console.log(`created ${target}\n  cd ${dir} && npm install && npm run build`);
}

const root = resolve(positional[0] ?? ".");
switch (command) {
  case "build":
    await build(root);
    break;
  case "pack":
    await pack(root);
    break;
  case "dev":
    await build(root, { watch: true });
    console.log("watching for changes — run Vitrine with: vitrine --dev " + join(root, "dist"));
    break;
  case "create":
    create(positional[0]);
    break;
  default:
    console.log(`vitrine-widget <command>

  create <folder> [--id=dev.you.pack]   scaffold a widget package
  build [folder]                        build widgets into dist/
  pack [folder]                         build and zip into <name>-<version>.vitrine
  dev [folder]                          rebuild on change (use with: vitrine --dev dist)`);
    if (command) process.exit(1);
}
