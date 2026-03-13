import {
  getBonds,
  createBond,
  updateBond,
  deleteBond,
  resetAllUsed,
  isUsed,
} from "../bond-manager.mjs";
import { postRulesToChat } from "../chat.mjs";
import { emitRefresh } from "../main.mjs";

const MODULE_ID = "friendship-dice";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { DialogV2 } = foundry.applications.api;

const DIE_SIZES = [4, 6, 8, 10, 12, 20];

export class GMPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "friendship-dice-gm",
    classes: ["friendship-dice"],
    window: {
      title: "FRIENDSHIP_DICE.GMPanel.Title",
      icon: "fa-solid fa-handshake",
      resizable: true,
    },
    position: {
      width: 520,
      height: 520,
    },
    actions: {
      addBond: GMPanel.#onAddBond,
      deleteBond: GMPanel.#onDeleteBond,
      resetAll: GMPanel.#onResetAll,
      resetOne: GMPanel.#onResetOne,
      sendRules: GMPanel.#onSendRules,
    },
  };

  static PARTS = {
    main: {
      template: "modules/friendship-dice/templates/gm-panel.hbs",
    },
  };

  async _prepareContext(options) {
    const bonds = getBonds();
    const makeSizeOptions = (selected) =>
      DIE_SIZES.map((s) => ({ value: s, label: `d${s}`, selected: s === selected }));

    const enrichedBonds = bonds.map((bond) => {
      const actor1 = game.actors.get(bond.actorId1);
      const actor2 = game.actors.get(bond.actorId2);
      return {
        id: bond.id,
        actor1Id: bond.actorId1,
        actor1Name: actor1?.name ?? "???",
        actor1Img: actor1?.img ?? "icons/svg/mystery-man.svg",
        actor1Used: actor1 ? isUsed(actor1) : false,
        actor2Id: bond.actorId2,
        actor2Name: actor2?.name ?? "???",
        actor2Img: actor2?.img ?? "icons/svg/mystery-man.svg",
        actor2Used: actor2 ? isUsed(actor2) : false,
        quantity: bond.quantity,
        size: bond.size,
        formula: `${bond.quantity}d${bond.size}`,
        sizeOptions: makeSizeOptions(bond.size),
      };
    });

    const actors = game.actors
      .filter((a) => a.hasPlayerOwner)
      .sort((a, b) => a.name.localeCompare(b.name));

    return { bonds: enrichedBonds, actors, dieSizes: makeSizeOptions(4) };
  }

  _onRender(_context, _options) {
    // Bond dice change listeners
    this.element.querySelectorAll("[data-field]").forEach((el) => {
      el.addEventListener("change", async (e) => {
        const bondId = e.currentTarget.dataset.bondId;
        const field = e.currentTarget.dataset.field;
        const value = Number(e.currentTarget.value);
        await updateBond(bondId, { [field]: value });
        emitRefresh();
        this.render();
      });
    });

    // Actor pickers
    this.element.querySelectorAll(".fd-picker").forEach((picker) => {
      const input = picker.querySelector(".fd-picker-input");
      const hidden = picker.querySelector("input[type=hidden]");
      const dropdown = picker.querySelector(".fd-picker-dropdown");
      const options = dropdown.querySelectorAll(".fd-picker-option");

      input.addEventListener("focus", () => {
        dropdown.style.display = "block";
        _filterOptions(input.value);
      });

      input.addEventListener("input", () => {
        hidden.value = "";
        _filterOptions(input.value);
        dropdown.style.display = "block";
      });

      input.addEventListener("blur", () => {
        setTimeout(() => { dropdown.style.display = "none"; }, 120);
      });

      options.forEach((opt) => {
        opt.addEventListener("mousedown", (e) => {
          e.preventDefault();
          hidden.value = opt.dataset.actorId;
          input.value = opt.dataset.actorName;
          dropdown.style.display = "none";
        });
      });

      function _filterOptions(query) {
        const q = query.toLowerCase().trim();
        options.forEach((opt) => {
          const name = opt.dataset.actorName.toLowerCase();
          opt.style.display = !q || name.includes(q) ? "" : "none";
        });
      }
    });

    // Bond list filter + session toggle
    const bondFilter = this.element.querySelector(".fd-filter");
    const sessionCheck = this.element.querySelector(".fd-session-check");
    const bondCards = this.element.querySelectorAll(".fd-bond-card");

    if (bondFilter && this._filterQuery) bondFilter.value = this._filterQuery;
    if (sessionCheck && this._sessionOnly) sessionCheck.checked = true;

    const applyFilters = () => {
      const q = bondFilter?.value.toLowerCase().trim() ?? "";
      this._filterQuery = q;
      const sessionOnly = sessionCheck?.checked ?? false;
      this._sessionOnly = sessionOnly;

      let sessionIds = null;
      if (sessionOnly) {
        sessionIds = new Set();
        for (const user of game.users) {
          if (user.active && !user.isGM && user.character) {
            sessionIds.add(user.character.id);
          }
        }
      }

      bondCards.forEach((card) => {
        const names = card.querySelectorAll(".fd-name");
        const textMatch = !q || Array.from(names).some((n) =>
          n.textContent.toLowerCase().includes(q),
        );
        const sessionMatch = !sessionIds ||
          sessionIds.has(card.dataset.actor1Id) ||
          sessionIds.has(card.dataset.actor2Id);
        card.style.display = textMatch && sessionMatch ? "" : "none";
      });
    };

    if (bondFilter) bondFilter.addEventListener("input", applyFilters);
    if (sessionCheck) sessionCheck.addEventListener("change", applyFilters);
    if (this._filterQuery || this._sessionOnly) applyFilters();
  }

  /** @this {GMPanel} */
  static async #onAddBond(event, target) {
    const section = this.element.querySelector(".fd-add-section");
    const actorId1 = section.querySelector("[name=actorId1]").value;
    const actorId2 = section.querySelector("[name=actorId2]").value;
    const quantity = Number(section.querySelector("[name=quantity]").value) || 1;
    const size = Number(section.querySelector("[name=size]").value) || 4;

    if (!actorId1 || !actorId2) return;

    const result = await createBond(actorId1, actorId2, quantity, size);
    if (result) {
      emitRefresh();
      this.render();
    }
  }

  /** @this {GMPanel} */
  static async #onDeleteBond(event, target) {
    const bondId = target.dataset.bondId ?? target.closest("[data-bond-id]")?.dataset.bondId;
    if (!bondId) return;

    const bonds = getBonds();
    const bond = bonds.find((b) => b.id === bondId);
    if (!bond) return;

    const actor1 = game.actors.get(bond.actorId1)?.name ?? "???";
    const actor2 = game.actors.get(bond.actorId2)?.name ?? "???";

    const confirmed = await DialogV2.confirm({
      window: { title: game.i18n.localize("FRIENDSHIP_DICE.GMPanel.Delete") },
      content: `<p>${game.i18n.format("FRIENDSHIP_DICE.GMPanel.ConfirmDelete", { actor1, actor2 })}</p>`,
    });

    if (confirmed) {
      await deleteBond(bondId);
      emitRefresh();
      this.render();
    }
  }

  /** @this {GMPanel} */
  static async #onResetAll(event, target) {
    const confirmed = await DialogV2.confirm({
      window: { title: game.i18n.localize("FRIENDSHIP_DICE.GMPanel.ResetAll") },
      content: `<p>${game.i18n.localize("FRIENDSHIP_DICE.GMPanel.ConfirmResetAll")}</p>`,
    });
    if (!confirmed) return;

    await resetAllUsed();
    emitRefresh();
    this.render();
  }

  /** @this {GMPanel} */
  static async #onResetOne(event, target) {
    const actorId = target.dataset.actorId ?? target.closest("[data-actor-id]")?.dataset.actorId;
    if (!actorId) return;

    const actor = game.actors.get(actorId);
    if (!actor || !isUsed(actor)) return;

    const confirmed = await DialogV2.confirm({
      window: { title: game.i18n.localize("FRIENDSHIP_DICE.GMPanel.ResetOne") },
      content: `<p>${game.i18n.format("FRIENDSHIP_DICE.GMPanel.ConfirmResetOne", { actor: actor.name })}</p>`,
    });
    if (!confirmed) return;

    await actor.unsetFlag("friendship-dice", "used");
    ui.notifications.info(game.i18n.format("FRIENDSHIP_DICE.GMPanel.ResetOneDone", { actor: actor.name }));
    emitRefresh();
    this.render();
  }

  /** @this {GMPanel} */
  static async #onSendRules() {
    await postRulesToChat();
  }

  static #instance = null;

  static open() {
    if (!GMPanel.#instance) {
      GMPanel.#instance = new GMPanel();
    }
    GMPanel.#instance.render(true);
    return GMPanel.#instance;
  }

  static refreshIfOpen() {
    if (GMPanel.#instance?.rendered) {
      GMPanel.#instance.render();
    }
  }
}
