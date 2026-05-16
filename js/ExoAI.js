// ============================================================
// FILE MAP — js/ExoAI.js
// Perception-based enemy AI for Project Exo (shell phase).
// Free functions; each takes the GameScene instance as first arg.
// Loaded before GameScene.js via index.html.
// If you add/remove code, update this map AND the section
// headers below so ranges stay accurate.
// ============================================================
//  1. AI / PERCEPTION CONSTANTS           (lines 25-45)
//  2. SOUND CONSTANTS                     (lines 46-55)
//  3. SCENE INIT HOOK                     (lines 56-76)
//  4. SOUND EMISSION                      (lines 77-84)
//  5. PER-FRAME AI DISPATCH               (lines 85-197)
//  6. INTERNAL AI HELPERS                 (lines 198-261)
//  7. O / I DEBUG OVERLAYS                (lines 262-358)
// ============================================================
//
// Sub-step 5: state machine + helpers FILLED.
// Sub-step 7: O = vision (cone or chase-range), I = audio
// (max-loudness ring), state-letter labels W/I/C/S piggyback
// on O. LOS assumption: no terrain occlusion in shell phase;
// when terrain lands, add an LOS test inside aiCheckSight.
//

// ===== 1. AI / PERCEPTION CONSTANTS (lines 25-45) =====
const AI_WANDER_RADIUS = 8;
const AI_WANDER_PAUSE_MIN = 0.5;
const AI_WANDER_PAUSE_MAX = 2.0;
const AI_SEARCH_RADIUS = 4;
const AI_SEARCH_DURATION = 7.0;
const AI_ARRIVAL_DIST = 0.5;
const AI_INVESTIGATE_PAUSE = 1.0;
// Chase-memory window. When sight is lost mid-chase, the exo keeps
// running at chase speed toward the LAST KNOWN player position for
// this many seconds before dropping to SEARCH. Re-entering sight
// resets the timer and re-locks the live player as target.
const AI_CHASE_MEMORY_DURATION = 2.5;

// State string constants — keep these as the only spellings used
// anywhere so a typo causes a JS reference error, not silent drift.
const AI_STATE_WANDER = 'wander';
const AI_STATE_INVESTIGATE = 'investigate';
const AI_STATE_CHASE = 'chase';
const AI_STATE_SEARCH = 'search';

// ===== 2. SOUND CONSTANTS (lines 46-55) =====
// Loudness values are in world tiles. An exo hears a sound iff
// hypot(self - origin) <= loudness * cfg.perception.hearingMult.
const SOUND_LOUDNESS_SHOOT = 15;
const SOUND_LOUDNESS_SPRINT = 9;
const SOUND_LOUDNESS_WALK = 4;
// Throttle player audio emission so we're not spamming the queue.
const SOUND_SPRINT_EMIT_INTERVAL = 0.5;
const SOUND_WALK_EMIT_INTERVAL = 0.8;

// ===== 3. SCENE INIT HOOK (lines 56-76) =====
// Called once from GameScene.create(). Sets up scene-side state,
// allocates the debug-overlay Graphics object + state-letter
// label pool, registers the O/I toggle keys, and wires
// drawAIDebugOverlay into PRE_RENDER so GameScene.js doesn't
// need a separate hook for it.
function initExoAI(scene) {
  scene.aiSoundEvents = [];
  scene.aiSprintSoundTimer = 0;
  scene.aiWalkSoundTimer = 0;
  scene.aiDebugVision = false;
  scene.aiDebugAudio = false;
  scene.aiDebugLabels = [];
  scene.aiDebugGfx = scene.add.graphics();
  scene.aiDebugGfx.setDepth(-100); // below entities (depth >= 0) so cone tips don't cover exo bodies
  if (scene.uiCam) scene.uiCam.ignore(scene.aiDebugGfx); // world-space only — keeps UI camera from double-rendering
  scene.aiDebugVisionKey = scene.input.keyboard.addKey('O');
  scene.aiDebugAudioKey = scene.input.keyboard.addKey('I');
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, () => drawAIDebugOverlay(scene));
}

