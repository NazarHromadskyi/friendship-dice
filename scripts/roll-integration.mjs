import { getBondsForActor, isUsed, markUsed } from "./bond-manager.mjs";

const MODULE_ID = "friendship-dice";

let _onBondUsed = () => {};

/**
 * Show a dialog for the player to select which friendship bond to use.
 * Styled to match the player panel's bond cards.
 * Returns the selected bond object or null if skipped/cancelled.
 */
async function showBondSelectionDialog(bonds, d20Result) {
  const sorted = [...bonds].sort((a, b) => b.expectedValue - a.expectedValue);
  const cardsHtml = sorted
    .map(
      (bond) => `
    <div class="fd-bond-card fd-dialog-bond" data-bond-id="${bond.id}">
      <img class="fd-avatar" src="${bond.partnerImg}" alt="" width="44" height="44">
      <div class="fd-bond-info">
        <span class="fd-name">${bond.partnerName}</span>
        <span class="fd-formula">${bond.formula}</span>
      </div>
    </div>`,
    )
    .join("");

  const d20Html = d20Result != null
    ? `<div class="fd-dialog-d20"><i class="fa-solid fa-dice-d20"></i> ${d20Result}</div>`
    : "";

  const content = `
    <div class="fd-player-panel fd-dialog-panel">
      ${d20Html}
      <div class="fd-bonds">
        ${cardsHtml}
      </div>
    </div>`;

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (value) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const dialog = new Dialog(
      {
        title: game.i18n.localize("FRIENDSHIP_DICE.Dialog.Title"),
        content,
        buttons: {
          skip: {
            label: game.i18n.localize("FRIENDSHIP_DICE.Dialog.Skip"),
            callback: () => finish(null),
          },
        },
        default: "skip",
        close: () => finish(null),
        render: (html) => {
          html[0].querySelectorAll(".fd-dialog-bond").forEach((card) => {
            card.addEventListener("click", () => {
              const bondId = card.dataset.bondId;
              const bond = bonds.find((b) => b.id === bondId);
              finish(bond ?? null);
              dialog.close();
            });
          });
        },
      },
      {
        classes: ["dialog", "friendship-dice", "fd-bond-dialog"],
        width: 340,
      },
    );
    dialog.render(true);
  });
}

/**
 * Add bonus dice to a roll. Uses MidiQOL.addRollTo if available, otherwise manual merge.
 */
function addBonusToRoll(roll, bonusRoll) {
  if (globalThis.MidiQOL?.addRollTo) {
    return MidiQOL.addRollTo(roll, bonusRoll);
  }
  const op = new OperatorTerm({ operator: "+" });
  op._evaluated = true;
  const terms = [...roll.terms, op, ...bonusRoll.terms];
  const newRoll = Roll.fromTerms(terms);
  newRoll.options = roll.options;
  return newRoll;
}

/**
 * Core logic: show bond selection dialog, add bonus to roll, mark used.
 * Shared by both actor-method and item-method wrappers.
 */
async function applyFriendshipBonus(actor, result) {
  if (!result || !actor || isUsed(actor)) return result;
  if (!game.settings.get(MODULE_ID, "rollDialog")) return result;

  // Check d20 threshold — skip dialog if the d20 result is above the threshold
  const threshold = game.settings.get(MODULE_ID, "rollThreshold");
  if (threshold > 0) {
    const rolls = Array.isArray(result) ? result : [result];
    const d20 = rolls[0]?.dice?.find((d) => d.faces === 20);
    if (d20 && d20.total >= threshold) return result;
  }

  const bonds = getBondsForActor(actor.id);
  if (!bonds.length) return result;

  // Extract d20 result for the dialog header
  const resultRolls = Array.isArray(result) ? result : [result];
  const d20Die = resultRolls[0]?.dice?.find((d) => d.faces === 20);
  const d20Result = d20Die?.total ?? null;

  let selectedBond;
  try {
    selectedBond = await showBondSelectionDialog(bonds, d20Result);
  } catch {
    return result;
  }
  if (!selectedBond) return result;

  try {
    const isArray = Array.isArray(result);
    const rolls = isArray ? result : [result];
    let roll = rolls[0];

    const bonusRoll = await new Roll(`+ ${selectedBond.formula}`).evaluate();
    roll = addBonusToRoll(roll, bonusRoll);

    await markUsed(actor);
    _onBondUsed();

    const flavor = game.i18n.format("FRIENDSHIP_DICE.Chat.Flavor", {
      actor: actor.name,
      partner: selectedBond.partnerName,
    });
    ui.notifications.info(flavor);

    return isArray ? [roll, ...rolls.slice(1)] : roll;
  } catch (e) {
    console.error(`${MODULE_ID} | Error adding friendship die bonus:`, e);
    return result;
  }
}

/**
 * Wrapper for Actor roll methods (rollSkill, rollAbilityCheck, rollSavingThrow).
 * `this` is the Actor.
 */
