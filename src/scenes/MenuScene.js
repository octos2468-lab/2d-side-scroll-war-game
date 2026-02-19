/**
 * MenuScene.js
 * ------------
 * Main menu: Title, "Start Game", and "Options" panel.
 */
class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { WIDTH, HEIGHT } = GlobalConfig;
    const cx = WIDTH / 2;

    // ── Background gradient (sky to ground) ──────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a1628, 0x0a1628, 0x1a3050, 0x1a3050, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    // Ground strip
    bg.fillStyle(0x2d5a1b, 1);
    bg.fillRect(0, HEIGHT - 120, WIDTH, 120);

    // Stars
    for (let i = 0; i < 120; i++) {
      const sx = Phaser.Math.Between(0, WIDTH);
      const sy = Phaser.Math.Between(0, HEIGHT - 140);
      const r  = Math.random() < 0.2 ? 2 : 1;
      bg.fillStyle(0xffffff, Math.random() * 0.8 + 0.2);
      bg.fillCircle(sx, sy, r);
    }

    // ── Title ─────────────────────────────────────────────────────────────
    this.add.text(cx, 130, 'LANE DEFENSE', {
      fontFamily: 'Georgia, serif',
      fontSize: '72px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, 210, 'Epic War – Web Edition', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#aaccff',
    }).setOrigin(0.5);

    // ── Buttons ───────────────────────────────────────────────────────────
    this._makeButton(cx, 320, 'START GAME', 0x2244aa, 0x3366dd, () => {
      this.scene.start('WorldMapScene');
    });

    this._makeButton(cx, 410, 'OPTIONS', 0x224422, 0x336633, () => {
      this._toggleOptions();
    });

    // ── Options Panel (hidden) ────────────────────────────────────────────
    this._buildOptionsPanel(cx);

    // ── Version footer ────────────────────────────────────────────────────
    this.add.text(WIDTH - 12, HEIGHT - 12, 'v0.1.0', {
      fontSize: '14px',
      color: '#556677',
    }).setOrigin(1, 1);
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  _makeButton(x, y, label, colorNormal, colorHover, callback) {
    const w = 260, h = 56;
    const bg = this.add.graphics();
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(1);

    const draw = (col) => {
      bg.clear();
      bg.lineStyle(2, 0xffffff, 0.6);
      bg.fillStyle(col, 1);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    };
    draw(colorNormal);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover',  () => draw(colorHover));
    zone.on('pointerout',   () => draw(colorNormal));
    zone.on('pointerdown',  callback);
    return { bg, txt, zone };
  }

  _buildOptionsPanel(cx) {
    const panelW = 500, panelH = 300;
    const px = cx - panelW / 2, py = 250;

    this._optionsGroup = this.add.group();

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a1628, 0.95);
    panelBg.lineStyle(2, 0x4488ff, 1);
    panelBg.fillRoundedRect(px, py, panelW, panelH, 12);
    panelBg.strokeRoundedRect(px, py, panelW, panelH, 12);
    this._optionsGroup.add(panelBg);

    const title = this.add.text(cx, py + 28, 'OPTIONS', {
      fontSize: '28px', color: '#ffd700', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this._optionsGroup.add(title);

    // Music volume slider label
    const saveData = SaveManager.load();
    const musicLabel = this.add.text(px + 30, py + 80, `Music Volume: ${Math.round(saveData.settings.musicVolume * 100)}%`, {
      fontSize: '20px', color: '#aaccff',
    });
    this._optionsGroup.add(musicLabel);

    // Simple +/- buttons for music volume
    this._addVolumeControls(cx, py + 80, 'music', saveData.settings.musicVolume, (val) => {
      const sd = SaveManager.load();
      sd.settings.musicVolume = val;
      SaveManager.save(sd);
      musicLabel.setText(`Music Volume: ${Math.round(val * 100)}%`);
    });

    const sfxLabel = this.add.text(px + 30, py + 150, `SFX Volume:   ${Math.round(saveData.settings.sfxVolume * 100)}%`, {
      fontSize: '20px', color: '#aaccff',
    });
    this._optionsGroup.add(sfxLabel);

    this._addVolumeControls(cx, py + 150, 'sfx', saveData.settings.sfxVolume, (val) => {
      const sd = SaveManager.load();
      sd.settings.sfxVolume = val;
      SaveManager.save(sd);
      sfxLabel.setText(`SFX Volume:   ${Math.round(val * 100)}%`);
    });

    // Keybind hint
    const hint = this.add.text(cx, py + 220, 'Unit keys: 1-5  |  Abilities: Q, E  |  Fast Fwd: F', {
      fontSize: '16px', color: '#778899',
    }).setOrigin(0.5);
    this._optionsGroup.add(hint);

    // Close button
    const closeBtn = this.add.text(cx, py + 265, '[ Close ]', {
      fontSize: '20px', color: '#ff9944',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._toggleOptions());
    this._optionsGroup.add(closeBtn);

    this._optionsGroup.setVisible(false);
  }

  _addVolumeControls(cx, y, _key, _initVal, onChange) {
    let currentVal = _initVal;

    const minus = this.add.text(cx + 130, y, '[ - ]', {
      fontSize: '20px', color: '#ff8888',
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    minus.on('pointerdown', () => {
      currentVal = Math.max(0, Math.round((currentVal - 0.1) * 10) / 10);
      onChange(currentVal);
    });

    const plus = this.add.text(cx + 200, y, '[ + ]', {
      fontSize: '20px', color: '#88ff88',
    }).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    plus.on('pointerdown', () => {
      currentVal = Math.min(1, Math.round((currentVal + 0.1) * 10) / 10);
      onChange(currentVal);
    });

    this._optionsGroup.add(minus);
    this._optionsGroup.add(plus);
  }

  _toggleOptions() {
    this._optionsGroup.setVisible(!this._optionsGroup.visible);
  }
}
