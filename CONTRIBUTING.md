# Contributing to ARISE Studio

## Workflow

1. Link work to a story, requirement, and acceptance criterion.
2. Write a failing test before changing production behavior.
3. Implement the smallest passing change, then refactor.
4. Run `pnpm quality` before every commit.
5. Update docs and ADRs when architecture changes.

## Quality command

```bash
pnpm quality
```

This runs format check, lint, strict typecheck, unit tests, architecture tests, and build.

## Architecture decisions

Record significant decisions in `docs/adr/` using the ADR template.
