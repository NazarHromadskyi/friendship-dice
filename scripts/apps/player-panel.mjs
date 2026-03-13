import { getBondsForActor, isUsed, markUsed } from "../bond-manager.mjs";
import { postFriendshipRoll } from "../chat.mjs";
import { emitRefresh } from "../main.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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
    if (!actor) return { noCharacter: true, bonds: [], used: false };

    const bonds = getBondsForActor(actor.id);
    const used = isUsed(actor);

    return { noCharacter: false, bonds, used, showFilter: bonds.length > 5 };
  }

  _onRender(_context, _options) {
    const filter = this.element.querySelector(".fd-filter");
    if (!filter) return;
    const cards = this.element.querySelectorAll(".fd-bond-card");

    if (this._filterQuery) filter.value = this._filterQuery;

    const applyFilter = () => {
      const q = filter.value.toLowerCase().trim();
      this._filterQuery = q;
      cards.forEach((card) => {
        const name = card.querySelector(".fd-name")?.textContent.toLowerCase() ?? "";
        card.style.display = !q || name.includes(q) ? "" : "none";
      });
    };

    filter.addEventListener("input", applyFilter);
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
