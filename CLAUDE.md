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

- **SESSION HANDOFF (2026-05-16):** Step 27 sub-step 2 done + multiple bug fixes confirmed playtested. Phantom cone bug from sub-step 1c IS resolved (verified). Aim-line waving during zoom was a separate Phaser timing bug — `drawAimLine` was hooked to `Phaser.Scenes.Events.PRE_RENDER` (scene-level), which fires BEFORE `Camera.preRender()` does its follow-target lerp; fix was to swap to `cam.on(Phaser.Cameras.Scene2D.Events.PRE_RENDER, ...)` (camera-level event, fires after lerp). AI deaggro tuning landed: chase-memory window (2.5s sprint toward last known pos before dropping to SEARCH) + SEARCH duration 4→7s. Step 27 sub-step 2 wired `assets/ammo-pistol.png` to `spawnAmmoPickup`; preload scaffold loads all 9 carved sprites. **Dev workflow gotcha:** the game MUST be opened via `http://localhost:8000/` (run `python -m http.server 8000 --bind 127.0.0.1` from project root). Double-clicking `index.html` loads on `file://` and Chrome/Edge block XHR cross-origin requests on file://, so every `load.image` call fails with the placeholder texture. **Untracked file `FEEL_NOTES.md` in project root is the user's own — do NOT touch or commit it.**
- **PROJECT DIRECTION SHIFT (2026-05-15):** Shell-first phase. Build a playable sandbox — core systems clean and decoupled, no game-mode logic (no win conditions, scoring, rounds, objectives, intermissions, leaderboards-as-gameplay). Mode-coupled code stays **parked in-place** (round flow, leaderboard, victory/game-over, boss bar, title round framing) — present but uncalled. When user signals "shell is done," game mode work resumes as a new layer on top of core systems. If unsure whether something is core vs mode: ASK. Rule of thumb — core = makes sense in any mode; mode-specific = makes sense only in one mode.
- **Approved shell tasks (in order):** (1) Sandbox runtime swap. (2) Core-feel pass on movement+shooting+camera (tuning only). (3) Asset pipeline end-to-end with one real of each. (4) Enemy config decoupling audit. (5) Small open map expansion.
- **Active step:** Step 27 sub-step 3 — next entity for sprite swap (user chose player body). Plan TBD on next turn.
- **Last completed:** Step 27 sub-step 2 — preload scaffold + first real asset wired end-to-end. `js/GameScene.js` §7 has `preload()` loading 9 sprites (`ammo-pistol`/`-rifle`/`-shotgun` + `-ap` variants, `health-red`/`-green`, `armor`). §9 `spawnAmmoPickup` swapped from `add.rectangle` to `add.image(0, 0, 'ammo-pistol')` with `setDisplaySize(AMMO_PICKUP_W, AMMO_PICKUP_H)`. Pickup loop in §15 is unchanged — Phaser `Image` is drop-in compatible with the `.x/.y/.depth/.destroy()` surface the `Rectangle` exposed. Source sheets, carved PNGs, and `tools/carve_sprites.ps1` (PowerShell + System.Drawing splitter with bg-color-key + bbox-crop) are all in repo. User confirmed visual review passed via a temporary `seedDemoPickups()` ring helper (since deleted).
- **Step 26 sub-step 7 finish (prior):** W/I/C/S state-letter labels above each exo. Pool grows as needed; piggybacks on O toggle. Playtested clean.
- **Step 26 sub-step 6 (prior, same session):** `respawnPlayer` break-chase. Captures `oldWX/oldWY` before teleport; iterates `this.exos`, any in `AI_STATE_CHASE` → `AI_STATE_SEARCH` at the death spot with `aiStateTimer = AI_SEARCH_DURATION`. Playtested clean ("works").
- **Step 26 sub-step 7 partial (prior, same session):** vision + audio debug overlays. **O** = vision (FOV cone non-chase, range circle in chase); **I** = audio (max-loudness hearing ring). `initExoAI` allocates `scene.aiDebugGfx` at depth -100 (below entities), registers keys, wires `drawAIDebugOverlay` into PRE_RENDER. Helpers `drawIsoEllipse`/`drawIsoCone` sample world-space boundary by angle and project via `worldToScreen` (2:1 squash → ellipses). Culls exos > 20 tiles from player to suppress offscreen-source phantom cones. State-letter W/I/C/S labels DEFERRED. **Some phantom artifacts still reported — known issue, see SESSION HANDOFF.**
- **Step 26 sub-step 5 (prior, same session):** `updateExoAI` body + 4 helpers + §15 call-site swap. State machine (WANDER/INVESTIGATE/CHASE/SEARCH), sight check (FOV-gated except CHASE = range-only), sound consumption (`audible iff dist ≤ loudness × hearingMult`; priority = `loudness / dist`), movement at state-appropriate speed. GameScene.js §15 chase math replaced with `updateExoAI(this, e, dt)` + `elen` recompute. Playtested by user — "tests worked very well."
- **Step 26 sub-step 4 (prior):** Player audio triggers (shoot/sprint/walk) push events onto `this.aiSoundEvents`; end-of-frame flush. `updateExoAI` was still a stub so nothing reacted yet. Playtested clean by user 2026-05-15.
- **Step 26 sub-step 3 (prior):** `perception` block per ENEMY_TYPES, 6 new AI state fields per exo (`aiState`/`aiTarget*`/`aiStateTimer`/`aiFacing`/`aiSoundPriority`), `initExoAI(this)` call from `create()`.
- **Step 26 sub-step 2 (prior):** `js/ExoAI.js` skeleton — 7-section module with AI/SOUND constants + state-string constants + stubs. Wired into `index.html` (load order phaser → iso → ExoAI → GameScene → main).
- **Step 26 sub-step 1 (prior):** Map resize WORLD_TILES 40 → 60, SANDBOX_MAX_ALIVE 22, respawn points rewritten.
- **Step 25 (prior, sub-tasks 1.1-1.3 confirmed):** Sandbox runtime swap (1.1), sandbox-mode gates parking the round flow (1.2), multi-point respawn with `respawnPlayer` + `pickSafestRespawnPoint` helpers (1.3). Sub-tasks 1.4 (god mode — was F1, would rebind to a letter key like `G` or `U` per [[debug-tool-keys]] convention below) and 1.5 (housekeeping) **deferred** — superseded by Step 26.
- **Debug-tool key convention:** Use letter keys (U/I/O/P), NOT F1-F12. Edge intercepts F1 as help; other F-keys collide with browser/OS bindings. F12 is reserved for DevTools (uncaptured). Currently bound: **O** = vision overlay (FOV cone / chase range), **I** = audio overlay (max-loudness hearing ring). U + P remain open for future debug tools.
- **Step 24 (prior):** Hit-feel rework — fire-slow + knockback deleted, neck=instakill on Basic/Runner, head=1.25× on Mutant/Boss/Jimmy, `resolveHit` is single source of truth for zone detection, `buildBodyParts`/`destroyBodyParts` shared between exo and boss spawn. Locked.
- **Step 27 sub-step 1e (prior, this session):** AI chase-memory window. `js/ExoAI.js` §1: new `AI_CHASE_MEMORY_DURATION = 2.5`, bumped `AI_SEARCH_DURATION` 4 → 7. §5 CHASE case: on sight-loss, exo tracks `e.aiChaseMemoryTimer` and keeps sprinting toward frozen last-known pos until timer expires; re-acquiring sight resets timer. §14 spawn paths add `aiChaseMemoryTimer: 0` field. User confirmed: "feels really good."
- **Aim-line camera-event fix (prior, this session):** `drawAimLine` hook swapped from scene-level `Phaser.Scenes.Events.PRE_RENDER` to `cam.on(Phaser.Cameras.Scene2D.Events.PRE_RENDER, ...)`. Eliminates aim-line waving during zoom (caused by `cam.getWorldPoint` running against pre-lerp scroll then rendering with post-lerp scroll). This is the actual fix the Step 20 "aim-line lag" entry intended.
- **Town cleanup (prior, this session):** Reverted unauthorized PZ-style town experiment from the prior session (`js/townMap.js`, `map-preview.html`, town render methods, `wouldCollideWithBuilding`, `_resolveMovement`, `PLAYER_COLLISION_RADIUS`). Restored inline ground-render diamond that the town session had deleted (was throwing `ReferenceError: ground is not defined` on load).
- **Last passed playtest:** Step 27 sub-step 2 asset pipeline (2026-05-16, "they are all there and they look good"). All prior listed work also confirmed working in playtest.
- **Next:** Step 27 sub-step 3 — wire player body sprite. User will supply a PNG; we keep rotating barrel + shadow on top, swap only the green ellipse for a sprite. Same `preload + add.image + setDisplaySize` pattern as ammo pickup.
- **SESSION END (2026-05-16, pre-execution):** Sub-step 3 plan written + approved in spirit (user chose "Player body" before leaving) but NOT executed — user wrapped session before supplying `assets/player.png`. Detailed plan in `C:\Users\JohnClaudeDev\.claude\plans\help-me-figure-out-cozy-sloth.md`. On resume: confirm `assets/player.png` is in place, then execute the wiring per the plan (preload entry, ellipse → image swap at line 385, three `setFillStyle` → `setTint`/`clearTint` conversions at lines 1330/1390/1474, FILE MAP refresh, parse check, playtest). **`git push origin main` blocked by auto-classifier — three unpushed commits (`05b209e`, `0d69b25`, plus this handoff note commit) sitting on local main waiting on user authorization.** Background `python -m http.server` was stopped at session end — restart with the command in the "Running the game" section above.
- **Parked (mode-coupled, do not extend):** round flow (`startIntermission`, `beginNextRound`, BOSS_ROUNDS, HP/size/cooldown tables, round-scaled mix/speed/spawn-rate helpers), leaderboard module, `triggerVictory`/`triggerGameOver`/`recordRunAndFormat`, round-counter HUD framing, boss HP bar. Code stays present and untouched. Mode-revival uses these as-is.

