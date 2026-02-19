/**
 * LevelScene.js
 * -------------
 * Core battle loop:
 *   • Two citadels (player-left / enemy-right)
 *   • Mana + Gold economy
 *   • Unit spawning via keybinds 1–5
 *   • Unit AI: MOVING → ATTACKING → (target dead) → MOVING
 *   • Hero with Arrow Rain (Q) and Heal Allies (E)
 *   • Fast Forward ×2 toggle (F)
 *   • Auto-save on victory
 */

// ── Unit state constants ──────────────────────────────────────────────────────
const UnitState = { MOVING: 'MOVING', ATTACKING: 'ATTACKING', DEAD: 'DEAD' };

const HERO_KNIGHT_TEXTURE = {
  key: 'hero-knight-sheet',
  frameWidth: 32,
  frameHeight: 40,
  frameCount: 6,
  scale: 2,
};

function ensureHeroKnightTexture(scene) {
  if (scene.textures.exists(HERO_KNIGHT_TEXTURE.key)) return;

  const {
    key,
    frameWidth,
    frameHeight,
    frameCount,
  } = HERO_KNIGHT_TEXTURE;

  const texture = scene.textures.createCanvas(key, frameWidth * frameCount, frameHeight);
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;

  for (let frame = 0; frame < frameCount; frame++) {
    drawHeroKnightFrame(ctx, frame * frameWidth, 0, frame);
  }
  texture.refresh();

  const phaserTexture = scene.textures.get(key);
  for (let frame = 0; frame < frameCount; frame++) {
    phaserTexture.add(`f${frame}`, 0, frame * frameWidth, 0, frameWidth, frameHeight);
  }
}

function drawHeroKnightFrame(ctx, ox, oy, frame) {
  const px = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x, oy + y, w, h);
  };

  const clear = () => {
    ctx.clearRect(ox, oy, HERO_KNIGHT_TEXTURE.frameWidth, HERO_KNIGHT_TEXTURE.frameHeight);
  };

  clear();

  const legOffsetL = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const legOffsetR = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const capeShift = frame === 1 ? -1 : frame === 2 ? 1 : frame === 4 ? -2 : 0;

  // Cape (behind armor)
  px(8 + capeShift, 17, 2, 14, '#5b1c1c');
  px(10 + capeShift, 19, 2, 12, '#782828');
  px(12 + capeShift, 20, 1, 10, '#8f3333');

  // Legs
  px(13 + legOffsetL, 29, 3, 8, '#474f5e');
  px(17 + legOffsetR, 29, 3, 8, '#474f5e');
  px(12 + legOffsetL, 36, 4, 2, '#2a2f39');
  px(17 + legOffsetR, 36, 4, 2, '#2a2f39');

  // Torso and pauldrons
  px(11, 16, 10, 13, '#4f5a6d');
  px(10, 17, 1, 8, '#6a7488');
  px(21, 17, 1, 8, '#6a7488');
  px(10, 16, 3, 3, '#8f9ab1');
  px(19, 16, 3, 3, '#8f9ab1');

  // Helmet + visor glow
  px(12, 8, 8, 8, '#8791a8');
  px(13, 9, 6, 2, '#aeb6c8');
  px(13, 12, 6, 3, '#2e3442');
  px(14, 13, 2, 1, '#7aa3ff');
  px(17, 13, 2, 1, '#7aa3ff');

  // Left arm + shield
  px(8, 18, 3, 8, '#4f5a6d');
  px(5, 19, 3, 9, '#6f778b');
  px(6, 21, 1, 4, '#9da7bc');

  // Right arm + sword by frame
  if (frame <= 2 || frame === 5) {
    px(21, 18, 3, 8, '#4f5a6d');
    px(24, 16, 2, 11, '#8e98ad');
    px(24, 14, 2, 2, '#b6c0d3');
  } else if (frame === 3) {
    // wind-up
    px(20, 17, 4, 4, '#4f5a6d');
    px(23, 12, 2, 8, '#8e98ad');
    px(23, 10, 2, 2, '#b6c0d3');
  } else {
    // slash frame
    px(21, 20, 4, 4, '#4f5a6d');
    px(24, 20, 7, 2, '#aeb6c8');
    px(30, 19, 2, 4, '#d4dbe8');
    px(29, 18, 1, 1, '#d4dbe8');
    px(29, 23, 1, 1, '#d4dbe8');
  }

  // Small armor highlights
  px(14, 20, 1, 1, '#c7cfde');
  px(17, 23, 1, 1, '#c7cfde');
}

