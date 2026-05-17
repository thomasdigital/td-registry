#!/usr/bin/env node
// Build static registry JSON tree under public/r/<channel>/.
// shadcn registries are served as static JSON; this script copies channel
// indexes and per-component items to the public path that vercel.json caches.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(ROOT, "registry");
const OUT = join(ROOT, "public", "r");

async function ensureDir(p) {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

async function copyJson(srcPath, destPath) {
  const text = await readFile(srcPath, "utf8");
  JSON.parse(text); // validate
  await ensureDir(dirname(destPath));
  await writeFile(destPath, text);
}

async function buildChannel(channel) {
  const srcChan = join(SRC, channel);
  if (!existsSync(srcChan)) return { channel, items: 0 };
  const entries = await readdir(srcChan, { withFileTypes: true });
  let count = 0;
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".json")) continue;
    const src = join(srcChan, e.name);
    const dest = join(OUT, channel, e.name);
    await copyJson(src, dest);
    count += 1;
  }
  return { channel, items: count };
}

async function main() {
  await ensureDir(OUT);
  await copyJson(join(ROOT, "registry.json"), join(OUT, "registry.json"));
  const results = [];
  for (const channel of ["v1", "v2"]) {
    results.push(await buildChannel(channel));
  }
  console.log("Built registry:", JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
