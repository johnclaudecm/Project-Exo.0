// ============================================================
// FILE MAP — js/ExoAI.js
// Perception-based enemy AI for Project Exo (shell phase).
// Free functions; each takes the GameScene instance as first arg.
// Loaded before GameScene.js via index.html.
// If you add/remove code, update this map AND the section
// headers below so ranges stay accurate.
// ============================================================
//  1. AI / PERCEPTION CONSTANTS           (lines 24-39)
//  2. SOUND CONSTANTS                     (lines 40-49)
//  3. SCENE INIT HOOK                     (lines 50-61)
//  4. SOUND EMISSION                      (lines 62-69)
//  5. PER-FRAME AI DISPATCH               (lines 70-84)
//  6. INTERNAL AI HELPERS                 (lines 85-107)
//  7. O-KEY DEBUG OVERLAY                 (lines 108-126)
// ============================================================
//
// Sub-step 2 status: STUBS ONLY. No call sites in GameScene yet.
// File loads but nothing reads from it. Sub-step 3 wires init +
// per-exo state fields; sub-step 4 wires sound emit + queue
// flush; sub-step 5 fills updateExoAI body; sub-step 7 fills
// drawAIDebugOverlay body.

// ===== 1. AI / PERCEPTION CONSTANTS (lines 24-39) =====
const AI_WANDER_RADIUS = 8;
const AI_WANDER_PAUSE_MIN = 0.5;
const AI_WANDER_PAUSE_MAX = 2.0;
const AI_SEARCH_RADIUS = 4;
const AI_SEARCH_DURATION = 4.0;
const AI_ARRIVAL_DIST = 0.5;
const AI_INVESTIGATE_PAUSE = 1.0;

// State string constants — keep these as the only spellings used
// anywhere so a typo causes a JS reference error, not silent drift.
const AI_STATE_WANDER = 'wander';
const AI_STATE_INVESTIGATE = 'investigate';
const AI_STATE_CHASE = 'chase';
const AI_STATE_SEARCH = 'search';

// ===== 2. SOUND CONSTANTS (lines 40-49) =====
// Loudness values are in world tiles. An exo hears a sound iff
// hypot(self - origin) <= loudness * cfg.perception.hearingMult.
const SOUND_LOUDNESS_SHOOT = 15;
const SOUND_LOUDNESS_SPRINT = 9;
const SOUND_LOUDNESS_WALK = 4;
// Throttle player audio emission so we're not spamming the queue.
const SOUND_SPRINT_EMIT_INTERVAL = 0.5;
const SOUND_WALK_EMIT_INTERVAL = 0.8;

// ===== 3. SCENE INIT HOOK (lines 50-61) =====
// Called once from GameScene.create(). Sets up scene-side state
// the AI system reads and writes. Does NOT register input keys
// or render hooks — those land in their own sub-steps.
function initExoAI(scene) {
  scene.aiSoundEvents = [];
  scene.aiSprintSoundTimer = 0;
  scene.aiWalkSoundTimer = 0;
  scene.aiDebugOverlay = false;
  scene.aiDebugLabels = [];
}

// ===== 4. SOUND EMISSION (lines 62-69) =====
// Player-action sites call this to push a sound event onto the
// per-frame queue. Consumed by updateExoAI; flushed at end of
// GameScene.update() main loop.
function emitSound(scene, wx, wy, loudness) {
  scene.aiSoundEvents.push({ wx, wy, loudness });
}

// ===== 5. PER-FRAME AI DISPATCH (lines 70-84) =====
// Main per-exo entry point. Called from GameScene's per-exo loop
// once per frame, replacing the old chase math at §15.
// State machine: WANDER / INVESTIGATE / CHASE / SEARCH.
// Sub-step 5 fills the body.
//
// LOS assumption: no occlusion check (no terrain in shell phase).
// When terrain lands, add a line-of-sight test in aiCheckSight.
function updateExoAI(scene, e, dt) {
  // STUB — sub-step 5 implements the state machine.
  // Sub-step 4 will leave this as a stub while wiring sounds;
  // exos continue to move via the old chase math until sub-step 5
  // swaps the call site in §15.
}

// ===== 6. INTERNAL AI HELPERS (lines 85-107) =====
// Pure-ish helpers used by updateExoAI. Filled in sub-step 5.
function aiCheckSight(scene, e) {
  // STUB — returns whether scene.player is visible to exo e.
  // CHASE state uses range-only; other states use FOV-gated.
  return false;
}

function aiReachedTarget(e) {
  // STUB — true if exo is within AI_ARRIVAL_DIST of (aiTargetWX, aiTargetWY).
  return false;
}

function aiPickWanderTarget(e) {
  // STUB — pick a random walkable point within AI_WANDER_RADIUS,
  // clamped to [1, WORLD_TILES - 1] on both axes.
}

function aiConsumeSounds(scene, e) {
  // STUB — for each event in scene.aiSoundEvents, transition e
  // to INVESTIGATE if heard and current state permits.
}

// ===== 7. O-KEY DEBUG OVERLAY (lines 108-126) =====
// Toggled by 'O' (Overlay) in GameScene.update(). When on, draws
// per-exo sight cone + hearing ring + W/I/C/S state letter labels.
// (Letter key, not F-key — Edge hijacks F1, and the user wants the
// debug-tool slot reserved on U/I/O/P.)
// Uses a Phaser.Text pool indexed by exo to avoid recreating
// text objects each frame. Sub-step 7 fills the body.
function drawAIDebugOverlay(scene) {
  // STUB — sub-step 7 implements the overlay render.
  // When off (scene.aiDebugOverlay === false), hide all pooled
  // labels so they don't linger from the last on-frame.
  if (!scene.aiDebugOverlay) {
    for (const label of scene.aiDebugLabels) {
      if (label) label.setVisible(false);
    }
    return;
  }
  // (Sight cones, hearing rings, state letters land in sub-step 7.)
}