// ===== 4. SOUND EMISSION (lines 77-84) =====
// Player-action sites call this to push a sound event onto the
// per-frame queue. Consumed by updateExoAI; flushed at end of
// GameScene.update() main loop.
function emitSound(scene, wx, wy, loudness) {
  scene.aiSoundEvents.push({ wx, wy, loudness });
}

// ===== 5. PER-FRAME AI DISPATCH (lines 85-197) =====
// Main per-exo entry point. Called from GameScene's per-exo
// loop once per frame, replacing the old chase math at §15.
// State machine: WANDER / INVESTIGATE / CHASE / SEARCH.
//
// LOS assumption: no occlusion check (no terrain in shell
// phase). When terrain lands, add a line-of-sight test in
// aiCheckSight.
function updateExoAI(scene, e, dt) {
  const cfg = e.cfg.perception;

  // 1. Sight check (FOV-gated except CHASE = range-only).
  if (aiCheckSight(scene, e) && e.aiState !== AI_STATE_CHASE) {
    e.aiState = AI_STATE_CHASE;
    e.aiTargetWX = scene.player.worldX;
    e.aiTargetWY = scene.player.worldY;
    e.aiStateTimer = 0;
    e.aiSoundPriority = 0;
  }

  // 2. Sound consumption — chase ignores all sounds.
  if (e.aiState !== AI_STATE_CHASE) aiConsumeSounds(scene, e);

  // 3. State dispatch.
  let speedMult = cfg.wanderSpeedMult;
  switch (e.aiState) {
    case AI_STATE_WANDER: {
      if (e.aiStateTimer > 0) {
        e.aiStateTimer -= dt;
        return;
      }
      if (e.aiTargetWX === null || aiReachedTarget(e)) {
        aiPickWanderTarget(e);
        e.aiStateTimer = AI_WANDER_PAUSE_MIN +
          Math.random() * (AI_WANDER_PAUSE_MAX - AI_WANDER_PAUSE_MIN);
        return;
      }
      speedMult = cfg.wanderSpeedMult;
      break;
    }
    case AI_STATE_INVESTIGATE: {
      if (aiReachedTarget(e)) {
        e.aiState = AI_STATE_SEARCH;
        e.aiStateTimer = AI_SEARCH_DURATION;
        e.aiTargetWX = e.worldX;
        e.aiTargetWY = e.worldY;
        e.aiSoundPriority = 0;
        return;
      }
      speedMult = cfg.chaseSpeedMult;
      break;
    }
    case AI_STATE_CHASE: {
      const dx = scene.player.worldX - e.worldX;
      const dy = scene.player.worldY - e.worldY;
      const dist = Math.hypot(dx, dy);
      if (dist > cfg.sightRange) {
        // Sight lost. Open (or tick) the chase-memory window — keep
        // running at chase speed toward the FROZEN last-known target.
        if (e.aiChaseMemoryTimer <= 0) {
          e.aiChaseMemoryTimer = AI_CHASE_MEMORY_DURATION;
        } else {
          e.aiChaseMemoryTimer -= dt;
        }
        if (e.aiChaseMemoryTimer <= 0) {
          e.aiState = AI_STATE_SEARCH;
          e.aiStateTimer = AI_SEARCH_DURATION;
          // aiTargetWX/Y already at last known player pos.
        }
        speedMult = cfg.chaseSpeedMult;
        break;
      }
      // In sight (initial or re-acquired). Live-track and reset memory.
      e.aiChaseMemoryTimer = 0;
      e.aiTargetWX = scene.player.worldX;
      e.aiTargetWY = scene.player.worldY;
      speedMult = cfg.chaseSpeedMult;
      break;
    }
    case AI_STATE_SEARCH: {
      e.aiStateTimer -= dt;
      if (e.aiStateTimer <= 0) {
        e.aiState = AI_STATE_WANDER;
        e.aiTargetWX = null;
        e.aiSoundPriority = 0;
        return;
      }
      if (e.aiTargetWX === null || aiReachedTarget(e)) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * AI_SEARCH_RADIUS;
        e.aiTargetWX = Phaser.Math.Clamp(e.worldX + Math.cos(angle) * r, 1, WORLD_TILES - 1);
        e.aiTargetWY = Phaser.Math.Clamp(e.worldY + Math.sin(angle) * r, 1, WORLD_TILES - 1);
      }
      speedMult = cfg.wanderSpeedMult;
      break;
    }
  }

  // 4. Movement toward aiTargetWX/Y at speedMult * e.speed.
  if (e.aiTargetWX !== null) {
    const tdx = e.aiTargetWX - e.worldX;
    const tdy = e.aiTargetWY - e.worldY;
    const tlen = Math.hypot(tdx, tdy);
    if (tlen > 0) {
      const nx = tdx / tlen;
      const ny = tdy / tlen;
      e.worldX += nx * e.speed * speedMult * dt;
      e.worldY += ny * e.speed * speedMult * dt;
      e.aiFacing = Math.atan2(ny, nx);
    }
  }
}

