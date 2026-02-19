# Assets

This directory holds game assets (sprites, audio, etc.).

Currently the game renders everything procedurally via Phaser's Graphics API,
so no external assets are required to run.

When real art/audio is added, place files here and reference them via
`GlobalConfig.js` or the relevant scene's `preload()` method.
