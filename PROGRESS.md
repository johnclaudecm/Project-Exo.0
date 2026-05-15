# Project Exo — Progress Log

Append-only. **Newest entries at the top.** Each entry: what was built, what was tested, pass/fail, any tuning decisions or feedback that landed.

When a tuning pass spans multiple turns (e.g. "PLAYER_SPEED 12 → 9 → 6"), record the final number and a one-line "why."

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
