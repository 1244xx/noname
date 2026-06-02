import { lib, game, ui, get, ai, _status } from "../main/utils.js";

const STORAGE_KEY = "_yiti_mark";

function getYitiList(player) {
	return player.storage[STORAGE_KEY] || [];
}

function getYitiBySubtype(player, subtype) {
	return getYitiList(player).find(i => i.subtype === subtype);
}

/** @type { importCharacterConfig['skill'] } */
const skill = {
	_yiti_mark: {
		forceLoad: true,
		marktext: "体",
		intro: {
			name: "义体",
			markcount(storage, player) {
				return getYitiList(player).length;
			},
			mark(dialog, storage, player) {
				const list = getYitiList(player);
				if (!list.length) {
					return "未装备义体";
				}
				dialog.add([list.map(i => [i.suit, i.number, i.name]), "vcard"]);
			},
			content(storage, player) {
				const list = getYitiList(player);
				if (!list.length) {
					return "未装备义体";
				}
				return list.map(i => get.translation(i.name)).join("、");
			},
		},
	},

	_yiti_mod: {
		charlotte: true,
		mod: {
			canBeReplaced(card, player) {
				if (!player || get.info(card).yiti) return;
				const subtype = get.subtype(card);
				if (getYitiBySubtype(player, subtype)) {
					return false;
				}
				if ((subtype === "equip3" || subtype === "equip4") && getYitiBySubtype(player, "equip3_4")) return false;
			},
			cardRecastable(card, player, source, result) {
				if (!player || get.info(card).yiti) return result;
				if (get.type(card) !== "equip") return result;
				const subtype = get.subtype(card);
				if (getYitiBySubtype(player, subtype)) {
					return true;
				}
				if ((subtype === "equip3" || subtype === "equip4") && getYitiBySubtype(player, "equip3_4")) return true;
				return result;
			},
		},
	},

	_yiti_equip: {
		enable: "phaseUse",
		filter(event, player) {
			return player.hasCard(card => _yiti_equip_filter(card, player), "hes");
		},
		filterCard(card, player) {
			if (!card || !get.info(card).yiti) return false;
			if (!canEquipYiti(player, card)) return false;
			return true;
		},
		position: "hes",
		selectCard: 1,
		discard: false,
		lose: false,
		delay: false,
		async content(event, trigger, player) {
			const card = event.cards[0];
			const info = get.info(card);
			const list = getYitiList(player);
			const matching = list.filter(i => i.subtype === info.subtype);
			const existing = matching.length ? await _chooseYitiToReplace(player, matching) : null;
			const isReplace = !!existing;
			const needDiscard = isReplace ? 1 : 2;

			const prompt = isReplace
				? "请弃置一张牌更换此义体"
				: "请弃置两张牌装备此义体";
			const result = await player
				.chooseToDiscard("he", needDiscard, prompt, true)
				.forResult();
			if (!result.bool) {
				event.finish();
				return;
			}

			if (isReplace) {
				for (const skill of existing.skills) {
					player.removeAdditionalSkill("_yiti_mark", skill);
				}
				const oldCard = game.createCard2(existing.name, existing.suit, existing.number);
				oldCard.fix();
				ui.discardPile.appendChild(oldCard);
				game.log(oldCard, "被置入了弃牌堆");
				const idx = list.indexOf(existing);
				if (idx >= 0) list.splice(idx, 1);
			} else {
				if (info.subtype === "equip3_4") {
					player.disableEquip(3, 4);
				} else {
					player.disableEquip(info.subtype);
				}
			}

			const skills = info.skills ? info.skills.slice() : [];
			list.push({
				name: card.name,
				subtype: info.subtype,
				suit: card.suit,
				number: card.number,
				skills: skills,
			});
			player.storage[STORAGE_KEY] = list;

			if (skills.length) {
				player.addAdditionalSkill("_yiti_mark", skills, true);
			}

			player.markSkill("_yiti_mark");

			for (const c of event.cards) {
				c.fix();
				c.delete();
			}
		},
		ai: {
			order: 7,
			result: {
				player: 1,
			},
		},
	},

	_yiti_cleanup: {
		trigger: { player: ["dieBegin", "changeGroup"] },
		forced: true,
		popup: false,
		firstDo: true,
		async content(event, trigger, player) {
			const list = getYitiList(player);
			if (!list.length) return;
			for (const item of list) {
				for (const skill of item.skills) {
					player.removeAdditionalSkill("_yiti_mark", skill);
				}
				const card = game.createCard2(item.name, item.suit, item.number);
				if (card) {
					card.fix();
					ui.discardPile.appendChild(card);
					game.log(card, "被置入了弃牌堆");
				}
			}
			player.unmarkSkill("_yiti_mark");
			delete player.storage[STORAGE_KEY];
		},
	},
};

function canEquipYiti(player, card) {
	if (!card || !get.info(card).yiti) return false;
	const subtype = get.subtype(card);
	const existing = getYitiBySubtype(player, subtype);
	if (existing) {
		return player.countCards("he") >= 1;
	}
	if (subtype === "equip3_4") {
		return player.hasEnabledSlot(3) && player.hasEnabledSlot(4) && player.countCards("he") >= 2;
	}
	return player.hasEnabledSlot(subtype) && player.countCards("he") >= 2;
}

function _yiti_equip_filter(card, player) {
	return get.info(card).yiti && canEquipYiti(player, card);
}

function getAllYitiCards() {
	const names = [];
	for (const key in lib.card) {
		if (lib.card[key].yiti === true) {
			names.push(key);
		}
	}
	return names;
}

async function registerYitiEquip(player, yitiName, extra = {}) {
	const info = lib.card[yitiName];
	if (!info) return;
	const subtype = info.subtype;
	const list = getYitiList(player);
	const matching = list.filter(i => i.subtype === subtype);
	const existing = matching.length ? await _chooseYitiToReplace(player, matching) : null;
	if (existing) {
		for (const skill of existing.skills) {
			player.removeAdditionalSkill("_yiti_mark", skill);
		}
		const oldCard = game.createCard2(existing.name, existing.suit, existing.number);
		oldCard.fix();
		ui.discardPile.appendChild(oldCard);
		game.log(oldCard, "被置入了弃牌堆");
		const idx = list.indexOf(existing);
		if (idx >= 0) list.splice(idx, 1);
	} else {
		if (subtype === "equip3_4") {
			player.disableEquip(3, 4);
		} else {
			player.disableEquip(subtype);
		}
	}
	const suit = extra.suit || info.cardcolor || "spade";
	const number = extra.number || info.yitiNumber || 1;
	const skills = info.skills ? info.skills.slice() : [];
	list.push({
		name: yitiName,
		subtype: subtype,
		suit: suit,
		number: number,
		skills: skills,
	});
	player.storage[STORAGE_KEY] = list;
	if (skills.length) {
		player.addAdditionalSkill("_yiti_mark", skills, true);
	}
	player.markSkill("_yiti_mark");
}

async function _chooseYitiToReplace(player, matching) {
	if (matching.length <= 1) return matching[0] || null;
	const result = await player
		.chooseButton(["请选择要替换掉的义体", [matching.map(i => [i.suit, i.number, i.name]), "vcard"]], true)
		.set("ai", button => {
			const item = matching.find(i => i.name === button.link[2]);
			return item ? -(item.skills?.length || 0) : 0;
		})
		.forResult();
	if (result.bool && result.links) {
		return matching.find(i => i.name === result.links[0][2]) || null;
	}
	return matching[0];
}

export { getYitiList, getYitiBySubtype, STORAGE_KEY, getAllYitiCards, registerYitiEquip };
export default skill;
