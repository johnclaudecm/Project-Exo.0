# Project Exo

Isometric wave-survival shooter in Phaser 3. Jimmy survives 10 rounds of Exo zombies with Wart Mutant bosses on rounds 3/6/9/10 (size + HP + attack speed scale per tier; round 10 is the mega-boss finale). Target: free HTML5 game portals.

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

- **Last completed:** Step 24 — Hit-feel rework. Three coherent changes plus a structural cleanup. (1) **Fire-slow deleted entirely** — no more 0.7× move-speed penalty for 0.2s after each shot. (2) **Knockback deleted entirely** — `KNOCKBACK_*` constants, `kbResistance` config field, `kbVX/kbVY/kbTime` per-enemy state, the per-frame KB-velocity application block, and the on-hit KB set are all gone. Bullets now never push enemies. (3) **Long-neck weak-point on Basic/Runner only** — replaces the prior small head-dot mechanic. Basic & Runner have `neck: { offset, hitRadius, color }` (instakill on hit). Mutant, Boss, and Jimmy each have a `head: { offset, hitRadius }` zone that does **1.25× damage** (`HEAD_DAMAGE_MULT`) — symmetric: bullets hitting Mutant/Boss heads get the multiplier, AND boss spit / exo touches landing in Jimmy's head zone get the same multiplier. Touch attacks pass `zoneOverride='body'` since touch is bodily contact. (4) **Anti-spaghetti structural fix:** new `resolveHit(target, hitWX, hitWY, baseDamage, zoneOverride)` method on GameScene is the single source of truth for zone detection (neck → head → body) and damage scaling. Both the bullet→enemy loop and the player-damage paths (boss spit, exo touch) call it. New `buildBodyParts(cfg)` / `destroyBodyParts(parts)` helpers handle the visual primitives (head ellipse + 2 arm rectangles + optional neck rectangle) so spawnExo and spawnBoss share one render path. All new tunables live in the constants block.
- **Last passed playtest:** Step 24 (2026-05-15 — "all works well"). Steps 22 (boss tuning) and 23 (barrel/aim sync) ride along as confirmed too since they were untouched and survived the same playtest.
- **Recent polish (not numbered):** sprint on Left Shift; camera zoom 0.75 + follow; aim line moved to `PRE_RENDER` + `cam.getWorldPoint` to remove camera-lerp lag.
- **Session handoff (2026-05-15 EOD):** Step 24 shipped and confirmed by playtest. Steps 22 + 23 are now also confirmed (rode along with the Step 24 playtest, untouched). Next session: propose the next numbered step in Plan Mode. Hit-feel is locked: no knockback, no fire-slow, neck=instakill on Basic/Runner, head=1.25× on Mutant/Boss/Jimmy.
- **Next planned:** TBD. User is sourcing free asset packs; do NOT auto-propose new placeholder polish. Ask before any visual/audio addition.

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