// ── Unit class ────────────────────────────────────────────────────────────────
class Unit {
  constructor(scene, x, y, cfg, isPlayer) {
    this.scene    = scene;
    this.isPlayer = isPlayer;
    this.cfg      = cfg;
    this.state    = UnitState.MOVING;
    this.target   = null;
    this.attackTimer = 0;

    // Apply upgrade multipliers (army upgrades)
    const sd  = scene.saveData;
    const ups = sd ? sd.upgrades : {};
    const hpMult  = 1 + (ups.ARMY_HP    || 0) * GlobalConfig.UPGRADES.ARMY_HP.effect.multiplier;
    const dmgMult = 1 + (ups.ARMY_DMG   || 0) * GlobalConfig.UPGRADES.ARMY_DMG.effect.multiplier;
    const spdMult = 1 + (ups.ARMY_SPEED || 0) * GlobalConfig.UPGRADES.ARMY_SPEED.effect.multiplier;

    this.maxHp  = Math.round(cfg.hp    * hpMult);
    this.hp     = this.maxHp;
    this.damage = Math.round(cfg.damage * dmgMult);
    this.speed  = cfg.speed * spdMult * (isPlayer ? 1 : -1); // negative = moving left
    this.range  = cfg.range;
    this.attackRate = cfg.attackRate; // attacks/sec

    this.x = x;
    this.y = y;

    this.gfx    = scene.add.graphics();
    this.hpBar  = scene.add.graphics();
    this._drawSelf();
  }

  _drawSelf() {
    const { width: w, height: h } = this.cfg;
    const col = this.isPlayer ? this.cfg.color : this.cfg.enemyColor;
    const gfx = this.gfx;
    gfx.clear();
    gfx.fillStyle(col, 1);
    gfx.lineStyle(1, 0xffffff, 0.5);
    gfx.fillRect(-w / 2, -h, w, h);
    gfx.strokeRect(-w / 2, -h, w, h);
    gfx.x = this.x;
    gfx.y = this.y;

    this._drawHpBar();
  }

  _drawHpBar() {
    const { width: w } = this.cfg;
    const ratio = Math.max(0, this.hp / this.maxHp);
    const barW  = w + 6;
    this.hpBar.clear();
    // background
    this.hpBar.fillStyle(0x440000, 1);
    this.hpBar.fillRect(-barW / 2, -this.cfg.height - 8, barW, 5);
    // foreground
    const barCol = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBar.fillStyle(barCol, 1);
    this.hpBar.fillRect(-barW / 2, -this.cfg.height - 8, Math.round(barW * ratio), 5);
    this.hpBar.x = this.x;
    this.hpBar.y = this.y;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = UnitState.DEAD;
    }
    this._drawHpBar();
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this._drawHpBar();
  }

  destroy() {
    this.gfx.destroy();
    this.hpBar.destroy();
  }

  /** Returns the pixel x-distance to another unit or citadel. */
  distanceTo(other) {
    return Math.abs(this.x - other.x);
  }

  update(dt, enemies, enemyCitadel) {
    if (this.state === UnitState.DEAD) return;

    // Tick attack cooldown
    this.attackTimer = Math.max(0, this.attackTimer - dt);

    if (this.state === UnitState.ATTACKING) {
      // Re-validate target
      if (!this.target || this.target.hp <= 0) {
        this.target = null;
        this.state  = UnitState.MOVING;
      } else if (this.distanceTo(this.target) > this.range + 10) {
        this.state = UnitState.MOVING;
      } else if (this.attackTimer <= 0) {
        this.target.takeDamage(this.damage);
        this.attackTimer = 1 / this.attackRate;
        // Damage flash
        this._flashDamage();
      }
      this._updateGfxPos();
      return;
    }

    // MOVING – find a target in range
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const d = this.distanceTo(e);
      if (d < this.range && d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    }

    // Check citadel
    const citadelDist = this.distanceTo(enemyCitadel);
    if (citadelDist < this.range && (!nearest || citadelDist < nearestDist)) {
      nearest = enemyCitadel;
    }

    if (nearest) {
      this.target = nearest;
      this.state  = UnitState.ATTACKING;
    } else {
      // Walk forward
      this.x += this.speed * dt;
    }

    this._updateGfxPos();
  }

  _updateGfxPos() {
    this.gfx.x   = this.x;
    this.hpBar.x = this.x;
  }

  _flashDamage() {
    this.scene.tweens.add({
      targets: this.gfx,
      alpha: 0.3,
      duration: 60,
      yoyo: true,
    });
  }
}

