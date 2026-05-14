# Project Exo

Isometric wave-survival shooter in Phaser 3. Jimmy survives 25 rounds of Exo zombies with Wart Mutant bosses on rounds 5/10/15/20/25. Target: free HTML5 game portals.

## Rules that don't get waived

- **Iso camera is locked.** True 2:1 dimetric (TILE_W=64, TILE_H=32), hand-rolled transform in `js/iso.js`. Do not propose top-down, plugins, or "switch later."
- **Phaser 3 + vanilla JS is locked.** No React/TypeScript/Vite/Webpack/Matter.js/iso plugins. Single bundle via CDN.
- **Build one numbered step at a time and STOP.** After implementing a step, end the turn and let the user test. Don't bundle Step N and Step N+1 unless the user explicitly says so.
- **Plan Mode for any new step.** Before writing code for a new step, use Plan Mode (write to the plan file, then `ExitPlanMode`) so the user can approve the approach.
- **No scope expansion without asking.** Don't add features/mechanics the user didn't request — even "nice to have" polish. The realism + hardcore lane is the design, not a suggestion.
- **No screen shake EVER.** Hard rule. Use sprite flashes, particles, or audio instead.
- **Realism > arcade.** Walk not sprint, shamble not run, ~2s reloads, slow spawn cadence. When in doubt, slower.
- **Hardcore feel.** No auto-reload, no aim assist, no QoL smoothing, no damage iframes. Empty click is a dead click.
- **Placeholders only.** Visuals + audio will be replaced by free asset packs — keep render/audio code minimal, don't polish what will be ripped out. Don't add new placeholder SFX or visuals on your own initiative.
- **Memory + CLAUDE.md + DECISIONS.md are the source of truth** for cross-session continuity. Read them before acting.
- **Gate input handlers against non-PLAYING phases.** Pointerdown, dash, jump, etc. must check `phase === 'PLAYING'`, `!paused`, `!gameOver` so nothing fires during title/intermission/game-over by accident.

## Current step tracker

- **Last completed:** Step 20 — Realism combat polish: state-dependent bullet spread (idle 0° / walk 3° / sprint 8° / jump 6° / dash 4° + recoil 5° over 0.3s, cap 15°), fire-slow (70% × 0.2s per shot), bullet knockback (1.5 u/s × resistance × 0.15s; basic 1.0× / runner 1.2× / mutant 0.5× / boss 0.0× immune).
- **Recent polish (not numbered):** sprint on Left Shift; camera zoom 0.75 + follow; aim line moved to `PRE_RENDER` + `cam.getWorldPoint` to remove camera-lerp lag.
- **Next planned:** TBD — user is sourcing free asset packs; do NOT auto-propose new placeholder polish. Ask before any visual/audio addition.

(Update this section after each step.)

## Project layout

- `index.html` — entry. Loads Phaser 3.80.1 via CDN + the three JS files in order.
- `js/iso.js` — `worldToScreen` / `screenToWorld`. **Locked transform — don't modify.**
- `js/main.js` — Phaser config. 1280x720, Arcade physics, scene = GameScene.
- `js/GameScene.js` — everything else. Game state, render, input, audio synth, leaderboard.
- `CLAUDE.md` (this file) — operating rules + current step.
- `PROGRESS.md` — append-only run log (newest at top).
- `DECISIONS.md` — locked-in choices, one line each.

## Where things live in GameScene.js

- **Top of file:** constants (player, bullets, exos, enemy types, pacing, audio, stamina, leaderboard keys) and the WebAudio SFX module.
- **`init(data)`:** reads `skipTitle` from scene-restart data.
- **`create()`:** camera + ground + player + barrel + shadow + all HUD text + bars + title/pause/game-over overlays + input handlers + leaderboard load.
- **Class methods:** `spawnExo`, `spawnBoss`, UI updaters (`updateHPText`, `updateStaminaBar`, etc.), `startReload`, `triggerVictory`, `triggerGameOver`, `recordRunAndFormat`.
- **`update()` order:** title gate → game-over gate → ESC pause toggle → reload tick → WASD → SPACE jump trigger → ALT dash trigger → SHIFT sprint check → stamina regen/drain → movement → jump arc → hit-flash tick → player/barrel/shadow render → exo chase + touch damage → bullets + collision → pickups → bursts → muzzle flashes → barrel orient + aim line → round/spawn/intermission flow.

## Memory entries (auto-loaded from `~/.claude/projects/.../memory/`)

- `project_exo_overview` — game pitch, scope rules.
- `project_exo_working_style` — one step at a time, no alternatives to locked decisions.
- `project_exo_iso_wasd_gotcha` — the spec's WASD table is rotated; derive from the transform.
- `project_exo_dont_prompt_for_next` — when user confirms a step works, jump straight to the next.
- `project_exo_hardcore_feel` — no auto-reload, no aim assist, no QoL smoothing.
- `project_exo_no_screen_shake` — hard ban.
- `project_exo_realism_pacing` — pacing target + "no unrealistic features without consent."
- `project_exo_map_too_small` — deferred map expansion TODO; do NOT auto-expand.
- `project_exo_placeholders_only` — visuals + audio are placeholders.

## When the user says "go" / "good" / "works"

That confirms the last step. Jump straight into the next step (Plan Mode first). No "say go" tail. Still STOP after building the next step so they can test.

## Boundaries (from global CLAUDE.md)

This is the `JohnClaudeDev` Windows user account. Do not touch other Windows users, do not escalate privileges, do not install globally. All project work stays inside `C:\Users\JohnClaudeDev\Desktop\Projects\Project-Exo.0\`.
