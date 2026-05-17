# Channel v1 Changelog

Channel v1 is the active development channel until the first breaking change is required, at which point it is frozen and v2 opens.

Per ADR-02: components are NEVER mutated in place after freeze. Bug fixes that would change a component's contract must ship to a new channel with a `shadcn migrate` codemod.

## Non-breaking fixes pre-freeze

(track here while v1 is still active)

## Freeze marker

- frozen_at: NOT YET FROZEN
- frozen_by: n/a
- frozen_at_commit: n/a