// ── Hero class ────────────────────────────────────────────────────────────────
class Hero {
  constructor(scene, x, y) {
    this.scene      = scene;
    this.x          = x;
    this.y          = y;
    this.targetX    = x;
    const cfg       = GlobalConfig.HERO;
    const sd        = scene.saveData;
    const ups       = sd ? sd.upgrades : {};

    const manaRegenMult  = 1 + (ups.HERO_MANA     || 0) * GlobalConfig.UPGRADES.HERO_MANA.effect.multiplier;
    const cooldownMult   = 1 + (ups.HERO_COOLDOWN || 0) * GlobalConfig.UPGRADES.HERO_COOLDOWN.effect.multiplier;

    this.maxHp      = cfg.hp;
    this.hp         = this.maxHp;
    this.damage     = cfg.damage;
    this.speed      = cfg.speed;
    this.range      = cfg.range;
    this.attackRate = cfg.attackRate;
    this.manaMax    = cfg.manaMax;
    this.mana       = this.manaMax * 0.5;
    this.manaRegen  = cfg.manaRegen * manaRegenMult;

    // Ability cooldowns (adjusted by upgrade)
    const ab = cfg.ABILITIES;
    this.arrowRainCooldownMax  = ab.ARROW_RAIN.cooldown * Math.max(0.1, cooldownMult);
    this.healCooldownMax       = ab.HEAL.cooldown * Math.max(0.1, cooldownMult);
    this.arrowRainCooldown     = 0;
    this.healCooldown          = 0;

    this.attackTimer = 0;
    this.attackAnimLock = 0;
    this.state       = UnitState.MOVING;
    this.target      = null;

    ensureHeroKnightTexture(scene);
    this._ensureAnimations();

    this.sprite = scene.add
      .sprite(this.x, this.y, HERO_KNIGHT_TEXTURE.key, 'f0')
      .setOrigin(0.5, 1)
      .setScale(HERO_KNIGHT_TEXTURE.scale);

    this.hpBar  = scene.add.graphics();
    this._drawHpBar();
  }

  _ensureAnimations() {
    const anims = this.scene.anims;

    if (!anims.exists('hero-knight-walk')) {
      anims.create({
        key: 'hero-knight-walk',
        frames: [
          { key: HERO_KNIGHT_TEXTURE.key, frame: 'f1' },
          { key: HERO_KNIGHT_TEXTURE.key, frame: 'f0' },
          { key: HERO_KNIGHT_TEXTURE.key, frame: 'f2' },
          { key: HERO_KNIGHT_TEXTURE.key, frame: 'f0' },
        ],
        frameRate: 7,
        repeat: -1,
      });
    }

    if (!anims.exists('hero-knight-attack')) {
      anims.create({
        key: 'hero-knight-attack',
        frames: [
          { key: HERO_KNIGHT_TEXTURE.key, frame: 'f3' },
          { key: HERO_KNIGHT_TEXTURE.key, frame: 'f4' },
          { key: HERO_KNIGHT_TEXTURE.key, frame: 'f5' },
        ],
        frameRate: 12,
        repeat: 0,
      });
    }
  }

  _playAttackAnimation() {
    this.attackAnimLock = 0.26;
    this.sprite.play('hero-knight-attack', true);
  }

  _setIdleFrame() {
    this.sprite.stop();
    this.sprite.setFrame('f0');
  }

