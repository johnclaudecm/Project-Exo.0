let audioCtx = null;
function initAudio() {
  if (audioCtx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  } catch (_) {}
}
function ensureAudio() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function tone(freq, dur, type, gain, rampTo) {
  if (!audioCtx) return;
  ensureAudio();
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, now);
  if (rampTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, rampTo), now + dur);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0005, now + dur);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}
function noiseBurst(dur, filterFreq, gain) {
  if (!audioCtx) return;
  ensureAudio();
  const sr = audioCtx.sampleRate;
  const len = Math.max(1, Math.floor(sr * dur));
  const buf = audioCtx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = audioCtx.createGain();
  g.gain.value = gain;
  src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
  src.start();
}
function sfxShoot()       { noiseBurst(0.08, 1800, 0.18); tone(180, 0.06, 'square', 0.08, 60); }
function sfxEnemyHit()    { tone(420, 0.05, 'square', 0.08, 300); }
function sfxEnemyDeath()  { tone(150, 0.18, 'sawtooth', 0.12, 70); }
function sfxPlayerHit()   { tone(110, 0.22, 'sawtooth', 0.18, 55); }

const PLAYER_SPEED = 6;
const PLAYER_W = 24;
const PLAYER_H = 12;

const BULLET_SPEED = 22;
const BULLET_RADIUS = 4;
const BULLET_COLOR = 0xffe066;
const BULLET_MAX_LIFE = 3.0;

const AIM_LINE_COLOR = 0xffffff;
const AIM_LINE_ALPHA = 0.35;
const AIM_LINE_WIDTH = 1;

const EXO_SPEED_BASE = 2.5;
const EXO_SPEED_PER_ROUND = 0.10;
const EXO_SPAWN_INTERVAL_BASE = 1.5;
const EXO_SPAWN_INTERVAL_PER_ROUND = 0.02;
const EXO_SPAWN_INTERVAL_FLOOR = 0.6;
const EXO_MAX_ALIVE = 30;

const ENEMY_TYPES = {
  basic:  { w: 22, h: 11, color: 0xc23838, hp: 1, speedMult: 1.0, damage: 1, hitRadius: 0.6, touchRadius: 0.6 },
  runner: { w: 16, h: 8,  color: 0x30dfff, hp: 1, speedMult: 1.6, damage: 1, hitRadius: 0.5, touchRadius: 0.5 },
  mutant: { w: 34, h: 17, color: 0xb040ff, hp: 3, speedMult: 0.6, damage: 2, hitRadius: 0.9, touchRadius: 0.9 },
  boss:   { w: 80, h: 40, color: 0x80c040, hp: 0, speedMult: 0.3, damage: 3, hitRadius: 1.6, touchRadius: 1.4 },
};

const BOSS_ROUNDS = [5, 10, 15, 20, 25];
function isBossRound(n) { return BOSS_ROUNDS.indexOf(n) !== -1; }
function bossHpForRound(n) {
  const idx = BOSS_ROUNDS.indexOf(n);
  return 30 + idx * 30;
}

function enemyMixForRound(n) {
  if (n <= 4)  return [['basic', 1.0]];
  if (n <= 9)  return [['basic', 0.70], ['runner', 0.30]];
  if (n <= 14) return [['basic', 0.50], ['runner', 0.30], ['mutant', 0.20]];
  return [['basic', 0.35], ['runner', 0.35], ['mutant', 0.30]];
}

function pickEnemyTypeForRound(n) {
  const mix = enemyMixForRound(n);
  const r = Math.random();
  let acc = 0;
  for (const [type, w] of mix) {
    acc += w;
    if (r <= acc) return type;
  }
  return mix[mix.length - 1][0];
}

function exoSpeedForRound(n) {
  return EXO_SPEED_BASE + (n - 1) * EXO_SPEED_PER_ROUND;
}
function spawnIntervalForRound(n) {
  return Math.max(EXO_SPAWN_INTERVAL_FLOOR, EXO_SPAWN_INTERVAL_BASE - (n - 1) * EXO_SPAWN_INTERVAL_PER_ROUND);
}
const EXO_TOUCH_COOLDOWN = 1.0;

const PLAYER_MAX_HP = 5;

const USERNAME_KEY = 'projectExoUsername';
const LEADERBOARD_KEY = 'projectExoLeaderboard';
const LEADERBOARD_MAX = 10;
const LEADERBOARD_DISPLAY = 5;
const USERNAME_MAX_LEN = 12;

function sanitizeUsername(raw) {
  if (!raw) return '';
  const cleaned = String(raw).replace(/[^A-Za-z0-9 _\-]/g, '').trim();
  return cleaned.slice(0, USERNAME_MAX_LEN);
}

function promptForUsername(defaultName) {
  const input = window.prompt('Enter your name for the leaderboard (max ' + USERNAME_MAX_LEN + ' chars):', defaultName || '');
  const cleaned = sanitizeUsername(input);
  return cleaned || 'PLAYER';
}

