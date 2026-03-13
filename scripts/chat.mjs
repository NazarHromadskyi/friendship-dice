const MODULE_ID = "friendship-dice";

export async function postFriendshipRoll(actor, partnerName, formula) {
  const flavor = game.i18n.format("FRIENDSHIP_DICE.Chat.Flavor", {
    actor: actor.name,
    partner: partnerName,
  });

  const roll = new Roll(formula);
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });
}

export async function postRulesToChat() {
  const t = (key) => game.i18n.localize(`FRIENDSHIP_DICE.Rules.${key}`);
  const items = [t("Bond"), t("Usage"), t("Nearby"), t("Limit")]
    .map((r) => `<li>${r}</li>`)
    .join("");
  const content = `<h3><i class="fa-solid fa-handshake"></i> ${t("Title")}</h3><ul>${items}</ul>`;

  await ChatMessage.create({
    content,
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
  });
}
