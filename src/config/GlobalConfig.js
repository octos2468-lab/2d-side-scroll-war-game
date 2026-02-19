/**
 * GlobalConfig.js
 * ---------------
 * Single source of truth for ALL game-balancing variables.
 * Edit only this file when tuning the game for a Steam release.
 */
window.GlobalConfig = {
  // ── Viewport ──────────────────────────────────────────────────────────────
  WIDTH: 1280,
  HEIGHT: 720,

  // ── Economy ───────────────────────────────────────────────────────────────
  MANA_REGEN_RATE: 12,   // mana per second for the player
  MANA_MAX: 200,
  MANA_START: 50,
  GOLD_PER_KILL: 10,
  GOLD_START: 0,

  // ── Unit Definitions ──────────────────────────────────────────────────────
  UNITS: {
    SOLDIER: {
      name: 'Soldier',
      hp: 100,
      damage: 15,
      speed: 65,
      range: 42,
      attackRate: 1.0,   // attacks per second
      cost: 20,          // mana cost
      width: 20,
      height: 30,
      color: 0x4488ff,
      enemyColor: 0xff4444,
      keybind: '1',
    },
    ARCHER: {
      name: 'Archer',
      hp: 70,
      damage: 22,
      speed: 58,
      range: 130,
      attackRate: 0.8,
      cost: 30,
      width: 18,
      height: 28,
      color: 0x44bbff,
      enemyColor: 0xff8844,
      keybind: '2',
    },
    KNIGHT: {
      name: 'Knight',
      hp: 210,
      damage: 28,
      speed: 42,
      range: 46,
      attackRate: 0.7,
      cost: 45,
      width: 24,
      height: 32,
      color: 0x8855ff,
      enemyColor: 0xff4488,
      keybind: '3',
    },
    MAGE: {
      name: 'Mage',
      hp: 65,
      damage: 45,
      speed: 52,
      range: 160,
      attackRate: 0.5,
      cost: 55,
      width: 16,
      height: 28,
      color: 0x44ffcc,
      enemyColor: 0xffcc44,
      keybind: '4',
    },
    CATAPULT: {
      name: 'Catapult',
      hp: 160,
      damage: 65,
      speed: 30,
      range: 210,
      attackRate: 0.3,
      cost: 85,
      width: 32,
      height: 24,
      color: 0xffaa00,
      enemyColor: 0xff6600,
      keybind: '5',
    },
  },

  // ── Hero ──────────────────────────────────────────────────────────────────
  HERO: {
    hp: 500,
    damage: 30,
    speed: 92,
    range: 60,
    attackRate: 1.5,
    manaMax: 100,
    manaRegen: 8,          // hero mana per second
    width: 22,
    height: 36,
    color: 0xffff44,
    ABILITIES: {
      ARROW_RAIN: {
        name: 'Arrow Rain',
        description: 'Deals AOE damage in target area',
        manaCost: 40,
        damage: 90,
        radius: 110,
        duration: 2000,    // ms visual duration
        cooldown: 8000,    // ms
        keybind: 'Q',
      },
      HEAL: {
        name: 'Heal Allies',
        description: 'Restores HP to nearby allied units',
        manaCost: 50,
        healAmount: 65,
        radius: 160,
        cooldown: 12000,   // ms
        keybind: 'E',
      },
    },
  },

  // ── Citadels ──────────────────────────────────────────────────────────────
  CITADEL: {
    hp: 1000,
    width: 60,
    height: 120,
    playerColor: 0x2255ff,
    enemyColor: 0xff2222,
  },

  // ── Levels ────────────────────────────────────────────────────────────────
  LEVELS: [
    {
      id: 1,
      name: 'Greenfield',
      mapX: 180, mapY: 420,
      enemies: [
        { type: 'SOLDIER', spawnRate: 5000 },
      ],
      rewards: { gold: 50 },
      description: 'Basic soldiers guard the fields.',
      requires: [],
    },
    {
      id: 2,
      name: 'Stone Bridge',
      mapX: 340, mapY: 330,
      enemies: [
        { type: 'SOLDIER', spawnRate: 4500 },
        { type: 'ARCHER',  spawnRate: 8500 },
      ],
      rewards: { gold: 80 },
      description: 'Archers defend the river crossing.',
      requires: [1],
    },
    {
      id: 3,
      name: 'Dark Forest',
      mapX: 510, mapY: 460,
      enemies: [
        { type: 'SOLDIER', spawnRate: 4000 },
        { type: 'KNIGHT',  spawnRate: 7500 },
      ],
      rewards: { gold: 100 },
      description: 'Knights lurk in the shadows.',
      requires: [1],
    },
    {
      id: 4,
      name: 'Mage Tower',
      mapX: 680, mapY: 300,
      enemies: [
        { type: 'ARCHER', spawnRate: 5000 },
        { type: 'MAGE',   spawnRate: 9000 },
      ],
      rewards: { gold: 130 },
      description: 'Mages rain spells from the tower.',
      requires: [2, 3],
    },
    {
      id: 5,
      name: 'Final Fortress',
      mapX: 880, mapY: 380,
      enemies: [
        { type: 'KNIGHT',   spawnRate: 4000 },
        { type: 'MAGE',     spawnRate: 6000 },
        { type: 'CATAPULT', spawnRate: 12000 },
      ],
      rewards: { gold: 200 },
      description: 'The enemy\'s last and mightiest bastion.',
      requires: [4],
    },
  ],

  // ── Upgrade Tree ──────────────────────────────────────────────────────────
  UPGRADES: {
    ARMY_HP: {
      id: 'ARMY_HP',
      name: 'Army Health',
      description: 'Increase all unit HP by 20% per level',
      maxLevel: 5,
      costPerLevel: [50, 100, 150, 200, 250],
      effect: { stat: 'hp', multiplier: 0.20 },
      gridX: 0, gridY: 0,
    },
    ARMY_DMG: {
      id: 'ARMY_DMG',
      name: 'Army Damage',
      description: 'Increase all unit damage by 15% per level',
      maxLevel: 5,
      costPerLevel: [60, 120, 180, 240, 300],
      effect: { stat: 'damage', multiplier: 0.15 },
      gridX: 1, gridY: 0,
    },
    ARMY_SPEED: {
      id: 'ARMY_SPEED',
      name: 'Army Speed',
      description: 'Increase all unit speed by 10% per level',
      maxLevel: 3,
      costPerLevel: [80, 160, 240],
      effect: { stat: 'speed', multiplier: 0.10 },
      gridX: 2, gridY: 0,
    },
    HERO_MANA: {
      id: 'HERO_MANA',
      name: 'Hero Mana Regen',
      description: 'Increase hero mana regen by 20% per level',
      maxLevel: 5,
      costPerLevel: [50, 100, 150, 200, 250],
      effect: { stat: 'manaRegen', multiplier: 0.20 },
      gridX: 0, gridY: 1,
    },
    HERO_COOLDOWN: {
      id: 'HERO_COOLDOWN',
      name: 'Reduce Cooldowns',
      description: 'Reduce hero ability cooldowns by 10% per level',
      maxLevel: 5,
      costPerLevel: [70, 140, 210, 280, 350],
      effect: { stat: 'cooldown', multiplier: -0.10 },
      gridX: 1, gridY: 1,
    },
    MANA_REGEN: {
      id: 'MANA_REGEN',
      name: 'Mana Regen',
      description: 'Increase base mana regen by 15% per level',
      maxLevel: 5,
      costPerLevel: [40, 80, 120, 160, 200],
      effect: { stat: 'manaRegen', multiplier: 0.15 },
      gridX: 2, gridY: 1,
    },
  },

  // ── Miscellaneous ─────────────────────────────────────────────────────────
  FAST_FORWARD_MULTIPLIER: 2,
  ENEMY_SPAWN_VARIANCE: 0.2,   // ±20% random timing variance
};
