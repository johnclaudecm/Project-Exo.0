# Project Exo — Progress Log

Append-only. **Newest entries at the top.** Each entry: what was built, what was tested, pass/fail, any tuning decisions or feedback that landed.

When a tuning pass spans multiple turns (e.g. "PLAYER_SPEED 12 → 9 → 6"), record the final number and a one-line "why."

---

## 2026-05-16 — Step 27 sub-step 2: preload scaffold + first real asset (ammo pickup)
**Built:** Asset pipeline end-to-end with one real asset. User dropped three Kenney-style 347×213 sprite sheets in `assets/` (`Ammo-Packs-Misc.png`, `Ammo-Packs2-misc.png`, `Health-Packs-Misc.png`). Wrote `tools/carve_sprites.ps1` (PowerShell + System.Drawing) — splits each sheet into thirds, color-keys the gray bg (RGB 88/88/88, tolerance 6) to transparent, crops each slice to bbox of non-bg pixels, saves as PNG. Output: nine carved sprites (`ammo-pistol`, `ammo-rifle`, `ammo-shotgun`, plus `-ap` variants for the 2nd sheet, and `health-red`, `health-green`, `armor`). Per user: pistol is the "first weapon" ammo; AP variants are "secondary form, possibly armor-piercing"; red is the active health pack, green saved for later, armor saved for later.

