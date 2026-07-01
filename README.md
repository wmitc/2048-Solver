# 2048-Solver

Remember 2048? Let's see how far we can go by making optimal moves.

This is **2048 solver-as-game**: play (or watch) the classic sliding-tile
puzzle alongside an expectimax solver that streams its **expected-value
calculations live**. The "show the math" panel is the whole point — for every
move you see the solver's EV, how confident it is, and how hard it searched.

## Status

Under active construction. See the milestone branches / PRs for progress:

1. Scaffold (Vite + TypeScript + Vitest) — _this PR_
2. Game engine
3. Board UI + input
4. Expectimax solver (Web Worker)
5. Live "show the math" panel
6. Auto-play mode
7. Polish + docs

## Tech stack

- **Vite** + **TypeScript** (strict), no UI framework — plain DOM/CSS.
- **Vitest** for unit tests.
- The solver runs in a **Web Worker** so search never blocks the UI.

## Getting started

```bash
npm install       # install dependencies
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check and produce a production build in dist/
npm run preview   # serve the production build locally
npm test          # run the Vitest suite once
npm run test:watch
```

## License

MIT
