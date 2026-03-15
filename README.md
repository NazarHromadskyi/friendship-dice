# Friendship Dice

A [Foundry VTT](https://foundryvtt.com/) module that adds a homebrew **Friendship Dice** mechanic for D&D and other systems.

When two player characters share a friendly bond, they gain a friendship die — a tangible representation of their connection. The GM sets the dice formula (1d4, 2d6, 3d8, etc.), and a player can roll their friendship die and add the result to any check, as long as their bonded friend is nearby. Once used, the ability is regained after finishing a long rest.

## Features

- **Symmetric bonds** — a bond between two characters is always mutual; both sides share the same dice formula
- **GM panel** — create, edit, and remove bonds; change dice formulas (quantity + die size); reset uses for all or individual characters
- **Player panel** — view your bonds (friend name, avatar, dice formula, available/used status) and roll with one click
- **Chat integration** — rolling posts a styled message to chat (e.g. _"Arwen uses friendship die with Gimli! 3d8 → 14"_)
- **midi-qol integration** — when midi-qol is active, a dialog automatically offers to add a friendship die to any skill check, ability check, saving throw, or attack roll. The bonus is part of the same roll result alongside Guidance, Bardic Inspiration, and other bonuses — no duplicate messages
- **CPR compatibility** — works alongside Chris's Premades (Cauldron of Plentiful Resources) bonus pass; all bonuses appear in one clean chat message
- **Long rest auto-reset** — automatic reset for dnd5e when a character completes a long rest; manual "Reset All" button for other systems
- **Bilingual UI** — English and Ukrainian (Українська)
- **System-agnostic** — works with any game system; optional dnd5e rest hook and midi-qol integration

## Rules

1. A bond is a pair of player characters with a dice formula set by the GM (e.g. 1d4, 2d8, 3d10)
2. A player can roll **one** of their friendship dice and add the result to any check
3. The bonded friend must be nearby (within 10 feet)
4. Once used, the character can't use any friendship die again until they finish a long rest
5. Only the GM can create, upgrade, or remove bonds

## Installation

### Via Manifest URL

1. In Foundry VTT, go to **Settings → Manage Modules → Install Module**
2. Paste the manifest URL:
   ```
   https://github.com/NazarHromadskyi/friendship-dice/releases/latest/download/module.json
   ```
3. Click **Install**

### Manual

1. Download the latest `module.zip` from [Releases](https://github.com/NazarHromadskyi/friendship-dice/releases)
2. Extract into your Foundry VTT `Data/modules/` directory
3. Restart Foundry and enable the module in your world

## Usage

1. Enable the module in your world settings
2. A heart/handshake icon appears in the **Token Controls** group on the left sidebar
3. **GM** — click the icon to open the bond management panel: add character pairs, set dice formulas, remove bonds, and reset uses
4. **Players** — click the icon to see your bonds and roll; make sure your character is set in **User Configuration**

## Recommended Modules

These modules are optional but enhance the experience:

| Module | Benefit |
| ------ | ------- |
| [midi-qol](https://foundryvtt.com/packages/midi-qol) | Automatic friendship die dialog on d20 rolls |
| [lib-wrapper](https://foundryvtt.com/packages/lib-wrapper) | Reliable roll method wrapping (required if midi-qol is used) |
| [Chris's Premades](https://foundryvtt.com/packages/chris-premades) | Full compatibility — friendship die appears alongside Guidance and other bonuses |

Without these modules, the friendship die works via the player panel's manual Roll button.

## Compatibility

| Foundry VTT | Status   |
| ----------- | -------- |
| v13.341+    | Verified |
| v13.x       | Minimum  |

## Development

No build step required — pure ESModules. Symlink or copy the module folder into your Foundry `Data/modules/` directory.

```bash
# Lint
npm run lint

# Format
npm run format
```

- CSS / HBS / JSON changes hot-reload automatically
- JS changes require a browser refresh (F5)
- `module.json` changes require returning to Foundry setup

## License

MIT
