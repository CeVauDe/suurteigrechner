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