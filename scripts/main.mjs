import { PlayerPanel } from "./apps/player-panel.mjs";
import { GMPanel } from "./apps/gm-panel.mjs";
import { resetUsed } from "./bond-manager.mjs";

const MODULE_ID = "friendship-dice";
const SOCKET = `module.${MODULE_ID}`;

/* ── Init ────────────────────────────────────────────── */
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);

  game.settings.register(MODULE_ID, "bonds", {
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });

});

/* ── Ready ───────────────────────────────────────────── */
Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);

  // Socket listener — refresh open panels when data changes
  game.socket.on(SOCKET, ({ action }) => {
    if (action === "refresh") {
      PlayerPanel.refreshIfOpen();
      GMPanel.refreshIfOpen();
    }
  });

  // dnd5e long rest hook
  if (game.system.id === "dnd5e") {
    Hooks.on("dnd5e.longRest", async (actor) => {
      await resetUsed(actor);
      emitRefresh();
    });
  }
});

/* ── Scene Control Button ────────────────────────────── */
function openPanel() {
  if (game.user.isGM) {
    GMPanel.open();
  } else {
    PlayerPanel.open(game.user.character?.id);
  }
}

// Register control group via API
Hooks.on("getSceneControlButtons", (controls) => {
  controls[MODULE_ID] = {
    name: MODULE_ID,
    title: game.i18n.localize("FRIENDSHIP_DICE.SceneControl"),
    icon: "fa-solid fa-handshake",
    visible: true,
    order: 70,
    tools: {
      open: {
        name: "open",
        title: game.i18n.localize("FRIENDSHIP_DICE.SceneControl"),
        icon: "fa-solid fa-handshake",
        button: true,
        visible: true,
        onChange: () => openPanel(),
      },
    },
    activeTool: "open",
  };
});

// Also open panel when clicking the group icon itself
Hooks.on("renderSceneControls", (_app, html) => {
  const btn = html.querySelector(`[data-control="${MODULE_ID}"]`);
  if (!btn || btn.dataset.fdBound) return;
  btn.dataset.fdBound = "1";
  btn.addEventListener("click", () => openPanel());
});

/* ── Refresh on character change ─────────────────────── */
Hooks.on("updateUser", (user) => {
  if (user.id === game.user.id) {
    PlayerPanel.refreshIfOpen();
  }
});

/* ── Socket emit helper ──────────────────────────────── */
export function emitRefresh() {
  game.socket.emit(SOCKET, { action: "refresh" });
}
