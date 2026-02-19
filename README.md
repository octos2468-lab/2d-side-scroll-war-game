# Lane Defense – Epic War Web Edition

A modular, web-based lane-defense game inspired by *Epic War 2*, built with **Phaser 3** and designed to be "Steam-ready" (all balance in one config file).

## 🎮 Play Now

**[▶ Play on GitHub Pages](https://octos2468-lab.github.io/2d-side-scroll-war-game/)**

Every push to `main` automatically redeploys the live URL via GitHub Actions.

---

## 🚀 One-Click Deploy

1. Fork this repository.
2. Go to **Settings → Pages** and set the source to **GitHub Actions**.
3. Push any commit to `main` — the workflow in `.github/workflows/deploy.yml` will build and publish automatically.
4. Your game will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 🕹️ Controls

| Key | Action |
|-----|--------|
| `1` – `5` | Spawn unit (Soldier / Archer / Knight / Mage / Catapult) |
| `Q` | Hero ability – **Arrow Rain** (AOE damage) |
| `E` | Hero ability – **Heal Allies** |
| `F` | Toggle **Fast Forward** ×2 |
| **Click** ground | Move hero |

---

## 📁 Project Structure

```
/
├── index.html              # Entry point (served by GitHub Pages)
├── dist/
│   └── index.html          # Alternate dist entry (references ../src/)
├── src/
│   ├── config/
│   │   └── GlobalConfig.js # ← ALL balance variables live here
│   ├── managers/
│   │   └── SaveManager.js  # localStorage auto-save
│   └── scenes/
│       ├── MenuScene.js     # Main menu + Options
│       ├── WorldMapScene.js # Node map, tooltips, footer
│       ├── LevelScene.js    # Core battle loop
│       └── UpgradeScene.js  # Upgrade tree
├── assets/                  # Placeholder asset folder
└── .github/
    └── workflows/
        └── deploy.yml       # GitHub Pages auto-deploy
```

---

## ⚙️ Balancing (Steam-Ready)

Open **`src/config/GlobalConfig.js`** to tweak any value:

- Unit HP / Damage / Speed / Range / Cost
- Hero stats and ability cooldowns
- Mana regen rate, citadel HP
- Level definitions and enemy wave configs
- Upgrade tree costs and effects

No other file needs to change for balance passes.

---

## 🗺️ Features

- **World Map** – node-based level selector with Red (available) / Blue (cleared) / Grey (locked) states and hover tooltips showing rewards & enemy types.
- **Lane Combat** – mana economy, unit spawning, two citadels.
- **Unit AI** – state machine: Move → Attack → (target dead) → Move.
- **Hero System** – player-controlled hero with Arrow Rain and Heal Allies abilities.
- **Upgrade Tree** – spend gold on Army (HP/Damage/Speed) and Hero (Mana Regen/Cooldowns) upgrades.
- **Fast Forward** – ×2 speed toggle for grinding.
- **Auto-save** – saves to `localStorage` after every level and map transition.
- **Options** – in-game volume controls accessible from the main menu.

---

## 🔧 Local Development

No build step required. Just open `index.html` in a browser:

```bash
# Using Python's built-in server (recommended to avoid CORS issues):
python3 -m http.server 8080
# Then open http://localhost:8080
```

Or use the **Live Server** extension in VS Code.
