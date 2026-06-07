# ruleslawyer-frontend

The web frontend for the **Geekway to the West Library Management System** — a library management and Play and Win event tool built for and by [Geekway to the West](https://geekway.com). It provides a dashboard for managing organizations, conventions, collections, games, copies, users and attendees, backed by the [ruleslawyer-backend](https://github.com/geekwaytothewest/ruleslawyer-backend) API.

This frontend is a **work in progress**. The end goal is a single unified experience for admins, geek guides, and attendees that replaces the 3 legacy SPAs. Currently it only replaces the legacy `Board Game Admin` SPA.

## Tech stack

- [Next.js 16](https://nextjs.org/) (App Router, standalone output) with React 19
- [HeroUI v3](https://www.heroui.com/) component library
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Auth0](https://auth0.com/) (`@auth0/nextjs-auth0`) for authentication
- [SWR](https://swr.vercel.app/) for client-side data fetching

By default the app is served at the apex (`/`); set `NEXT_PUBLIC_BASE_PATH` to nest it under a prefix instead (see `next.config.mjs` and [Environment variables](#environment-variables)).

## Getting started

Install dependencies and copy the environment template:

```bash
npm install
cp .env.template .env
```

Fill in the required values in `.env` (see below), then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint

## Environment variables

Configured in `.env` (template: `.env.template`). Key variables:

- `AUTH0_ISSUER_URL`, `AUTH0_AUDIENCE` — Auth0 tenant configuration
- `NEXT_PUBLIC_API_URL` — base URL of the ruleslawyer-backend API (e.g. `http://localhost:8080/api`)
- `NEXT_PUBLIC_BASE_PATH` — app base path; empty (the default) serves the dashboard at the apex (`/`). Set a non-empty value (baked at build time) to nest it under a prefix instead. The dashboard's Auth0 routes (`/auth/*`) follow this base path, so callback URLs must match.
- `LEGACY_ADMIN_URL`, `LEGACY_LIBRARIAN_URL`, `LEGACY_PLAY_PRIZE_ENTRY_URL` — links out to the legacy SPA frontends (admin / librarian / play-and-win) for the capabilities this dashboard doesn't cover yet. Locally these point at the SPAs' dev servers (e.g. `http://localhost:8081`–`8083/legacy/<app>`); in deployed environments they're the CloudFront paths (`/legacy/admin`, `/legacy/librarian`, `/legacy/playandwin`) and are set on the ECS task by [ruleslawyer-infra](https://github.com/geekwaytothewest/ruleslawyer-infra).

`NEXT_PUBLIC_*` variables are inlined into the client bundle **at build time**, so the deploy workflow passes the per-environment value in as a Docker build arg.

## Project structure

- `app/` — App Router routes; `app/dashboard/` holds the authenticated management UI (organizations, conventions, collections, games)
- `components/` — feature components grouped by domain (`game/`, `user/`, `collection/`, `convention/`, `copy/`, `auth/`, `boardgamegeek/`)
- `lib/auth0.ts` — Auth0 client setup
- `proxy.ts` — Auth0 middleware (Next 16 renamed the `middleware` file convention to `proxy`); its matcher runs on nearly every route so the rolling session is refreshed everywhere, not just `/auth/*`
- `utilities/` — backend/frontend fetch helpers, SWR hooks, and constants

## Deployment

Deployed to AWS ECS via the **Build and Deploy** GitHub Action (manual `workflow_dispatch`; choose `nonprod` or `prod`). It builds the Docker image (baking in `NEXT_PUBLIC_API_URL` as a build arg), pushes it (tagged `:<sha>` and `:latest`) to the `ruleslawyer-frontend` ECR repo, then forces a new deployment of the `ruleslawyer-frontend` ECS service on the `geekway-{env}` cluster (`aws ecs update-service --force-new-deployment`). The task definition is owned by the infra CDK, not this repo.

See the full guide: [ruleslawyer-backend/DEPLOYMENT.md](https://github.com/geekwaytothewest/ruleslawyer-backend/blob/main/DEPLOYMENT.md).

## Migration status (vs. legacy tools)

The primary goal is to replace each legacy tool. Currently board-game-admin is deprecated, and the next steps are to move on to librarian, play-prize-entry, and finally pnw-picker.

The `ruleslawyer-frontend` is at parity with the legacy board-game-admin SPA for core CRUD and adds several capabilities the legacy app lacks (collection archiving, copy deletion, BoardGameGeek sync, organization/user-permission management, pagination).