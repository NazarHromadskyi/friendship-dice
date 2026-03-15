import { getBondsForActor, isUsed, markUsed } from "../bond-manager.mjs";
import { postFriendshipRoll } from "../chat.mjs";
import { emitRefresh } from "../main.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const PLAYER_SORT_MODES = ["created", "name", "dice"];
const SORT_ICONS = {
  created: "fa-solid fa-arrow-down-1-9",
  name: "fa-solid fa-arrow-down-a-z",
  dice: "fa-solid fa-dice-d20",
};

export class PlayerPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "friendship-dice-player",
    classes: ["friendship-dice"],
    window: {
      title: "FRIENDSHIP_DICE.PlayerPanel.Title",
      icon: "fa-solid fa-handshake",
      resizable: true,
    },
    position: {
      width: 340,
      height: 420,
    },
    actions: {
      rollBond: PlayerPanel.#onRollBond,
    },
  };

  static PARTS = {
    main: {
      template: "modules/friendship-dice/templates/player-panel.hbs",
    },
  };

  _actorId;

  constructor(actorId, options = {}) {
    super(options);
    this._actorId = actorId ?? null;
  }

  get actor() {
    return game.actors.get(this._actorId) ?? game.user?.character ?? null;
  }

  async _prepareContext(_options) {
    const actor = this.actor;
    if (!actor) return { noCharacter: true, bonds: [], used: false, sortOptions: [] };

    const bonds = getBondsForActor(actor.id);
    const used = isUsed(actor);

    const sortMode = this._sortMode ?? "created";
    PlayerPanel.#sortBonds(bonds, sortMode);

    const sortIcon = SORT_ICONS[sortMode];
    const sortTooltip = game.i18n.localize(`FRIENDSHIP_DICE.Sort.${sortMode}`);

    return { noCharacter: false, bonds, used, showFilter: bonds.length > 5, sortIcon, sortTooltip };
  }

  _onRender(_context, _options) {
    // Sort cycle button
    const sortBtn = this.element.querySelector(".fd-sort-btn");
    if (sortBtn) {
      sortBtn.addEventListener("click", () => {
        const current = this._sortMode ?? "created";
        const idx = PLAYER_SORT_MODES.indexOf(current);
        this._sortMode = PLAYER_SORT_MODES[(idx + 1) % PLAYER_SORT_MODES.length];
        this.render();
      });
    }

    const filter = this.element.querySelector(".fd-filter");
    if (!filter) return;
    const cards = this.element.querySelectorAll(".fd-bond-card");
    const clearBtn = this.element.querySelector(".fd-filter-clear");

    if (this._filterQuery) {
      filter.value = this._filterQuery;
      if (clearBtn) clearBtn.hidden = false;
    }

    const syncClear = () => {
      if (clearBtn) clearBtn.hidden = !filter.value;
    };

    const applyFilter = () => {
      const q = filter.value.toLowerCase().trim();
      this._filterQuery = q;
      cards.forEach((card) => {
        const name = card.querySelector(".fd-name")?.textContent.toLowerCase() ?? "";
        card.style.display = !q || name.includes(q) ? "" : "none";
      });
    };

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        filter.value = "";
        syncClear();
        filter.focus();
        applyFilter();
      });
    }

    filter.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && filter.value) {
        e.preventDefault();
        e.stopPropagation();
        filter.value = "";
        syncClear();
        applyFilter();
      }
    });

    filter.addEventListener("input", () => { syncClear(); applyFilter(); });
    if (this._filterQuery) applyFilter();
  }

  /** @this {PlayerPanel} */
  static async #onRollBond(event, target) {
    const actor = this.actor;
    if (!actor) return;

    if (isUsed(actor)) {
      ui.notifications.warn(
        game.i18n.localize("FRIENDSHIP_DICE.PlayerPanel.AlreadyUsed"),
      );
      return;
    }

    const bondId = target.dataset.bondId;
    const bonds = getBondsForActor(actor.id);
    const bond = bonds.find((b) => b.id === bondId);
    if (!bond) return;

    await postFriendshipRoll(actor, bond.partnerName, bond.formula);
    await markUsed(actor);

    emitRefresh();
    this.render();
  }

  static #sortBonds(bonds, mode) {
    switch (mode) {
      case "name":
        bonds.sort((a, b) => a.partnerName.localeCompare(b.partnerName));
        break;
      case "dice":
        bonds.sort((a, b) => b.expectedValue - a.expectedValue);
        break;
      case "created":
      default:
        bonds.sort((a, b) => a.createdAt - b.createdAt);
        break;
    }
  }

  static #instance = null;

  static open(actorId) {
    if (!PlayerPanel.#instance) {
      PlayerPanel.#instance = new PlayerPanel(actorId);
    } else if (actorId) {
      PlayerPanel.#instance._actorId = actorId;
    }
    PlayerPanel.#instance.render(true);
    return PlayerPanel.#instance;
  }

  static refreshIfOpen() {
    if (PlayerPanel.#instance?.rendered) {
      PlayerPanel.#instance.render();
    }
  }
}