// ===== 6. INTERNAL AI HELPERS (lines 198-261) =====
// Pure-ish helpers used by updateExoAI.

// Sight check. In CHASE, range-only (no FOV). Otherwise FOV-gated.
function aiCheckSight(scene, e) {
  const cfg = e.cfg.perception;
  const dx = scene.player.worldX - e.worldX;
  const dy = scene.player.worldY - e.worldY;
  const dist = Math.hypot(dx, dy);
  if (dist > cfg.sightRange) return false;
  if (e.aiState === AI_STATE_CHASE) return true;
  if (dist === 0) return true;
  const nx = dx / dist;
  const ny = dy / dist;
  const dot = Math.cos(e.aiFacing) * nx + Math.sin(e.aiFacing) * ny;
  return dot >= Math.cos(cfg.sightFOV / 2);
}

// Within AI_ARRIVAL_DIST of the current target.
function aiReachedTarget(e) {
  if (e.aiTargetWX === null) return false;
  const dx = e.aiTargetWX - e.worldX;
  const dy = e.aiTargetWY - e.worldY;
  return Math.hypot(dx, dy) <= AI_ARRIVAL_DIST;
}

// Random point within AI_WANDER_RADIUS of current pos, clamped
// to map interior.
function aiPickWanderTarget(e) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.random() * AI_WANDER_RADIUS;
  e.aiTargetWX = Phaser.Math.Clamp(e.worldX + Math.cos(angle) * r, 1, WORLD_TILES - 1);
  e.aiTargetWY = Phaser.Math.Clamp(e.worldY + Math.sin(angle) * r, 1, WORLD_TILES - 1);
}

// Walk the per-frame sound queue. WANDER/SEARCH transition to
// INVESTIGATE on audible sound. INVESTIGATE only preempts if
// the new event is louder/closer than what we're already tracking.
// CHASE state is filtered out by the caller.
function aiConsumeSounds(scene, e) {
  const cfg = e.cfg.perception;
  for (const evt of scene.aiSoundEvents) {
    const dx = evt.wx - e.worldX;
    const dy = evt.wy - e.worldY;
    const dist = Math.hypot(dx, dy);
    if (dist > evt.loudness * cfg.hearingMult) continue;
    const priority = evt.loudness / Math.max(dist, 0.001);
    if (e.aiState === AI_STATE_WANDER || e.aiState === AI_STATE_SEARCH) {
      e.aiState = AI_STATE_INVESTIGATE;
      e.aiTargetWX = evt.wx;
      e.aiTargetWY = evt.wy;
      e.aiSoundPriority = priority;
      e.aiStateTimer = 0;
    } else if (e.aiState === AI_STATE_INVESTIGATE) {
      if (priority > e.aiSoundPriority) {
        e.aiTargetWX = evt.wx;
        e.aiTargetWY = evt.wy;
        e.aiSoundPriority = priority;
        e.aiStateTimer = 0;
      }
    }
  }
}

