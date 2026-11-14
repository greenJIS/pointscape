# Pointscape

A flat 2D web puzzle. Every arrow is a line with a head. Tap an arrow whose path is clear and it slides off the board.
Tap one that is blocked and you lose a heart. Clear the board to win.

It is a remake of the idea behind the mobile game "Pointers" (Arrows). It reuses none of that game's art, audio, levels
or name.

## Level sets

Difficulty is set by grid size: Tiny (16x16), Compact (24x24), Large (32x32), Vast (48x48) or Massive (64x64).
Each size has 200 levels, for 1,000 levels in total. Tiny is open from the start. Clearing 10 levels of a size opens the
next size. Levels 1 to 10 of each size use a plain square board to learn the grid; from level 11 shapes rotate.
There is no Undo.

## Getting started

You need Node 24 (pinned in `.nvmrc`, so `nvm use` picks it) and npm.

```bash
npm install
npm run dev
```

Other commands:

```bash
npm test             # unit tests (Vitest)
FULL=1 npm test      # also builds and solves all 1,000 levels (about 3 minutes)
npm run lint         # ESLint, including canonical Tailwind class checks
npm run format:check # Prettier
npm run build        # type check and production build into dist/
npm run preview      # serve the production build
```

## Project layout

```text
src/core/   pure game logic, rules, masks, solver, generator
src/game/   state, progress, settings, saving
src/view/   canvas 2D rendering, pan, zoom, animation
src/ui/     React screens, modals, HUD
public/     static files, such as the favicon and icons
docs/       requirements, spec and plan (kept local, not in the repository)
```

Commit messages follow `type(scope): summary` (feat, fix, chore, refactor, docs, test, ci, build, perf, style, revert)
and are checked by commitlint through a Husky hook.

## Documents

The design documents live in `docs/` on the author's machine and are not published with the repository.

## Deploy

`.github/workflows/deploy.yml` lints, tests, solves all 1,000 levels (`FULL=1 npm test`, which fails the build if any level is
unsolvable), builds and publishes `dist/` to GitHub Pages on every push to `main`.
In the repository settings, set Pages source to "GitHub Actions". The Vite `base` is `/pointscape/`, and the workflow
sets `VITE_SITE_URL` to the absolute site URL for the Open Graph image.

## License

[MIT](LICENSE)