(Update this section after each step.)

## Project layout

- `index.html` — entry. Loads Phaser 3.80.1 via CDN + the JS files in order: iso → ExoAI → GameScene → main.
- `js/iso.js` — `worldToScreen` / `screenToWorld`, plus `WORLD_TILES` (currently 120), `TILE_W`, `TILE_H`. **Locked transform — don't modify the math. `WORLD_TILES` can be retuned but everything in the codebase parameterizes off it.**
- `js/ExoAI.js` — free-function module for the perception-based enemy AI: state machine, sight, hearing, O/I debug overlays. Has its own FILE MAP. Loaded before GameScene.js. All functions take `scene` (GameScene instance) as first arg. As of sub-step 7 (partial): state machine + 4 helpers + vision/audio overlays filled (`updateExoAI`/`aiCheckSight`/`aiReachedTarget`/`aiPickWanderTarget`/`aiConsumeSounds`/`drawAIDebugOverlay`/`drawIsoEllipse`/`drawIsoCone`). State-letter labels (W/I/C/S above each exo) deferred from sub-step 7.
- `js/main.js` — Phaser config. 1280x720, Arcade physics, scene = GameScene.
- `js/GameScene.js` — everything else. Game state, render, input, audio synth, leaderboard, per-type combat config (`ENEMY_TYPES`), spawn, hit resolution.
- `assets/` — placeholder PNGs. Three source sprite sheets (`Ammo-Packs-Misc.png`, `Ammo-Packs2-misc.png`, `Health-Packs-Misc.png`) from user; nine carved per-sprite PNGs (`ammo-pistol`/`ammo-rifle`/`ammo-shotgun` + `-ap` variants, `health-red`/`-green`, `armor`). All loaded via `preload()` in §7 even when only one is wired into a spawn site — keeps them ready when we wire more.
- `tools/carve_sprites.ps1` — PowerShell + System.Drawing splitter. Splits a 3-sprite sheet into thirds, color-keys the gray bg to transparent, crops each slice to bbox. Re-runnable; output paths hardcoded for the current three sheets. Don't run on file:// — it's a CLI tool, not browser-dependent.
- `CLAUDE.md` (this file) — operating rules + current step.
- `PROGRESS.md` — append-only run log (newest at top).
- `DECISIONS.md` — locked-in choices, one line each.

