/**
 * UpgradeScene.js
 * ---------------
 * Grid-based upgrade tree.
 * Spends saved Gold to buff Army (HP / Damage / Speed) and Hero (Mana Regen / Cooldowns).
 * Returns to WorldMapScene when done.
 */
class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  init(data) {
    this.saveData = data && data.saveData ? data.saveData : SaveManager.load();
  }

  create() {
    const { WIDTH, HEIGHT } = GlobalConfig;
    const cx = WIDTH / 2;

    // ── Background ─────────────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a20, 0x0a0a20, 0x1a1a35, 0x1a1a35, 1);
    bg.fillRect(0, 0, WIDTH, HEIGHT);

    // ── Title ─────────────────────────────────────────────────────────────
    this.add.text(cx, 36, 'UPGRADE TREE', {
      fontFamily: 'Georgia, serif',
      fontSize: '38px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // ── Section labels ─────────────────────────────────────────────────────
    this.add.text(cx, 90, '⚔ Army Upgrades', {
      fontSize: '22px', color: '#aaddff', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    this.add.text(cx, 310, '✨ Hero Upgrades', {
      fontSize: '22px', color: '#ffddaa', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // ── Gold display (live update) ─────────────────────────────────────────
    this._goldText = this.add.text(cx, HEIGHT - 100, `💰 Gold: ${this.saveData.gold}`, {
      fontSize: '22px', color: '#ffd700',
    }).setOrigin(0.5);

    // ── Upgrade cards ─────────────────────────────────────────────────────
    this._cards = {};
    const COLS       = 3;
    const cardW      = 260, cardH = 160;
    const marginX    = 40;
    const totalW     = COLS * cardW + (COLS - 1) * marginX;
    const startX     = (WIDTH - totalW) / 2 + cardW / 2;

    const armyRowY   = 200;
    const heroRowY   = 420;

    for (const [id, upg] of Object.entries(GlobalConfig.UPGRADES)) {
      const rowY = upg.gridY === 0 ? armyRowY : heroRowY;
      const x    = startX + upg.gridX * (cardW + marginX);
      this._buildCard(id, upg, x, rowY, cardW, cardH);
    }

    // ── Back button ────────────────────────────────────────────────────────
    const backBtn = this.add.text(cx, HEIGHT - 48, '[ Back to Map ]', {
      fontSize: '26px',
      color: '#aaccff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    backBtn.on('pointerover',  () => backBtn.setColor('#ffffff'));
    backBtn.on('pointerout',   () => backBtn.setColor('#aaccff'));
    backBtn.on('pointerdown',  () => {
      SaveManager.save(this.saveData);
      this.scene.start('WorldMapScene', { saveData: this.saveData });
    });
  }

  // ── Upgrade card ──────────────────────────────────────────────────────────

  _buildCard(id, upg, x, y, cardW, cardH) {
    const currentLevel = this.saveData.upgrades[id] || 0;
    const maxed        = currentLevel >= upg.maxLevel;
    const cost         = maxed ? null : upg.costPerLevel[currentLevel];
    const canAfford    = !maxed && this.saveData.gold >= cost;

    const cardColor = maxed ? 0x225522 : canAfford ? 0x222244 : 0x221122;
    const borderCol = maxed ? 0x44ff44 : canAfford ? 0x4488ff : 0x554455;

    const g = this.add.graphics();
    const draw = (fill, border) => {
      g.clear();
      g.fillStyle(fill, 0.92);
      g.lineStyle(2, border, 1);
      g.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
      g.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 10);
    };
    draw(cardColor, borderCol);

    // Name
    const nameT = this.add.text(x, y - cardH / 2 + 18, upg.name, {
      fontSize: '17px', color: '#ffd700', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5);

    // Description
    this.add.text(x, y - cardH / 2 + 44, upg.description, {
      fontSize: '13px', color: '#aaccdd', wordWrap: { width: cardW - 20 }, align: 'center',
    }).setOrigin(0.5);

    // Level pips
    const pipY = y + cardH / 2 - 52;
    const pipSpacing = 22;
    const pipsStartX = x - ((upg.maxLevel - 1) * pipSpacing) / 2;
    for (let i = 0; i < upg.maxLevel; i++) {
      const pip = this.add.graphics();
      pip.fillStyle(i < currentLevel ? 0xffd700 : 0x334455, 1);
      pip.lineStyle(1, 0xffffff, 0.4);
      pip.fillCircle(pipsStartX + i * pipSpacing, pipY, 7);
      pip.strokeCircle(pipsStartX + i * pipSpacing, pipY, 7);
    }

    // Cost / status text
    const statusY = y + cardH / 2 - 28;
    const statusT = this.add.text(x, statusY,
      maxed ? 'MAX LEVEL' : `Cost: ${cost} Gold`,
      { fontSize: '14px', color: maxed ? '#44ff44' : canAfford ? '#ffffff' : '#ff6666' }
    ).setOrigin(0.5);

    // Upgrade button (only if not maxed)
    if (!maxed) {
      const btnY = y + cardH / 2 - 5;
      const btnG = this.add.graphics();
      const btnW = 120, btnH = 30;
      const colN = canAfford ? 0x2244aa : 0x443344;
      const colH = canAfford ? 0x3366ff : 0x443344;
      const drawBtn = col => {
        btnG.clear();
        btnG.fillStyle(col, 1);
        btnG.lineStyle(1, 0xffffff, 0.5);
        btnG.fillRoundedRect(x - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
        btnG.strokeRoundedRect(x - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
      };
      drawBtn(colN);

      const btnTxt = this.add.text(x, btnY, 'Upgrade', {
        fontSize: '15px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(1);

      if (canAfford) {
        const zone = this.add.zone(x, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
        zone.on('pointerover',  () => drawBtn(colH));
        zone.on('pointerout',   () => drawBtn(colN));
        zone.on('pointerdown',  () => {
          this._applyUpgrade(id, upg, currentLevel, cost);
          // Refresh the scene to reflect new state
          this.scene.restart({ saveData: this.saveData });
        });
      }
    }

    this._cards[id] = { g, nameT, statusT };
  }

  // ── Apply upgrade ─────────────────────────────────────────────────────────

  _applyUpgrade(id, upg, currentLevel, cost) {
    if (this.saveData.gold < cost) return;
    this.saveData.gold -= cost;
    this.saveData.upgrades[id] = currentLevel + 1;
    SaveManager.save(this.saveData);
  }
}
