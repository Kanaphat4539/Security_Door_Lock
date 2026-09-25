# Security Door Lock dashboard

Next.js dashboard for RFID access events. The backend (Nest.js + MySQL) runs
separately on port 3001. This app defaults to `http://localhost:3001` for its
server-side API and WebSocket connections. Copy `.env.example` to `.env.local`
and adjust the URLs when the backend is on another host. Never put device or
dashboard tokens in a `NEXT_PUBLIC_` variable.

## Develop and verify

From `apps/frontend`:

```bash
npm ci
npm run dev
```

Visit `http://localhost:3000/login`. For tests and production checks:

```bash
npm run test
npm run lint
npm run build
npm run start
```

`next start` serves a **specific production build**, not live source files.
**Stop `next start` before running another `npm run build`, then start it again.**
Rebuilding `.next` while the old server is running can leave HTML pointing to
removed CSS chunks, causing a completely unstyled page even though `/login`
still returns HTTP 200. Use `npm run dev` for iterative UI work instead.
Docker builds with `BUILD_STANDALONE=1` and serves its own traced output;
local builds use the standard `next start` output.

The `ADMIN` dashboard can manage RFID cards. `USER` is a read-only viewer and
currently sees shared access logs, not personal logs. Neither role displays
door/relay status, since firmware does not report it yet.