## Running the game

The game MUST be opened via a local HTTP server. `file://` doesn't work because Chrome/Edge block XHR cross-origin requests on file:// origins, and Phaser's image loader uses XHR — every `load.image` call fails silently and you get placeholder textures (black square + green slash).

Standard dev loop:
```
python -m http.server 8000 --bind 127.0.0.1
```
from the project root, then open `http://localhost:8000/`. Leave the server running across reloads; stop with Ctrl+C.

## GameScene.js structure

The file has a FILE MAP comment block at the top (lines 1-24) with exact line ranges. Major sections (line ranges as of last update — trust the FILE MAP if these drift):

1. **Audio synth module** (25-75) — WebAudio context + `sfxShoot`/`sfxEnemyHit`/`sfxEnemyDeath`/`sfxPlayerHit`.
2. **Combat constants + sandbox spawn** (76-149) — player, bullet, aim, exo spawn, `ENEMY_TYPES` (each type now has a nested `perception: { sightRange, sightFOV, hearingMult, chaseSpeedMult, wanderSpeedMult }` block per Step 26 sub-step 3), head/neck zone constants, spread/recoil, sandbox spawn constants (`SANDBOX_SPAWN_INTERVAL`, `SANDBOX_MAX_ALIVE`, `SANDBOX_SPAWN_POOL`, `SANDBOX_ENEMY_BASE_SPEED`, `SANDBOX_RESPAWN_POINTS` — editable array of `{wx, wy}` entries, user-owned).
3. **Boss / round helpers** (150-197) — `BOSS_ROUNDS`/`BOSS_HP_TABLE`/`BOSS_SIZE_TABLE`/`BOSS_ATTACK_COOLDOWN_TABLE`, `hpForRound`, boss attack constants. *(Mode-coupled, parked.)*
4. **Enemy mix & spawn-rate helpers** (198-226) — `enemyMixForRound`, `pickEnemyTypeForRound`, `exoSpeedForRound`, `spawnIntervalForRound`, `EXO_TOUCH_COOLDOWN`, `PLAYER_MAX_HP`. *(Round-scaled helpers are mode-coupled, parked. `EXO_TOUCH_COOLDOWN` + `PLAYER_MAX_HP` are core.)*
5. **Leaderboard module** (227-290) — localStorage keys, sanitize/prompt/load/save, `addToLeaderboard`, `formatLeaderboard`. *(Mode-coupled, parked.)*
6. **Movement / visual / UI constants** (291-341) — dash, jump, stamina, sprint, player visuals, barrel, muzzle flash, round/intermission, hit burst, ammo/pickup, **camera zoom** (`CAM_ZOOM_DEFAULT=0.75`, `CAM_ZOOM_MIN=0.4`, `CAM_ZOOM_MAX=1.5`, `CAM_ZOOM_STEP=1.1`).
7. **Scene `init` + `preload` + `create()`** (342-768) — `init(data)` reads `skipTitle`; **`preload()` loads all 9 carved sprites** (`ammo-pistol`/`-rifle`/`-shotgun` + `-ap` variants, `health-red`/`-green`, `armor`); `create()` builds camera/ground/player/barrel/shadow/HUD/title/pause/game-over and wires input + pointerdown fire. The aim-line hook uses `cam.on(Phaser.Cameras.Scene2D.Events.PRE_RENDER, ...)` — camera-level event, fires after Camera.preRender lerp so `cam.getWorldPoint` is correct. Pointerdown also calls `emitSound(this, x, y, SOUND_LOUDNESS_SHOOT)`. Inits `this.sandboxMode=true` + `this.sandboxSpawnTimer=0`, then calls `initExoAI(this)` (from `js/ExoAI.js`).
8. **UI/HUD updaters + reload** (769-812) — `updateHPText`, `updateStaminaBar`, `updateRoundText` *(empty in sandbox mode)*, `updateKillsText`, `updateAmmoText`, `startReload`.
9. **Pickup & burst spawners** (813-828) — `spawnAmmoPickup` (now uses `add.image(0, 0, 'ammo-pistol')` + `setDisplaySize(AMMO_PICKUP_W, AMMO_PICKUP_H)` — the per-frame loop in §15 only touches `.x/.y/.depth/.destroy()`, drop-in compatible with Phaser `Image`); `spawnHitBurst`.
10. **Round flow + sandbox spawn/respawn** (829-903) — `startIntermission`, `beginNextRound` *(mode-coupled, parked — unreachable in sandbox mode)*; `sandboxSpawnTick(deltaSec)` (core, picks from `SANDBOX_SPAWN_POOL`, calls `spawnExo({type, hp, speed})`, respects `SANDBOX_MAX_ALIVE`); `pickSafestRespawnPoint()` (core, returns entry in `SANDBOX_RESPAWN_POINTS` with greatest min-distance to any alive enemy); `respawnPlayer()` (core, captures old player pos, picks safe point, resets HP/position/stamina/jump/dash + HUD, **breaks any CHASE-state exo to SEARCH at the death position with timer = AI_SEARCH_DURATION** so chasers investigate the corpse instead of relocking on the new spawn).
11. **Title & run recording** (904-960) — `refreshTitleText` *(sandbox-gated: shows "start sandbox" prompt, clears leaderboard)*, `startGameFromTitle` *(mode-agnostic — only sets phase=PLAYING)*, `recordRunAndFormat`, `triggerVictory`, `triggerGameOver` *(parked: unreachable in sandbox mode — HP=0 calls `respawnPlayer` instead)*.
12. **Boss bar helpers** (961-973) — `updateBossBar`, `hideBossBar`. *(Mode-coupled, parked.)*
13. **Hit resolver + body-part helpers** (974-1041) — `resolveHit` (neck → head → body zone detection + damage scaling), `buildBodyParts`, `destroyBodyParts`.
14. **Enemy / boss / slime spawn** (1042-1159) — `spawnBoss`, `spawnBossSlime`, `spawnExo(opts={})`. Each spawned exo carries AI fields: `aiState`, `aiTargetWX/Y`, `aiStateTimer`, **`aiChaseMemoryTimer`** (sub-step 1e — chase-memory window when sight is lost mid-chase), `aiFacing`, `aiSoundPriority`. `spawnExo` accepts optional `{ type, hp, speed }`.
15. **`update()` main loop** (1160-1600) — title gate → game-over gate → ESC pause → reload tick → WASD → SPACE jump trigger → ALT dash trigger → SHIFT sprint → stamina regen/drain → movement (inline `worldX/Y += dx/dy` + `Phaser.Math.Clamp(0, WORLD_TILES)`; with throttled `emitSound` for sprint/walk; dash + jump silent) → jump arc → hit-flash tick → player/barrel/shadow render → **spawn flow** (`if sandboxMode: sandboxSpawnTick(dt) else { round/intermission/boss/victory block }`) → **per-exo `updateExoAI(this, e, dt)`** + touch damage (HP=0 branches `sandboxMode` → `respawnPlayer` else `triggerGameOver`) + boss windup → slime loop → bullet loop (calls `resolveHit`) → pickups → bursts → muzzle flashes → **flush `aiSoundEvents`**.
16. **`drawAimLine()` PRE_RENDER** (1601-1618) — wired to `Phaser.Cameras.Scene2D.Events.PRE_RENDER` ON THE MAIN CAMERA (not the scene event — scene PRE_RENDER fires before camera lerp, causing aim-line wave during zoom). Uses `cam.getWorldPoint`.

