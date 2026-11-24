# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page React 18 + TypeScript treasure hunt game built with Vite (exported from Figma Make). Three chests are shown; one randomly holds treasure (+$150), the others hold skeletons (-$50). The game ends when the treasure is found or all chests are opened.

## Commands

```bash
npm install      # install dependencies
npm run dev      # start dev server at http://localhost:3000 (opens browser)
npm run server   # start API server at http://localhost:3001 (run alongside `npm run dev`)
npm run build    # production build into ./build (not ./dist)
```

The game works without the API server (guest mode only); sign in / sign up need it running. The API server needs Node 22.5+ for `node:sqlite` (`npm run server` uses `node --watch`, so it restarts when you edit the file).

There is no test runner, linter, or `tsconfig.json` configured. Vite (SWC) strips types without type-checking, so type errors will not fail the build.

## Architecture

- `src/main.tsx` mounts `App` and imports `src/index.css`.
- `src/App.tsx` holds all game logic and UI in one component: `boxes` / `score` / `gameEnded` state, `initializeGame()` (random treasure placement, runs on mount and on "Play Again"), and `openBox()` (updates score and checks end conditions). Animations use `motion/react`.
- Accounts and scores: `server/index.mjs` is an Express server using Node's built-in `node:sqlite` (DB file `server/data/game.db`, git-ignored, created on first run) and `node:crypto` (scrypt password hashing, random session tokens in an httpOnly cookie). Vite proxies `/api/*` to it. `src/api.ts` has the fetch helpers; `src/components/AuthPanel.tsx` is the sign in / sign up / score history UI. `App.tsx` saves the final score only when a user is signed in; guests make no API calls. The server only accepts final scores 150, 100 or 50, so update `VALID_SCORES` if the game rules change. The server also derives `result` (win/tie/loss) from the score in `getResult()`; keep both in sync with the game rules. Session lifetime (7 days) is set both in `SESSION_MAX_AGE_MS` and in the `findUserBySession` SQL; change both together.
- Images (`src/assets/`) and sounds (`src/audios/`) are imported directly as ES modules, so Vite handles their URLs.
- `src/components/ui/` is a generated shadcn/ui component library (Radix + `class-variance-authority`). `Button`, `Input` and `Label` are used today. Treat these as library code; `cn()` helper lives in `ui/utils.ts`.
- `vite.config.ts` contains many versioned aliases (e.g. `'sonner@2.0.3': 'sonner'`) so the Figma-generated imports with version suffixes resolve. `@` aliases to `src/`.

## Styling gotcha

`src/index.css` is a **precompiled Tailwind v4 output**; Tailwind is not installed and there is no Tailwind build step. Tailwind classes that do not already appear in `src/index.css` will have no effect. When adding a new utility class, check it exists in `index.css` first, or use inline styles / plain CSS instead. `src/styles/globals.css` holds the theme variables but is not imported anywhere.

## Notes

- `src/guidelines/Guidelines.md` is an empty Figma Make template (no real rules).
- `src/results/` holds only a reference screenshot (`key_hover.png`), not source code.
- `Attributions.md` lists the sources of the audio and image assets; update it when adding new third-party assets.
