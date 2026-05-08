# May the Force Be With You ⚡

A [Farcaster Snap](https://farcaster.xyz) for May the 4th — a Force battle between the Light Side and the Dark Side.

Users reveal their personal Force score (based on their Farcaster FID and follower count), pick a side, and shift the balance of power across the whole network.

## What it does

1. **Check Your Force** — the snap calculates your Force Power: lower FIDs and more followers = stronger Force.
2. **Pick a side** — join the Light Side ☀️ or the Dark Side 🌑.
3. **See the balance** — a live bar chart shows how Farcaster is split between the two sides.
4. **Share** — compose a cast with your Force score and the current battle state.

## Tech stack

| Layer | Technology |
|---|---|
| Snap server | [Hono](https://hono.dev) + TypeScript |
| Farcaster protocol | [`@farcaster/snap`](https://docs.farcaster.xyz/snap) — JFS verification, snap schema |
| User data | [Neynar API](https://neynar.com) — follower count, profile pictures |
| Database | [Turso](https://turso.tech) (SQLite, edge) with in-memory fallback for local dev |
| Deployment | [Vercel](https://vercel.com) Edge Runtime |
| Emulator | Next.js app for local snap development and testing |
| Monorepo | [pnpm](https://pnpm.io) workspaces + [Turborepo](https://turbo.build) |

## Project structure

```
template/       Snap server (the deployable Farcaster snap)
  src/
    index.ts    Snap screens and request handling
    neynar.ts   Neynar API calls (follower count, profile pictures)
    store.ts    Vote persistence (Turso / in-memory)
    force.ts    Force Power calculation
  public/       Static assets served alongside the snap
apps/
  emulator/     Local web emulator for testing snaps
```

## Local development

```bash
pnpm install

# Run the snap server (http://localhost:3003)
pnpm --filter snap-template dev

# Run the emulator (http://localhost:3000)
pnpm --filter @farcaster/snap-emulator dev
```

Paste `http://localhost:3003` into the emulator to interact with the snap locally.

Set `SKIP_JFS_VERIFICATION=true` in `template/.env` to bypass signature checks during development.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEYNAR_API_KEY` | Yes (production) | Neynar API key for fetching user data |
| `TURSO_DATABASE_URL` | Yes (production) | Turso database URL |
| `TURSO_AUTH_TOKEN` | Yes (production) | Turso auth token |
| `SNAP_PUBLIC_BASE_URL` | Optional | Override base URL for snap asset links |
| `SKIP_JFS_VERIFICATION` | Dev only | Set to `true` to skip JFS signature checks |

## Deploying

The fastest way to deploy is [Neynar's snap host](https://host.neynar.app). The `template/vercel.json` is already configured for Vercel Edge deployment.
