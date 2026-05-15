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

- **SESSION HANDOFF (2026-05-15 EOD):** Shut down clean after Step 26 sub-step 4. **Next session: jump straight into sub-step 5** — the big behavioral step where exos finally use sight + hearing. Plan file at `C:\Users\JohnClaudeDev\.claude\plans\temporal-brewing-yeti.md`. Sub-step 4 was committed and pushed but NOT playtested by the user — first thing next session should be a quick playtest to confirm game still boots and behaves like sub-step 3 (sound events accumulate in `this.aiSoundEvents` and flush each frame; `updateExoAI` is still a stub so no exo reaction yet; old chase math still runs). If that passes, proceed to sub-step 5. Sub-step 5 = `updateExoAI(scene, e, dt)` body in `js/ExoAI.js`: state machine (WANDER/INVESTIGATE/CHASE/SEARCH), sight check (FOV-gated except CHASE = range-only), sound consumption, state-appropriate movement. Plus fill the internal helpers (`aiCheckSight`, `aiReachedTarget`, `aiPickWanderTarget`, `aiConsumeSounds`). Then replace chase math at GameScene.js §15 ~line 1311 with `updateExoAI(this, e, dt)`. Touch damage + boss windup stay unchanged. **Untracked file `FEEL_NOTES.md` in project root is the user's own — do NOT touch or commit it.**
- **PROJECT DIRECTION SHIFT (2026-05-15):** Shell-first phase. Build a playable sandbox — core systems clean and decoupled, no game-mode logic (no win conditions, scoring, rounds, objectives, intermissions, leaderboards-as-gameplay). Mode-coupled code stays **parked in-place** (round flow, leaderboard, victory/game-over, boss bar, title round framing) — present but uncalled. When user signals "shell is done," game mode work resumes as a new layer on top of core systems. If unsure whether something is core vs mode: ASK. Rule of thumb — core = makes sense in any mode; mode-specific = makes sense only in one mode.
- **Approved shell tasks (in order):** (1) Sandbox runtime swap. (2) Core-feel pass on movement+shooting+camera (tuning only). (3) Asset pipeline end-to-end with one real of each. (4) Enemy config decoupling audit. (5) Small open map expansion.
- **Active step:** Step 26 — Perception-based exo AI + bigger map (shell-phase core system). Plan file: `C:\Users\JohnClaudeDev\.claude\plans\temporal-brewing-yeti.md`. AI lives in NEW file `js/ExoAI.js` (split decided after sub-step-2 line-count threshold hit). 8 sub-steps planned, one at a time, STOP after each.
- **Last completed:** Step 26 sub-step 4 — Player audio triggers + per-frame sound queue. (a) Shoot: `emitSound(this, player.worldX, player.worldY, SOUND_LOUDNESS_SHOOT)` added right after `sfxShoot()` in the pointerdown fire handler (§7). One event per shot. (b) WASD movement block (§15): when sprinting (Shift + moving + stamina + not dashing), throttle `aiSprintSoundTimer` to fire `SOUND_LOUDNESS_SPRINT` every `SOUND_SPRINT_EMIT_INTERVAL=0.5s`. When walking (moving but not sprinting), throttle `aiWalkSoundTimer` to fire `SOUND_LOUDNESS_WALK` every `SOUND_WALK_EMIT_INTERVAL=0.8s`. Dash + jump deliberately silent — note in code. (c) End of `update()` (§15): `this.aiSoundEvents.length = 0;` flushes the queue. Events live one frame. `updateExoAI` is still a stub, so nothing consumes the events yet — gameplay unchanged. FILE MAP + §7-§16 headers updated for +17 line shift. Both files parse clean.
- **Step 26 sub-step 3 (prior):** `perception` block per ENEMY_TYPES, 6 new AI state fields per exo (`aiState`/`aiTarget*`/`aiStateTimer`/`aiFacing`/`aiSoundPriority`), `initExoAI(this)` call from `create()`.
- **Step 26 sub-step 2 (prior):** `js/ExoAI.js` skeleton — 7-section module with AI/SOUND constants + state-string constants + stubs. Wired into `index.html` (load order phaser → iso → ExoAI → GameScene → main).
- **Step 26 sub-step 1 (prior):** Map resize WORLD_TILES 40 → 60, SANDBOX_MAX_ALIVE 22, respawn points rewritten.
- **Step 25 (prior, sub-tasks 1.1-1.3 confirmed):** Sandbox runtime swap (1.1), sandbox-mode gates parking the round flow (1.2), multi-point respawn with `respawnPlayer` + `pickSafestRespawnPoint` helpers (1.3). Sub-tasks 1.4 (god mode — was F1, would rebind to a letter key like `G` or `U` per [[debug-tool-keys]] convention below) and 1.5 (housekeeping) **deferred** — superseded by Step 26.
- **Debug-tool key convention:** Use letter keys (U/I/O/P), NOT F1-F12. Edge intercepts F1 as help; other F-keys collide with browser/OS bindings. F12 is reserved for DevTools (uncaptured). Sub-step 7 binds **O** = AI debug overlay (Overlay). U/I/P stay open for future debug tools.
- **Step 24 (prior):** Hit-feel rework — fire-slow + knockback deleted, neck=instakill on Basic/Runner, head=1.25× on Mutant/Boss/Jimmy, `resolveHit` is single source of truth for zone detection, `buildBodyParts`/`destroyBodyParts` shared between exo and boss spawn. Locked.
- **Last passed playtest:** Step 25 sub-task 1.3 with multi-spawn revision (2026-05-15). Step 26 sub-step 1 is pre-playtest.
- **Next:** Step 26 sub-step 5 — The big one. Fill `updateExoAI(scene, e, dt)` body in ExoAI.js: state machine (WANDER/INVESTIGATE/CHASE/SEARCH), sight check (FOV-gated except CHASE = range-only), sound consumption from queue, movement at state-appropriate speed. Plus internal helpers `aiCheckSight`, `aiReachedTarget`, `aiPickWanderTarget`, `aiConsumeSounds`. Replace chase math at §15 (~line 1311 — was 1283 before line shifts) with `updateExoAI(this, e, dt)`. Touch damage + boss windup stay unchanged. THIS is when exos finally start wandering/investigating/chasing properly. Waiting on sub-step 4 playtest confirmation first.
- **Parked (mode-coupled, do not extend):** round flow (`startIntermission`, `beginNextRound`, BOSS_ROUNDS, HP/size/cooldown tables, round-scaled mix/speed/spawn-rate helpers), leaderboard module, `triggerVictory`/`triggerGameOver`/`recordRunAndFormat`, round-counter HUD framing, boss HP bar. Code stays present and untouched. Mode-revival uses these as-is.

