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

## GameScene.js structure

The file has a FILE MAP comment block at the top (lines 1-24) with exact line ranges. Major sections (line ranges as of last update — trust the FILE MAP if these drift):

1. **Audio synth module** (25-75) — WebAudio context + `sfxShoot`/`sfxEnemyHit`/`sfxEnemyDeath`/`sfxPlayerHit`.
2. **Combat constants** (76-128) — player, bullet, aim, exo spawn, `ENEMY_TYPES`, head/neck zone constants, spread/recoil.
3. **Boss / round helpers** (129-176) — `BOSS_ROUNDS`/`BOSS_HP_TABLE`/`BOSS_SIZE_TABLE`/`BOSS_ATTACK_COOLDOWN_TABLE`, `hpForRound`, boss attack constants.
4. **Enemy mix & spawn-rate helpers** (177-205) — `enemyMixForRound`, `pickEnemyTypeForRound`, `exoSpeedForRound`, `spawnIntervalForRound`, `EXO_TOUCH_COOLDOWN`, `PLAYER_MAX_HP`.
5. **Leaderboard module** (206-269) — localStorage keys, sanitize/prompt/load/save, `addToLeaderboard`, `formatLeaderboard`.
6. **Movement / visual / UI constants** (270-314) — dash, jump, stamina, sprint, player visuals, barrel, muzzle flash, round/intermission, hit burst, ammo/pickup.
7. **Scene `init` + `create()`** (315-694) — `init(data)` reads `skipTitle`; `create()` builds camera/ground/player/barrel/shadow/HUD/title/pause/game-over and wires input + pointerdown fire.
8. **UI/HUD updaters + reload** (695-737) — `updateHPText`, `updateStaminaBar`, `updateRoundText`, `updateKillsText`, `updateAmmoText`, `startReload`.
9. **Pickup & burst spawners** (738-752) — `spawnAmmoPickup`, `spawnHitBurst`.
10. **Round flow** (753-773) — `startIntermission`, `beginNextRound`.
11. **Title & run recording** (774-825) — `refreshTitleText`, `startGameFromTitle`, `recordRunAndFormat`, `triggerVictory`, `triggerGameOver`.
12. **Boss bar helpers** (826-838) — `updateBossBar`, `hideBossBar`.
13. **Hit resolver + body-part helpers** (839-906) — `resolveHit` (neck → head → body zone detection + damage scaling), `buildBodyParts`, `destroyBodyParts`.
14. **Enemy / boss / slime spawn** (907-1009) — `spawnBoss`, `spawnBossSlime`, `spawnExo`.
15. **`update()` main loop** (1010-1432) — title gate → game-over gate → ESC pause → reload tick → WASD → SPACE jump trigger → ALT dash trigger → SHIFT sprint → stamina regen/drain → movement → jump arc → hit-flash tick → player/barrel/shadow render → round/intermission/spawn flow → enemy chase + touch damage + boss windup → slime loop → bullet loop (calls `resolveHit`) → pickups → bursts → muzzle flashes.
16. **`drawAimLine()` PRE_RENDER** (1433-1450) — wired to Phaser `Scenes.Events.PRE_RENDER`; uses `cam.getWorldPoint` so the aim line doesn't lag camera lerp.

## Working in GameScene.js

- **Read the FILE MAP first** (lines 1-24 of `js/GameScene.js`) before doing anything else in that file. The map names every section and its current line range.
- **Read by range, not whole-file.** Use Read with `offset`/`limit` to load only the section you need. Only read the entire file when the task genuinely requires it (cross-section refactors, full audits, structural reviews).
- **If the FILE MAP is out of date** — section header line ranges don't match the map, or a section drifted because lines were added/removed elsewhere — fix the map (and the affected section headers) BEFORE any other work. A stale map is worse than no map.
- **When adding code, place it inside the correct existing section.** Don't dump new helpers at the bottom of the class. After the edit, recompute the affected section's end line plus every later section's start/end, and update both the FILE MAP and the in-file section header comments to match the new line numbers.
- **Don't split the file into multiple modules** without an explicit user-approved restructure step. The FILE MAP is the lightweight alternative to that split.

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
