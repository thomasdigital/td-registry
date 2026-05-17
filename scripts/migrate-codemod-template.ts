/**
 * TEMPLATE: shadcn migration codemod (jscodeshift)
 *
 * Per ADR-02: every breaking change shipped to a new channel (e.g. @td-v1 -> @td-v2)
 * MUST be accompanied by a codemod runnable via `shadcn migrate <name>`. Clients
 * upgrade their channel pin and run the codemod; the codemod rewrites consumer
 * call sites mechanically.
 *
 * This file is a working template. Copy it to scripts/codemods/<name>.ts for
 * each real migration. Example below renames the `title` prop on <Hero /> to
 * `heading` — the canonical scenario from subagent_3_registry_versioning.md.
 *
 * Run locally against a client repo:
 *   pnpm dlx jscodeshift -t ./scripts/codemods/rename-hero-title.ts \
 *     --parser=tsx --extensions=tsx,jsx,ts,js \
 *     /path/to/client-repo/src
 *
 * Run via shadcn CLI once published:
 *   pnpm dlx shadcn@latest migrate rename-hero-title
 */

import type { API, FileInfo, Options, JSXAttribute } from "jscodeshift";

const TARGET_COMPONENT = "Hero";
const OLD_PROP = "title";
const NEW_PROP = "heading";

export default function transformer(
  file: FileInfo,
  api: API,
  _options: Options,
): string | null {
  const j = api.jscodeshift;
  const root = j(file.source);
  let mutated = false;

  root
    .find(j.JSXOpeningElement, {
      name: { type: "JSXIdentifier", name: TARGET_COMPONENT },
    })
    .forEach((path) => {
      const attrs = path.node.attributes ?? [];
      attrs.forEach((attr) => {
        if (
          attr.type === "JSXAttribute" &&
          attr.name.type === "JSXIdentifier" &&
          attr.name.name === OLD_PROP
        ) {
          (attr as JSXAttribute).name.name = NEW_PROP;
          mutated = true;
        }
      });
    });

  return mutated ? root.toSource({ quote: "double" }) : null;
}

// jscodeshift convention: parser must be set on each invocation.
export const parser = "tsx";
