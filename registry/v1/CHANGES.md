# Channel v1 Changelog

Channel v1 is the active development channel until the first breaking change is required, at which point it is frozen and v2 opens.

Per ADR-02: components are NEVER mutated in place after freeze. Bug fixes that would change a component's contract must ship to a new channel with a `shadcn migrate` codemod.

## Non-breaking fixes pre-freeze

(track here while v1 is still active)

### 2026-05-17 — Initial 8-component drop

Pre-freeze additions (all new files, no mutation):

- `button` — primary/secondary/ghost variants, sm/md/lg sizes, tokenized via `--td-primary` / `--td-secondary`.
- `nav` — 5-item top nav with optional CTA. Brand on left, items center-right, CTA flush right.
- `hero` — biotech-friendly hero, bokeh background, vertical CTA stack, large headline. Backed by `--td-primary` / `--td-secondary`.
- `section` — generic container (eyebrow, headline, body, CTA, children); `light` / `dark` / `tinted` surfaces.
- `card` — image + headline + body + optional CTA.
- `footer` — brand + 3 link columns + social row + legal line. Dark surface backed by `--td-primary`.
- `pipeline-table` — biotech pipeline: drug, indication, phase progress bar across Preclinical -> Phase 1 -> 2 -> 3 -> Approved.
- `contact-form` — name / email / message form. zod schema + react-hook-form. `--td-primary` focus ring and submit button.

All components consume color via CSS custom properties (`--td-primary`, `--td-secondary`, `--td-border`, `--td-tint`, `--td-track`) so per-client themes attach at the CSS layer, not at component-source level.

## Freeze marker

- frozen_at: NOT YET FROZEN
- frozen_by: n/a
- frozen_at_commit: n/a