  _drawHpBar() {
    const w = GlobalConfig.HERO.width + 10;
    const ratio = Math.max(0, this.hp / this.maxHp);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x440000, 1);
    this.hpBar.fillRect(-w / 2, -GlobalConfig.HERO.height - 8, w, 5);
    this.hpBar.fillStyle(0x00ff44, 1);
    this.hpBar.fillRect(-w / 2, -GlobalConfig.HERO.height - 8, Math.round(w * ratio), 5);
    this.hpBar.x = this.x;
    this.hpBar.y = this.y;
  }

  moveTo(tx) {
    this.targetX = tx;
    this.state   = UnitState.MOVING;
    this.target  = null;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) this.hp = 0;
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.45,
      duration: 70,
      yoyo: true,
    });
    this._drawHpBar();
  }

  castArrowRain(tx, ty, enemies, enemyCitadel) {
    const ab = GlobalConfig.HERO.ABILITIES.ARROW_RAIN;
    if (this.mana < ab.manaCost || this.arrowRainCooldown > 0) return false;
    this.mana            -= ab.manaCost;
    this.arrowRainCooldown = this.arrowRainCooldownMax;
    this._playAttackAnimation();

    // Visual
    const g = this.scene.add.graphics();
    g.fillStyle(0xff8800, 0.35);
    g.fillCircle(tx, ty, ab.radius);
    this.scene.time.delayedCall(ab.duration, () => g.destroy());

    // Rain arrow lines
    for (let i = 0; i < 12; i++) {
      const ax = tx + Phaser.Math.Between(-ab.radius, ab.radius);
      const ag = this.scene.add.graphics();
      ag.lineStyle(2, 0xff6600, 1);
      ag.beginPath(); ag.moveTo(ax, ty - ab.radius * 0.7); ag.lineTo(ax, ty + ab.radius * 0.3); ag.strokePath();
      this.scene.time.delayedCall(ab.duration, () => ag.destroy());
    }

    // AOE damage
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      if (Math.hypot(e.x - tx, e.y - ty) < ab.radius) {
        e.takeDamage(ab.damage);
      }
    }
    if (Math.hypot(enemyCitadel.x - tx, enemyCitadel.y - ty) < ab.radius) {
      enemyCitadel.takeDamage(ab.damage);
    }
    return true;
  }

  castHeal(allies) {
    const ab = GlobalConfig.HERO.ABILITIES.HEAL;
    if (this.mana < ab.manaCost || this.healCooldown > 0) return false;
    this.mana       -= ab.manaCost;
    this.healCooldown = this.healCooldownMax;
    this._playAttackAnimation();

    // Visual
    const g = this.scene.add.graphics();
    g.fillStyle(0x44ffaa, 0.3);
    g.fillCircle(this.x, this.y, ab.radius);
    this.scene.time.delayedCall(1200, () => g.destroy());

    // Heal allies in radius
    for (const a of allies) {
      if (a.hp <= 0) continue;
      if (Math.hypot(a.x - this.x, a.y - this.y) < ab.radius) {
        a.heal(ab.healAmount);
      }
    }
    // Heal self
    this.heal(ab.healAmount);
    return true;
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this._drawHpBar();
  }

  update(dt, enemies, enemyCitadel) {
    // Mana regen
    this.mana = Math.min(this.manaMax, this.mana + this.manaRegen * dt);

    // Ability cooldowns
    this.arrowRainCooldown = Math.max(0, this.arrowRainCooldown - dt * 1000);
    this.healCooldown      = Math.max(0, this.healCooldown      - dt * 1000);
    this.attackTimer       = Math.max(0, this.attackTimer       - dt);
    this.attackAnimLock    = Math.max(0, this.attackAnimLock    - dt);

    // Auto-attack nearest enemy in range
    let nearest = null, nearestDist = Infinity;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const d = Math.abs(this.x - e.x);
      if (d < this.range && d < nearestDist) { nearest = e; nearestDist = d; }
    }
    if (!nearest && Math.abs(this.x - enemyCitadel.x) < this.range) nearest = enemyCitadel;

    if (nearest && this.attackTimer <= 0) {
      nearest.takeDamage(this.damage);
      this.attackTimer = 1 / this.attackRate;
      this._playAttackAnimation();
    }

    // Movement toward targetX
    const dx = this.targetX - this.x;
    if (Math.abs(dx) > 3 && !nearest) {
      const dir = Math.sign(dx);
      this.x += dir * this.speed * dt;
      if (dir !== 0) this.sprite.setFlipX(dir < 0);
      if (this.attackAnimLock <= 0 && this.sprite.anims.currentAnim?.key !== 'hero-knight-walk') {
        this.sprite.play('hero-knight-walk', true);
      }
    } else if (nearest) {
      this.sprite.setFlipX(nearest.x < this.x);
      if (this.attackAnimLock <= 0) this._setIdleFrame();
    } else if (this.attackAnimLock <= 0) {
      this._setIdleFrame();
    }

    this.sprite.x = this.x;
    this.hpBar.x = this.x;
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
  }
}

// ── Citadel ───────────────────────────────────────────────────────────────────
class Citadel {
  constructor(scene, x, y, isPlayer) {
    this.scene    = scene;
    this.isPlayer = isPlayer;
    this.x        = x;
    this.y        = y;
    const cfg     = GlobalConfig.CITADEL;
    this.maxHp    = cfg.hp;
    this.hp       = this.maxHp;
    this.range    = 10;          // just a flag for unit AI targeting
    this.gfx      = scene.add.graphics();
    this.hpBar    = scene.add.graphics();
    this._draw();
  }

  _draw() {
    const cfg = GlobalConfig.CITADEL;
    const col = this.isPlayer ? cfg.playerColor : cfg.enemyColor;
    const w   = cfg.width, h = cfg.height;
    const gfx = this.gfx;
    gfx.clear();

    // Base
    gfx.fillStyle(col, 1);
    gfx.fillRect(-w / 2, -h, w, h);

    // Battlements
    gfx.fillStyle(0xffffff, 0.15);
    for (let i = 0; i < 3; i++) {
      gfx.fillRect(-w / 2 + i * (w / 3), -h - 14, w / 3 - 4, 14);
    }

    // Door
    gfx.fillStyle(0x221100, 0.8);
    gfx.fillRect(-10, -30, 20, 30);

    // Windows
    gfx.fillStyle(0xffff99, 0.6);
    gfx.fillRect(-16, -h + 20, 10, 12);
    gfx.fillRect(6,   -h + 20, 10, 12);

    gfx.lineStyle(2, 0xffffff, 0.6);
    gfx.strokeRect(-w / 2, -h, w, h);

    gfx.x = this.x;
    gfx.y = this.y;
    this._drawHpBar();
  }

