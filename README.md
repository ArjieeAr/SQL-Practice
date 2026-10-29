# SQL Practice

A LeetCode-style practice platform focused only on SQL. Read a problem, write a query in the
editor, run it against a Postgres sandbox in your browser, and submit it to be graded against
hidden test cases.

> Work in progress. Full docs (architecture, sandboxing design, setup, deploy) land with the
> final phase.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase keys
npm run dev
```

| Script              | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start the dev server             |
| `npm run lint`      | ESLint                           |
| `npm run typecheck` | Generate route types, then `tsc` |
| `npm test`          | Vitest unit tests                |
| `npm run test:e2e`  | Playwright end-to-end tests      |
| `npm run format`    | Prettier                         |
