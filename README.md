# railway-trial — Minimal TypeScript hello-world server

This repository contains a tiny TypeScript HTTP server used as the first step toward a Railway + SQLite demo project.

Features included in this step:

- Minimal TypeScript HTTP server (`src/index.ts`) using the node `http` module
- Development script using `ts-node-dev` and production-ready `build` + `start` scripts

Quick start

```bash
npm install
npm run dev      # development (hot reload via ts-node-dev)
npm run build    # compile to ./dist
npm start        # run compiled server
```

Server endpoints

- GET / -> `Hello from TypeScript hello-world server!` (plain text)
- GET /api/health -> JSON health response

Next steps:

- Add SQLite persistence, API routes, frontend, and Docker/Docker Compose configuration for local testing and Railway deployment.

Docker (production) — build & run locally

This project includes a minimal multi-stage Dockerfile and a `docker-compose.yaml` that runs the production image locally.

Build and run with docker-compose (uses the `runner`/production stage and runs the compiled `dist/index.js`):

```bash
# build + start in detached mode
docker compose build --no-cache web
docker compose up -d web

# check logs and health
docker compose ps
docker compose logs -f web

# stop and remove containers
docker compose down
```

Security notes about the Docker image

- Uses a multi-stage build so development/build tools do not exist in the final image.
- The final stage runs as the non-root `node` user for better isolation.
- The runtime image uses `NODE_ENV=production` and minimal Alpine base image.
- The docker-compose file runs the service with a read-only filesystem and a tmpfs for `/tmp` to reduce risk.