(Update this section after each step.)

## Project layout

- `index.html` — entry. Loads Phaser 3.80.1 via CDN + the JS files in order: iso → ExoAI → GameScene → main.
- `js/iso.js` — `worldToScreen` / `screenToWorld`, plus `WORLD_TILES` (currently 60), `TILE_W`, `TILE_H`. **Locked transform — don't modify the math. `WORLD_TILES` can be retuned but everything in the codebase parameterizes off it.**
- `js/ExoAI.js` — free-function module for the perception-based enemy AI: state machine, sight, hearing, O-key debug overlay. Has its own FILE MAP. Loaded before GameScene.js. All functions take `scene` (GameScene instance) as first arg. As of sub-step 2: stubs only; behavior fills in sub-steps 4/5/7.
- `js/main.js` — Phaser config. 1280x720, Arcade physics, scene = GameScene.
- `js/GameScene.js` — everything else. Game state, render, input, audio synth, leaderboard, per-type combat config (`ENEMY_TYPES`), spawn, hit resolution.
- `CLAUDE.md` (this file) — operating rules + current step.
- `PROGRESS.md` — append-only run log (newest at top).
- `DECISIONS.md` — locked-in choices, one line each.

## GameScene.js structure

The file has a FILE MAP comment block at the top (lines 1-24) with exact line ranges. Major sections (line ranges as of last update — trust the FILE MAP if these drift):

