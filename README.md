# Suurteigrechner

A static-hostable sourdough calculator built with Next.js Pages Router, React, and TypeScript.
Calculations run in the browser, and named recipes are saved in browser `localStorage`.

## Features

- Sourdough ingredient and hydration calculator on `/` and `/calculator`
- Named recipe save, load, overwrite, rename, and delete on both routes
- Installable PWA with offline support after the site has been visited online
- No application server, API, database, or notification service required at runtime

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build and deploy

Build the static site with:

```bash
npm run build
```

Next.js exports the complete site to `out/`. Publish the **contents of `out/`** to any static host; there is no `npm start` step or Node.js server in production. The host must serve the files over HTTPS (or localhost for testing) for service-worker offline support.

The export contains `index.html` for `/` and `calculator.html` for `/calculator`. Configure the host to serve `calculator.html` when a visitor requests `/calculator` (a clean-URL mapping or rewrite from `/calculator` to `/calculator.html`) so direct visits and page refreshes work. If the host already resolves extensionless HTML routes, no rewrite is needed. Publish at the domain root, or configure Next.js `basePath` consistently when deploying under a subpath.

The service worker caches both exported calculator pages and same-origin assets as they are used. Previously visited calculator pages and their cached assets can then be used offline. Saved recipes remain in that browser's local storage and are not synchronized between browsers or devices.

## Tests

```bash
npm run test:run
```

## Project structure

```text
pages/          Calculator routes and shared app wrapper
components/     Calculator fields and navigation
lib/            Calculator math, state, and local-save helpers
public/         Static assets, PWA manifest, and service worker
styles/         Global styles
```