## Working in GameScene.js

- **Read the FILE MAP first** (lines 1-24 of `js/GameScene.js`) before doing anything else in that file. The map names every section and its current line range.
- **Read by range, not whole-file.** Use Read with `offset`/`limit` to load only the section you need. Only read the entire file when the task genuinely requires it (cross-section refactors, full audits, structural reviews).
- **If the FILE MAP is out of date** — section header line ranges don't match the map, or a section drifted because lines were added/removed elsewhere — fix the map (and the affected section headers) BEFORE any other work. A stale map is worse than no map.
- **When adding code, place it inside the correct existing section.** Don't dump new helpers at the bottom of the class. After the edit, recompute the affected section's end line plus every later section's start/end, and update both the FILE MAP and the in-file section header comments to match the new line numbers.
- **Don't split the file into multiple modules** without an explicit user-approved restructure step. The FILE MAP is the lightweight alternative to that split. *(Exception that's already happened: AI extracted to `js/ExoAI.js` in Step 26 sub-step 2, approved after sub-step-5 line-count estimate crossed ~1700.)*

## Working in ExoAI.js

Same rules as GameScene.js — read its own FILE MAP first (lines 1-22 of `js/ExoAI.js`), read by range, fix stale FILE MAP before any work. ExoAI.js is a flat function module (no class). All entry points take the GameScene instance as `scene` first arg. State lives on the scene (`scene.aiSoundEvents`, `scene.aiDebugLabels`, etc.) — never as module-level mutables. AI state per exo lives on the exo object itself (`e.aiState`, `e.aiTargetWX/Y`, `e.aiStateTimer`, `e.aiFacing`, `e.aiSoundPriority`).

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
- `project_exo_approve_design_calls` — feel-affecting design calls (respawn behavior, spawn locations, etc.) need explicit user approval before implementation.

## When the user says "go" / "good" / "works"

That confirms the last step. Jump straight into the next step (Plan Mode first). No "say go" tail. Still STOP after building the next step so they can test.

## Boundaries (from global CLAUDE.md)

This is the `JohnClaudeDev` Windows user account. Do not touch other Windows users, do not escalate privileges, do not install globally. All project work stays inside `C:\Users\JohnClaudeDev\Desktop\Projects\Project-Exo.0\`.
