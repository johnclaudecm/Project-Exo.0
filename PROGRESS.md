# Project Exo — Progress Log

Append-only. **Newest entries at the top.** Each entry: what was built, what was tested, pass/fail, any tuning decisions or feedback that landed.

When a tuning pass spans multiple turns (e.g. "PLAYER_SPEED 12 → 9 → 6"), record the final number and a one-line "why."

---

## 2026-05-14 — Step 19: Wart Mutant boss attack (telegraphed slime spit)
**Built:** Boss now winds up for 0.6s when player is within 6 world tiles (color shifts to `0xc0ff60`, scale 1.08), then fires a green slime circle (`0xa8e040`, radius 8) toward the player's position at wind-up start. Slime travels 8 world units/sec, deals 2 dmg on direct hit, despawns on hit / leaving diamond / 2.5s life. 3.0s cooldown from wind-up start. Jump i-frames cover the slime per existing `this.jumpTime <= 0` gate.
**Tested:** User initiated push at session close — implementation landed but not yet confirmed by playtest.
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