function loadUsername() {
  try { return localStorage.getItem(USERNAME_KEY) || ''; } catch (_) { return ''; }
}
function saveUsername(name) {
  try { localStorage.setItem(USERNAME_KEY, name); } catch (_) {}
}

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) { return []; }
}
function saveLeaderboard(arr) {
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(arr)); } catch (_) {}
}

function addToLeaderboard(entry) {
  const board = loadLeaderboard();
  board.push(entry);
  board.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills;
    return b.round - a.round;
  });
  const trimmed = board.slice(0, LEADERBOARD_MAX);
  saveLeaderboard(trimmed);
  const rank = trimmed.indexOf(entry);
  return { board: trimmed, rank };
}

function formatLeaderboard(board, highlightEntry) {
  if (board.length === 0) return '(empty)';
  const lines = ['-- LEADERBOARD --'];
  const shown = board.slice(0, LEADERBOARD_DISPLAY);
  for (let i = 0; i < shown.length; i++) {
    const e = shown[i];
    const marker = (e === highlightEntry) ? '> ' : '  ';
    const namePad = (e.name + '            ').slice(0, USERNAME_MAX_LEN);
    lines.push(marker + (i + 1) + '. ' + namePad + '  K:' + e.kills + '  R:' + e.round);
  }
  return lines.join('\n');
}

const DASH_DISTANCE = 2.0;
const DASH_DURATION = 0.18;

const JUMP_DURATION = 0.5;
const JUMP_PEAK_HEIGHT = 18;

const STAMINA_MAX = 100;
const STAMINA_REGEN = 15;
const DASH_STAMINA_COST = 35;
const JUMP_STAMINA_COST = 25;
const SPRINT_MULT = 1.6;
const SPRINT_STAMINA_DRAIN = 25;

const PLAYER_COLOR = 0x3ecf3e;
const PLAYER_HIT_COLOR = 0xff3030;
const HIT_FLASH_DURATION = 0.15;

const BARREL_LENGTH = 14;
const BARREL_THICKNESS = 3;
const BARREL_COLOR = 0xdddddd;
const MUZZLE_FLASH_LIFE = 0.10;
const MUZZLE_FLASH_RADIUS = 11;
const MUZZLE_FLASH_COLOR = 0xfff0a0;

const ROUND_INTERMISSION = 3.0;
const ROUND_TOTAL = 25;
const START_ROUND = 1;
function exosForRound(n) { return 5 + (n - 1) * 3; }

const HIT_BURST_LIFE = 0.25;
const HIT_BURST_START_RADIUS = 6;
const HIT_BURST_END_RADIUS = 22;
const HIT_BURST_COLOR = 0xffffff;