// ===== 7. O / I DEBUG OVERLAYS (lines 262-358) =====
// O toggles vision (FOV cone in non-chase, range-circle in
// chase) AND W/I/C/S state-letter labels above each exo.
// I toggles audio (max-loudness hearing radius).
// World circles become 2:1 ellipses under the dimetric squash,
// so we sample the boundary by world angle and project each
// point through worldToScreen(). Wired into PRE_RENDER from
// initExoAI; runs every frame.
function drawAIDebugOverlay(scene) {
  if (Phaser.Input.Keyboard.JustDown(scene.aiDebugVisionKey)) {
    scene.aiDebugVision = !scene.aiDebugVision;
  }
  if (Phaser.Input.Keyboard.JustDown(scene.aiDebugAudioKey)) {
    scene.aiDebugAudio = !scene.aiDebugAudio;
  }
  const g = scene.aiDebugGfx;
  g.clear();
  // Hide all pooled state-letter labels by default; we'll un-hide what we use.
  for (const label of scene.aiDebugLabels) {
    if (label) label.setVisible(false);
  }
  if (!scene.aiDebugVision && !scene.aiDebugAudio) return;
  if (!scene.exos) return;
  let labelIdx = 0;
  for (const e of scene.exos) {
    // Cull exos far from the player — their cones extending from off-screen
    // sources into the viewport look like "phantom cones" without a base.
    const dpx = e.worldX - scene.player.worldX;
    const dpy = e.worldY - scene.player.worldY;
    if (dpx * dpx + dpy * dpy > 400) continue; // 20-tile radius from player
    const cfg = e.cfg.perception;
    if (scene.aiDebugAudio) {
      drawIsoEllipse(g, e.worldX, e.worldY,
        SOUND_LOUDNESS_SHOOT * cfg.hearingMult, 0x4080ff, 0.25);
    }
    if (scene.aiDebugVision) {
      if (e.aiState === AI_STATE_CHASE) {
        drawIsoEllipse(g, e.worldX, e.worldY, cfg.sightRange, 0xff4040, 0.5);
      } else {
        drawIsoCone(g, e.worldX, e.worldY, e.aiFacing,
          cfg.sightFOV, cfg.sightRange, 0xff4040, 0.5);
      }
      // State letter (W/I/C/S) above the exo so each cone is tagged
      // to a visible body. If you see a cone with NO letter, that's a
      // truly phantom cone (no exo behind it) — proof of a draw bug.
      let label = scene.aiDebugLabels[labelIdx];
      if (!label) {
        label = scene.add.text(0, 0, '', {
          fontSize: '14px', color: '#ffffff',
          stroke: '#000000', strokeThickness: 3,
        });
        label.setOrigin(0.5);
        label.setDepth(50);
        if (scene.uiCam) scene.uiCam.ignore(label); // world-space label — UI camera mustn't double-render
        scene.aiDebugLabels[labelIdx] = label;
      }
      const center = worldToScreen(e.worldX, e.worldY);
      label.x = center.x;
      label.y = center.y - 22;
      label.setText(e.aiState.charAt(0).toUpperCase());
      label.setVisible(true);
      labelIdx++;
    }
  }
}

// Sample a world-space circle into screen-space ellipse points.
function drawIsoEllipse(g, wx, wy, r, color, alpha) {
  const steps = 36;
  g.lineStyle(1, color, alpha);
  g.beginPath();
  for (let i = 0; i <= steps; i++) {
    const ang = (i / steps) * Math.PI * 2;
    const px = worldToScreen(wx + Math.cos(ang) * r, wy + Math.sin(ang) * r);
    if (i === 0) g.moveTo(px.x, px.y);
    else g.lineTo(px.x, px.y);
  }
  g.strokePath();
}

// Sample a world-space FOV cone into a screen-space polygon
// (center → arc points along the rim → back to center).
function drawIsoCone(g, wx, wy, facing, fov, r, color, alpha) {
  const half = fov / 2;
  const steps = 16;
  const center = worldToScreen(wx, wy);
  g.lineStyle(1, color, alpha);
  g.beginPath();
  g.moveTo(center.x, center.y);
  for (let i = 0; i <= steps; i++) {
    const ang = facing - half + (i / steps) * fov;
    const px = worldToScreen(wx + Math.cos(ang) * r, wy + Math.sin(ang) * r);
    g.lineTo(px.x, px.y);
  }
  g.lineTo(center.x, center.y);
  g.strokePath();
}
