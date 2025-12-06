# railway-trial — Next.js + TypeScript + SQLite web app

A small web application for Railway deployment that stores visitor entries in an SQLite database and displays the 10 most recent submissions.

## Features

- **Next.js + TypeScript** — server-side rendering and API routes
- **Bootstrap CSS** — modern styling
- **SQLite persistence** — simple file-based database with `better-sqlite3`
- **Docker + docker-compose** — production-ready containerized deployment with persistent volumes
- **Secure defaults** — runs as non-root user, minimal Alpine base image

## Quick start (local development)

1. Install dependencies:
```bash
npm install
```

2. Run in development mode (hot reload):
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

The dev server will create a local SQLite database at `./data/db.sqlite`.

## Server endpoints

- **GET /** — web UI (form + latest 10 entries)
- **GET /api/entries** — returns latest 10 entries as JSON
- **POST /api/entries** — create a new entry (`{ "text": "..." }`)
- **GET /api/hello** — health/info endpoint

## Production build (local)

```bash
npm run build
npm start
```

## Docker (production) — build & run locally

This project includes a multi-stage Dockerfile optimized for Next.js and a docker-compose file with persistent storage for SQLite.

Build and run with docker-compose:

```bash
# Build the production image
docker compose build web

# Start the container (detached mode)
docker compose up -d web

# Check logs
docker compose logs -f web

# Stop and remove containers
docker compose down
```

The SQLite database is stored in a Docker named volume (`sqlite_data`) mounted at `/data`, so data persists across container restarts.

## Environment variables

Create a `.env` file for local configuration (see `.env.example`):

```bash
PORT=3000                          # Server port
SQLITE_DB_PATH=./data/db.sqlite    # Local dev DB path
# For Docker/Railway, set SQLITE_DB_PATH=/data/db.sqlite
```

## Railway deployment

1. Create a new project in Railway and connect your GitHub repo
2. Add a **Persistent Storage** / **Volume** plugin and mount it to `/data`
3. Set environment variable:
   ```
   SQLITE_DB_PATH=/data/db.sqlite
   ```
4. Railway auto-detects the Next.js project and runs `npm run build` + `npm start`
5. Deploy and verify persistence by adding entries, restarting the service, and checking they survive

### Notes for Railway

- Ensure `SQLITE_DB_PATH` points to the mounted persistent volume path (e.g., `/data/db.sqlite`)
- Railway supplies `PORT` automatically — the app reads `process.env.PORT`
- For multi-instance scaling, consider migrating to PostgreSQL (SQLite has concurrency limitations)

## Docker image security notes

- Multi-stage build — dev tools and build artifacts excluded from final image
- Runs as non-root `node` user
- Uses minimal `node:20-alpine` base image
- Read-only filesystem (when configured in docker-compose) with tmpfs for /tmp
- Healthcheck endpoint for orchestrators

## Project structure

```
railway-trial/
├── pages/
│   ├── _app.tsx          # Next.js app wrapper
│   ├── index.tsx         # Main UI page
│   └── api/
│       ├── entries.ts    # GET/POST /api/entries
│       └── hello.ts      # Health endpoint
├── lib/
│   └── db.ts             # SQLite helper functions
├── styles/
│   └── globals.css       # Bootstrap CSS import + global styles
├── public/               # Static assets
├── Dockerfile            # Multi-stage production build
├── docker-compose.yaml   # Local production testing with persistent volume
├── next.config.js        # Next.js config (standalone output)
├── tsconfig.json         # TypeScript config
├── package.json          # Dependencies and scripts
└── README.md
```

## Development

- `npm run dev` — Start dev server (hot reload)
- `npm run build` — Build for production
- `npm start` — Run production build
- `npm run lint` — Run ESLint

## Testing locally (quick smoke test)

```bash
# Start dev server
npm run dev

# In another terminal, test the API
curl http://localhost:3000/api/entries

# Create an entry
curl -X POST http://localhost:3000/api/entries \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test entry from curl!"}'

# Verify it appears
curl http://localhost:3000/api/entries
```

## License

MIT (demo project for Railway)