const MAG_SIZE = 10;
const RELOAD_TIME = 2.0;
const STARTING_RESERVE = 30;
const AMMO_DROP_CHANCE = 0.25;
const AMMO_DROP_AMOUNT = 5;
const AMMO_PICKUP_RADIUS = 0.7;
const AMMO_PICKUP_W = 10;
const AMMO_PICKUP_H = 10;
const AMMO_PICKUP_COLOR = 0xffe066;

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.skipTitle = !!(data && data.skipTitle);
  }

  create() {
    const cam = this.cameras.main;
    cam.setZoom(0.75);
    cam.centerOn(0, (WORLD_TILES * TILE_H) / 2);

    const c0 = worldToScreen(0, 0);
    const c1 = worldToScreen(WORLD_TILES, 0);
    const c2 = worldToScreen(WORLD_TILES, WORLD_TILES);
    const c3 = worldToScreen(0, WORLD_TILES);

    const ground = this.add.graphics();
    ground.fillStyle(0x2b2b2b, 1);
    ground.beginPath();
    ground.moveTo(c0.x, c0.y);
    ground.lineTo(c1.x, c1.y);
    ground.lineTo(c2.x, c2.y);
    ground.lineTo(c3.x, c3.y);
    ground.closePath();
    ground.fillPath();
    ground.setDepth(-1000);

    this.player = this.add.ellipse(0, 0, PLAYER_W, PLAYER_H, PLAYER_COLOR);
    this.player.worldX = WORLD_TILES / 2;
    this.player.worldY = WORLD_TILES / 2;
    const initS = worldToScreen(this.player.worldX, this.player.worldY);
    this.player.x = initS.x;
    this.player.y = initS.y;
    cam.startFollow(this.player, true, 0.12, 0.12);

    this.barrel = this.add.rectangle(0, 0, BARREL_LENGTH, BARREL_THICKNESS, BARREL_COLOR);
    this.barrel.setOrigin(0, 0.5);

    this.shadow = this.add.ellipse(0, 0, PLAYER_W, PLAYER_H * 0.7, 0x000000, 0.5);
    this.shadow.setVisible(false);

    this.muzzleFlashes = [];

    this.playerHP = PLAYER_MAX_HP;
    this.gameOver = false;
    this.phase = this.skipTitle ? 'PLAYING' : 'TITLE';

    this.username = loadUsername();
    if (!this.username) {
      this.username = promptForUsername('PLAYER');
      saveUsername(this.username);
    }

    this.keys = this.input.keyboard.addKeys('W,A,S,D,R,SPACE,N,ENTER,ESC,ALT,SHIFT');
    this.input.keyboard.addCapture('SPACE,ESC,ALT,SHIFT');
    this.paused = false;
    this.escKeyWasDown = false;
    this.altKeyWasDown = false;
    this.input.mouse.disableContextMenu();

    this.input.once('pointerdown', initAudio);
    this.input.keyboard.once('keydown', initAudio);

    this.aimLine = this.add.graphics();
    this.aimLine.setDepth(-500);

    this.bullets = [];

    this.exos = [];
    this.exoSpawnTimer = 0;

    this.roundNumber = START_ROUND;
    this.roundSpawnsRemaining = exosForRound(this.roundNumber);
    if (isBossRound(this.roundNumber)) {
      this.roundSpawnsRemaining = Math.floor(this.roundSpawnsRemaining / 2);
    }
    this.betweenRounds = false;
    this.intermissionTimer = 0;
    this.victory = false;
    this.boss = null;
    this.bossSpawnPending = isBossRound(this.roundNumber);

    this.kills = 0;
    this.bursts = [];

    this.ammo = MAG_SIZE;
    this.reserve = STARTING_RESERVE;
    this.reloadTimer = 0;
    this.rKeyWasDown = false;
    this.pickups = [];

    this.dashTime = 0;
    this.dashVX = 0;
    this.dashVY = 0;
    this.spaceKeyWasDown = false;

    this.jumpTime = 0;
    this.jumpTotal = 0;

    this.stamina = STAMINA_MAX;

    this.hitFlashTimer = 0;

    const uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    uiCam.setName('ui');
    this.uiCam = uiCam;
    this.worldObjects = [ground, this.player, this.barrel, this.shadow, this.aimLine];

    this.hpText = this.add.text(12, 10, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });
    this.hpText.setScrollFactor(0);
    this.hpText.setDepth(10000);

    this.staminaLabel = this.add.text(12, 36, 'Stamina', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#cccccc',
    });
    this.staminaLabel.setScrollFactor(0);
    this.staminaLabel.setDepth(10000);
    const stBarW = 150;
    const stBarH = 10;
    this.staminaBarBg = this.add.rectangle(12, 56, stBarW, stBarH, 0x222222).setOrigin(0, 0);
    this.staminaBarBg.setStrokeStyle(1, 0x000000);
    this.staminaBarBg.setScrollFactor(0);
    this.staminaBarBg.setDepth(10000);
    this.staminaBarFill = this.add.rectangle(12, 56, stBarW, stBarH, 0x3ecf3e).setOrigin(0, 0);
    this.staminaBarFill.setScrollFactor(0);
    this.staminaBarFill.setDepth(10001);
    this.staminaBarMaxW = stBarW;

    this.roundText = this.add.text(this.scale.width - 12, 10, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });
    this.roundText.setOrigin(1, 0);
    this.roundText.setScrollFactor(0);
    this.roundText.setDepth(10000);

    this.killsText = this.add.text(this.scale.width / 2, 10, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });
    this.killsText.setOrigin(0.5, 0);
    this.killsText.setScrollFactor(0);
    this.killsText.setDepth(10000);

    this.ammoText = this.add.text(this.scale.width - 12, 34, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffffff',
    });
    this.ammoText.setOrigin(1, 0);
    this.ammoText.setScrollFactor(0);
    this.ammoText.setDepth(10000);

    this.intermissionText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 80, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffe066',
      align: 'center',
    });
    this.intermissionText.setOrigin(0.5);
    this.intermissionText.setScrollFactor(0);
    this.intermissionText.setDepth(10000);
    this.intermissionText.setVisible(false);

    const barW = 480;
    const barH = 16;
    const barX = (this.scale.width - barW) / 2;
    const barY = 40;
    this.bossBarBg = this.add.rectangle(barX, barY, barW, barH, 0x222222).setOrigin(0, 0);
    this.bossBarBg.setStrokeStyle(2, 0x000000);
    this.bossBarBg.setScrollFactor(0);
    this.bossBarBg.setDepth(10000);
    this.bossBarBg.setVisible(false);
    this.bossBarFill = this.add.rectangle(barX, barY, barW, barH, 0x80c040).setOrigin(0, 0);
    this.bossBarFill.setScrollFactor(0);
    this.bossBarFill.setDepth(10001);
    this.bossBarFill.setVisible(false);
    this.bossBarMaxW = barW;
    this.bossLabel = this.add.text(this.scale.width / 2, barY - 4, 'WART MUTANT', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
    });
    this.bossLabel.setOrigin(0.5, 1);
    this.bossLabel.setScrollFactor(0);
    this.bossLabel.setDepth(10001);
    this.bossLabel.setVisible(false);

    this.gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER\nPress R to restart', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ff5555',
      align: 'center',
      lineSpacing: 4,
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setScrollFactor(0);
    this.gameOverText.setDepth(10000);
    this.gameOverText.setVisible(false);

    const titleVisible = this.phase === 'TITLE';
    this.titleBg = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.75);
    this.titleBg.setScrollFactor(0);
    this.titleBg.setDepth(20000);
    this.titleBg.setVisible(titleVisible);

    this.titleText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 180, 'PROJECT EXO', {
      fontFamily: 'monospace',
      fontSize: '56px',
      color: '#3ecf3e',
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setScrollFactor(0);
    this.titleText.setDepth(20001);
    this.titleText.setVisible(titleVisible);

    this.titleSubText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 130, 'isometric wave shooter', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#aaaaaa',
    });
    this.titleSubText.setOrigin(0.5);
    this.titleSubText.setScrollFactor(0);
    this.titleSubText.setDepth(20001);
    this.titleSubText.setVisible(titleVisible);

    const controlsLines = [
      'CONTROLS',
      'WASD       move',
      'LEFT SHIFT sprint (drains stamina)',
      'MOUSE      aim',
      'LEFT-CLICK fire',
      'R          reload',
      'LEFT ALT   dash',
      'SPACE      jump',
      'ESC        pause / resume',
    ];
    this.titleControls = this.add.text(this.scale.width / 2, this.scale.height / 2 - 80, controlsLines.join('\n'), {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      align: 'left',
      lineSpacing: 2,
    });
    this.titleControls.setOrigin(0.5, 0);
    this.titleControls.setScrollFactor(0);
    this.titleControls.setDepth(20001);
    this.titleControls.setVisible(titleVisible);

    this.titleLeaderboard = this.add.text(this.scale.width / 2, this.scale.height / 2 + 70, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#cccccc',
      align: 'left',
      lineSpacing: 2,
    });
    this.titleLeaderboard.setOrigin(0.5, 0);
    this.titleLeaderboard.setScrollFactor(0);
    this.titleLeaderboard.setDepth(20001);
    this.titleLeaderboard.setVisible(titleVisible);

    this.titlePrompt = this.add.text(this.scale.width / 2, this.scale.height - 60, '', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffe066',
      align: 'center',
    });
    this.titlePrompt.setOrigin(0.5);
    this.titlePrompt.setScrollFactor(0);
    this.titlePrompt.setDepth(20001);
    this.titlePrompt.setVisible(titleVisible);

    this.pauseBg = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.55);
    this.pauseBg.setScrollFactor(0);
    this.pauseBg.setDepth(20000);
    this.pauseBg.setVisible(false);
    this.pauseText = this.add.text(this.scale.width / 2, this.scale.height / 2, 'PAUSED\n\nPress P to resume', {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 4,
    });
    this.pauseText.setOrigin(0.5);
    this.pauseText.setScrollFactor(0);
    this.pauseText.setDepth(20001);
    this.pauseText.setVisible(false);

    cam.ignore([this.hpText, this.staminaLabel, this.staminaBarBg, this.staminaBarFill, this.roundText, this.killsText, this.ammoText, this.intermissionText, this.gameOverText, this.bossBarBg, this.bossBarFill, this.bossLabel, this.titleBg, this.titleText, this.titleSubText, this.titleControls, this.titleLeaderboard, this.titlePrompt, this.pauseBg, this.pauseText]);
    uiCam.ignore(this.worldObjects);

    this.updateHPText();
    this.updateStaminaBar();
    this.updateRoundText();
    this.updateKillsText();
    this.updateAmmoText();
    this.refreshTitleText();

    this.input.on('pointerdown', (pointer) => {
      if (!pointer.leftButtonDown()) return;
      if (this.phase !== 'PLAYING') return;
      if (this.gameOver) return;
      if (this.paused) return;
      if (this.reloadTimer > 0) return;
      if (this.ammo <= 0) return;
      const cw = screenToWorld(pointer.worldX, pointer.worldY);
      let dx = cw.x - this.player.worldX;
      let dy = cw.y - this.player.worldY;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;
      dx /= len;
      dy /= len;
      const gfx = this.add.circle(0, 0, BULLET_RADIUS, BULLET_COLOR);
      this.uiCam.ignore(gfx);
      this.bullets.push({
        gfx,
        worldX: this.player.worldX,
        worldY: this.player.worldY,
        vx: dx,
        vy: dy,
        life: BULLET_MAX_LIFE,
      });
      this.ammo -= 1;
      this.updateAmmoText();
      sfxShoot();

      const angle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
      const mx = this.player.x + Math.cos(angle) * BARREL_LENGTH;
      const my = this.player.y + Math.sin(angle) * BARREL_LENGTH;
      const flash = this.add.circle(mx, my, MUZZLE_FLASH_RADIUS, MUZZLE_FLASH_COLOR);
      flash.setDepth(this.player.depth + 0.2);
      this.uiCam.ignore(flash);
      this.muzzleFlashes.push({ gfx: flash, life: MUZZLE_FLASH_LIFE, total: MUZZLE_FLASH_LIFE });
    });
  }

  updateHPText() {
    this.hpText.setText('HP: ' + this.playerHP + ' / ' + PLAYER_MAX_HP);
  }

  updateStaminaBar() {
    const frac = Math.max(0, Math.min(1, this.stamina / STAMINA_MAX));
    this.staminaBarFill.width = this.staminaBarMaxW * frac;
    let color = 0x3ecf3e;
    if (frac < 0.25) color = 0xff5555;
    else if (frac < 0.5) color = 0xff9955;
    this.staminaBarFill.fillColor = color;
  }

  updateRoundText() {
    this.roundText.setText('Round ' + this.roundNumber + ' / ' + ROUND_TOTAL);
  }

  updateKillsText() {
    this.killsText.setText('Kills: ' + this.kills);
  }

  updateAmmoText() {
    if (this.reloadTimer > 0) {
      this.ammoText.setText('Reloading...  | ' + this.reserve);
      this.ammoText.setColor('#ffe066');
    } else {
      this.ammoText.setText('Ammo: ' + this.ammo + ' / ' + MAG_SIZE + '  | ' + this.reserve);
      let color = '#ffffff';
      if (this.ammo === 0 && this.reserve === 0) color = '#ff5555';
      else if (this.ammo === 0) color = '#ff9955';
      this.ammoText.setColor(color);
    }
  }

  startReload() {
    if (this.reloadTimer > 0) return;
    if (this.ammo === MAG_SIZE) return;
    if (this.reserve <= 0) return;
    this.reloadTimer = RELOAD_TIME;
    this.updateAmmoText();
  }

  spawnAmmoPickup(worldX, worldY) {
    const gfx = this.add.rectangle(0, 0, AMMO_PICKUP_W, AMMO_PICKUP_H, AMMO_PICKUP_COLOR);
    this.uiCam.ignore(gfx);
    this.pickups.push({ gfx, worldX, worldY, amount: AMMO_DROP_AMOUNT });
  }

  spawnHitBurst(worldX, worldY) {
    const s = worldToScreen(worldX, worldY);
    const gfx = this.add.circle(s.x, s.y, HIT_BURST_START_RADIUS, HIT_BURST_COLOR);
    gfx.setDepth(worldX + worldY + 0.1);
    this.uiCam.ignore(gfx);
    this.bursts.push({ gfx, life: HIT_BURST_LIFE, total: HIT_BURST_LIFE });
  }

  startIntermission() {
    this.betweenRounds = true;
    this.intermissionTimer = ROUND_INTERMISSION;
    this.intermissionText.setText('Round ' + (this.roundNumber + 1) + ' incoming...');
    this.intermissionText.setVisible(true);
  }

  beginNextRound() {
    this.roundNumber += 1;
    this.roundSpawnsRemaining = exosForRound(this.roundNumber);
    if (isBossRound(this.roundNumber)) {
      this.roundSpawnsRemaining = Math.floor(this.roundSpawnsRemaining / 2);
      this.bossSpawnPending = true;
    }
    this.betweenRounds = false;
    this.intermissionText.setVisible(false);
    this.exoSpawnTimer = 0;
    this.updateRoundText();
  }

  refreshTitleText() {
    const board = loadLeaderboard();
    const lbText = board.length === 0
      ? '(no scores yet — be the first)'
      : formatLeaderboard(board, null);
    this.titleLeaderboard.setText(lbText);
    this.titlePrompt.setText('Player: ' + this.username + '   (N to change)\nPress SPACE or ENTER to begin');
  }

  startGameFromTitle() {
    this.phase = 'PLAYING';
    this.titleBg.setVisible(false);
    this.titleText.setVisible(false);
    this.titleSubText.setVisible(false);
    this.titleControls.setVisible(false);
    this.titleLeaderboard.setVisible(false);
    this.titlePrompt.setVisible(false);
    this.spaceKeyWasDown = true;
    this.enterKeyWasDown = true;
    this.nKeyWasDown = true;
  }

  recordRunAndFormat(headline, color) {
    const entry = {
      name: this.username,
      kills: this.kills,
      round: this.roundNumber,
      date: Date.now(),
    };
    const { board, rank } = addToLeaderboard(entry);
    let txt = headline + '\n' + this.username + ': ' + this.kills + ' kills / round ' + this.roundNumber;
    if (rank === 0) txt += '\n*** #1 on the leaderboard ***';
    else if (rank > -1 && rank < LEADERBOARD_DISPLAY) txt += '\nRanked #' + (rank + 1);
    txt += '\n\n' + formatLeaderboard(board, entry);
    txt += '\n\nPress R to restart   N to change name';
    this.gameOverText.setText(txt);
    this.gameOverText.setColor(color);
    this.gameOverText.setVisible(true);
  }

  triggerVictory() {
    this.victory = true;
    this.gameOver = true;
    this.recordRunAndFormat('YOU SURVIVED!', '#3ecf3e');
  }

  triggerGameOver() {
    this.gameOver = true;
    this.recordRunAndFormat('GAME OVER', '#ff5555');
  }

  updateBossBar() {
    if (!this.boss) return;
    const frac = Math.max(0, this.boss.hp / this.boss.maxHp);
    this.bossBarFill.width = this.bossBarMaxW * frac;
  }

  hideBossBar() {
    this.bossBarBg.setVisible(false);
    this.bossBarFill.setVisible(false);
    this.bossLabel.setVisible(false);
  }

  spawnBoss() {
    const edge = Math.floor(Math.random() * 4);
    let wx, wy;
    if (edge === 0) { wx = WORLD_TILES / 2; wy = 0; }
    else if (edge === 1) { wx = WORLD_TILES; wy = WORLD_TILES / 2; }
    else if (edge === 2) { wx = WORLD_TILES / 2; wy = WORLD_TILES; }
    else { wx = 0; wy = WORLD_TILES / 2; }
    const cfg = ENEMY_TYPES.boss;
    const maxHp = bossHpForRound(this.roundNumber);
    const gfx = this.add.ellipse(0, 0, cfg.w, cfg.h, cfg.color);
    this.uiCam.ignore(gfx);
    const boss = {
      gfx,
      worldX: wx,
      worldY: wy,
      touchTimer: 0,
      speed: exoSpeedForRound(this.roundNumber) * cfg.speedMult,
      hp: maxHp,
      maxHp,
      damage: cfg.damage,
      hitRadius: cfg.hitRadius,
      touchRadius: cfg.touchRadius,
      type: 'boss',
    };
    this.exos.push(boss);
    this.boss = boss;
    this.bossBarBg.setVisible(true);
    this.bossBarFill.setVisible(true);
    this.bossLabel.setVisible(true);
    this.updateBossBar();
  }

  spawnExo() {
    const edge = Math.floor(Math.random() * 4);
    const t = Math.random() * WORLD_TILES;
    let wx, wy;
    if (edge === 0) { wx = t; wy = 0; }
    else if (edge === 1) { wx = WORLD_TILES; wy = t; }
    else if (edge === 2) { wx = t; wy = WORLD_TILES; }
    else { wx = 0; wy = t; }
    const type = pickEnemyTypeForRound(this.roundNumber);
    const cfg = ENEMY_TYPES[type];
    const gfx = this.add.ellipse(0, 0, cfg.w, cfg.h, cfg.color);
    this.uiCam.ignore(gfx);
    this.exos.push({
      gfx,
      worldX: wx,
      worldY: wy,
      touchTimer: 0,
      speed: exoSpeedForRound(this.roundNumber) * cfg.speedMult,
      hp: cfg.hp,
      maxHp: cfg.hp,
      damage: cfg.damage,
      hitRadius: cfg.hitRadius,
      touchRadius: cfg.touchRadius,
      type,
    });
  }

  update(time, delta) {
    const k = this.keys;
    const dtPre = delta / 1000;

    if (this.phase === 'TITLE') {
      const spaceEdge = k.SPACE.isDown && !this.spaceKeyWasDown;
      const enterEdge = k.ENTER.isDown && !this.enterKeyWasDown;
      const nEdge = k.N.isDown && !this.nKeyWasDown;
      if (nEdge) {
        const newName = promptForUsername(this.username);
        this.username = newName;
        saveUsername(newName);
        this.refreshTitleText();
      } else if (spaceEdge || enterEdge) {
        this.startGameFromTitle();
      }
      this.spaceKeyWasDown = k.SPACE.isDown;
      this.enterKeyWasDown = k.ENTER.isDown;
      this.nKeyWasDown = k.N.isDown;
      return;
    }

    if (this.gameOver) {
      if (k.R.isDown) {
        this.scene.restart({ skipTitle: true });
      } else if (k.N.isDown && !this.nKeyWasDown) {
        const newName = promptForUsername(this.username);
        this.username = newName;
        saveUsername(newName);
      }
      this.nKeyWasDown = k.N.isDown;
      return;
    }
    this.nKeyWasDown = k.N.isDown;

    const escDown = k.ESC.isDown;
    const escEdge = escDown && !this.escKeyWasDown;
    const spaceDownEarly = k.SPACE.isDown;
    const spaceEdgeEarly = spaceDownEarly && !this.spaceKeyWasDown;
    if (this.paused) {
      if (escEdge || spaceEdgeEarly) {
        this.paused = false;
        this.pauseBg.setVisible(false);
        this.pauseText.setVisible(false);
      }
      this.escKeyWasDown = escDown;
      this.spaceKeyWasDown = spaceDownEarly;
      return;
    }
    if (escEdge) {
      this.paused = true;
      this.pauseBg.setVisible(true);
      this.pauseText.setVisible(true);
      this.escKeyWasDown = escDown;
      this.spaceKeyWasDown = spaceDownEarly;
      return;
    }
    this.escKeyWasDown = escDown;

    const rDown = k.R.isDown;
    if (rDown && !this.rKeyWasDown) {
      this.startReload();
    }
    this.rKeyWasDown = rDown;

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dtPre;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        const need = MAG_SIZE - this.ammo;
        const give = Math.min(need, this.reserve);
        this.ammo += give;
        this.reserve -= give;
      }
      this.updateAmmoText();
    }

    let vx = 0;
    let vy = 0;
    if (k.W.isDown) { vx -= 1; vy -= 1; }
    if (k.S.isDown) { vx += 1; vy += 1; }
    if (k.A.isDown) { vx -= 1; vy += 1; }
    if (k.D.isDown) { vx += 1; vy -= 1; }
    const wasdLen = Math.hypot(vx, vy);

    const spaceDown = k.SPACE.isDown;
    const spaceEdge = spaceDown && !this.spaceKeyWasDown;
    if (spaceEdge && this.jumpTime <= 0 && this.dashTime <= 0 && this.stamina >= JUMP_STAMINA_COST) {
      this.stamina -= JUMP_STAMINA_COST;
      this.jumpTime = JUMP_DURATION;
      this.jumpTotal = JUMP_DURATION;
      this.shadow.setVisible(true);
    }
    this.spaceKeyWasDown = spaceDown;

    const altDown = k.ALT.isDown;
    const altEdge = altDown && !this.altKeyWasDown;
    if (altEdge && this.dashTime <= 0 && this.jumpTime <= 0 && this.stamina >= DASH_STAMINA_COST && wasdLen > 0) {
      this.stamina -= DASH_STAMINA_COST;
      this.dashVX = vx / wasdLen;
      this.dashVY = vy / wasdLen;
      this.dashTime = DASH_DURATION;
    }
    this.altKeyWasDown = altDown;

    const dt = delta / 1000;

    const shiftDown = k.SHIFT.isDown;
    const sprinting = shiftDown && wasdLen > 0 && this.stamina > 0 && this.dashTime <= 0;

    if (sprinting) {
      this.stamina = Math.max(0, this.stamina - SPRINT_STAMINA_DRAIN * dt);
    } else {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_REGEN * dt);
    }
    this.updateStaminaBar();

    if (this.dashTime > 0) {
      const dashStep = (DASH_DISTANCE / DASH_DURATION) * dt;
      this.player.worldX += this.dashVX * dashStep;
      this.player.worldY += this.dashVY * dashStep;
      this.player.worldX = Phaser.Math.Clamp(this.player.worldX, 0, WORLD_TILES);
      this.player.worldY = Phaser.Math.Clamp(this.player.worldY, 0, WORLD_TILES);
      this.dashTime -= dt;
      if (this.dashTime < 0) this.dashTime = 0;
    } else if (wasdLen > 0) {
      vx /= wasdLen;
      vy /= wasdLen;
      const moveSpeed = sprinting ? PLAYER_SPEED * SPRINT_MULT : PLAYER_SPEED;
      const step = moveSpeed * dt;
      this.player.worldX += vx * step;
      this.player.worldY += vy * step;
      this.player.worldX = Phaser.Math.Clamp(this.player.worldX, 0, WORLD_TILES);
      this.player.worldY = Phaser.Math.Clamp(this.player.worldY, 0, WORLD_TILES);
    }

    let jumpHeight = 0;
    if (this.jumpTime > 0) {
      this.jumpTime -= dt;
      if (this.jumpTime <= 0) {
        this.jumpTime = 0;
        this.shadow.setVisible(false);
      } else {
        const progress = 1 - this.jumpTime / this.jumpTotal;
        jumpHeight = Math.sin(progress * Math.PI) * JUMP_PEAK_HEIGHT;
      }
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      if (this.hitFlashTimer <= 0) {
        this.hitFlashTimer = 0;
        this.player.setFillStyle(PLAYER_COLOR);
      }
    }

    const s = worldToScreen(this.player.worldX, this.player.worldY);
    this.player.x = s.x;
    this.player.y = s.y - jumpHeight;
    this.player.depth = this.player.worldX + this.player.worldY + (jumpHeight > 0 ? 1000 : 0);
    if (this.jumpTime > 0) {
      this.shadow.x = s.x;
      this.shadow.y = s.y;
      this.shadow.depth = this.player.worldX + this.player.worldY - 0.01;
    }

    if (this.betweenRounds) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) {
        this.beginNextRound();
      }
    } else {
      if (this.bossSpawnPending) {
        this.bossSpawnPending = false;
        this.spawnBoss();
      }
      if (this.roundSpawnsRemaining > 0) {
        this.exoSpawnTimer += dt;
        const interval = spawnIntervalForRound(this.roundNumber);
        if (this.exoSpawnTimer >= interval && this.exos.length < EXO_MAX_ALIVE) {
          this.exoSpawnTimer = 0;
          this.spawnExo();
          this.roundSpawnsRemaining -= 1;
        }
      } else if (this.exos.length === 0) {
        if (this.roundNumber >= ROUND_TOTAL) {
          this.triggerVictory();
        } else {
          this.startIntermission();
        }
      }
    }

    for (let i = this.exos.length - 1; i >= 0; i--) {
      const e = this.exos[i];
      let edx = this.player.worldX - e.worldX;
      let edy = this.player.worldY - e.worldY;
      const elen = Math.hypot(edx, edy);
      if (elen > 0) {
        edx /= elen;
        edy /= elen;
        e.worldX += edx * e.speed * dt;
        e.worldY += edy * e.speed * dt;
      }
      if (e.touchTimer > 0) e.touchTimer -= dt;
      if (elen <= e.touchRadius && e.touchTimer <= 0 && this.jumpTime <= 0) {
        this.playerHP -= e.damage;
        e.touchTimer = EXO_TOUCH_COOLDOWN;
        this.hitFlashTimer = HIT_FLASH_DURATION;
        this.player.setFillStyle(PLAYER_HIT_COLOR);
        sfxPlayerHit();
        this.updateHPText();
        if (this.playerHP <= 0) {
          this.playerHP = 0;
          this.updateHPText();
          this.triggerGameOver();
        }
      }
      const es = worldToScreen(e.worldX, e.worldY);
      e.gfx.x = es.x;
      e.gfx.y = es.y;
      e.gfx.depth = e.worldX + e.worldY;
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.worldX += b.vx * BULLET_SPEED * dt;
      b.worldY += b.vy * BULLET_SPEED * dt;
      b.life -= dt;
      if (
        b.life <= 0 ||
        b.worldX < 0 || b.worldX > WORLD_TILES ||
        b.worldY < 0 || b.worldY > WORLD_TILES
      ) {
        b.gfx.destroy();
        this.bullets.splice(i, 1);
        continue;
      }
      let hit = false;
      for (let j = this.exos.length - 1; j >= 0; j--) {
        const e = this.exos[j];
        const ddx = b.worldX - e.worldX;
        const ddy = b.worldY - e.worldY;
        if (ddx * ddx + ddy * ddy <= e.hitRadius * e.hitRadius) {
          e.hp -= 1;
          this.spawnHitBurst(e.worldX, e.worldY);
          if (e === this.boss) this.updateBossBar();
          if (e.hp <= 0) {
            sfxEnemyDeath();
            if (e.type !== 'boss' && Math.random() < AMMO_DROP_CHANCE) {
              this.spawnAmmoPickup(e.worldX, e.worldY);
            }
            if (e === this.boss) {
              this.boss = null;
              this.hideBossBar();
            }
            e.gfx.destroy();
            this.exos.splice(j, 1);
            this.kills += 1;
            this.updateKillsText();
          } else {
            sfxEnemyHit();
          }
          hit = true;
          break;
        }
      }
      if (hit) {
        b.gfx.destroy();
        this.bullets.splice(i, 1);
        continue;
      }
      const bs = worldToScreen(b.worldX, b.worldY);
      b.gfx.x = bs.x;
      b.gfx.y = bs.y;
      b.gfx.depth = b.worldX + b.worldY;
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const pdx = this.player.worldX - p.worldX;
      const pdy = this.player.worldY - p.worldY;
      if (pdx * pdx + pdy * pdy <= AMMO_PICKUP_RADIUS * AMMO_PICKUP_RADIUS) {
        this.reserve += p.amount;
        p.gfx.destroy();
        this.pickups.splice(i, 1);
        this.updateAmmoText();
        continue;
      }
      const ps = worldToScreen(p.worldX, p.worldY);
      p.gfx.x = ps.x;
      p.gfx.y = ps.y;
      p.gfx.depth = p.worldX + p.worldY - 0.01;
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const br = this.bursts[i];
      br.life -= dt;
      if (br.life <= 0) {
        br.gfx.destroy();
        this.bursts.splice(i, 1);
        continue;
      }
      const t = 1 - br.life / br.total;
      const r = HIT_BURST_START_RADIUS + (HIT_BURST_END_RADIUS - HIT_BURST_START_RADIUS) * t;
      br.gfx.setRadius(r);
      br.gfx.setAlpha(1 - t);
    }

    const pointer = this.input.activePointer;
    const aimAngle = Math.atan2(pointer.worldY - this.player.y, pointer.worldX - this.player.x);
    this.barrel.x = this.player.x;
    this.barrel.y = this.player.y;
    this.barrel.rotation = aimAngle;
    this.barrel.depth = this.player.depth + 0.1;

    for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
      const f = this.muzzleFlashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        f.gfx.destroy();
        this.muzzleFlashes.splice(i, 1);
        continue;
      }
      f.gfx.setAlpha(f.life / f.total);
    }

    this.aimLine.clear();
    this.aimLine.lineStyle(AIM_LINE_WIDTH, AIM_LINE_COLOR, AIM_LINE_ALPHA);
    this.aimLine.beginPath();
    this.aimLine.moveTo(this.player.x, this.player.y);
    this.aimLine.lineTo(pointer.worldX, pointer.worldY);
    this.aimLine.strokePath();
  }
}