1. **Audio synth module** (25-75) — WebAudio context + `sfxShoot`/`sfxEnemyHit`/`sfxEnemyDeath`/`sfxPlayerHit`.
2. **Combat constants + sandbox spawn** (76-149) — player, bullet, aim, exo spawn, `ENEMY_TYPES` (each type now has a nested `perception: { sightRange, sightFOV, hearingMult, chaseSpeedMult, wanderSpeedMult }` block per Step 26 sub-step 3), head/neck zone constants, spread/recoil, sandbox spawn constants (`SANDBOX_SPAWN_INTERVAL`, `SANDBOX_MAX_ALIVE`, `SANDBOX_SPAWN_POOL`, `SANDBOX_ENEMY_BASE_SPEED`, `SANDBOX_RESPAWN_POINTS` — editable array of `{wx, wy}` entries, user-owned).
3. **Boss / round helpers** (150-197) — `BOSS_ROUNDS`/`BOSS_HP_TABLE`/`BOSS_SIZE_TABLE`/`BOSS_ATTACK_COOLDOWN_TABLE`, `hpForRound`, boss attack constants. *(Mode-coupled, parked.)*
4. **Enemy mix & spawn-rate helpers** (198-226) — `enemyMixForRound`, `pickEnemyTypeForRound`, `exoSpeedForRound`, `spawnIntervalForRound`, `EXO_TOUCH_COOLDOWN`, `PLAYER_MAX_HP`. *(Round-scaled helpers are mode-coupled, parked. `EXO_TOUCH_COOLDOWN` + `PLAYER_MAX_HP` are core.)*
5. **Leaderboard module** (227-290) — localStorage keys, sanitize/prompt/load/save, `addToLeaderboard`, `formatLeaderboard`. *(Mode-coupled, parked.)*
6. **Movement / visual / UI constants** (291-335) — dash, jump, stamina, sprint, player visuals, barrel, muzzle flash, round/intermission, hit burst, ammo/pickup.
7. **Scene `init` + `create()`** (336-721) — `init(data)` reads `skipTitle`; `create()` builds camera/ground/player/barrel/shadow/HUD/title/pause/game-over and wires input + pointerdown fire. Pointerdown also calls `emitSound(this, x, y, SOUND_LOUDNESS_SHOOT)` (sub-step 4). Inits `this.sandboxMode=true` + `this.sandboxSpawnTimer=0`, then calls `initExoAI(this)` (from `js/ExoAI.js`).
8. **UI/HUD updaters + reload** (722-765) — `updateHPText`, `updateStaminaBar`, `updateRoundText` *(empty in sandbox mode)*, `updateKillsText`, `updateAmmoText`, `startReload`.
9. **Pickup & burst spawners** (766-780) — `spawnAmmoPickup`, `spawnHitBurst`.
10. **Round flow + sandbox spawn/respawn** (781-843) — `startIntermission`, `beginNextRound` *(mode-coupled, parked — unreachable in sandbox mode)*; `sandboxSpawnTick(deltaSec)` (core, picks from `SANDBOX_SPAWN_POOL`, calls `spawnExo({type, hp, speed})`, respects `SANDBOX_MAX_ALIVE`); `pickSafestRespawnPoint()` (core, returns entry in `SANDBOX_RESPAWN_POINTS` with greatest min-distance to any alive enemy); `respawnPlayer()` (core, calls picker then resets HP/position/stamina/jump/dash + HUD).
11. **Title & run recording** (844-900) — `refreshTitleText` *(sandbox-gated: shows "start sandbox" prompt, clears leaderboard)*, `startGameFromTitle` *(mode-agnostic — only sets phase=PLAYING)*, `recordRunAndFormat`, `triggerVictory`, `triggerGameOver` *(parked: unreachable in sandbox mode — HP=0 calls `respawnPlayer` instead)*.
12. **Boss bar helpers** (901-913) — `updateBossBar`, `hideBossBar`. *(Mode-coupled, parked.)*
13. **Hit resolver + body-part helpers** (914-981) — `resolveHit` (neck → head → body zone detection + damage scaling), `buildBodyParts`, `destroyBodyParts`.
14. **Enemy / boss / slime spawn** (982-1097) — `spawnBoss`, `spawnBossSlime`, `spawnExo(opts={})`. Each spawned exo (basic/runner/mutant AND boss) carries new AI fields: `aiState` (init `AI_STATE_WANDER`), `aiTargetWX`/`aiTargetWY` (null until first AI tick), `aiStateTimer` (0), `aiFacing` (`atan2` toward map center), `aiSoundPriority` (0). `spawnExo` accepts optional `{ type, hp, speed }`; defaults reproduce round-driven behavior for zero-arg call.
15. **`update()` main loop** (1098-1542) — title gate → game-over gate → ESC pause → reload tick → WASD → SPACE jump trigger → ALT dash trigger → SHIFT sprint → stamina regen/drain → movement (with throttled `emitSound` for sprint/walk; dash + jump silent) → jump arc → hit-flash tick → player/barrel/shadow render → **spawn flow** (`if sandboxMode: sandboxSpawnTick(dt) else { round/intermission/boss/victory block }`) → enemy chase + touch damage (HP=0 branches `sandboxMode` → `respawnPlayer` else `triggerGameOver`) + boss windup → slime loop (same HP=0 branch) → bullet loop (calls `resolveHit`) → pickups → bursts → muzzle flashes → **flush `aiSoundEvents`** (queue lives one frame).
16. **`drawAimLine()` PRE_RENDER** (1543-1559) — wired to Phaser `Scenes.Events.PRE_RENDER`; uses `cam.getWorldPoint` so the aim line doesn't lag camera lerp.

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
