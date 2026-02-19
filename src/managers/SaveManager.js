/**
 * SaveManager.js
 * --------------
 * Handles persistent game state via localStorage.
 * Merges loaded data with defaults so new save fields are always present.
 */
window.SaveManager = {
  SAVE_KEY: 'laneDefenseSave_v1',

  defaultSave: {
    clearedLevels: [],    // array of level IDs
    gold: 0,
    upgrades: {},         // { upgradeId: currentLevel }
    settings: {
      musicVolume: 0.7,
      sfxVolume: 0.8,
      keybinds: {
        unit1: '1',
        unit2: '2',
        unit3: '3',
        unit4: '4',
        unit5: '5',
        ability1: 'Q',
        ability2: 'E',
        fastForward: 'F',
      },
    },
  },

  /** Persist the given save object to localStorage. */
  save(data) {
    try {
      localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[SaveManager] Save failed:', e);
      return false;
    }
  },

  /** Load save data from localStorage, merging missing fields with defaults. */
  load() {
    try {
      const raw = localStorage.getItem(this.SAVE_KEY);
      if (!raw) return this._clone(this.defaultSave);
      return this._merge(JSON.parse(raw), this.defaultSave);
    } catch (e) {
      console.error('[SaveManager] Load failed:', e);
      return this._clone(this.defaultSave);
    }
  },

  /** Delete the save file. */
  deleteSave() {
    localStorage.removeItem(this.SAVE_KEY);
  },

  // ── private helpers ───────────────────────────────────────────────────────

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Deep-merge `loaded` on top of `defaults`.
   * Arrays are replaced wholesale (not merged element-by-element).
   */
  _merge(loaded, defaults) {
    const result = this._clone(defaults);
    for (const key in loaded) {
      if (
        typeof loaded[key] === 'object' &&
        !Array.isArray(loaded[key]) &&
        loaded[key] !== null &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = this._merge(loaded[key], result[key]);
      } else {
        result[key] = loaded[key];
      }
    }
    return result;
  },
};
