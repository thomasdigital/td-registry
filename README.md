# td-registry

Thomas Digital's private shadcn component registry. Implements **channel-based versioning** per ADR-02. Served as static JSON from Vercel; intended public URL `registry.thomasdigital.com` once Cloudflare DNS is wired.

## Why channels, not semver

shadcn has no per-component semver primitive. The official versioning mechanism is URL parameters on the registry namespace (`@td-v1`, `@td-v2`). Components are pinned by which channel URL the client's `components.json` points at, NOT by a tag inside the component. Mutating a component in place inside an existing channel silently overwrites every client that ran `shadcn add` against that channel — the exact failure mode this registry exists to prevent.

Source: `state/projects/td-ai-native-build/research/wave_F3_ADRs.md` (ADR-02) + `subagent_3_registry_versioning.md`.

## Repo layout

```
td-registry/
  registry.json                  # top-level manifest + channel routing
  registry/
    v1/
      index.json                 # channel index (frozen flag lives here)
      CHANGES.md                 # changelog; the ONLY file editable after freeze
      <name>.json                # one file per component
    v2/
      index.json
      CHANGES.md
  scripts/
    add-component.sh             # TD-tagged wrapper around `shadcn add`
    build-registry.mjs           # copies registry/ tree to public/r/ for static serving
    validate-registry.mjs        # JSON well-formedness + cross-channel overlap report
    migrate-codemod-template.ts  # jscodeshift codemod template (ADR-02 migration pattern)
  .github/workflows/registry-ci.yml
  vercel.json                    # static JSON serving + cache headers
  public/                        # build output served by Vercel
```

## Operator runbook

### Add a component to an active channel

```bash
scripts/add-component.sh <name> <channel> [shadcn-source]
# Example: scripts/add-component.sh hero v1 https://ui.shadcn.com/r/styles/new-york/card.json
```

The script refuses to write to a channel marked `"frozen": true`. CI enforces the same rule at PR time.

### Build & validate locally

```bash
pnpm install
pnpm run registry:validate
pnpm run build           # writes public/r/v1/*.json + public/r/v2/*.json + public/r/registry.json
```

### Deploy

```bash
vercel link --project td-registry --yes
vercel --prod
```

DNS to `registry.thomasdigital.com` is deferred — currently no CLOUDFLARE_API_TOKEN. Until DNS is wired, clients consume the registry via the `td-registry-<hash>.vercel.app` URL Vercel returns.

## V1 freeze ceremony

Run this once, when the first breaking change to a v1 component is about to ship. The ceremony is irreversible by design — the freeze flag turns CI into a hard wall.

1. Confirm v1 is at the contract you want every existing client to keep getting.
2. Edit `registry/v1/index.json`: set `"frozen": true`.
3. Edit `registry/v1/CHANGES.md`: fill in the freeze marker (`frozen_at`, `frozen_by`, `frozen_at_commit`).
4. Edit `registry.json`: set `channels.v1.frozen: true`.
5. Open a PR titled `freeze: v1`.
6. After merge, all subsequent contract changes ship under `@td-v2` with a migration codemod. The codemod goes into `scripts/codemods/<name>.ts` using `scripts/migrate-codemod-template.ts` as the starting point.
7. Run the ADR-02 falsifying test: `shadcn diff` against every client repo pinned to `@td-v1` must show zero diffs.

After freeze, the ONLY file editable under `registry/v1/` is `CHANGES.md`. CI rejects any other change.

## Channel discipline

- Bug fixes that don't change a component's public contract: allowed in-channel pre-freeze, forbidden post-freeze.
- Bug fixes that DO change the public contract (renamed prop, removed slot, changed default): always ship to a new channel + codemod, never as a v1 mutation.
- "Just a small fix" arguments are the named failure mode. The codemod cost is the price of safety.

## Migration codemod pattern

Every breaking-change PR includes a codemod under `scripts/codemods/<name>.ts`. Template at `scripts/migrate-codemod-template.ts`. Clients upgrade by:

1. Editing one line in `components.json`: `@td-v1` -> `@td-v2`.
2. Running `pnpm dlx shadcn@latest migrate <name>`.

## CI gates (`.github/workflows/registry-ci.yml`)

- **validate**: `registry:validate` + `build` must pass.
- **freeze-guard**: rejects any PR that edits files under a channel where `frozen: true`, except `CHANGES.md`.
- **chromatic**: visual regression placeholder. Wires up once `CHROMATIC_PROJECT_TOKEN` is added to repo secrets and a Storybook is added.

Branch protection on `main` should require `validate` and `freeze-guard` to pass before merge.

## Open work

- Add real components to `registry/v1/` (currently scaffolded empty).
- Cloudflare DNS pointing `registry.thomasdigital.com` -> Vercel project (deferred; no CF token yet).
- Storybook + Chromatic project token (placeholder workflow already in place).
- Branch protection rules on `main` (GitHub UI; cannot be set via the repo files alone).
