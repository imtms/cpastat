# Contributing

## Development Setup

1. Install dependencies:
```bash
npm --prefix frontend install
```
2. Run local full-stack dev (recommended):
```bash
vercel dev
```
3. Build check:
```bash
npm --prefix frontend run build
```

## Pull Request Checklist

- Keep changes focused and small.
- Confirm `npm --prefix frontend run build` succeeds.
- Do not add secrets to any tracked file.
- Update `README.md` when behavior or env vars change.

## Commit Style

Use clear, imperative commit messages, for example:
- `feat: add dashboard auto-refresh`
- `fix: harden function env validation`
