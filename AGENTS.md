# Agent Context: Suurteigrechner

This document provides essential context for AI agents working on the **Suurteigrechner** project.

## Project Overview
Suurteigrechner is a specialized web application designed for sourdough bakers. It calculates ingredient ratios (flour, water, starter) based on desired hydration levels and total dough mass. It also includes a feeding plan for starter maintenance and a simple guestbook.

## Tech Stack
- **Framework**: Next.js (Pages Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Bootstrap 5, Sass (SCSS)
- **Database**: SQLite (via `better-sqlite3`)
- **PWA**: `next-pwa` for offline capabilities
- **Deployment**: Docker & Docker Compose (optimized for Railway)

## Key Directories & Files
- `/lib/calc.ts`: Core mathematical logic for sourdough calculations.
- `/lib/reducerHelpers.ts`: State management logic for the complex calculator form.
- `/lib/calculatorState.ts`: Factory for initial calculator runtime state.
- `/lib/calculatorSnapshot.ts`: Versioned serializer/deserializer for calculator snapshots.
- `/lib/calculatorSaves.ts`: LocalStorage repository for named calculator saves.
- `/lib/calculatorSaveHelpers.ts` & `/lib/calculatorSaveUiState.ts`: Save-name validation and UI action state helpers.
- `/pages/calculator.tsx`: Main calculator interface.
- `/pages/feedingplan.tsx`: Starter maintenance logic.
- `/pages/guestbook.tsx`: Guestbook UI.
- `/pages/api/entries.ts`: API routes for guestbook persistence.
- `/public/sw.js` & `manifest.json`: PWA configuration.
- `/styles/globals.scss`: Global styles and Bootstrap overrides.

## Core Logic (Sourdough Math)
The calculator handles the relationship between:
- **Flour**: The base amount of flour.
- **Water**: The added water.
- **Starter**: The sourdough starter (which itself has a hydration level).
- **Hydration**: The ratio of total water to total flour in the dough.
- **Total Dough Mass**: The sum of all ingredients (plus a small adjustment factor in some calculations).

## Calculator Persistence (Local Saves)
- Save management is available on both calculator routes (`/` and `/calculator`).
- Local key: `suurteig_saved_calculations`.
- Snapshot payloads are versioned and serializable; runtime function fields (e.g. `Ingredient.calculate`) are never stored directly.
- Rehydration must go through `fromSnapshot(...)` so calculate handlers are reattached safely.
- Avoid hydration mismatches: do not read localStorage during initial render; load persisted data in client effects.

## Development Guidelines
- **State Management**: Uses `useReducer` for the calculator to handle interdependent field updates.
- **Calculator Restore**: Prefer reducer-level state restore (`RESTORE_STATE`) for loading a saved calculation, rather than replaying field updates.
- **Database**: SQLite is stored in `/data/db.sqlite` (mapped via Docker volume in production).
- **Styling**: Prefer Bootstrap classes for layout and SCSS for custom components.
- **PWA**: Ensure any new assets are correctly cached in the service worker if necessary.
- **Testing**: Run tests with `npm run test:run`. Changes to `lib/db.ts` require corresponding tests in `lib/db.test.ts` and must pass before committing.

## Testing Requirements
- **Calculator save modules** (`lib/calculatorState.ts`, `lib/calculatorSnapshot.ts`, `lib/calculatorSaves.ts`, `lib/calculatorSaveHelpers.ts`, `lib/calculatorSaveUiState.ts`):
  1. Add or update targeted Vitest files under `/lib/*.test.ts`
  2. Run `npm run test:run` and ensure all tests pass
  3. Keep tests Node-compatible (mock localStorage where needed)
  4. Cover corruption recovery and guard behavior for invalid/empty input

- **Database module (`lib/db.ts`)**: Every change to this file requires:
  1. Writing or updating tests in `lib/db.test.ts`
  2. Running `npm run test:run` and ensuring all tests pass
  3. Tests use real SQLite databases (temp files) with mocked `web-push` module
  4. Set `DISABLE_DISPATCHER=true` in tests to prevent auto-starting the notification dispatcher

## Common Tasks
- **Updating Math**: Check `lib/calc.ts` for ingredient calculation formulas.
- **UI Changes**: Most UI components are in `/components` or directly in `/pages`.
- **Calculator Save/Load**: Use `calculatorSnapshot` + `calculatorSaves` APIs instead of direct localStorage access in page components.
- **API/DB**: Guestbook entries are handled in `lib/db.ts` and `pages/api/entries.ts`.
