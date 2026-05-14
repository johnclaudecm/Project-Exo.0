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

- **Last completed:** Step 23 — Headshot weak-point mechanic + Step 22 follow-up tuning. Non-boss enemies (basic/runner/mutant) now spawn with a small `headGfx` dot (lighter shade of body color, 3px radius) drawn ~10px above the body via world offset (-0.3, -0.3). Bullet within `HEAD_HIT_RADIUS = 0.3` of head world point = instant kill regardless of body HP. Body shot still 1 dmg, must drain HP. Boss has `headColor: null` and gets no head (slime blob, no weak point). HP minimums bumped so body-only kill always needs ≥2 shots: Basic 2/3/4, Runner 2/3/4, Mutant 3/4/5 (unchanged). **Barrel/aim-line desync fix:** barrel rotation moved from `update()` to `drawAimLine` (PRE_RENDER) using `cam.getWorldPoint(pointer.x, pointer.y)` — same fresh-cursor source as the aim line, so they can no longer diverge. Click-time bullet direction + muzzle-flash angle also switched to `cam.getWorldPoint` so shots travel down the visible aim line even mid-camera-lerp. *Awaiting playtest confirm.*
- **Step 22 tuning logged at confirm time:** boss `hitRadius` 1.6→1.1 and `touchRadius` 1.4→0.95; `BOSS_HP_TABLE` halved to [25,60,110,200].
- **Last passed playtest:** Step 21 — per-round non-boss HP scaling. ("feels good")
- **Recent polish (not numbered):** sprint on Left Shift; camera zoom 0.75 + follow; aim line moved to `PRE_RENDER` + `cam.getWorldPoint` to remove camera-lerp lag.
- **Session handoff (2026-05-14 EOD):** Step 22 + Step 23 are built and committed but NOT yet playtest-confirmed. Next session: have user playtest first, confirm or tune, THEN propose the next numbered step. Do not start a new feature until the unpaid playtest tab is closed.
- **What needs testing on next playtest:**
  1. **Body shots take ≥2 hits.** Basic + Runner are 2 HP on R1-3, 3 HP on R4-7, 4 HP on R8-10. No 1-shot body kills should ever happen.
  2. **Headshots = instant kill.** Each non-boss zombie has a small light-colored head dot ~10px above the body (basic = light red, runner = light cyan, mutant = light purple). Bullet within ~0.3 world units of the head = instant kill regardless of HP.
  3. **Gun stays glued to aim line.** Sprint around, swing the mouse fast, watch for the barrel rotating off the white aim line. They share one cursor source per render frame now — if they ever diverge, the fix didn't take.
  4. **Bullets travel down the aim line.** Fire while the camera is mid-lerp (right after sprinting). Bullet path should match the aim line, not fly off-angle.
  5. **Boss feel (still unconfirmed from Step 22):** R3 boss at 25 HP (~2.5 mags), R6 at 60, R9 at 110, R10 mega at 200. Hitbox should match the visual silhouette now. Boss has no head — confirm no head dot on it.
  6. **R10 mega boss is the finale beat.** 2.2× size, 1.8s attack cooldown, 200 HP. Should feel like a wall, not unkillable.
- **Next planned:** TBD pending playtest. User is sourcing free asset packs; do NOT auto-propose new placeholder polish. Ask before any visual/audio addition.

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
