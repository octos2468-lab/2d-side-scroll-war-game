/**
 * WorldMapScene.js
 * ----------------
 * Node-based level selector with:
 *   • Red  = available / unbeaten
 *   • Blue = cleared
 *   • Grey = locked
 *   • Hover tooltips showing rewards & enemy types
 *   • Persistent footer: Save/Quit | Settings | Upgrade Tree
 */
class WorldMapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WorldMapScene' });
  }

  create() {
    const { WIDTH, HEIGHT } = GlobalConfig;
    this.saveData = SaveManager.load();

    // ── Background ─────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a2a1a, 0x1a2a1a, 0x0a1a0a, 0x0a1a0a, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    // Decorative grid lines
    bg.lineStyle(1, 0x224422, 0.3);
    for (let x = 0; x < WIDTH; x += 80)  { bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x, HEIGHT); bg.strokePath(); }
    for (let y = 0; y < HEIGHT; y += 80) { bg.beginPath(); bg.moveTo(0, y); bg.lineTo(WIDTH, y); bg.strokePath(); }

    // ── Title ─────────────────────────────────────────────────────────────
    this.add.text(WIDTH / 2, 36, 'WORLD MAP', {
      fontFamily: 'Georgia, serif',
      fontSize: '38px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // ── Tooltip object (shared, hidden until hover) ────────────────────────
    this._tooltip = this._buildTooltip();

    // ── Draw connections first, then nodes ────────────────────────────────
    this._drawConnections();
    this._drawNodes();

    // ── Persistent footer ─────────────────────────────────────────────────
    this._buildFooter();
  }

  // ── Connections ──────────────────────────────────────────────────────────

  _drawConnections() {
    const g = this.add.graphics();
    g.lineStyle(3, 0x446644, 0.8);

    for (const level of GlobalConfig.LEVELS) {
      for (const reqId of level.requires) {
        const parent = GlobalConfig.LEVELS.find(l => l.id === reqId);
        if (!parent) continue;
        g.beginPath();
        g.moveTo(parent.mapX, parent.mapY);
        g.lineTo(level.mapX, level.mapY);
        g.strokePath();
      }
    }
  }

  // ── Level Nodes ───────────────────────────────────────────────────────────

  _drawNodes() {
    const cleared = this.saveData.clearedLevels;

    for (const level of GlobalConfig.LEVELS) {
      const isCleared  = cleared.includes(level.id);
      const isUnlocked = level.requires.every(r => cleared.includes(r));
      const isLocked   = !isCleared && !isUnlocked;

      const color = isCleared ? 0x2266ff : isUnlocked ? 0xdd2222 : 0x555566;
      const glow  = isCleared ? 0x4488ff : isUnlocked ? 0xff5555 : 0x777788;

      // Glow ring
      const g = this.add.graphics();
      g.fillStyle(glow, 0.25);
      g.fillCircle(level.mapX, level.mapY, 28);

      // Node circle
      g.fillStyle(color, 1);
      g.lineStyle(2, 0xffffff, 0.7);
      g.fillCircle(level.mapX, level.mapY, 20);
      g.strokeCircle(level.mapX, level.mapY, 20);

      // Lock / check icon
      if (isLocked) {
        this.add.text(level.mapX, level.mapY, '🔒', { fontSize: '16px' }).setOrigin(0.5);
      } else if (isCleared) {
        this.add.text(level.mapX, level.mapY, '✓', {
          fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5);
      }

      // Level name label
      this.add.text(level.mapX, level.mapY + 34, level.name, {
        fontSize: '14px',
        color: isLocked ? '#777788' : '#eeeeff',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);

      // Interactive zone
      if (!isLocked) {
        const zone = this.add.zone(level.mapX, level.mapY, 56, 56).setInteractive({ useHandCursor: true });
        zone.on('pointerover', () => this._showTooltip(level));
        zone.on('pointerout',  () => this._hideTooltip());
        zone.on('pointerdown', () => {
          this._hideTooltip();
          this._startLevel(level);
        });
      }
    }
  }

  _startLevel(level) {
    this.scene.start('LevelScene', { levelId: level.id, saveData: this.saveData });
  }

  // ── Tooltip ───────────────────────────────────────────────────────────────

  _buildTooltip() {
    const group = this.add.group();
    const bg = this.add.graphics();
    const name = this.add.text(0, 0, '', { fontSize: '16px', color: '#ffd700', stroke: '#000', strokeThickness: 2 });
    const desc = this.add.text(0, 0, '', { fontSize: '13px', color: '#aaccff' });
    const rewards = this.add.text(0, 0, '', { fontSize: '13px', color: '#aaffaa' });
    const enemies = this.add.text(0, 0, '', { fontSize: '13px', color: '#ffaaaa' });
    group.addMultiple([bg, name, desc, rewards, enemies]);
    group.setVisible(false);
    return { group, bg, name, desc, rewards, enemies };
  }

  _showTooltip(level) {
    const tw = 230, th = 120;
    let tx = level.mapX + 32;
    let ty = level.mapY - 60;
    if (tx + tw > GlobalConfig.WIDTH - 10) tx = level.mapX - tw - 32;
    if (ty < 60) ty = level.mapY + 32;

    const { bg, name, desc, rewards, enemies } = this._tooltip;

    bg.clear();
    bg.fillStyle(0x0a1020, 0.92);
    bg.lineStyle(1, 0x4488ff, 1);
    bg.fillRoundedRect(tx, ty, tw, th, 8);
    bg.strokeRoundedRect(tx, ty, tw, th, 8);

    name.setPosition(tx + 10, ty + 8).setText(level.name);
    desc.setPosition(tx + 10, ty + 30).setText(level.description);
    rewards.setPosition(tx + 10, ty + 52).setText(`Reward: ${level.rewards.gold} Gold`);
    const enemyNames = [...new Set(level.enemies.map(e => GlobalConfig.UNITS[e.type].name))].join(', ');
    enemies.setPosition(tx + 10, ty + 74).setText(`Enemies: ${enemyNames}`);

    this._tooltip.group.setVisible(true);
    this._tooltip.group.setDepth(10);
    [bg, name, desc, rewards, enemies].forEach(o => o.setDepth(10));
  }

  _hideTooltip() {
    this._tooltip.group.setVisible(false);
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  _buildFooter() {
    const { WIDTH, HEIGHT } = GlobalConfig;
    const footerY = HEIGHT - 50;

    // Footer background
    const fg = this.add.graphics();
    fg.fillStyle(0x050d15, 0.92);
    fg.fillRect(0, HEIGHT - 70, WIDTH, 70);
    fg.lineStyle(1, 0x224466, 1);
    fg.beginPath(); fg.moveTo(0, HEIGHT - 70); fg.lineTo(WIDTH, HEIGHT - 70); fg.strokePath();

    // Gold display
    this.add.text(20, footerY, `💰 Gold: ${this.saveData.gold}`, {
      fontSize: '18px', color: '#ffd700',
    }).setOrigin(0, 0.5);

    // Buttons
    this._footerBtn(WIDTH / 2 - 200, footerY, 'Upgrade Tree', 0x334433, 0x446644, () => {
      this.scene.start('UpgradeScene', { saveData: this.saveData });
    });

    this._footerBtn(WIDTH / 2, footerY, 'Save Game', 0x223344, 0x334455, () => {
      SaveManager.save(this.saveData);
      this._flashMessage('Game Saved!', 0x44ff44);
    });

    this._footerBtn(WIDTH / 2 + 200, footerY, 'Quit to Menu', 0x443322, 0x664433, () => {
      SaveManager.save(this.saveData);
      this.scene.start('MenuScene');
    });
  }

  _footerBtn(x, y, label, colNormal, colHover, cb) {
    const w = 170, h = 38;
    const g = this.add.graphics();
    const draw = col => {
      g.clear();
      g.fillStyle(col, 1);
      g.lineStyle(1, 0x88aacc, 0.7);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    };
    draw(colNormal);
    this.add.text(x, y, label, { fontSize: '16px', color: '#ffffff' }).setOrigin(0.5).setDepth(1);
    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover',  () => draw(colHover));
    zone.on('pointerout',   () => draw(colNormal));
    zone.on('pointerdown',  cb);
  }

  _flashMessage(msg, color) {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const txt = this.add.text(GlobalConfig.WIDTH / 2, GlobalConfig.HEIGHT / 2, msg, {
      fontSize: '36px', color: hex, stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: txt, alpha: 0, y: GlobalConfig.HEIGHT / 2 - 60, duration: 1800, onComplete: () => txt.destroy() });
  }

  // Called when returning from LevelScene
  init(data) {
    if (data && data.saveData) {
      this.saveData = data.saveData;
    }
  }
}
