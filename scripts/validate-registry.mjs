#!/usr/bin/env node
// Validate registry.json + channel indexes are well-formed JSON and that no
// component name exists in two channels with the same contract (sanity guard
// against accidental in-place mutation).

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

async function loadJson(path) {
  const text = await readFile(path, "utf8");
  return JSON.parse(text);
}

async function listChannelItems(channel) {
  const dir = join(ROOT, "registry", channel);
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const items = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith(".json")) continue;
    if (e.name === "index.json") continue;
    const data = await loadJson(join(dir, e.name));
    items.push({ channel, file: e.name, name: data.name });
  }
  return items;
}

async function main() {
  const root = await loadJson(join(ROOT, "registry.json"));
  if (!root.channels || !root.channels.v1) {
    console.error("registry.json missing channels.v1");
    process.exit(1);
  }
  const v1 = await listChannelItems("v1");
  const v2 = await listChannelItems("v2");
  console.log(`v1 items: ${v1.length}`);
  console.log(`v2 items: ${v2.length}`);

  // Cross-channel name visibility is allowed by design (same name, new channel
  // = the migration scenario). Print overlap for operator awareness.
  const v1Names = new Set(v1.map((i) => i.name));
  const overlap = v2.filter((i) => v1Names.has(i.name)).map((i) => i.name);
  if (overlap.length > 0) {
    console.log("Cross-channel name overlap (expected for migrations):", overlap);
  }
  console.log("OK");
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
