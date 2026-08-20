# Decision Weigher

A modern web app that helps you choose between alternatives for major decisions
(big purchases, big life choices) using a **weighted-factor** model.

You describe the decision, list the **factors** that matter (each with a
**weight**), list the **alternatives** you're considering, and **rate** each
alternative on every factor. The app scales each rating by its factor's weight,
aggregates, and **ranks the alternatives from winner to loser** — showing you
*why* one came out ahead.

## How scoring works

Each factor has a **scale** (`0–10`, `0–100`, or **boolean** yes/no) and a
**direction** (`higher-is-better` or `lower-is-better`, so a low price helps
rather than hurts). Ratings may include decimals.

Because factors can use different scales, each rating is first normalized to
0–1, direction-adjusted, then weighted:

```
norm  = clamp(rating, 0, scaleMax) / scaleMax          # → 0..1
adj   = (direction is lower-is-better) ? 1 - norm : norm
score = Σ(adj · weight) / Σ(weight)                    # → 0..1, shown as 0–10
```

## Status

v1 is **session-only** — decisions live as long as the browser session and can
be **exported/imported as JSON** and turned into a **printable report** (save as
PDF via the browser). User accounts, saved/shareable decisions, and editing come
later. Feature work is tracked in [`STORIES.md`](./STORIES.md).

## Running it

Everything runs in Docker — see [`DEVELOPMENT.md`](./DEVELOPMENT.md). The short
version:

```bash
docker compose run --rm install     # install pinned deps into a volume
docker compose up frontend          # dev server → http://localhost:5173
docker compose run --rm test        # type-check + unit tests + coverage
docker compose run --rm sentinel    # prove the sandbox is isolated
```

## Tech

React + Vite + TypeScript, Zustand (state), Tailwind (styling), Vitest (unit),
Playwright (E2E), Stryker (mutation testing). All dependencies are pinned to
exact versions with a 7-day minimum release age; container images are pinned to
digests. See [`DEVELOPMENT.md`](./DEVELOPMENT.md) for the security rationale.
