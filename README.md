# US Miles Club

**Every mile counts for somewhere.**

A lightweight, map-driven mileage leaderboard for real US counties. Log a walk, run, or ride, and your city, county, and state climb a live map of the United States. No trackers, no social feed, no streak guilt.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What it does

Most fitness apps are built around the individual. US Miles Club is built around the place you live. Every mile you log is credited to your county and state, and the map fills in as the miles roll in.

- **Interactive US map.** A county- and state-level choropleth showing where the miles are coming from, with a legend and hover detail.
- **Leaderboards.** Rankings by state, county, and city, filterable by sport.
- **Sport filter.** Walk, run, and bike, filterable across the map and the boards.
- **Badges.** Simple milestones like first mile logged, the 10 Mile Club, county coverage, and best daily streak. No punishment for missing a day.
- **Monthly goal.** Set a personal mileage target and track progress against it.
- **Personal insights.** A private breakdown of your own logging patterns and totals.
- **Shareable rank card.** Export an image of your current standing.
- **Data transparency panel.** Shows what is being counted and how, so a number on the board is never a black box.
- **Light and dark themes.** Follows your system preference, with a visible toggle.

Public pages (map, leaderboards, about) are readable without an account. Logging a workout and viewing your portal require sign-in.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) with TanStack Router (file-based routes) |
| UI | React 19, Tailwind CSS v4, shadcn/ui on Radix primitives |
| Data fetching | TanStack Query |
| Backend | Supabase (Postgres, Auth, row-level security) |
| Mapping | `d3-geo`, `topojson-client`, `us-atlas` |
| Charts | Recharts |
| Build | Vite 8, Nitro |
| Runtime / package manager | Bun |
| Forms & validation | React Hook Form + Zod |

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (the repo ships a `bun.lock`)
- A Supabase project

### Install

```bash
git clone https://github.com/ranschel/us-miles-club.git
cd us-miles-club
bun install
```

### Configure

Create a `.env` file in the project root:

```bash
# Client-side (bundled into the browser build by Vite; publishable values only)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_SUPABASE_PROJECT_ID=your-project-id

# Server-side (SSR fallback)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_PROJECT_ID=your-project-id

# Server-only. Bypasses row-level security. Never expose this to the client
# and never commit it.
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

Anything prefixed with `VITE_` is replaced at build time and ends up in the browser bundle, so only ever put publishable values there. The service role key is read exclusively by `src/integrations/supabase/client.server.ts` and must stay server-side.

### Set up the database

Apply the migrations in `supabase/migrations/` to your Supabase project, either through the Supabase CLI or by running them in the SQL editor in filename order.

### Run

```bash
bun run dev
```

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run build:dev` | Build in development mode |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint |
| `bun run format` | Format with Prettier |

## Data model

Three tables in the `public` schema:

- **`workouts`.** One row per logged activity: sport (`walk` / `run` / `bike`), distance in miles, state code, 5-digit county FIPS, county name, city, and when it was performed. Constraints keep distances between 0 and 200 miles and dates within a sane window. Readable by anonymous visitors so the public boards work; insert and delete are limited to the authenticated owner.
- **`profiles`.** Display names and per-user settings.
- **`profile_recovery`.** Supports the account recovery flow.

Row-level security policies live alongside the table definitions in the migration files.

## Project structure

```
src/
├─ routes/              File-based routes; _authenticated/ requires a session
├─ components/          Feature components (map, leaderboards, badges, charts)
│  └─ ui/               shadcn/ui primitives
├─ lib/                 Aggregation, insights, formatting, geo helpers
├─ integrations/
│  └─ supabase/         Browser client, server client, auth middleware, types
└─ hooks/               Theme and viewport hooks
supabase/migrations/    Database schema and RLS policies
```

## Contributing

Issues and pull requests are welcome. Keep changes focused, run `bun run lint` and `bun run format` before opening a PR, and describe the user-facing behavior your change affects.

## License

Released under the [MIT License](LICENSE).

## Credits

County and state boundaries come from [us-atlas](https://github.com/topojson/us-atlas), derived from US Census Bureau TIGER/Line shapefiles.
