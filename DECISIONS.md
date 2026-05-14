# Locked-in Decisions

Choices that have been made and are **NOT** to be revisited. One line each, dated. If a future step would conflict with one of these, stop and ask before proceeding.

---

- 2026-05-14 — Iso camera: true 2:1 dimetric, TILE_W=64, TILE_H=32, hand-rolled transform in `js/iso.js`. No top-down, no plugin, ever.
- 2026-05-14 — Phaser 3 via CDN (3.80.1). No React/TypeScript/Vite/Webpack/Matter.js/iso plugins.
- 2026-05-14 — Vanilla JS + Arcade Physics. Single-bundle static delivery (no build step).
- 2026-05-14 — Screen-aligned WASD: W=up, S=down, A=left, D=right. Velocities derived from the iso transform, NOT from any spec table that contradicts.
- 2026-05-14 — Target platform: free HTML5 game portals (itch.io, Newgrounds). Static bundle, no plugins, no server, no backend.
- 2026-05-14 — Game structure: 25 rounds total; bosses on rounds 5/10/15/20/25. **Superseded 2026-05-14 by 10-round restructure (see entry below).**
- 2026-05-14 — Game structure (current): 10 rounds total; bosses on rounds 3/6/9/10. Boss size scales per tier (1.0×/1.4×/1.8×/2.2×) and size dictates danger (bigger hitbox + faster attack cooldown). Round 10 is the mega-boss finale.
- 2026-05-14 — Boss type: Wart Mutant only (no other bosses planned).
- 2026-05-14 — Enemy roster: Basic Exo, Exo Runner, Exo Mutant, Wart Mutant boss. No other enemy types in scope.
- 2026-05-14 — Realism > arcade for all pacing (walk, shamble, reload, spawn cadence).
- 2026-05-14 — Hardcore feel: no auto-reload, no aim assist, no QoL smoothing, no damage iframes.
- 2026-05-14 — No screen shake EVER. Hard rule. Use sprite flash / particles / audio instead.
- 2026-05-14 — Leaderboard is local-only (localStorage per-browser). No server, no cross-device sharing.
- 2026-05-14 — Visuals + audio are placeholders awaiting free asset packs. Keep render/audio code minimal; don't polish placeholders.
- 2026-05-14 — Build cadence: one numbered step at a time, Plan Mode first, STOP after each for user testing.
- 2026-05-14 — Jump grants touch-damage immunity during the airborne arc (realism call; user did not object).
- 2026-05-14 — Stamina is the only gate for dash (no separate cooldown). Dash and jump cannot overlap with each other.
