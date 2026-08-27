# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc`) then production build (`vite build`)
- `npm run preview` — preview the production build locally

There is no lint or test setup in this repo (no ESLint/Prettier config, no test runner/framework installed).

## Architecture

WorkPilot is a single-page React + TypeScript + Vite app — a personal productivity "copilot" UI (Spanish-language) with four tabs: Hoy (today/tasks), Energía (energy tracking + Pomodoro timer), Agenda, and Insights.

**The entire app lives in one file: `src/App.tsx` (~900 lines).** Onboarding, the Pomodoro timer, the add-task modal, and all four screens are defined as sibling function components inside that single file and composed in the default-exported `WorkPilot` component, which owns all app state (`user`, `tab`, `tasks`) and passes it down via props — there is no router, no context, no state library. `src/main.tsx` just mounts `<App />`.

Styling is inline `style={}` objects driven by a single `theme` object (colors) defined at the top of `App.tsx`, plus a `globalStyles` template string (fonts, keyframe animations, scrollbar) injected via a `<style>` tag at render time. Tailwind is configured (`tailwind.config.js`, `postcss.config.js`) but `App.tsx` does not use Tailwind classes — layout is done entirely with inline styles.

**`src/screens/`, `src/components/`, `src/data/sampleData.ts`, and `src/types/index.ts` are unused leftovers from an earlier version of the app and are not imported anywhere.** `App.tsx` defines its own local types, icons (inline SVG via a local `Icon` component), and sample task data inline instead of using these files. Don't assume changes to those directories affect the running app — check whether `App.tsx` actually imports something before editing it there.

`tsconfig.json` has `strict: false`; component props are untyped (implicit `any`) throughout `App.tsx`.
