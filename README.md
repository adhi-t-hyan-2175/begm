# BETX Platform

A high-performance, realtime betting platform with continuous synchronized rounds.

## Architecture: `round_id` vs `period`
During early development, the platform used a `period` string (e.g. `001` to `999`) to track rounds. Because periods loop back to `001` every day, this caused historic data collisions (stale bets resolving in new rounds).

**The architecture has been migrated globally to use `round_id`:**
- **`round_id`**: The true, monotonically increasing integer that dictates synchronization (e.g., `1001310`). It is generated natively by the GameEngine and is used as the primary key for state, bets, and results.
- **`period`**: Still generated, but it is strictly **UI-only**. It exists purely for the frontend display, keeping the UX familiar to users. 

> [!WARNING]
> Do **NOT** use `period` for any backend lookup, index, or result matching. Always query against `round_id`.

## Tech Stack
- **Frontend**: React + Vite (Context API for state)
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL, Realtime, Edge Functions)

## Getting Started
See [PRODUCTION_DEPLOYMENT_GUIDE.md](./PRODUCTION_DEPLOYMENT_GUIDE.md) and [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md).