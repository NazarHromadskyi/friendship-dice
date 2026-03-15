const MODULE_ID = "friendship-dice";

export function getBonds() {
  return game.settings.get(MODULE_ID, "bonds") ?? [];
}

export function getBondsForActor(actorId) {
  const bonds = getBonds();
  const results = [];

  for (const bond of bonds) {
    let partnerId;
    if (bond.actorId1 === actorId) partnerId = bond.actorId2;
    else if (bond.actorId2 === actorId) partnerId = bond.actorId1;
    else continue;

    const partner = game.actors.get(partnerId);
    if (!partner) continue;

    results.push({
      id: bond.id,
      partnerId,
      partnerName: partner.name,
      partnerImg: partner.img,
      quantity: bond.quantity,
      size: bond.size,
      formula: `${bond.quantity}d${bond.size}`,
      expectedValue: bond.quantity * (bond.size + 1) / 2,
      createdAt: bond.createdAt ?? 0,
      updatedAt: bond.updatedAt ?? 0,
    });
  }

  return results;
}

export async function createBond(actorId1, actorId2, quantity = 1, size = 4) {
  if (!game.user.isGM) return;
  if (actorId1 === actorId2) {
    ui.notifications.warn(game.i18n.localize("FRIENDSHIP_DICE.GMPanel.SameActor"));
    return;
  }

  const bonds = getBonds();
  const duplicate = bonds.some(
    (b) =>
      (b.actorId1 === actorId1 && b.actorId2 === actorId2) ||
      (b.actorId1 === actorId2 && b.actorId2 === actorId1),
  );
  if (duplicate) {
    ui.notifications.warn(game.i18n.localize("FRIENDSHIP_DICE.GMPanel.DuplicateBond"));
    return;
  }

  const now = Date.now();
  const bond = {
    id: foundry.utils.randomID(),
    actorId1,
    actorId2,
    quantity: Math.max(1, Math.round(quantity)),
    size: [4, 6, 8, 10, 12, 20].includes(size) ? size : 4,
    createdAt: now,
    updatedAt: now,
  };

  bonds.push(bond);
  await game.settings.set(MODULE_ID, "bonds", bonds);
  return bond;
}

export async function updateBond(bondId, { quantity, size } = {}) {
  if (!game.user.isGM) return;

  const bonds = getBonds();
  const bond = bonds.find((b) => b.id === bondId);
  if (!bond) return;

  if (quantity !== undefined) bond.quantity = Math.max(1, Math.round(quantity));
  if (size !== undefined && [4, 6, 8, 10, 12, 20].includes(size)) bond.size = size;
  bond.updatedAt = Date.now();

  await game.settings.set(MODULE_ID, "bonds", bonds);
}

export async function deleteBond(bondId) {
  if (!game.user.isGM) return;

  const bonds = getBonds().filter((b) => b.id !== bondId);
  await game.settings.set(MODULE_ID, "bonds", bonds);
}

export function isUsed(actor) {
  return actor?.getFlag(MODULE_ID, "used") === true;
}

export async function markUsed(actor) {
  await actor.setFlag(MODULE_ID, "used", true);
}

export async function resetUsed(actor) {
  await actor.unsetFlag(MODULE_ID, "used");
}

export async function resetAllUsed() {
  if (!game.user.isGM) return;

  const promises = [];
  for (const actor of game.actors) {
    if (actor.getFlag(MODULE_ID, "used")) {
      promises.push(actor.unsetFlag(MODULE_ID, "used"));
    }
  }
  await Promise.all(promises);
  ui.notifications.info(game.i18n.localize("FRIENDSHIP_DICE.GMPanel.ResetDone"));
}
