# SpokeToWork — Job Hunting by Bicycle

Track employers, plan bicycle routes, find work locally.

**[Try it →](https://SpokeToWork.com/)**

Most job platforms assume you own a car. Their commute filters are built for drivers, so the jobs you can actually reach never surface. SpokeToWork starts from the other end: where you can get to under your own power.

## What It Does

### For job seekers

| Feature            | Description                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| 🏢 Track employers | Maintain target companies with status, priority, and contacts                     |
| 🚴 Plan routes     | Road-network bicycle routing across multiple stops, ordered by a 2-opt TSP solver |
| 🗺️ Map nearby      | Geocoded employer locations with viewport and radius search                       |
| 💬 Secure messages | End-to-end encrypted direct and group chat (ECDH P-256 + AES-GCM-256)             |
| 📅 Schedule        | Shift schedule and time clock                                                     |
| 📱 Works offline   | Installable PWA that syncs when back online                                       |

### For employers

| Feature               | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| 📥 Applicant pipeline | Table and kanban views with realtime updates and a status funnel |
| 👥 Team roster        | Add and remove members, including employees without accounts     |
| 🗓️ Shift scheduling   | Week grid, business hours, copy-last-week                        |
| ⏱️ Time clock         | Server-authoritative clock in/out with offline gap tracking      |

> **Note:** the employer side is an applicant-pipeline and workforce-ops console, not a job-posting surface. There are no job listings in the product — the unit of supply is an employer with a geocoded address. Employers also cannot yet link themselves to a company without operator help. See [#68](https://github.com/TortoiseWolfe/SpokeToWork/issues/68).

## Quick Links

- **App** — [SpokeToWork.com](https://SpokeToWork.com/)
- **Storybook** — [SpokeToWork.com/storybook](https://SpokeToWork.com/storybook/)
- **Status** — [SpokeToWork.com/status](https://SpokeToWork.com/status)

## Tech Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 + DaisyUI · Supabase · PWA

Routing via OSRM (bike profile) and OpenRouteService. Geocoding via Nominatim. Maps rendered with MapLibre GL. Deployed to GitHub Pages as a static export, so all server-side logic lives in Supabase.

## Project Scale

|                  |        |
| ---------------- | ------ |
| Source files     | 638    |
| Test files       | 551    |
| Test cases       | ~5,200 |
| SpecKit features | 35     |

> The file counts include roughly 75 files belonging to orphaned components that nothing imports ([#82](https://github.com/TortoiseWolfe/SpokeToWork/issues/82)), and the test-case count is not a coverage claim — see [#76](https://github.com/TortoiseWolfe/SpokeToWork/issues/76).

Vitest for unit and component tests, Playwright across Chromium/Firefox/WebKit for E2E, axe-core (via `axe-playwright`) and `@storybook/addon-a11y` for accessibility.

## For Contributors

Docker required. All commands run inside the container.

```bash
docker compose up                                    # Start dev
docker compose exec spoketowork pnpm test            # Unit tests
docker compose exec spoketowork pnpm run type-check  # Type check
docker compose exec spoketowork pnpm storybook       # Storybook
```

See [CLAUDE.md](./CLAUDE.md) for architecture, Supabase workflow, and project conventions.

## Active Work

Tracked as GitHub issues rather than in this file.

| Area                                    | Issue                                                         |
| --------------------------------------- | ------------------------------------------------------------- |
| Flaky `msg-1/4` E2E shard (replica lag) | [#65](https://github.com/TortoiseWolfe/SpokeToWork/issues/65) |
| E2E remediation backlog                 | [#66](https://github.com/TortoiseWolfe/SpokeToWork/issues/66) |
| Design system redesign                  | [#67](https://github.com/TortoiseWolfe/SpokeToWork/issues/67) |
| Employer surface gaps                   | [#68](https://github.com/TortoiseWolfe/SpokeToWork/issues/68) |
| Message reliability                     | [#69](https://github.com/TortoiseWolfe/SpokeToWork/issues/69) |
| Accessibility suite                     | [#70](https://github.com/TortoiseWolfe/SpokeToWork/issues/70) |
| Approved contributions land at (0,0)    | [#71](https://github.com/TortoiseWolfe/SpokeToWork/issues/71) |
| Private notes visible to employers      | [#72](https://github.com/TortoiseWolfe/SpokeToWork/issues/72) |
| Measure real Lighthouse scores          | [#73](https://github.com/TortoiseWolfe/SpokeToWork/issues/73) |

Longer-range items live in [docs/TECHNICAL-DEBT.md](./docs/TECHNICAL-DEBT.md) and [docs/future-features/HR-FEATURE-ROADMAP.md](./docs/future-features/HR-FEATURE-ROADMAP.md).

## Template

SpokeToWork is built on [ScriptHammer](https://github.com/TortoiseWolfe/ScriptHammer). The friction of this fork produced `scripts/rebrand.sh` upstream — see [docs/FORKING-FEEDBACK.md](./docs/FORKING-FEEDBACK.md).

## License

MIT — see [LICENSE](./LICENSE)
