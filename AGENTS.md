# Agent Context: Suurteigrechner

This document provides essential context for AI agents working on the **Suurteigrechner** project.

## Project Overview
Suurteigrechner is a browser-based sourdough calculator. It calculates ingredient ratios (flour, water, starter) based on desired hydration levels and total dough mass. It can be exported as a static site.

## Tech Stack
- **Framework**: Next.js (Pages Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Bootstrap 5, Sass (SCSS)
- **Static export**: Next.js output is written to `/out`
- **PWA**: Native service worker and web app manifest in `/public`
- **Persistence**: Named calculator saves are stored in browser `localStorage`

## Key Directories & Files
- `/lib/calc.ts`: Core mathematical logic for sourdough calculations.
- `/lib/reducerHelpers.ts`: State management logic for the complex calculator form.
- `/lib/calculatorState.ts`: Factory for initial calculator runtime state.
- `/lib/calculatorSnapshot.ts`: Versioned serializer/deserializer for calculator snapshots.
- `/lib/calculatorSaves.ts`: LocalStorage repository for named calculator saves.
- `/lib/calculatorSaveHelpers.ts` & `/lib/calculatorSaveUiState.ts`: Save-name validation and UI action state helpers.
- `/pages/calculator.tsx`: Main calculator interface.
- `/pages/index.tsx` and `/pages/calculator.tsx`: Calculator routes.
- `/public/sw.js` & `/public/manifest.json`: Offline caching and install metadata.
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
- **Styling**: Prefer Bootstrap classes for layout and SCSS for custom components.
- **PWA**: Ensure assets needed offline are covered by the service worker.
- **Testing**: Run tests with `npm run test:run`.
- **Build Validation**: After each implementation, run `npm run build` and fix any build errors before finishing. Confirm static-exported assets are generated under `out/`.

## Testing Requirements
- **Calculator save modules** (`lib/calculatorState.ts`, `lib/calculatorSnapshot.ts`, `lib/calculatorSaves.ts`, `lib/calculatorSaveHelpers.ts`, `lib/calculatorSaveUiState.ts`):
  1. Add or update targeted Vitest files under `/lib/*.test.ts`
  2. Run `npm run test:run` and ensure all tests pass
  3. Keep tests Node-compatible (mock localStorage where needed)
  4. Cover corruption recovery and guard behavior for invalid/empty input

## Common Tasks
- **Updating Math**: Check `lib/calc.ts` for ingredient calculation formulas.
- **UI Changes**: Most UI components are in `/components` or directly in `/pages`.
- **Calculator Save/Load**: Use `calculatorSnapshot` + `calculatorSaves` APIs instead of direct localStorage access in page components.
- **Static deployment**: Publish the contents of `out/`; configure the host to resolve `/calculator` to `calculator.html` for direct requests if it does not provide clean URLs by default.