  _drawHpBar() {
    const ratio = Math.max(0, this.hp / this.maxHp);
    const barW  = 80;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x440000, 1);
    this.hpBar.fillRect(-barW / 2, -GlobalConfig.CITADEL.height - 20, barW, 8);
    const col = ratio > 0.5 ? 0x44ff44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBar.fillStyle(col, 1);
    this.hpBar.fillRect(-barW / 2, -GlobalConfig.CITADEL.height - 20, Math.round(barW * ratio), 8);
    this.hpBar.x = this.x;
    this.hpBar.y = this.y;

    // HP text
    if (!this._hpText) {
      this._hpText = this.scene.add.text(this.x, this.y - GlobalConfig.CITADEL.height - 34,
        `${this.hp}/${this.maxHp}`, { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    }
    this._hpText.setText(`${this.hp}/${this.maxHp}`);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this._drawHpBar();
  }

  get alive() { return this.hp > 0; }

  destroy() {
    this.gfx.destroy();
    this.hpBar.destroy();
    if (this._hpText) this._hpText.destroy();
  }
}

// ── LevelScene ────────────────────────────────────────────────────────────────
class LevelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelScene' });
  }

  init(data) {
    this.levelId  = data.levelId  || 1;
    this.saveData = data.saveData || SaveManager.load();
  }

  create() {
    const { WIDTH, HEIGHT } = GlobalConfig;
    this.levelCfg = GlobalConfig.LEVELS.find(l => l.id === this.levelId);

    // Game state
    this.playerUnits  = [];
    this.enemyUnits   = [];
    this.mana         = GlobalConfig.MANA_START;
    this.gold         = 0;
    this.fastForward  = false;
    this.gameOver     = false;

    // Apply mana regen upgrade
    const ups = this.saveData.upgrades || {};
    const manaUpMult = 1 + (ups.MANA_REGEN || 0) * GlobalConfig.UPGRADES.MANA_REGEN.effect.multiplier;
    this.manaRegen = GlobalConfig.MANA_REGEN_RATE * manaUpMult;

    // ── Scenery ────────────────────────────────────────────────────────────
    this._buildBackground();

    // Ground y level for units
    this.groundY = HEIGHT - 130;

    // ── Citadels ───────────────────────────────────────────────────────────
    this.playerCitadel = new Citadel(this, 80,        this.groundY, true);
    this.enemyCitadel  = new Citadel(this, WIDTH - 80, this.groundY, false);

    // ── Hero ───────────────────────────────────────────────────────────────
    this.hero = new Hero(this, 160, this.groundY);

    // Click ground to move hero
    this.input.on('pointerdown', (ptr) => {
      if (ptr.y > this.groundY - 80 && ptr.y < this.groundY + 10 && !this.gameOver) {
        this.hero.moveTo(Phaser.Math.Clamp(ptr.x, 100, WIDTH / 2 - 30));
      }
    });

    // ── Enemy spawn timers ─────────────────────────────────────────────────
    this._setupEnemySpawners();

    // ── Keybinds ───────────────────────────────────────────────────────────
    this._setupKeybinds();

    // ── HUD ────────────────────────────────────────────────────────────────
    this._buildHUD();

    // ── Pause/Return button ────────────────────────────────────────────────
    this._buildReturnButton();
  }

  // ── Background ────────────────────────────────────────────────────────────

  _buildBackground() {
    const { WIDTH, HEIGHT } = GlobalConfig;
    const gY = HEIGHT - 130;
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x1a3a6a, 0x1a3a6a, 0x4a7aaa, 0x4a7aaa, 1);
    sky.fillRect(0, 0, WIDTH, gY);

    // Mountains
    sky.fillStyle(0x2a4a2a, 0.7);
    sky.fillTriangle(100, gY, 280, gY - 160, 460, gY);
    sky.fillTriangle(350, gY, 580, gY - 200, 800, gY);
    sky.fillTriangle(700, gY, 950, gY - 140, 1100, gY);

    // Ground
    sky.fillStyle(0x3a6a28, 1);
    sky.fillRect(0, gY, WIDTH, HEIGHT - gY);
    sky.fillStyle(0x5a8a3a, 0.5);
    sky.fillRect(0, gY, WIDTH, 12);

    // Battle zone lane indicator
    sky.lineStyle(1, 0xffffff, 0.1);
    sky.beginPath(); sky.moveTo(80, gY); sky.lineTo(WIDTH - 80, gY); sky.strokePath();

    // Level name
    this.add.text(WIDTH / 2, 18, this.levelCfg.name, {
      fontSize: '22px', color: '#ffd700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
  }

  // ── Enemy spawners ────────────────────────────────────────────────────────

  _setupEnemySpawners() {
    for (const spawn of this.levelCfg.enemies) {
      const variance = GlobalConfig.ENEMY_SPAWN_VARIANCE;
      const baseRate = spawn.spawnRate;
      const spawnEnemy = () => {
        if (this.gameOver) return;
        this._spawnEnemy(spawn.type);
        const delay = baseRate * (1 + (Math.random() * 2 - 1) * variance);
        this.time.delayedCall(delay, spawnEnemy);
      };
      this.time.delayedCall(baseRate * 0.5, spawnEnemy);
    }
  }

  _spawnEnemy(type) {
    const cfg = GlobalConfig.UNITS[type];
    const x   = GlobalConfig.WIDTH - 130;
    const unit = new Unit(this, x, this.groundY, cfg, false);
    this.enemyUnits.push(unit);
  }

  // ── Keybinds ──────────────────────────────────────────────────────────────

  _setupKeybinds() {
    const unitTypes = Object.keys(GlobalConfig.UNITS); // order matches 1–5

    for (let i = 0; i < unitTypes.length; i++) {
      const key  = this.input.keyboard.addKey((i + 1).toString());
      const type = unitTypes[i];
      key.on('down', () => this._spawnPlayerUnit(type));
    }

    // Ability Q – Arrow Rain
    this.input.keyboard.addKey('Q').on('down', () => {
      const tx = this.hero.x + 180;
      this.hero.castArrowRain(tx, this.groundY - 20, this.enemyUnits, this.enemyCitadel);
      this._updateAbilityHUD();
    });

    // Ability E – Heal
    this.input.keyboard.addKey('E').on('down', () => {
      this.hero.castHeal(this.playerUnits);
      this._updateAbilityHUD();
    });

    // Fast Forward F
    this.input.keyboard.addKey('F').on('down', () => this._toggleFastForward());
  }

  _spawnPlayerUnit(type) {
    const cfg  = GlobalConfig.UNITS[type];
    if (this.mana < cfg.cost) {
      this._flashNotEnoughMana();
      return;
    }
    this.mana -= cfg.cost;
    const x    = 130;
    const unit = new Unit(this, x, this.groundY, cfg, true);
    this.playerUnits.push(unit);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  _buildHUD() {
    const { WIDTH, HEIGHT } = GlobalConfig;
    const hudY = HEIGHT - 68;

    // Footer background
    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x050d15, 0.9);
    hudBg.fillRect(0, HEIGHT - 80, WIDTH, 80);
    hudBg.lineStyle(1, 0x224466, 1);
    hudBg.beginPath(); hudBg.moveTo(0, HEIGHT - 80); hudBg.lineTo(WIDTH, HEIGHT - 80); hudBg.strokePath();

    // Mana bar
    const manaBarX = 20, manaBarY = HEIGHT - 72, manaBarW = 200, manaBarH = 18;
    this._manaBarBg = this.add.graphics();
    this._manaBarBg.fillStyle(0x220044, 1);
    this._manaBarBg.fillRoundedRect(manaBarX, manaBarY, manaBarW, manaBarH, 4);

    this._manaBarFg = this.add.graphics();
    this._manaLabel = this.add.text(manaBarX, manaBarY - 16, 'Mana', { fontSize: '14px', color: '#aa88ff' });

    // Hero mana bar
    const heroManaX = 20, heroManaY = HEIGHT - 40;
    this._heroManaBarBg = this.add.graphics();
    this._heroManaBarBg.fillStyle(0x002244, 1);
    this._heroManaBarBg.fillRoundedRect(heroManaX, heroManaY, 160, 12, 3);
    this._heroManaBarFg = this.add.graphics();
    this._heroManaLabel = this.add.text(heroManaX, heroManaY - 14, 'Hero Mana', { fontSize: '11px', color: '#44aaff' });

    // Gold display
    this._goldText = this.add.text(240, HEIGHT - 72, `💰 ${this.gold}`, {
      fontSize: '18px', color: '#ffd700',
    });

    // Hero HP
    this._heroHpText = this.add.text(240, HEIGHT - 46, `❤️ Hero: ${this.hero.hp}/${this.hero.maxHp}`, {
      fontSize: '14px', color: '#ff8888',
    });

    // Unit spawn buttons (bottom row)
    const unitTypes = Object.keys(GlobalConfig.UNITS);
    const btnStartX = 440;
    unitTypes.forEach((type, i) => {
      const cfg = GlobalConfig.UNITS[type];
      const bx  = btnStartX + i * 130;
      const by  = HEIGHT - 50;

      const g = this.add.graphics();
      g.fillStyle(cfg.color, 0.8);
      g.lineStyle(1, 0xffffff, 0.5);
      g.fillRoundedRect(bx - 50, by - 16, 100, 32, 5);
      g.strokeRoundedRect(bx - 50, by - 16, 100, 32, 5);

      this.add.text(bx, by - 4, `[${i + 1}] ${cfg.name}`, {
        fontSize: '13px', color: '#ffffff', stroke: '#000', strokeThickness: 1,
      }).setOrigin(0.5);
      this.add.text(bx, by + 10, `${cfg.cost} mana`, {
        fontSize: '11px', color: '#ccccff',
      }).setOrigin(0.5);

      // Click to spawn
      const zone = this.add.zone(bx, by, 100, 32).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this._spawnPlayerUnit(type));
    });

    // Ability buttons
    const abilX = WIDTH - 360;
    this._buildAbilityBtn(abilX,       HEIGHT - 44, 'Q', 'Arrow Rain', 0x884400);
    this._buildAbilityBtn(abilX + 160, HEIGHT - 44, 'E', 'Heal Allies', 0x004433);

    // Fast-forward button
    this._ffBtnGfx = this.add.graphics();
    this._ffBtnTxt = this.add.text(WIDTH - 72, HEIGHT - 44, '[F] ×1', {
      fontSize: '16px', color: '#aaffaa',
    }).setOrigin(0.5);
    this._drawFFBtn();
    const ffZone = this.add.zone(WIDTH - 72, HEIGHT - 44, 100, 36).setInteractive({ useHandCursor: true });
    ffZone.on('pointerdown', () => this._toggleFastForward());
  }

  _buildAbilityBtn(x, y, key, name, color) {
    const g = this.add.graphics();
    g.fillStyle(color, 0.85);
    g.lineStyle(1, 0xffffff, 0.5);
    g.fillRoundedRect(x - 70, y - 20, 140, 40, 6);
    g.strokeRoundedRect(x - 70, y - 20, 140, 40, 6);

    this.add.text(x, y - 7, `[${key}] ${name}`, { fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);

    const ab = key === 'Q' ? GlobalConfig.HERO.ABILITIES.ARROW_RAIN : GlobalConfig.HERO.ABILITIES.HEAL;
    const cdTxt = this.add.text(x, y + 8, `${ab.manaCost} hero-mana`, { fontSize: '11px', color: '#aaccff' }).setOrigin(0.5);

    if (key === 'Q') this._arrowRainCdTxt = cdTxt;
    else             this._healCdTxt = cdTxt;
  }

  _drawFFBtn() {
    const { WIDTH, HEIGHT } = GlobalConfig;
    this._ffBtnGfx.clear();
    const col = this.fastForward ? 0x886600 : 0x334433;
    this._ffBtnGfx.fillStyle(col, 0.9);
    this._ffBtnGfx.lineStyle(1, 0xffffff, 0.5);
    this._ffBtnGfx.fillRoundedRect(WIDTH - 122, HEIGHT - 62, 100, 36, 6);
    this._ffBtnGfx.strokeRoundedRect(WIDTH - 122, HEIGHT - 62, 100, 36, 6);
  }

  _updateHUD() {
    const { MANA_MAX } = GlobalConfig;
    const manaRatio  = this.mana / MANA_MAX;
    const heroManaR  = this.hero.mana / this.hero.manaMax;
    const { HEIGHT } = GlobalConfig;
    const manaBarX = 20, manaBarY = HEIGHT - 72, manaBarW = 200, manaBarH = 18;

    this._manaBarFg.clear();
    this._manaBarFg.fillStyle(0x8844ff, 1);
    this._manaBarFg.fillRoundedRect(manaBarX, manaBarY, Math.round(manaBarW * manaRatio), manaBarH, 4);
    this._manaLabel.setText(`Mana: ${Math.floor(this.mana)}/${MANA_MAX}`);

    this._heroManaBarFg.clear();
    this._heroManaBarFg.fillStyle(0x2288ff, 1);
    this._heroManaBarFg.fillRoundedRect(20, HEIGHT - 40, Math.round(160 * heroManaR), 12, 3);

    this._goldText.setText(`💰 ${this.gold}`);
    this._heroHpText.setText(`❤️ Hero: ${this.hero.hp}/${this.hero.maxHp}`);
    this._ffBtnTxt.setText(this.fastForward ? '[F] ×2' : '[F] ×1');
    this._drawFFBtn();
  }

  _updateAbilityHUD() {
    const arCd = this.hero.arrowRainCooldown > 0
      ? `${(this.hero.arrowRainCooldown / 1000).toFixed(1)}s`
      : 'Ready';
    const hlCd = this.hero.healCooldown > 0
      ? `${(this.hero.healCooldown / 1000).toFixed(1)}s`
      : 'Ready';
    if (this._arrowRainCdTxt) this._arrowRainCdTxt.setText(`${GlobalConfig.HERO.ABILITIES.ARROW_RAIN.manaCost} mana | ${arCd}`);
    if (this._healCdTxt)      this._healCdTxt.setText(`${GlobalConfig.HERO.ABILITIES.HEAL.manaCost} mana | ${hlCd}`);
  }

  _flashNotEnoughMana() {
    if (this._manaFlashTween) this._manaFlashTween.stop();
    this._manaBarFg.setAlpha(1);
    this._manaFlashTween = this.tweens.add({
      targets: this._manaBarFg,
      alpha: 0.2,
      duration: 120,
      yoyo: true,
      repeat: 2,
    });
  }

  // ── Fast forward ──────────────────────────────────────────────────────────

  _toggleFastForward() {
    this.fastForward = !this.fastForward;
    this.time.timeScale   = this.fastForward ? GlobalConfig.FAST_FORWARD_MULTIPLIER : 1;
    this.tweens.timeScale = this.fastForward ? GlobalConfig.FAST_FORWARD_MULTIPLIER : 1;
    this._drawFFBtn();
    this._ffBtnTxt.setText(this.fastForward ? '[F] ×2' : '[F] ×1');
  }

  // ── Return to map button ──────────────────────────────────────────────────

  _buildReturnButton() {
    const btn = this.add.text(8, 8, '← Map', {
      fontSize: '16px', color: '#aaccff', backgroundColor: '#00000066', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      SaveManager.save(this.saveData);
      this.scene.start('WorldMapScene', { saveData: this.saveData });
    });
  }

  // ── Main update loop ──────────────────────────────────────────────────────

  update(time, delta) {
    if (this.gameOver) return;

    const dt = (delta / 1000) * (this.fastForward ? GlobalConfig.FAST_FORWARD_MULTIPLIER : 1);

    // Mana regen
    this.mana = Math.min(GlobalConfig.MANA_MAX, this.mana + this.manaRegen * dt);

    // Hero update
    this.hero.update(dt, this.enemyUnits, this.enemyCitadel);

    // Unit updates
    for (const u of this.playerUnits) {
      u.update(dt, this.enemyUnits, this.enemyCitadel);
    }
    for (const u of this.enemyUnits) {
      u.update(dt, this.playerUnits, this.playerCitadel);
    }

    // Reap dead units, award gold for kills
    this.playerUnits = this._reapDead(this.playerUnits, false);
    this.enemyUnits  = this._reapDead(this.enemyUnits,  true);

    // Clamp unit positions
    this._clampUnits();

    // HUD
    this._updateHUD();
    this._updateAbilityHUD();

    // Win / Lose check
    if (!this.enemyCitadel.alive) {
      this._onVictory();
    } else if (!this.playerCitadel.alive || this.hero.hp <= 0) {
      this._onDefeat();
    }
  }

  _reapDead(units, awardGold) {
    const alive = [];
    for (const u of units) {
      if (u.state === UnitState.DEAD || u.hp <= 0) {
        if (awardGold) this.gold += GlobalConfig.GOLD_PER_KILL;
        u.destroy();
      } else {
        alive.push(u);
      }
    }
    return alive;
  }

  _clampUnits() {
    const minX = 100, maxX = GlobalConfig.WIDTH - 100;
    for (const u of [...this.playerUnits, ...this.enemyUnits]) {
      u.x = Phaser.Math.Clamp(u.x, minX, maxX);
      u._updateGfxPos();
    }
  }

  // ── Victory / Defeat ──────────────────────────────────────────────────────

  _onVictory() {
    this.gameOver = true;
    this.time.timeScale = 1;

    // Award gold
    this.saveData.gold   = (this.saveData.gold || 0) + this.levelCfg.rewards.gold + this.gold;
    if (!this.saveData.clearedLevels.includes(this.levelId)) {
      this.saveData.clearedLevels.push(this.levelId);
    }
    SaveManager.save(this.saveData);

    this._showEndScreen(true, `Victory!\n+${this.levelCfg.rewards.gold + this.gold} Gold`);
  }

  _onDefeat() {
    this.gameOver = true;
    this.time.timeScale = 1;
    this._showEndScreen(false, 'Defeated!\nTry again or upgrade your army.');
  }

  _showEndScreen(win, message) {
    const { WIDTH, HEIGHT } = GlobalConfig;
    const cx = WIDTH / 2, cy = HEIGHT / 2;

    // Dim
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.65);
    dim.fillRect(0, 0, WIDTH, HEIGHT);

    const color = win ? '#ffd700' : '#ff4444';
    this.add.text(cx, cy - 80, message, {
      fontSize: '42px',
      color,
      stroke: '#000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5);

    // Continue button
    const btnLabel = win ? 'Back to Map' : 'Retry';
    const btnCb    = win
      ? () => this.scene.start('WorldMapScene', { saveData: this.saveData })
      : () => this.scene.restart({ levelId: this.levelId, saveData: this.saveData });

    this._endBtn(cx - 90, cy + 30, btnLabel, 0x2244aa, btnCb);
    this._endBtn(cx + 90, cy + 30, 'Map', 0x224422, () => {
      this.scene.start('WorldMapScene', { saveData: this.saveData });
    });
  }

  _endBtn(x, y, label, col, cb) {
    const w = 150, h = 46;
    const g = this.add.graphics();
    g.fillStyle(col, 1); g.lineStyle(2, 0xffffff, 0.7);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
    this.add.text(x, y, label, { fontSize: '20px', color: '#fff' }).setOrigin(0.5).setDepth(1);
    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
  }
}
