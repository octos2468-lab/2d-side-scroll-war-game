/**
 * main.js
 * -------
 * Phaser 3 game initialization.
 * All scene classes must be loaded before this script.
 */
window.addEventListener('load', () => {
  const { WIDTH, HEIGHT } = GlobalConfig;

  const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: '#0a1020',
    parent: 'game-container',
    scene: [
      MenuScene,
      WorldMapScene,
      LevelScene,
      UpgradeScene,
    ],
    // Phaser's physics is not used in this game (custom physics via update loop).
    // Enable only if needed for advanced features.
  };

  window.game = new Phaser.Game(config);
});