`js/GameScene.js` §7: added `preload()` between `init` and `create` that loads all 9 sprites via `this.load.image(key, 'assets/key.png')`. §9: `spawnAmmoPickup` swapped from `add.rectangle(...)` to `add.image(0, 0, 'ammo-pistol')` + `setDisplaySize(AMMO_PICKUP_W, AMMO_PICKUP_H)`. The pickup loop in §15 is unchanged — Phaser `Image` is drop-in compatible with the `.x/.y/.depth/.destroy()` surface the old `Rectangle` exposed. `AMMO_PICKUP_COLOR` constant left in place (one line, no cost; don't ripple-clean).

**Visual review:** Bundled with the playtest: a temporary `seedDemoPickups()` helper placed one of each carved sprite in a ring around the player at radius 10 (~20m, since 1 tile ≈ 2m) using the same 10×10 display scale as live drops. User confirmed all 9 looked good. Helper deleted after review — clean baseline.

**file://-protocol gotcha:** First reload after the wiring rendered Phaser's "texture not found" placeholder (black square with green slash) for every sprite. Console showed `Access to XMLHttpRequest at 'file:///.../assets/...png' from origin 'null' has been blocked by CORS policy` for every PNG — browser was loading `index.html` via file://, and Chrome/Edge block XHR on file:// origins. Phaser's image loader uses XHR. Fix: ran `python -m http.server 8000 --bind 127.0.0.1` from the project root (background process), user loads `http://localhost:8000/` instead. Going forward every dev session must use the local HTTP server, not a double-clicked file. Logged in `tools/carve_sprites.ps1` companion only — no game-side change needed.

**Line shifts:** GameScene.js 1605 → 1618. §7 +12 (preload method), §9 +1 (setDisplaySize), §10-§16 shifted +13. FILE MAP + every §7-§16 in-file header updated. New ranges: §7 342-768, §8 769-812, §9 813-828, §10 829-903, §11 904-960, §12 961-973, §13 974-1041, §14 1042-1159, §15 1160-1600, §16 1601-1618.

---

## 2026-05-16 — Aim-line camera-event fix (waving during zoom)
**Built:** User reported the aim line "waving left and right" during mouse-wheel zoom. Root cause: `drawAimLine` was hooked to `Phaser.Scenes.Events.PRE_RENDER` (scene-level), which fires BEFORE `Camera.preRender()` does its follow-target lerp. So `cam.getWorldPoint(pointer.x, pointer.y)` ran against the previous frame's scroll, then the camera lerped, then the line was rendered with the new scroll — endpoint offset by `(oldScroll - newScroll) * zoom` pixels. Tiny during normal play (lerp delta per frame is small); large and visible during zoom because the camera scroll target jumps when the viewport size changes around the player.

**Fix:** `js/GameScene.js` §7 — swapped `this.events.on(Phaser.Scenes.Events.PRE_RENDER, ...)` to `cam.on(Phaser.Cameras.Scene2D.Events.PRE_RENDER, ...)`. The camera-level event fires from inside `Camera.preRender()` AFTER scroll is updated. Endpoint now resolves against the post-lerp camera state and the line is rock-steady at any zoom.

This was the actual fix for the "aim-line lag" Step 20 was supposed to address — Step 20 moved the hook from `update()` to scene-PRE_RENDER, which was the wrong PRE_RENDER. **User confirmed "feels really good."**

**Line shifts:** +4 lines in §7 (4-line comment explaining the swap). FILE MAP + §7-§16 in-file headers shifted +4. (Specific ranges land in the sub-step 2 entry above since both shipped together.)

---

## 2026-05-16 — Step 27 sub-step 1e: AI chase memory + longer search
**Built:** User reported "AI deaggrovates too quickly. They are a little too dumb." Researched against Hitman/RE-style enemy vision systems — the missing piece was a chase-memory window between CHASE and SEARCH.

`js/ExoAI.js` §1: new constant `AI_CHASE_MEMORY_DURATION = 2.5` (seconds). Bumped `AI_SEARCH_DURATION` 4.0 → 7.0. §5 CHASE state: when sight is lost (`dist > sightRange`), open or tick a chase-memory timer on the exo (`aiChaseMemoryTimer` field). While the timer is active, target stays frozen at last known position, speed stays at `chaseSpeedMult` — exo sprints toward where you went. If sight is regained before the timer expires, instantly snap back to live tracking and reset the timer. If the timer hits 0 without re-acquisition, drop to SEARCH (which now lasts 7s, walking at `wanderSpeedMult`).

`js/GameScene.js` §14: added `aiChaseMemoryTimer: 0` field to both spawn paths (`spawnBoss` line 1065 area and `spawnExo` line 1132 area).

**User confirmed:** "feels really good."

**Line shifts:** ExoAI.js 341 → 358 (+17 from new constant block + expanded CHASE case). GameScene.js +2 (one field per spawn site). FILE MAPs + section headers updated in both files.

---

## 2026-05-16 — Town-experiment cleanup + ground-render restore
**Built:** Previous session crashed mid-experiment on an unauthorized "PZ-style town" (HOTEL/POLICE/STORE/GAS buildings inside the 120×120 world). The town session deleted the inline ground-render block from `create()` but left `worldObjects = [ground, this.player, ...]` referencing the now-undefined `ground` variable — `ReferenceError: ground is not defined` on load. Likely the reason the session ended abruptly.

**Cleanup actions:**
- Deleted `js/townMap.js` (untracked, never logged) — 30×30 PZ-style town with HOTEL/POLICE/STORE/GAS building data.
- Deleted `map-preview.html` (untracked) — standalone canvas preview of the town.
- `index.html`: reverted the added `<script src="js/townMap.js"></script>` line.
- `js/GameScene.js`:
  - §2: removed `PLAYER_COLLISION_RADIUS = 0.35` (only used by `wouldCollideWithBuilding`).
  - §7 FILE MAP entry + section header: `init + create() + TOWN` → `init + create()`.
  - §7 `create()`: removed `this.renderTownGround()` + `this.renderTownBuildings()` calls; restored the inline ground graphics block (single filled diamond, fillStyle 0x2b2b2b, depth -1000) that the town session had deleted.
  - §7 town methods (148 lines): deleted `renderTownGround`, `renderTownBuildings`, `_drawWindowsOnWall`, `_darken`.
  - §10: deleted `wouldCollideWithBuilding(wx, wy, radius)`.
  - §10: deleted `_resolveMovement(dx, dy)` slide-collision helper.
  - §15 dash + walk/sprint movement: restored inline `worldX/Y += dx/dy` + `Phaser.Math.Clamp(0, WORLD_TILES)` updates at both call sites.
  - FILE MAP + every §7-§16 in-file header recomputed.

**Tooling note:** `Get-Content | Measure-Object -Line` undercounts a Get-Content array by 1 (trailing-newline handling); use `(Get-Content path).Count` for true row count. Burned a minute on this.

**Net effect:** Repo back to a clean shell-phase baseline — only the legitimate Step 26 sub-steps 5/6/7 + Step 27 sub-step 1 (a-d) work remains. Grep across the repo for `town|TOWN|HOTEL|POLICE|SIDEWALK|ASPHALT|wouldCollideWithBuilding|PLAYER_COLLISION_RADIUS|_resolveMovement|TILE_TYPE|TILE_COLORS|townMap` returns zero matches. **`FEEL_NOTES.md` left untouched** (user-owned per CLAUDE.md handoff).

---

## 2026-05-15 — Step 27 sub-step 1d: Hidden cursor + small + crosshair
**Built:** `this.game.canvas.style.cursor = 'none'` hides the OS pointer. A new `this.crosshair = this.add.graphics()` at depth 10500 draws a 4-segment + (2px gap in the center, ±6px reach) in white α 0.85. Added to `cam.ignore([...])` so it renders only via the UI camera (no zoom). Position updated each frame at the top of `update()` from `this.input.activePointer.x/y`. Always visible — even on title/pause/game-over screens, since hiding it conditionally would be more code for no obvious benefit.

**Line shifts:** +9 in §7 (crosshair setup), +2 in §15 (per-frame position update). FILE MAP + §7-§16 in-file headers shifted +11. New ranges: §7 342-753, §8 754-797, §9 798-812, §10 813-887, §11 888-944, §12 945-957, §13 958-1025, §14 1026-1141, §15 1142-1582, §16 1583-1600.

---

## 2026-05-15 — Step 27 sub-step 1c: Camera dual-render fix (likely solves long-standing phantom-cone bug)
**Built:** User reported visual bugs after the zoom + FPS additions: shooting line fading/popping, FPS counter "duplicated near the character" at off-default zoom, "duplicated green dot" on player + AI models when zoomed out. Root cause discovered: **the project has a dual-camera setup** (`cam` for world with zoom, `uiCam` for HUD with no zoom, set up at GameScene.js §7 lines 466-469) and there's an explicit `cam.ignore([...all HUD elements...])` + `uiCam.ignore(this.worldObjects)` at lines 668-669. Every dynamic spawn site already calls `this.uiCam.ignore(newObj)`. But three new objects added in recent sub-steps were never added to any ignore list:

1. **`this.fpsText`** (Step 27 sub-step 1b) — missing from the static `cam.ignore([...])` HUD list. Result: UI camera renders it at world-space-zoom-1 position, main camera renders it at scrollFactor=0-but-zoomed position. Two FPS counters at different screen coords, moving apart as you zoom.
2. **`scene.aiDebugGfx`** (Step 26 sub-step 7) — created in `initExoAI` in ExoAI.js, no `scene.uiCam.ignore` call. Result: UI camera renders the cone/ring graphics at world-space-zoom-1, treating world coords as screen coords. Since exos are at world positions like (60, 60) but UI camera doesn't transform, this draws everything near the top-left of the screen. **This is almost certainly the long-standing "phantom cone" bug** — the user has been seeing cones drawn near the upper-left of the screen because UI camera rendered the world-space cone graphics untransformed.
3. **`scene.aiDebugLabels[]`** (Step 26 sub-step 7 finish) — created in `drawAIDebugOverlay`, no ignore call. Result: state letters duplicate near upper-left for same reason as #2.

*Fixes applied:*
- `js/GameScene.js` line 668: added `this.fpsText` to the `cam.ignore([...])` list.
- `js/GameScene.js` line 348: added `cam.setRoundPixels(true)` for sub-pixel snapping (helps with the "fading" and "duplicated green dot" jitter at off-default zoom).
- `js/GameScene.js` line 467 area: added `uiCam.setRoundPixels(true)`.
- `js/GameScene.js` wheel handler: `c.zoom = ...` → `c.setZoom(...)` (method call ensures proper internal matrix updates).
- `js/ExoAI.js` `initExoAI`: added `if (scene.uiCam) scene.uiCam.ignore(scene.aiDebugGfx);` after the depth set. Guarded with `if (scene.uiCam)` since `initExoAI` is called from `create()` AFTER the uiCam is set up at line 468, so the ref is available.
- `js/ExoAI.js` `drawAIDebugOverlay`: added `if (scene.uiCam) scene.uiCam.ignore(label);` inside the lazy label-creation branch.

**Line shifts:** GameScene.js +2 lines (two setRoundPixels calls in §7). ExoAI.js +2 lines (two ignore calls). FILE MAPs + every affected in-file section header re-shifted. New ranges: GameScene §7 342-744 through §16 1572-1589; ExoAI §3 51-71 through §7 245-341. Both files parse clean.

**Pending playtest:**
- Zoom in/out wildly — FPS counter stays anchored to top-right, no duplicates anywhere on screen.
- Toggle O at various zoom levels — vision cones appear ONLY around visible exos. No ghost cones near upper-left.
- Aim line should be steady, not fading/popping.
- Player and exos shouldn't show duplicated dots when zoomed out.

If the phantom cone is gone, the long-standing bug noted in CLAUDE.md SESSION HANDOFF is resolved — that's been the mystery since sub-step 7 first shipped. The depth-fix and 20-tile cull earlier only addressed adjacent symptoms; the actual root cause was the dual-render via the un-ignored UI camera.

---

## 2026-05-15 — Step 27 sub-step 1b: FPS counter + mouse-wheel zoom
**Built:** User asked for both mid-playtest of the bigger map. Bundled with sub-step 1 since they'll be tested together.

*FPS counter:*
- New §6 has nothing for camera/diagnostics; the FPS HUD lives in `create()` alongside the other HUD text. `this.fpsText = this.add.text(this.scale.width - 12, 58, ...)` — top-right, just below `ammoText`. Monospace 14px, light gray (`#aaaaaa`) so it's visible but unobtrusive. `setOrigin(1, 0)`, `setScrollFactor(0)`, `setDepth(10000)`.
- Per-frame update at the very top of `update()`: `this.fpsText.setText('FPS ' + Math.round(this.game.loop.actualFps))`. Runs even during title/pause/game-over so the user always has a perf readout.

*Mouse-wheel zoom:*
- Four new §6 constants: `CAM_ZOOM_DEFAULT = 0.75`, `CAM_ZOOM_MIN = 0.4`, `CAM_ZOOM_MAX = 1.5`, `CAM_ZOOM_STEP = 1.1` (multiplicative per scroll tick — 10% per notch).
- `cam.setZoom(0.75)` in create() now reads `cam.setZoom(CAM_ZOOM_DEFAULT)`.
- Wheel handler registered right after `cam.startFollow`: `this.input.on('wheel', (_p, _o, _dx, deltaY) => { const c = this.cameras.main; const factor = deltaY > 0 ? 1 / CAM_ZOOM_STEP : CAM_ZOOM_STEP; c.zoom = Phaser.Math.Clamp(c.zoom * factor, CAM_ZOOM_MIN, CAM_ZOOM_MAX); })`. Zoom is automatically centered on the player because the camera follows the player.

Bounds rationale: at zoom 0.4 the player sees most of the 120×120 map (avoids "off-the-edge" weirdness); at zoom 1.5 the viewport tightens to ~17 tiles around the player, still enough context to play. Below 0.4 the map starts looking tiny and the edges are visible; above 1.5 you can't see attackers approaching.

**Line shifts:** §6 +5 lines (zoom constants). §7 +13 internal (5-line wheel handler + 8-line FPS text setup). §15 +1 (FPS text update). FILE MAP + every in-file section header §6-§16 re-shifted. New ranges: §6 291-341, §7 342-742, §8 743-786, §9 787-801, §10 802-876, §11 877-933, §12 934-946, §13 947-1014, §14 1015-1130, §15 1131-1569, §16 1570-1587. Parses clean.

**Pending playtest:** boot map, verify FPS reads ~60 in top-right, scroll wheel zooms in/out smoothly within the clamps, zooming feels centered on the character.

---

## 2026-05-15 — Step 27 sub-step 1: Map expansion 60 → 120 (2× linear, 4× area)
**Built:** Pure constant retune. User wants a map "at least two times as big" before asset insertion. Audit had already confirmed everything parameterizes off `WORLD_TILES`, so this is one constant change plus three dependent retunes.

*`js/iso.js`:* `WORLD_TILES` 60 → 120.

*`js/GameScene.js` §2:*
- `SANDBOX_MAX_ALIVE` 22 → **40**. Proportional scale would be 88 (preserve density on 4× area), but that's a perf risk AND defeats the "bigger map feels emptier" intent. 40 gives ~½ density vs the old map. Conservative — easy to nudge up if it feels too sparse.
- `SANDBOX_RESPAWN_POINTS` rewritten for the new layout: center (60,60) + four quadrant centers (30,30)/(90,30)/(30,90)/(90,90). Same shape as before, scaled.
- Comment updated: "WORLD_TILES is 60" → "WORLD_TILES is 120".

**What stayed:** SOUND_LOUDNESS_*, AI_WANDER_RADIUS, AI_SEARCH_RADIUS, the 20-tile overlay cull, SANDBOX_SPAWN_INTERVAL, camera zoom 0.75, EXO_MAX_ALIVE (round-mode, parked). All either map-relative-and-fine, or player-relative (cull), or mode-parked. Detailed reasoning in the Step 27 plan file.

**Pending playtest:**
- Walk diagonally across the map — should feel roughly 2× longer than before (~20s at PLAYER_SPEED=6).
- Let sandbox fill to spawn cap — should plateau at 40 alive, feeling more spread out than the old 22-on-60 swarm.
- Die mid-chase — respawn should pick one of the new 5 points (center or a quadrant).
- O-overlay: cones still draw within 20 tiles of player, state letters still appear above each visible body.
- 60fps locked. If perf dips, the bottleneck is AI tick on 40 exos; we'd lower the cap.

Both files parse clean via `node -c`.

---

## 2026-05-15 — Step 27 plan + Step 26 closure
**Built:** Closed Step 26 (functionally complete) with a quick decision tree: (2) core-feel pass skipped by user, (3) asset pipeline needs assets so deferred, (4) enemy config decoupling audit done (finding: already clean, no refactor work). Pivoted to Step 27 — map expansion immediate, asset pipeline as a held sub-step 2.

Audit used the Explore agent to trace every read of ENEMY_TYPES, every spawn path, every cap, every mode gate. Confirmed:
- `sandboxSpawnTick` never reads `roundNumber` or calls `xForRound` helpers.
- `spawnExo(opts)` opts-provided branch never falls back to round helpers.
- `EXO_MAX_ALIVE` (round) and `SANDBOX_MAX_ALIVE` (sandbox) never cross.
- Only one `if (this.sandboxMode)` gate in `refreshTitleText` — by design.
- `triggerVictory` / `triggerGameOver` unreachable from sandbox.

No leaks. No work. Filed as deliverable, moved on.

---

## 2026-05-15 — Step 26 sub-step 7 finish: W/I/C/S state-letter labels
**Built:** Each visible exo now has its state's first letter (W/I/C/S) floating ~22px above its body whenever the O vision toggle is on. Two purposes: (a) makes the AI state-machine visible at a glance for tuning, (b) diagnostic for the lingering phantom-cone bug — a red cone with NO letter above its base would be a true phantom (cone drawn for no exo), proving a real draw-state bug; a cone WITH a letter is just an exo whose body is hard to spot in the visual noise.

*`js/ExoAI.js` §3 — `initExoAI`:* one new line `scene.aiDebugLabels = []` (pool, grown lazily). No new key — labels piggyback on the existing O toggle.

*`js/ExoAI.js` §7 — `drawAIDebugOverlay`:* restructured body. At the top of the function (after `g.clear()`) every pooled label gets hidden by default. Then inside the per-exo loop, when vision is on and the exo passed the 20-tile cull, the function grabs `scene.aiDebugLabels[labelIdx]` (creating a new `scene.add.text(0, 0, '', {fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 3})` if absent), positions it at `worldToScreen(e.worldX, e.worldY)` with `y -= 22`, sets text to `e.aiState.charAt(0).toUpperCase()`, and un-hides. Pool index increments. Labels are at depth 50 — above ground/aim-line/overlay graphics, below entity depth peaks (~120) and HUD (10000+).

**FILE MAP realignment:** the FILE MAP had drifted off-by-1 (and in some sections off-by-2) across §3-§7 from a stale claim — pre-existing bug that crept in over earlier Writes. Fixed all 7 entries to match actual line numbers: §1 25-40, §2 41-50, §3 51-70, §4 71-78, §5 79-179, §6 180-243, §7 244-339. ExoAI.js total now 339 lines (was 313).

**Pending playtest:** boot game, press O, walk around. Should see one of W/I/C/S above each on-screen exo body. State letters should update live as exos transition (e.g. exo sees you → letter flips from W to C). Phantom-cone diagnostic: any red cone with no letter above it is a real bug — capture the scenario.

Parses clean via `node -c`.

---

## 2026-05-15 — Step 26 sub-step 6: respawnPlayer break-chase
**Built:** `respawnPlayer()` in §10 now captures `oldWX/oldWY` from the player's pre-teleport position. After the teleport + HP/stamina reset block, iterates `this.exos` and for each in `AI_STATE_CHASE`: transitions to `AI_STATE_SEARCH`, points `aiTargetWX/Y` at the death spot, sets `aiStateTimer = AI_SEARCH_DURATION` (4s), clears `aiSoundPriority`. Result: any exo that was locked on you when you died spends ~4s investigating the corpse instead of teleporting attention to your new spawn.

INVESTIGATE-state exos (those chasing a sound, not sight) are left untouched on purpose — they were already heading somewhere else, not specifically locked on the player.

**Line shift:** GameScene.js §10 grew by 12 lines (781-843 → 781-855). FILE MAP + section headers for §10-§16 all shifted +12. New ranges: §11 856-912, §12 913-925, §13 926-993, §14 994-1109, §15 1110-1547, §16 1548-1564.

**Pending playtest:** Run into a swarm, get touch-damaged to death mid-chase. Watch the chasing exo (toggle O to see the cone) — instead of redirecting toward your respawn point, it should walk toward the spot you died, search for ~4s, then wander. If you spawn back into LOS, the search exo will still see you and re-acquire — that's correct; the rule is "don't INSTANTLY relock," not "go fully blind for 4s."

Parses clean via `node -c`.

---

## 2026-05-15 — Overlay polish: phantom-cone cull + depth fix
**Built/iterated:** Two follow-up fixes on the sub-step 7 partial overlay reported during sub-step 5 playtest.

1. **Depth -100 instead of 1000.** The debug gfx was drawing ABOVE every entity (exo depth = worldX+worldY, range 0-120), so each cone's tip covered the exo at its base — looked like 22 "phantom" coneless cones. Dropped to -100 (above ground -1000 + aim line -500, below all entities). Cones now visibly fan FROM exo bodies.
2. **20-tile player-cull on cones.** Exos beyond 20 tiles from the player no longer draw their cones — those were the cones extending from offscreen exos into the visible viewport, which also looked phantom. Inline `dpx*dpx + dpy*dpy > 400` check at the top of the per-exo draw loop. §7 grew by 5 lines (240-303 → 240-308).

User reports "ok for now, still a little buggy" after both fixes — flagged as known issue in CLAUDE.md SESSION HANDOFF for later. Possible remaining causes: Graphics path state across multiple `beginPath/strokePath` cycles within one frame, NaN coords on specific exos, or just visual noise from overlapping cones in a swarm. Not blocking; deferred to sub-step 8 polish pass.

---

## 2026-05-15 — Step 26 sub-step 7 (partial): O/I debug overlays for vision + audio
**Built:** User asked for toggleable debug visualizations to make sub-step 5's perception system legible while playtesting. Brought sub-step 7 forward, scoped to JUST the two overlays they requested (state-letter labels deferred).

*`js/ExoAI.js` §3 — `initExoAI` expanded:*
- Allocates `scene.aiDebugGfx = scene.add.graphics()` at depth 1000 so it draws above everything.
- Registers `scene.aiDebugVisionKey = scene.input.keyboard.addKey('O')` and `scene.aiDebugAudioKey = scene.input.keyboard.addKey('I')`.
- Initializes `scene.aiDebugVision = false`, `scene.aiDebugAudio = false`.
- Wires `scene.events.on(Phaser.Scenes.Events.PRE_RENDER, () => drawAIDebugOverlay(scene))` so GameScene.js needs no separate hook.

*`js/ExoAI.js` §7 — `drawAIDebugOverlay(scene)` (was a stub, now full):*
- Edge-detect toggles via `Phaser.Input.Keyboard.JustDown` for O and I (flips the respective boolean each keypress).
- Clears `aiDebugGfx` every frame, then early-returns if both toggles are off OR if `scene.exos` doesn't exist yet (title screen).
- For each exo:
  - I toggle on → `drawIsoEllipse` at radius `SOUND_LOUDNESS_SHOOT × cfg.hearingMult` (blue 0x4080ff, α=0.25). Uses max-loudness only — represents the envelope of "what this exo could ever hear from the player." Walk/sprint rings would be tighter; if you want them later we add them then.
  - O toggle on → in CHASE, `drawIsoEllipse` at `cfg.sightRange` (no FOV gate — spec is range-only in chase). Otherwise, `drawIsoCone` from `aiFacing - sightFOV/2` to `aiFacing + sightFOV/2` at `cfg.sightRange`. Red 0xff4040, α=0.5.

*`js/ExoAI.js` — new iso helpers `drawIsoEllipse` and `drawIsoCone`:*
- Both sample the world-space boundary by world angle (36 steps for circles, 16 for cones) and project each sampled point through `worldToScreen(wx, wy)` from `js/iso.js`. Necessary because the 2:1 dimetric squash makes a world circle into a screen ellipse rotated 45°. Cheap — 22 exos × ~50 points × 2 overlays = ~2200 samples per frame, fully GL-accelerated.
- Cone polygon: `center → arc rim → back to center` so it fills as a sector when filled (we only stroke for now, but the structure is there).

**GameScene.js: no changes.** PRE_RENDER hook lives entirely inside `initExoAI`. The existing `initExoAI(this)` call in `create()` (§7) handles all wiring.

**Line shift:** ExoAI.js 253 → 303 lines. §3 50-61 → 50-66 (+5 lines for graphics + keys + PRE_RENDER hook). §4-§6 shifted by +5 each (now 67-74 / 75-175 / 176-239). §7 235-253 (19 lines stub) → 240-303 (64 lines). FILE MAP at top updated.

**Pending playtest:** Press O at any time → vision cones / chase-range circles appear in red. Press I → audio rings appear in blue. Both toggleable independently. Should validate: (1) FOV cone widths match per-type spec (mutant widest, runner narrowest), (2) chase exos visibly switch from cone to full circle, (3) audio rings scale with `hearingMult` (runner ring biggest, mutant ring smallest). Use to tune sub-step 5 perception values in `ENEMY_TYPES` if anything feels off.

Parses clean via `node -c`.

---

## 2026-05-15 — Step 26 sub-step 5: updateExoAI body + 4 helpers + §15 call-site swap
**Built:** The big behavioral step. Exos now actually use perception. Old "every-exo-line-walks-toward-player" math is gone; in its place is a four-state machine reading from `this.aiSoundEvents` and the FOV/sight-range knobs on `cfg.perception`.

*`js/ExoAI.js` §5 — `updateExoAI(scene, e, dt)`:*
- Step 1: `aiCheckSight(scene, e)` — if visible AND not already CHASE, transition to CHASE (target = player.worldX/Y, clear `aiStateTimer` + `aiSoundPriority`).
- Step 2: `aiConsumeSounds(scene, e)` — only if `aiState !== CHASE` (chase ignores sounds per spec).
- Step 3: state-machine `switch`:
  - WANDER: paused-timer decrement OR (no target / arrived) → `aiPickWanderTarget(e)` + new pause [0.5s, 2.0s]. Otherwise move at `cfg.wanderSpeedMult`.
  - INVESTIGATE: arrived → transition to SEARCH (timer = AI_SEARCH_DURATION=4s, target = current pos). Otherwise move at `cfg.chaseSpeedMult`.
  - CHASE: recompute `dist`. If `dist > cfg.sightRange` → SEARCH at last player pos. Else update target = player.worldX/Y, speed = `chaseSpeedMult`.
  - SEARCH: timer decrement → WANDER on expire. Reached target → micro-wander pick within `AI_SEARCH_RADIUS`. Move at `wanderSpeedMult`.
- Step 4: if `aiTargetWX != null`, normalize delta and step `e.speed * speedMult * dt`. Update `e.aiFacing = atan2(ny, nx)` so the sight cone rotates with motion (cheap enough — replaces all per-frame trig the old chase math wasn't doing anyway).

*`js/ExoAI.js` §6 — helpers:*
- `aiCheckSight(scene, e)`: range check first; CHASE returns true on range alone; otherwise FOV via `cos(aiFacing) * nx + sin(aiFacing) * ny >= cos(sightFOV / 2)`. Guards `dist === 0` (point-blank).
- `aiReachedTarget(e)`: simple `hypot ≤ AI_ARRIVAL_DIST` (0.5 tiles).
- `aiPickWanderTarget(e)`: random angle, random radius in [0, AI_WANDER_RADIUS=8], clamp to map interior via `Phaser.Math.Clamp(v, 1, WORLD_TILES - 1)`.
- `aiConsumeSounds(scene, e)`: for each event, audible iff `dist ≤ loudness * cfg.hearingMult`. WANDER/SEARCH → INVESTIGATE (target = event origin, priority = loudness / max(dist, 0.001)). INVESTIGATE only preempts when new priority > old (louder OR closer beats current).

*`js/GameScene.js` §15 — call-site swap (lines 1316-1324 → 1316-1317):*
Old 9-line chase math (edx/edy/elen + normalize + step) replaced with:
```
updateExoAI(this, e, dt);
const elen = Math.hypot(this.player.worldX - e.worldX, this.player.worldY - e.worldY);
```
`elen` is still needed for the touch-damage check immediately below. Net: -7 lines. Boss windup at the bottom of the per-exo block unchanged.

**Line shifts:** ExoAI.js 127 → 253 lines (+126: §5 +85, §6 +41). GameScene.js -7 lines: §15 was 1098-1542 → now 1098-1535. §16 was 1543-1559 → now 1536-1552. FILE MAPs in both files and the §15/§16 section header comments in GameScene.js updated.

**Pending playtest (the big checklist):** wander baseline (exos drift, no edge-hug), sight acquisition (walk into FOV cone = chase, walk behind = no react), sound investigate (shoot at 20 tiles → exo investigates origin → arrives → searches 4s → wanders), chase lock (walk past or behind chasing exo = still chasing; outrun past sightRange = break to search), sprint loudness (distant exos hear sprint that wouldn't hear walk), walk stealth (5 tiles outside FOV, walking = no react), per-type feel (runner reacts to sound mutant ignores; mutant sees further with wider cone; runner chases faster), respawn (dying mid-chase respawns clean; the chasing exo still locks on new spawn — that's sub-step 6's problem), perf (22 exos at 60fps).

**Known design carryover:** LOS occlusion not implemented (no terrain yet) — documented in `updateExoAI` and `aiCheckSight` comments. When terrain lands, the FOV cone "seeing through walls" needs an LOS test in `aiCheckSight`.

Both files parse clean via `node -c`.

---

## 2026-05-15 — Step 26 sub-step 4: Player audio triggers + per-frame sound queue
**Built:** Player actions now push sound events onto the AI queue. Nothing consumes them yet (`updateExoAI` still a stub), so gameplay is unchanged — but the data is flowing. Sub-step 5 will fill in the consumer.

*Shoot emit (§7, in pointerdown fire handler right after `sfxShoot()`):*
- `emitSound(this, this.player.worldX, this.player.worldY, SOUND_LOUDNESS_SHOOT)` — one push per shot. Loudness 15 tiles.

*Sprint / walk throttled emits (§15, inside the WASD movement block, gated on `wasdLen > 0` so silence-while-stationary works automatically):*
- If `sprinting`: increment `this.aiSprintSoundTimer` by dt; when ≥ `SOUND_SPRINT_EMIT_INTERVAL` (0.5s), push at SOUND_LOUDNESS_SPRINT (9 tiles), reset timer.
- Else (walking): increment `this.aiWalkSoundTimer` by dt; when ≥ `SOUND_WALK_EMIT_INTERVAL` (0.8s), push at SOUND_LOUDNESS_WALK (4 tiles), reset timer.
- Dash + jump deliberately silent (commented in code). Dash is fast and short, jump is brief — both fall into "no emit" by intent.

*End-of-frame flush (§15, after muzzle-flash cleanup):*
- `this.aiSoundEvents.length = 0;` — events live one frame.

`emitSound` itself in ExoAI.js was already functional from sub-step 2 (single-line push). All five sound constants (SHOOT/SPRINT/WALK loudness + SPRINT/WALK interval) already declared in ExoAI.js §2 (also from sub-step 2).

**Pending playtest:** game should still behave like sub-step 3 — exos chase via the old math, respawn works. The only invisible difference: every frame, `this.aiSoundEvents` accumulates entries from player actions and gets flushed at the end. If you wanted to verify it's working, you could open DevTools (F12) and add a console.log inside `emitSound` — would print one line per shoot, one per 0.5s of sprint, one per 0.8s of walk. Or just trust the syntax check.

**Line shift:** +17 lines total. §7 +1 (pointerdown emit), §15 +16 internal (14 sprint/walk block + 2 flush). FILE MAP and §7-§16 headers all updated. `node -c` parses clean.

---

## 2026-05-15 — Step 26 sub-step 3: Data wiring (perception + per-exo AI fields + initExoAI call)
**Built:** Pure data plumbing. New AI helpers in ExoAI.js still un-called by gameplay logic; this step just gives them the data they'll need.

*`ENEMY_TYPES` (§2) — each type now has a nested `perception` block:*
- basic:  `{ sightRange: 8,  sightFOV: 1.4, hearingMult: 1.0, chaseSpeedMult: 1.4, wanderSpeedMult: 0.5 }`
- runner: `{ sightRange: 7,  sightFOV: 1.3, hearingMult: 1.6, chaseSpeedMult: 1.6, wanderSpeedMult: 0.5 }` (worse sight, much better hearing, faster chase)
- mutant: `{ sightRange: 12, sightFOV: 1.8, hearingMult: 0.6, chaseSpeedMult: 1.2, wanderSpeedMult: 0.5 }` (best sight, widest FOV, deaf-ish, slow)
- boss:   copies basic (parked, but won't crash AI if ever spawned)

*`spawnExo` + `spawnBoss` (§14) — each pushed exo now carries 6 AI state fields:*
- `aiState: AI_STATE_WANDER` (initial)
- `aiTargetWX: null`, `aiTargetWY: null` (first AI tick will pick a wander target)
- `aiStateTimer: 0`
- `aiFacing: Math.atan2(WORLD_TILES/2 - wy, WORLD_TILES/2 - wx)` (face toward map center so edge-spawned exos don't immediately wander off-map)
- `aiSoundPriority: 0` (for "louder/closer sound preempts current investigate" math in sub-step 5)

State constants reuse `AI_STATE_WANDER`/`INVESTIGATE`/`CHASE`/`SEARCH` from ExoAI.js — accessible because ExoAI.js loads first per `index.html`. Typos crash with `ReferenceError`.

*`create()` (§7) — `initExoAI(this)` call added* after the sandbox state init block. `initExoAI` is functional (not a stub) — sets up `scene.aiSoundEvents = []`, `scene.aiSprintSoundTimer = 0`, `scene.aiWalkSoundTimer = 0`, `scene.aiDebugOverlay = false`, `scene.aiDebugLabels = []`. Scene-side state now exists for sub-step 4 (sound queue) and sub-step 7 (debug overlay) to consume.

**Pending playtest:** game should behave exactly like sub-step 2 — title, sandbox, exos chase via the OLD math (which still runs unchanged), respawn works. The only invisible difference is that each exo now has 6 unused fields and the scene has 5 unused properties. If the game booting after this means ENEMY_TYPES still parses correctly + spawnExo/spawnBoss don't error on the new fields.

**Line shift:** +18 lines total. §2 +4 (4 perception blocks), §7 +2 (initExoAI call), §14 +12 (6 fields × 2 spawn sites). FILE MAP + §2-§16 headers updated. Both files syntax-check clean with `node -c`.

---

## 2026-05-15 — Side fix (reverted): F-key suppression → letter-key debug convention
**Built then reverted:** Briefly added `addCapture('F1,F3,F4,F5,F6,F7,F8,F9,F10,F11')` to suppress Edge's F1-help hijack. User responded that F-keys don't work reliably for in-game tools and asked to use letter keys instead (U/I/O/P). Reverted the F-key capture. GameScene.js back to pre-fix line counts; FILE MAP + headers §7-§16 unwound.

**New convention:** Debug tool keys live on U/I/O/P (letters), not F1-F12. F12 stays uncaptured for DevTools. Sub-step 7 will bind **O** = AI debug overlay (Overlay) — letter keys don't need addCapture since they don't have browser defaults to suppress on a page with focus.

**DevTools access:** F12 (or Ctrl+Shift+I) — uncaptured, works as normal.

**Plan file updated:** all F2 references → O-key. ExoAI.js section §7 header renamed "F2 DEBUG OVERLAY" → "O-KEY DEBUG OVERLAY". CLAUDE.md notes the convention in the current-step tracker.

**Net code shift after revert:** zero in GameScene.js. +2 lines in ExoAI.js (clarifying comment in §7 stub).

---

## 2026-05-15 — Step 26 sub-step 2: `js/ExoAI.js` skeleton + wired into index.html
**Built:** Empty-shell module for the perception AI. 124 lines, 7 internal sections, its own FILE MAP. File loads via `index.html` (order: phaser → iso → **ExoAI** → GameScene → main) but nothing in GameScene calls it yet, so behavior is identical to sub-step 1.

*`js/ExoAI.js` structure:*
1. **AI / PERCEPTION CONSTANTS** (lines 24-39) — `AI_WANDER_RADIUS`, `AI_WANDER_PAUSE_MIN/MAX`, `AI_SEARCH_RADIUS`, `AI_SEARCH_DURATION`, `AI_ARRIVAL_DIST`, `AI_INVESTIGATE_PAUSE`. Plus state-string constants `AI_STATE_WANDER`/`INVESTIGATE`/`CHASE`/`SEARCH` so typos crash loudly with a ReferenceError instead of silent state drift.
2. **SOUND CONSTANTS** (lines 40-49) — `SOUND_LOUDNESS_SHOOT=15`, `SOUND_LOUDNESS_SPRINT=9`, `SOUND_LOUDNESS_WALK=4`, `SOUND_SPRINT_EMIT_INTERVAL=0.5`, `SOUND_WALK_EMIT_INTERVAL=0.8`.
3. **SCENE INIT HOOK** (lines 50-61) — `initExoAI(scene)`: sets up `scene.aiSoundEvents = []`, `scene.aiSprintSoundTimer = 0`, `scene.aiWalkSoundTimer = 0`, `scene.aiDebugOverlay = false`, `scene.aiDebugLabels = []`. Functional (not stubbed) — sub-step 3 will call it from `create()`.
4. **SOUND EMISSION** (lines 62-69) — `emitSound(scene, wx, wy, loudness)`: pushes onto the queue. Functional. Sub-step 4 calls it from player audio sites.
5. **PER-FRAME AI DISPATCH** (lines 70-84) — `updateExoAI(scene, e, dt)`: STUB. Sub-step 5 implements the state machine. LOS-occlusion assumption documented in the function-level comment so it's not forgotten when terrain lands.
6. **INTERNAL AI HELPERS** (lines 85-107) — `aiCheckSight`, `aiReachedTarget`, `aiPickWanderTarget`, `aiConsumeSounds`: STUBS for sub-step 5.
7. **F2 DEBUG OVERLAY** (lines 108-124) — `drawAIDebugOverlay(scene)`: partial. When `scene.aiDebugOverlay === false`, hides all pooled labels (correctly handles the off-state already so toggling later doesn't leave stale labels). Sub-step 7 fills in the cone+ring+label drawing.

*`index.html` change:* added `<script src="js/ExoAI.js"></script>` between `iso.js` and `GameScene.js`. Single-line insertion.

*`CLAUDE.md` updates:* current-step tracker advanced; project layout entry for ExoAI.js (no longer "planned"); new "Working in ExoAI.js" section that mirrors the GameScene.js rules; addendum to the "don't split the file" rule documenting this approved exception.

**Pending playtest:** game should run identically to sub-step 1 — title, sandbox, exos, respawn all unchanged. The only observable difference is one extra HTTP request for the new JS file at page load. If ExoAI.js has a syntax error the whole game won't boot — that's the main thing to confirm (does the title screen come up).

**Line shift:** none in GameScene.js. ExoAI.js is brand new — its FILE MAP block + 7 section headers all aligned and verified.

---

## 2026-05-15 — Step 26 sub-step 1: Map resize WORLD_TILES 40 → 60
**Built:** First sub-step of the perception-AI + bigger-map step. Pure constant-bumps + respawn-point rewrite — no behavioral change beyond "everything got bigger."

*`js/iso.js`:* `WORLD_TILES` 40 → 60. One-line constant change.

*`js/GameScene.js` (§2):*
- `SANDBOX_MAX_ALIVE` 12 → 22 (proportional to 2.25× area).
- `SANDBOX_RESPAWN_POINTS` rewritten for 60×60: center (30,30) + four quadrants (15,15), (45,15), (15,45), (45,45).
- Stale comment on line 105 ("WORLD_TILES is 40") updated to 60.

*WORLD_TILES verification (the "don't take on faith" ask):* greped all 18 `WORLD_TILES` references in `GameScene.js` plus the iso.js definition. Every reference uses the constant in a math expression — no hardcoded 40s anywhere that need updating. Sites confirmed:
- Camera centering (line 345): `cam.centerOn(0, (WORLD_TILES * TILE_H) / 2)` — scales. Initial cam Y = 960 (was 640).
- Ground render corners (lines 348-350): `worldToScreen(WORLD_TILES, ...)` — diamond stretches from (-1920, 0) to (1920, 1920) screen px.
- Player spawn (lines 364-365): `WORLD_TILES / 2` = (30, 30). Screens to (0, 960) — exactly where camera centers on frame 1.
- Player clamps × 2 (lines 1201-1202 WASD, 1212-1213 dash): `Phaser.Math.Clamp(.., 0, WORLD_TILES)` — scales.
- Boss spawn edges (lines 979-982): all `WORLD_TILES` / `WORLD_TILES / 2` — scale.
- Exo spawn edges (lines 1047-1051): `Math.random() * WORLD_TILES` + edge wrap — scale.
- Slime bounds (lines 1371-1372) + Bullet bounds (lines 1410-1411): out-of-bounds destroy — scale.

*Hardcoded `40` literals in GameScene.js (verified unrelated to map size):* boss sprite height (`h: 40` px, line 121), ENEMY_HEAD_VISUAL_OFFSET (-0.40 multiplier, line 127), boss HP bar Y coordinate (`barY = 40` screen px, line 520). None reference map dimensions.

*Camera has no `setBounds`* — just `setZoom(0.75)` + `startFollow`. Camera bounds are implicit (follow + lerp). No bounds update needed.

**Line shift:** zero. Same line count in both files. No FILE MAP changes.

**Pending playtest:** the "walk every edge" check the user explicitly asked for. Things to confirm visually:
- Player spawns near the middle of the bigger diamond on game start (world (30,30) → screen (0,960)).
- Walk to all four corners (0,0), (60,0), (60,60), (0,60). Ground extends the full way to each corner without seams.
- The "old boundary" at world coord 40 should no longer feel like an edge — keep walking past it.
- Die multiple times: respawn should pick from the five new safe points, not the old (10,10)-style coords.
- 22-exo cap fills the bigger map without feeling cramped.
- Camera follows smoothly to all corners — no whip, no void exposure beyond what was present before (corners always show some off-diamond void at zoom 0.75; this is unchanged from 40×40 state).

**Plan reference:** `C:\Users\JohnClaudeDev\.claude\plans\temporal-brewing-yeti.md`.

**Memory updated:** [[project_exo_map_too_small]] now records the expansion as resolved.

---

## 2026-05-15 — Project direction shift: SHELL-FIRST phase begins
**Decision:** Stop building toward any specific game mode. Build a playable shell (core systems clean, assets in, runnable as sandbox, no win/lose) first. Mode work (rounds, scoring, objectives) resumes only when user signals "shell is done, game mode now." During shell phase, mode-coupled code stays **parked in-place** — present but uncalled — not deleted. When mode work resumes, it layers on top of core systems without rewriting them.

**Approved shell task list (priority order):**
1. Sandbox runtime swap (replace round-driven path with flat sandbox spawner; F1 god mode; respawn on death).
2. Core-feel pass on movement + shooting + camera (tuning only).
3. Asset pipeline end-to-end with one real character/tile/weapon-sound/footstep.
4. Enemy config decoupling audit (split round-scaling from core config).
5. Small open map expansion (resolves long-deferred `project_exo_map_too_small`).

**Parked code (mode-coupled, do not extend):** round flow (`startIntermission`/`beginNextRound`, BOSS_ROUNDS + scaling tables, round-scaled mix/speed/spawn-rate helpers), leaderboard module, `triggerVictory`/`triggerGameOver`/`recordRunAndFormat`, round-counter HUD framing, boss HP bar UI. Code stays untouched and ready to revive.

**Tested:** N/A — this is a scope decision, not a code change.

---

## 2026-05-15 — Step 25 sub-task 1.3 (revised): Multi-spawn respawn on death
**Initial implementation had a problem:** single fixed spawn point at map center + no invuln frames → if enemies camped the center, respawning into instant death was possible. User flagged this strongly: "DO NOT MAKE ANY CHANGES LIKE THIS THATS CRAZY > MAKE SURE I APPROVE THEM FIRST." Justified — that was a feel-affecting design call, not an implementation detail, and I extrapolated from `project_exo_hardcore_feel` ("no damage iframes") to defend a silent decision. Saved [[project-exo-approve-design-calls]] feedback memory: don't extrapolate from existing rules to make feel calls without explicit approval.

**Revised approach (approved):** multiple spawn points + "pick the safest one." No invuln frames stays — but spawn-point selection now avoids the camping problem.

*New constant in §2:* `SANDBOX_RESPAWN_POINTS` — editable array of `{ wx, wy }` entries. Five default points on the 40×40 map: center `(20,20)` + four quadrant centers `(10,10)`, `(30,10)`, `(10,30)`, `(30,30)`. Comment explicitly documents that the user owns this list and can add/move/remove points without touching logic.

*New helper `pickSafestRespawnPoint()` (§10):* for each candidate point, computes the min distance to any alive enemy; returns the candidate with the **max** min-distance. Deterministic — same enemy positions always yield the same pick. If no enemies are alive, the first array entry wins.

*`respawnPlayer()` (§10):* calls `pickSafestRespawnPoint()`, then runs the same state reset as before (HP/position/stamina/jump/dash + HUD). One shared helper per concern — picker is separate from state-reset.

**What this fixes:** dying immediately on respawn is now only possible if every single defined spawn point is closer to an enemy than safe distance — and the user controls the spawn-point set, so that's a user-tunable knob, not a hidden hazard.

**Still under hardcore-feel rule:** zero invuln frames. Open question if you want a brief grace later — flagged here for revisit.

**Both HP=0 sites in §15 still branch the same way:** `sandboxMode → respawnPlayer()` else `triggerGameOver()`.

**Pending playtest:** die to an enemy; expect to teleport to whichever defined spawn point is farthest from the nearest exo. Should never land on top of an enemy unless you've crowded all 5 points.

**Line shift:** +27 lines total this revision (replaced 2-line `SANDBOX_RESPAWN_WX/WY` with 11-line array+comment for +9; new `pickSafestRespawnPoint` + 1-line tweak to `respawnPlayer` for +18). FILE MAP and §2-16 section headers updated.

**Feedback memory added to MEMORY.md index:** `project_exo_approve_design_calls`.

---

## 2026-05-15 — Step 25 sub-task 1.3 (initial): Respawn on death — superseded
**Built:** `respawnPlayer()` helper + branched both HP=0 sites so sandbox mode respawns the player instead of triggering game over. No invuln frames, no grace period — single fixed spawn point at `(WORLD_TILES/2, WORLD_TILES/2)`.

**Superseded same-day by the multi-spawn revision above** — single-spawn was unplayable when enemies camped the center.

*New helper `respawnPlayer()` (§10, after `sandboxSpawnTick`):*
- `playerHP = PLAYER_MAX_HP`
- `player.worldX = SANDBOX_RESPAWN_WX`, `player.worldY = SANDBOX_RESPAWN_WY`
- syncs screen coords via `worldToScreen` (next frame would catch it via the per-frame transform, but immediate sync avoids one-frame ghost at the prior position)
- `stamina = STAMINA_MAX`, `jumpTime = 0`, `dashTime = 0` — cancels in-flight arc state so respawning mid-jump or mid-dash doesn't carry over
- `updateHPText()` + `updateStaminaBar()` — HUD reflects reset
- `hitFlashTimer` left alone — auto-decays in `<0.2s` via the existing tick

*Branched HP=0 sites (§15):*
- Exo touch (~line 1273): `if (this.sandboxMode) this.respawnPlayer(); else this.triggerGameOver();`
- Slime hit (~line 1358): same branch.

*Section §10 rename:* "ROUND FLOW + SANDBOX SPAWN" → "ROUND FLOW + SANDBOX SPAWN/RESPAWN" — groups both sandbox lifecycle helpers in one place.

*What's now fully unreachable in sandbox mode:* `triggerGameOver`, `triggerVictory`, `recordRunAndFormat`, `addToLeaderboard`, the entire `gameOver` UI block. They remain present in the code, untouched, ready to revive when mode work resumes.

**Pending playtest on 1.3:** drop HP to zero (let an exo touch you 5 times). Expected — player teleports to map center with full HP and full stamina, fight continues; no GAME OVER screen, no leaderboard prompt. If exos are camped at the respawn point you'll just die again immediately.

**Line shift:** +16 lines total (14 from `respawnPlayer`, 2 from HP=0 site branching). FILE MAP and §10-16 section headers updated.

---

## 2026-05-15 — Step 25 sub-task 1.2: Sandbox path active; round flow parked at call sites
**Built:** Wired three gates on `this.sandboxMode` so the sandbox spawner replaces the round-driven path. Round-flow code remains present and untouched but unreachable while `sandboxMode=true`.

*Gate A — `updateRoundText` (§8):* early-returns with empty string when `sandboxMode`. Round HUD text hidden in sandbox; kills text stays (it's a stat, not mode mechanic).

*Gate B — `refreshTitleText` (§11):* in sandbox mode, sets prompt to "Press SPACE or ENTER to start sandbox" and clears the leaderboard text. Title (PROJECT EXO) + subtext ("isometric wave shooter") left alone — cosmetic only.

*Gate C — spawn flow in `update()` (§15):* wrapped the round-driven spawn block in `if (this.sandboxMode) { this.sandboxSpawnTick(dt); } else { /* existing block, indented +2 */ }`. Existing block (betweenRounds tick, bossSpawnPending, roundSpawnsRemaining, ROUND_TOTAL victory check, startIntermission) is unchanged inside the else branch — diffs only as indentation + brace wrapping.

*Unreachable in sandbox mode after 1.2:* `startIntermission`, `beginNextRound`, `spawnBoss`, `triggerVictory`. `triggerGameOver` still reachable (HP=0 path) — handled in 1.3.

*`startGameFromTitle` left untouched* — it only sets `phase='PLAYING'`, no round-init call. Mode-agnostic.

**Confirmed playtest-pass on 1.1 (prior):** "runs good bro" — identical behavior to last commit before sandboxMode activated.

**Pending playtest on 1.2:** sandbox should run on start — title says "start sandbox," round HUD empty, basic + runner enemies spawn at flat 1.5s interval up to 12 alive, no bosses, no intermission text, no victory after 10 rounds. Death still triggers GAME OVER screen (fixed in 1.3).

**Line shift:** +10 lines total. FILE MAP and §8-16 section headers updated.

---

## 2026-05-15 — Step 25 sub-task 1.1: Sandbox spawner wired but inactive
**Built:** First sub-task of the sandbox runtime swap. New code only — no behavior change yet.

*Constants (§2, after `EXO_MAX_ALIVE`):*
- `SANDBOX_SPAWN_INTERVAL = 1.5` (seconds between spawns)
- `SANDBOX_MAX_ALIVE = 12`
- `SANDBOX_SPAWN_POOL = ['basic', 'runner']` (uniform random pick; Mutant held out by design; array easy to extend)
- `SANDBOX_ENEMY_BASE_SPEED = EXO_SPEED_BASE` (named alias — sandbox enemy speed never scales)
- `SANDBOX_RESPAWN_WX = WORLD_TILES / 2`, `SANDBOX_RESPAWN_WY = WORLD_TILES / 2` (matches current `create()` spawn coords)

*Scene state init (§7 `create()`, alongside `exoSpawnTimer`):*
- `this.sandboxMode = true`
- `this.sandboxSpawnTimer = 0`

*New method `sandboxSpawnTick(deltaSec)` (§10):*
- Returns early if alive exo count >= `SANDBOX_MAX_ALIVE`.
- Increments `sandboxSpawnTimer`; spawns when interval elapsed.
- Picks type uniformly from `SANDBOX_SPAWN_POOL`.
- Calls `this.spawnExo({ type, hp: cfg.hp, speed: SANDBOX_ENEMY_BASE_SPEED * cfg.speedMult })` — no round-scaling.
- Section renamed: "ROUND FLOW" → "ROUND FLOW + SANDBOX SPAWN" (covers both flows).

*Refactor `spawnExo()` → `spawnExo(opts = {})`:*
- Optional `{ type, hp, speed }`. Each defaults to its prior round-driven expression.
- Round path still calls `this.spawnExo()` with no args → identical behavior.
- Sandbox path passes explicit values, bypasses round helpers.

*FILE MAP + section headers + CLAUDE.md GameScene structure section all updated to the new line ranges (+21 lines total).*

**Tested:** Not yet playtested. Sub-task is intentionally dead code — `sandboxSpawnTick` is never called, `sandboxMode` is never read. Game must behave identically to last commit. Pending user diff review + "identical behavior" confirmation before sub-task 1.2.

---

## 2026-05-15 — Step 24: Hit-feel rework (fire-slow + knockback deleted, long-neck on Basic/Runner, 1.25× head on Mutant/Boss/Jimmy, shared resolveHit)
**Built:** A single coherent hit-feel beat with a structural anti-spaghetti pass.

*Fire-slow deletion:*
- Removed constants `FIRE_MOVE_PENALTY` and `FIRE_PENALTY_DURATION`.
- Removed `this.firePenaltyTimer` init, set-on-shot, decay block, and the `moveSpeed *= FIRE_MOVE_PENALTY` multiplier.
- Result: walk-and-shoot equals walk-no-shoot; sprint-shoot equals sprint-no-shoot.

*Knockback deletion:*
- Removed constants `KNOCKBACK_BASE_SPEED`, `KNOCKBACK_DURATION`.
- Removed `kbResistance` from all four enemy configs (basic/runner/mutant/boss).
- Removed `kbVX`, `kbVY`, `kbTime`, `kbResistance` from `spawnExo` and `spawnBoss` enemy objects.
- Removed the per-frame `if (e.kbTime > 0) { ... }` block that nudged enemies along the bullet vector.
- Removed the on-hit knockback set inside the bullet collision loop.
- Result: bullets never push enemies. (User's second-thought call — knockback simply isn't in the game right now.)

*Long-neck weak-point on Basic + Runner only:*
- Replaced the old `headColor` head-dot mechanic from Step 23. Old constants `HEAD_HIT_RADIUS`, `HEAD_VISUAL_RADIUS`, `HEAD_WORLD_OFFSET_X/Y` deleted.
- `ENEMY_TYPES` now carries structured `head` / `neck` zone fields:
  - basic: `head: null`, `neck: { offset: -0.30, hitRadius: 0.18, color: 0xff8080 }` — neck hit = **instakill**.
  - runner: `head: null`, `neck: { offset: -0.30, hitRadius: 0.15, color: 0x80f0ff }` — neck hit = **instakill**.
  - mutant: `head: { offset: -0.55, hitRadius: 0.30 }`, `neck: null` — head hit = **1.25× dmg**.
  - boss: `head: { offset: -0.65, hitRadius: 0.45 }`, `neck: null` — head hit = **1.25× dmg**.
- Boss head/neck offsets and radii scale by `sizeMult` at spawn so the larger boss tiers have a proportionally larger head target.
- New top-of-file constants: `HEAD_DAMAGE_MULT = 1.25`, `NECK_INSTAKILL = true`, plus visual sizing constants (`ENEMY_HEAD_VISUAL_OFFSET = -0.40`, `ENEMY_HEAD_VISUAL_SCALE = 0.55`, `ENEMY_ARM_W_PX/H_PX/DX_PX`, `NECK_VISUAL_W_PX/H_PX`).

*Visual primitives (placeholder, minimal):*
- Every enemy now spawns a body ellipse + head ellipse + 2 arm rectangles via `buildBodyParts(cfg)`. Basic/Runner additionally get a small lighter-shade neck rectangle between body and head (the visual cue for the instakill zone).
- Head color reuses the per-config `headColor` field as a slightly lighter shade for silhouette readability.
- Per-frame render block positions head + arms + (neck) by converting the body's world position + per-zone offset through `worldToScreen`, with arms screen-px offset and depth-sorted +0.04 / +0.045 / +0.05 above the body so they draw on top.
- Death cleanup destroys body parts via `destroyBodyParts(e.parts)`.

*Symmetric body+head on Mutant, Boss, and Jimmy:*
- Player object gets `this.player.hitRadius`, `this.player.head = { offset, hitRadius }`, `this.player.neck = null` in `create()` so the shared resolver works on Jimmy too.
- Boss-spit projectile collision routes through `resolveHit(this.player, sl.worldX, sl.worldY, BOSS_SLIME_DAMAGE)` — slime hitting head zone deals 1.25× = 2.5 dmg; body = 2 dmg. The old `BOSS_SLIME_HIT_RADIUS` constant was deleted since the player's `hitRadius` (0.5) now serves that role.
- Exo touch routes through `resolveHit(this.player, e.worldX, e.worldY, e.damage, 'body')` with `zoneOverride='body'` since touch is bodily contact, not a precision strike.

*Anti-spaghetti core — `resolveHit`:*
- Single method on GameScene that takes `(target, hitWX, hitWY, baseDamage, zoneOverride?)` and returns `{ hitZone, damageDealt, isInstakill }`.
- Zone detection order: neck (if present) → head (if present) → body. First zone whose distance check passes wins.
- Bullet→enemy and player-damage paths both call it. The hit math lives in exactly one place; future enemies or attacks become config changes, not new code paths.

**Tested:** Passed playtest 2026-05-15 — "all works well." Step 22 (boss HP/hitbox) and Step 23 (barrel/aim sync) implicitly confirmed too since they were untouched and survived the same session.
**Decisions (locked):** Knockback is removed from the game, not paused. Fire-slow is removed entirely. Long-neck instakill is exclusive to Basic + Runner; Mutant + Boss + Jimmy share a body-plus-head model where head = 1.25× dmg. Touch attacks always resolve to body damage. All new tunables live in the constants block at the top of the file. The `resolveHit` helper is the only place hit-zone logic lives; do not duplicate it.

---

## 2026-05-14 — Step 23: Headshot weak-point + barrel/aim-line desync fix
**Built:** Two pieces of playtest feedback in one pass.

*Weak-point mechanic (zombies too weak as 1-shots):*
- `ENEMY_TYPES` gains `headColor` per type (lighter shade of body): basic 0xff8080, runner 0x80f0ff, mutant 0xd080ff. Boss `headColor: null` (no weak point — slime blob).
- New constants: `HEAD_WORLD_OFFSET_X = -0.3`, `HEAD_WORLD_OFFSET_Y = -0.3` (projects to ~10px straight up on screen via iso transform: dscreen = (-0.6 * 16) = -9.6px Y), `HEAD_HIT_RADIUS = 0.3` world units, `HEAD_VISUAL_RADIUS = 3` px.
- `spawnExo` now creates a small head circle when `cfg.headColor` is set, stored as `e.headGfx`.
- Per-frame enemy render loop also positions `e.headGfx` at the offset world point and gives it depth `+0.05` so it draws on top of the body.
- Bullet hit loop checks head first: if bullet within `HEAD_HIT_RADIUS` of head world point, set `e.hp = 0` (instant kill). Else fall back to body radius check, 1 damage as before. Body-kill and head-kill both go through the existing death path (ammo drop, kb, kill count, sfx).
- Death cleanup also destroys `e.headGfx` alongside `e.gfx`.
- `hpForRound` table bumped by 1 for basic + runner so body-only kill always needs ≥2 shots: basic 2/3/4 (was 1/2/3), runner 2/3/4 (was 1/2/3). Mutant 3/4/5 unchanged (already passed).

*Barrel/aim-line desync (gun rotates off the aim line during movement, intermittent):*
- Root cause: `barrel.rotation` was computed in `update()` from `pointer.worldX/Y`, which is updated at input poll (frame start). The aim line was already on `PRE_RENDER` using `cam.getWorldPoint(pointer.x, pointer.y)` from Step 20. The camera follow-lerp runs *between* `update()` and `PRE_RENDER`, so the barrel was angling toward a one-step-stale cursor while the aim line angled toward the fresh one. Visible as the gun pointing off the line during camera movement.
- Fix: barrel `x/y/depth` still set in `update()` (those track the player, no lerp involved), but `barrel.rotation` moved into `drawAimLine` and computed from the same `cam.getWorldPoint` cursor that draws the line. Barrel + aim line now share one cursor source per render frame; they cannot diverge.
- Same fix applied to the pointerdown handler: bullet direction (`screenToWorld(pointer.worldX, pointer.worldY)`) and muzzle-flash angle (`pointer.worldY/X`) both replaced with `cam.getWorldPoint(pointer.x, pointer.y)`. Shots now leave the barrel along the visible aim line even mid-camera-lerp.

**Tested:** Awaiting next playtest.
**Decisions:** Headshot = instant kill (not bonus damage) — simplest realism beat, makes the weak point actually mean something at every round. Head dot is a placeholder (3px lighter-shade circle) — when the enemy sprite pack lands, replace it with the actual sprite head region; the offset constants and hit-radius are easy to retune to match a real sprite. Boss intentionally skipped: a slime blob has no obvious head, and giving it a 1-shot crit would trivialize the finale.

---

## 2026-05-14 — Step 22 tuning pass: boss HP halved + hitbox tightened
**Built:** Two targeted fixes after R3 playtest ("hitbox bigger than visual, didn't have enough ammo, felt super strong"):
- **Boss hitbox shrunk to live inside the visual:** `ENEMY_TYPES.boss.hitRadius` 1.6 → 1.1; `touchRadius` 1.4 → 0.95. Math: visual ellipse is 80×40 px → half-width = 40px = 1.25 world units along screen-X (TILE_W/2 = 32). Old 1.6 hitbox extended ~28% past the visual edge. New 1.1 sits just inside the sprite; new 0.95 touch lives well inside it so contact damage matches what the player sees. Both still scale with `sizeMult` per Step 22.
- **Boss HP table halved across all tiers:** `BOSS_HP_TABLE` [50,120,220,400] → [25,60,110,200]. R3 at 50 HP = 5 full mags, which is more than the ammo budget through R1-3 supports (start 40 ammo + ~10 from drops vs. needing ~50 for the boss alone plus regular kills). Halving puts R3 at 2.5 mags — reachable from carryover. R10 mega-boss still 200 HP = 20 mags worth, a real fight but not impossible.
**Tested:** Awaiting next playtest.
**Decisions:** Did not bump `AMMO_DROP_CHANCE` (still 0.25) or add boss-death ammo drops yet — boss HP halving alone should fix the economy. If R6/R9/R10 still feel ammo-starved, next lever is drop rate or boss-death drop, not another HP cut.

---

## 2026-05-14 — Step 22: Game restructured 25 → 10 rounds (built, awaiting playtest)
**Built:** Major rebalance of round structure in `js/GameScene.js`:
- `ROUND_TOTAL`: 25 → 10. `BOSS_ROUNDS`: [5,10,15,20,25] → [3,6,9,10].
- New per-tier boss tables driven by `BOSS_ROUNDS` index: `BOSS_HP_TABLE = [50,120,220,400]`, `BOSS_SIZE_TABLE = [1.0,1.4,1.8,2.2]`, `BOSS_ATTACK_COOLDOWN_TABLE = [3.0,2.6,2.2,1.8]` (R10 mega = biggest + most HP + fastest attack — "interesting" lever instead of a new mechanic).
- Three helpers in the existing one-line `bossHpForRound` style: `bossHpForRound`, `bossSizeMultForRound`, `bossAttackCooldownForRound`. All fall back to safe defaults when called outside boss rounds.
- `spawnBoss` applies `sizeMult` to `gfx.setScale` + scales `hitRadius` and `touchRadius` proportionally (bigger boss = bigger hitbox = harder to dodge melee). `sizeMult` stored on the boss struct so the windup `setScale` math (was hard-coded `1` / `1.08`) now reads `e.sizeMult` / `e.sizeMult * 1.08`. Attack cooldown read per-round from `bossAttackCooldownForRound(this.roundNumber)` instead of the fixed `BOSS_ATTACK_COOLDOWN` constant.
- `hpForRound` (Step 21 helper) re-derived for 10 rounds: Basic 1/2/3 @ R1-3/R4-7/R8-10; Runner 1/2/3 @ R3-5/R6-9/R10; Mutant 3/4/5 @ R6-7/R8-9/R10.
- `enemyMixForRound` re-tiered for 10 rounds: R1-2 basic-only, R3-5 70/30 basic/runner (runner debuts at R3 alongside first boss), R6-8 50/30/20 (mutant debuts at R6 alongside second boss), R9-10 35/35/30.
- `EXO_SPEED_PER_ROUND` 0.10 → 0.22 (R10 end-speed ≈ 4.7 u/s, matches former R23 feel). `EXO_SPAWN_INTERVAL_PER_ROUND` 0.02 → 0.07 (R10 interval ≈ 0.87s, tighter late-game pressure).
- `CLAUDE.md` tracker + opening blurb updated. `DECISIONS.md` adds new "10 rounds, bosses on 3/6/9/10" entry and supersedes the old 25-round line in place (kept for history).
**Tested:** Not yet — awaiting user playtest. Verification path: spot-check each boss tier (`START_ROUND` to 3 / 6 / 9 / 10), confirm victory still triggers at R10, confirm boss sizes scale visibly.
**Decisions:** Dropped the COD/PZ hybrid feature menu (currency, perks, bleeding, extraction). User pivoted: "the cod thing was a bad idea, forget that, just keep going with development as it was going before." Slime damage + radius left fixed across all bosses — "size dictates danger" is delivered via boss hitbox + cooldown + HP, not slime stats. No new mechanics this step.

---

## 2026-05-14 — Step 21: Per-round HP scaling for non-boss enemies
**Built:** New `hpForRound(type, n)` helper next to `bossHpForRound`. `spawnExo` now reads `hp` + `maxHp` from the helper instead of `cfg.hp`. (For 25-round schedule — superseded by Step 22's 10-round re-tiering.)
**Tested:** "feels good" — user confirmed in next message that the difficulty curve felt right.
**Decisions:** Skipped HP bars (placeholder polish). Kept mag size + reload flat per realism lane. Boss HP untouched — `bossHpForRound` already handled it.

---

## 2026-05-14 — Aim-line camera-lerp lag fix
**Built:** Moved `aimLine` drawing out of `update()` into a `Phaser.Scenes.Events.PRE_RENDER` handler (`drawAimLine`). Uses `cam.getWorldPoint(pointer.x, pointer.y)` for the cursor end so the camera's freshly-lerped `scrollX/Y` is reflected. Previous version used `pointer.worldX/Y`, which is set during input update at frame start — Phaser's camera follow-lerp runs *after* `scene.update()`, so the cursor world point was always one frame behind the player's world position when the player moved fast.
**Tested:** "It looks great."
**Decisions:** Barrel rotation still computed in `update()` from stale `pointer.worldY/X` — the angle lag is imperceptible on a 14px barrel, and the user explicitly said the barrel was fine. Don't fix what isn't broken.

---

## 2026-05-14 — Step 20: Realism combat polish (spread + fire-slow + knockback)
**Built:** Three behavioral additions in `js/GameScene.js`, no new visuals/audio:
- **Bullet spread** — half-cone in degrees, sums state contributions: idle 0° / walking 3° / sprinting 8° / mid-jump 6° / mid-dash 4° / per-shot recoil +5° decaying linearly over 0.3s. Hard cap 15°. Perturbation applied via `Math.atan2`/`cos`/`sin` on the base aim angle inside the existing pointerdown handler.
- **Fire-slow** — each shot sets `firePenaltyTimer = 0.2s`. While >0, `moveSpeed *= 0.7` (stacks under sprint).
- **Knockback** — bullet hit sets `kbVX/kbVY = b.vx * 1.5 * kbResistance` and `kbTime = 0.15s` on the exo struct. While `kbTime > 0`, knockback velocity fully replaces chase (clamped to diamond bounds). Touch damage still applies. `kbResistance` per type: basic 1.0 / runner 1.2 / mutant 0.5 / boss 0.0 (immune, can't be shoved out of slime-spit range).
**Tested:** "It looks great." (after the aim-line fix above)
**Decisions:** Reused the existing exo struct + per-frame timer-tick pattern. Pointerdown handler re-reads WASD/SHIFT state at fire time rather than caching on `this`. Boss is immune by setting resistance to 0 — the `e.kbResistance > 0` guard in the bullet hit block keeps boss kb fields at 0 so the chase branch always runs.

---

## 2026-05-14 — Step 19 confirmed passing playtest
**Tested:** User confirmed "looks good" after playtest on Round 5 boss. `START_ROUND` reverted to 1.
**Result:** Passed at defaults — no tuning requested.

---

## 2026-05-14 — Step 19: Wart Mutant boss attack (telegraphed slime spit)
**Built:** Boss now winds up for 0.6s when player is within 6 world tiles (color shifts to `0xc0ff60`, scale 1.08), then fires a green slime circle (`0xa8e040`, radius 8) toward the player's position at wind-up start. Slime travels 8 world units/sec, deals 2 dmg on direct hit, despawns on hit / leaving diamond / 2.5s life. 3.0s cooldown from wind-up start. Jump i-frames cover the slime per existing `this.jumpTime <= 0` gate.
**Tested:** Implementation pushed at end of session; playtest confirmation came next session (see entry above).
**Decisions:** Telegraphed (not instant) per realism + skill-design ask. Direct-hit-only (no AoE puddle) — keeps boss readable; AoE option deferred. Boss keeps walking during wind-up, doesn't freeze.

---

## 2026-05-14 — Pushed to GitHub
**Built:** `git init -b main`, `.gitignore`, identity set locally for this repo (johnclaudecm / gtaautogroupsales@gmail.com — global git config left untouched), remote `origin` = `https://github.com/johnclaudecm/Project-Exo.0`, first commit pushed as `c2102f8` on `main`. WebFetch cache showed empty for ~15min after push but `git ls-remote` confirmed the commit is live.
**Decisions:** Identity is **local-to-repo only** (not `--global`) — global git settings on this machine remain untouched. User can override either field at any time.

---

## 2026-05-14 — Context-persistence files set up
**Built:** `CLAUDE.md`, `DECISIONS.md`, `PROGRESS.md` at project root. CLAUDE.md is the operating-rules + current-step tracker; DECISIONS.md is the locked-choice list; this file is the append-only log.
**Tested:** N/A — meta step.
**Decisions:** These files live at project root, separate from the `~/.claude/.../memory/` directory. The memory dir holds cross-session user preferences (feedback memos); project root holds in-repo context. Both are sources of truth.

---

## 2026-05-14 — Step 18: Audio (procedural SFX placeholders)
**Built:** WebAudio synth module at top of `GameScene.js`. Four sounds wired: `sfxShoot` (filtered noise burst + low square thump), `sfxEnemyHit` (high beep, on non-lethal hits), `sfxEnemyDeath` (sawtooth descend), `sfxPlayerHit` (lower sawtooth descend). AudioContext init on first user input.
**Tested:** "all sounds do their assigned tasks."
**Result:** Passed.
**Decisions:** **All current audio is placeholder** — will be replaced by free sound packs. Saved feedback memory `project_exo_placeholders_only`. Do not add more synth SFX (reload chime, dash whoosh, victory sting) without asking — those are exactly what asset packs ship.

---

## 2026-05-14 — Camera zoom + follow
**Built:** Camera zoom 0.45 → 0.75. Switched from fixed `centerOn` to `startFollow(this.player, true, 0.12, 0.12)` (light lerp).
**Tested:** "perfect camera."
**Decisions:** At this zoom the 40×40 diamond feels cramped. Saved project memory `project_exo_map_too_small` — map expansion is a future deferred step; do NOT auto-expand.

---

## 2026-05-14 — Sprint (Left Shift)
**Built:** SHIFT held + WASD → 1.6× speed. Drains 25 stamina/sec while sprinting; regen disabled mid-sprint. Auto-cancels at 0 stamina.
**Tested:** Worked.
**Decisions:** SPRINT_MULT=1.6, SPRINT_STAMINA_DRAIN=25. Net −10/sec while sprinting vs idle regen +15/sec → ~10 sec sustained sprint from a full bar.

---

## 2026-05-14 — Keybind reshuffle + jump + stamina system
**Built:** ESC pause/resume (SPACE also resumes); ALT = dash (moved from SPACE); SPACE = jump (new). Stamina pool 100, regen 15/sec, dash cost 35, jump cost 25. Removed old dash cooldown — stamina is the only gate now. Stamina bar UI under HP. Jump = 0.5s sine arc, 18px peak Y offset, ground shadow stays put, player immune to touch damage during the arc.
**Tested:** Worked.
**Decisions:** Jump grants touch-damage immunity during the arc (locked in DECISIONS.md — flagged to user as a realism call, they didn't object). Dash gated on stamina only, not cooldown. ALT and ESC have `addCapture` to prevent browser default actions (Windows menu activation, fullscreen exit).

---

## 2026-05-14 — Pause menu + muzzle flash visibility fix
**Built:** P key pause + dark overlay (later replaced by ESC in the keybind reshuffle). Muzzle flash radius 5→11 and life 60→100ms — was nearly invisible at 0.45 camera zoom.
**Tested:** Pause worked. Muzzle flash now readable.
**Bug fixed:** Title-screen clicks queued shots that fired on game start. Patched: pointerdown gated against `phase !== 'PLAYING'`.
**Decisions:** Realism feedback memory updated — "any feature/bug that LOOKS unrealistic counts; gate handlers against non-PLAYING phases so accidental fire/dash/spawn can't happen during title, intermission, or game over."

---

## 2026-05-14 — Step 16: Weapon facing + muzzle flash
**Built:** Light-grey 14×3 px barrel rectangle attached to player, rotates with cursor each frame. Yellow muzzle-flash circle at the barrel tip on each shot (initially 60ms / radius 5 — too subtle; fixed next step).
**Tested:** Barrel readable; muzzle flash too small.

---

## 2026-05-14 — Step 15: Title screen
**Built:** TITLE phase. Big green "PROJECT EXO", subtitle, controls list, top-5 leaderboard preview, current player name + "Press SPACE/ENTER to begin", N to change name. Semi-transparent dark overlay (75% alpha) keeps the world dim behind the title.
**Tested:** Worked — but on first transition, accidental shots fired in every direction (bug; fixed next step).

---

## 2026-05-14 — Step 14: Leaderboard + username (localStorage)
**Built:** Username key `projectExoUsername`, leaderboard key `projectExoLeaderboard`. Top 10 stored, top 5 displayed on end screens. Sort by kills desc, then round desc. Sanitized username (max 12 chars, A-Za-z0-9 _-). N key on game-over re-prompts for name.
**Tested:** Worked.
**Decisions:** Local-only by explicit user spec ("no need for a server"). Flagged that cross-device sharing would need a server — declined for now.

---

## 2026-05-14 — Realism pacing rebalance
**Built:** PLAYER_SPEED 9→6, BULLET_SPEED 30→22, EXO_SPEED_BASE 4→2.5, EXO_SPEED_PER_ROUND 0.15→0.10, EXO_SPAWN_INTERVAL_BASE 1.0→1.5, EXO_SPAWN_INTERVAL_FLOOR 0.3→0.6, RELOAD_TIME 1.2→2.0, DASH_DISTANCE 3→2, DASH_COOLDOWN 2→4 (later removed entirely with stamina system).
**Tested:** "I like it."
**Decisions:** Saved feedback memory `project_exo_realism_pacing`. Applies to ALL future temporal/speed tuning. When in doubt, slower.

---

## 2026-05-14 — Step 13: Wart Mutant boss (rounds 5/10/15/20/25)
**Built:** Boss as `ENEMY_TYPES.boss`: 80×40 green slime ellipse, speedMult 0.3, damage 3, hitRadius 1.6, touchRadius 1.4. Per-round HP scales 30/60/90/120/150. Boss HP bar centered at top with "WART MUTANT" label. On boss rounds, minion spawn count is halved. Boss does not drop ammo.
**Tested:** Round 5 boss confirmed.

---

## 2026-05-14 — Step 12: Enemy variants (Runner + Mutant) + color tweak
**Built:** `ENEMY_TYPES` config. Runner (cyan #30dfff, 16×8, 1.6× speed, 1 HP, 1 dmg) introduced R5+. Mutant (violet #b040ff, 34×17, 0.6× speed, 3 HP, 2 dmg) introduced R10+. Spawn mix bracketed by round (R1-4, R5-9, R10-14, R15+). Bullets do 1 dmg; Mutants take 3 shots. Ammo drops only on killing blow. Colors retuned (orange/purple → cyan/violet) for distinct hues on the grey ground.
**Tested:** Worked.

---

## 2026-05-14 — Step 11: Hit feedback
**Built:** Player ellipse flashes red (PLAYER_HIT_COLOR) for 150ms on each contact hit.
**Tested:** Worked.
**Decisions:** Initially included a 100ms camera shake — user response: "we will NOT have ANY screen shake EVER." Removed. Saved memory `project_exo_no_screen_shake` as hard rule. See DECISIONS.md.

---

## 2026-05-14 — Step 10: Dash
**Built:** SPACE (later moved to ALT) triggers a quick lunge in the WASD direction. 3-tile (later 2-tile) distance over 0.15s. Cooldown 2s (later 4s, later removed entirely with stamina). Dash UI line under HP showing READY / countdown.
**Decisions:** Hardcore-pure — no i-frames during dash. Requires a WASD direction (no idle dash).

---

## 2026-05-14 — Step 9: Difficulty scaling
**Built:** Per-round Exo speed (+0.15 then +0.10/round). Spawn interval shrinks per round with a floor. Per-enemy speed stored at spawn so a wave's pace is locked in when the wave starts.

---

## 2026-05-14 — Step 8: Reserve ammo + drops
**Built:** Starting reserve 30. 25% chance per Exo kill to drop a yellow square (+5 reserve). Pickup radius 0.7 world units — walk-over, no magnet.
**Decisions:** No magnet pickups (hardcore-feel rule).

---

## 2026-05-14 — Step 7: Mag/reload (hardcore)
**Built:** 10-round mag, R to reload, 1.2s (later 2.0s with realism pass) reload. Originally had auto-reload-on-empty-click; **removed at user request** — empty click is a dead click.
**Decisions:** Saved feedback memory `project_exo_hardcore_feel`. Applies broadly: no auto-reload, no aim assist, no QoL smoothing.

---

## 2026-05-14 — Step 6: Kill counter + death flash
**Built:** Top-center `Kills: N`. On each Exo death, a white circle expands 6→22 px while fading over 250ms. End screens show final kill count.

---

## 2026-05-14 — Step 5: 25-round system
**Built:** Round counter top-right. Round 1 = 5 Exos (formula `5 + (n-1)*3`); when all dead → 3s intermission → next round. Round 25 cleared = green victory screen.

---

## 2026-05-14 — Step 4: HP + contact damage + game over + restart
**Built:** PLAYER_MAX_HP 5. Per-Exo touch cooldown 1s so a single Exo can't drain you in one frame. HP=0 → red GAME OVER text, R restarts the scene. Two-camera UI setup: main cam ignores HUD; zoom-1 UI cam ignores world objects.

---

## 2026-05-14 — Step 3: Basic Exo (spawn + chase)
**Built:** Red ellipse 22×11. Spawns from random diamond edge every 2s, capped at 20 alive, walks straight at player. Bullets one-shot kill. Hit radius 0.6 world units. No player damage in this step (added in Step 4).

---

## 2026-05-14 — Step 2: Aim line + bullets
**Built:** Faint white aim line player → cursor. Left-click fires a yellow circle bullet from player toward cursor world position. Bullets despawn at the diamond edge or after 3s life.
**Decisions:** BULLET_SPEED=30 (later 22 for realism). Semi-auto (per-click). Warm-yellow on dark ground reads well.

---

## 2026-05-14 — Step 1+1B: Iso world + WASD
**Built:** WORLD_TILES=40, TILE_W=64, TILE_H=32. Diamond ground, player ellipse 24×12 at world center. WASD on iso axes.
**Decisions:** PLAYER_SPEED settled at 9 (later 6 for realism). **WASD mapping derived from the iso transform**, NOT the spec's table — that table was rotated 90° wrong (spec said W=+1/-1 which is east on screen, not north). Saved as memory `project_exo_iso_wasd_gotcha`.