async function actorRollWrapper(wrapped, ...args) {
  const result = await wrapped(...args);
  return applyFriendshipBonus(this, result);
}

/**
 * Wrapper for Item roll methods (dnd5e v3: Item.rollAttack).
 * `this` is the Item — actor is accessed via this.actor.
 */
async function itemRollWrapper(wrapped, ...args) {
  const result = await wrapped(...args);
  return applyFriendshipBonus(this?.actor, result);
}

/**
 * Wrapper for Activity roll methods (dnd5e v4: AttackActivity.rollAttack).
 * `this` is the Activity — actor is accessed via this.actor or this.item.actor.
 */
async function activityRollWrapper(wrapped, ...args) {
  const result = await wrapped(...args);
  const actor = this?.actor ?? this?.item?.actor;
  return applyFriendshipBonus(actor, result);
}

/**
 * One-time cleanup of legacy midi-qol optional flags and AEs
 * from previous integration approaches. Gated by schemaVersion.
 */
async function cleanupLegacy() {
  const LEGACY_SCHEMA = 1;
  if (game.settings.get(MODULE_ID, "schemaVersion") >= LEGACY_SCHEMA) return;

  console.log(`${MODULE_ID} | Cleaning up legacy midi-qol data`);
  const originPrefix = `${MODULE_ID}.bond.`;
  const promises = [];

  for (const actor of game.actors) {
    const sourceOptional = actor._source?.flags?.["midi-qol"]?.optional;
    if (sourceOptional) {
      const legacyKeys = Object.keys(sourceOptional).filter((k) => k.startsWith("FD_"));
      if (legacyKeys.length) {
        const cleanupData = {};
        for (const key of legacyKeys) {
          cleanupData[`flags.midi-qol.optional.-=${key}`] = null;
        }
        promises.push(actor.update(cleanupData));
      }
    }

    const legacyEffects = actor.effects.filter((e) => e.origin?.startsWith(originPrefix));
    if (legacyEffects.length) {
      promises.push(
        actor.deleteEmbeddedDocuments("ActiveEffect", legacyEffects.map((e) => e.id)),
      );
    }
  }

  await Promise.all(promises);
  await game.settings.set(MODULE_ID, "schemaVersion", LEGACY_SCHEMA);
}

/**
 * Register a wrapper for a method via libWrapper (preferred) or monkey-patch (fallback).
 */
function wrapMethod(target, wrapper) {
  try {
    if (typeof libWrapper !== "undefined") {
      libWrapper.register(MODULE_ID, target, wrapper, "MIXED");
    } else {
      const parts = target.split(".");
      let obj = globalThis;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      const methodName = parts[parts.length - 1];
      const original = obj[methodName];
      obj[methodName] = function (...fnArgs) {
        return wrapper.call(this, original.bind(this), ...fnArgs);
      };
    }
  } catch (e) {
    console.warn(`${MODULE_ID} | Failed to wrap ${target}:`, e.message);
  }
}

/**
 * Set up the roll wrapper for dnd5e bonus integration.
 * Wraps rollSkill, rollAbilityCheck, rollSavingThrow, and rollAttack
 * to offer friendship dice as a bonus on any d20 roll.
 * @param {Function} onBondUsedFn — called after a friendship die is used
 */
export function setupRollIntegration(onBondUsedFn) {
  _onBondUsed = onBondUsedFn ?? (() => {});

  if (game.system?.id !== "dnd5e" || !game.modules.get("midi-qol")?.active) {
    console.log(`${MODULE_ID} | dnd5e + midi-qol not detected, skipping roll wrapper`);
    return;
  }

  console.log(`${MODULE_ID} | Setting up dnd5e roll wrapper`);

  // Actor methods: rollSkill, rollAbilityCheck, rollSavingThrow (this = Actor)
  const actorTargets = [
    "CONFIG.Actor.documentClass.prototype.rollSkill",
    "CONFIG.Actor.documentClass.prototype.rollAbilityCheck",
    "CONFIG.Actor.documentClass.prototype.rollSavingThrow",
  ];

  for (const target of actorTargets) {
    wrapMethod(target, actorRollWrapper);
  }

  // Attack rolls: dnd5e v4 uses AttackActivity.rollAttack, v3 uses Item.rollAttack
  const AttackActivity = CONFIG.DND5E?.activityTypes?.attack?.documentClass;
  if (AttackActivity?.prototype?.rollAttack) {
    const original = AttackActivity.prototype.rollAttack;
    AttackActivity.prototype.rollAttack = function (...fnArgs) {
      return activityRollWrapper.call(this, original.bind(this), ...fnArgs);
    };
    console.log(`${MODULE_ID} | Wrapped AttackActivity.rollAttack`);
  } else if (CONFIG.Item.documentClass.prototype.rollAttack) {
    wrapMethod("CONFIG.Item.documentClass.prototype.rollAttack", itemRollWrapper);
  }

  if (game.user.isGM) cleanupLegacy();
}
