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
			const subtype = info.subtype;
			const list = getYitiList(player);
			const existing = list.find(i => i.subtype === subtype);
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
				if (subtype === "equip3_4") {
					player.disableEquip(3, 4);
				} else {
					player.disableEquip(subtype);
				}
			}

			const skills = info.skills ? info.skills.slice() : [];
			list.push({
				name: card.name,
				subtype: subtype,
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

	wangqu_skill1: {
		locked: true,
		forced: true,
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return get.type2(event.card) === "trick";
		},
		async content(event, trigger, player) {
			player.draw();
		},
		ai: {
			combo: "trick",
		},
	},

	wangqu_skill2: {
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target.countCards("h") === 0
				|| target.getCards("h").every(c => get.is.shownCard(c));
		},
		async content(event, trigger, player) {
			const { target } = event;
			const result = await player
				.chooseControl(["wangqu_loseHp", "wangqu_control"])
				.set("prompt", `请选择对${get.translation(target)}的效果`)
				.set("ai", () => {
					const att = get.attitude(player, target);
					if (att > 0) return "wangqu_control";
					if (target.hp <= 1) return "wangqu_loseHp";
					if (target.countCards("h") >= 4) return "wangqu_control";
					return "wangqu_loseHp";
				})
				.forResult();
			if (result.control === "wangqu_loseHp") {
				await target.loseHp();
			} else {
				const hs = target.getCards("h");
				if (hs.length) {
					target.addGaintag(hs, "visible_wangqu");
					player.markAuto("wangqu_control_shared", [target]);
				}
				player.storage.wangqu_control_target = target;
			}
			player.addTempSkill("wangqu_control_end", { player: "phaseJieshuAfter" });
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					if (get.attitude(player, target) > 0) return 0;
					return target.countCards("h") === 0 ? -1.5 : -1;
				},
			},
		},
	},

	wangqu_control_end: {
		charlotte: true,
		trigger: { player: "phaseJieshu" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			await player.chooseToDiscard("he", 2, "网驱：请弃置两张牌", true);
		},
	},

	qilusi_skill1: {
		mod: {
			targetInRange(card, player, target, result) {
				if (get.type2(card) === "trick") return true;
			},
		},
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			if (get.type2(event.card) !== "trick") return false;
			if (player.countCards("he") < 1) return false;
			return event.targets && event.targets.some(t => t !== player && t.countCards("h") > 0);
		},
		async content(event, trigger, player) {
			const targets = trigger.targets.filter(t => t !== player && t.countCards("h") > 0);
			if (!targets.length) return;

			const target = targets.length === 1 ? targets[0] : (await player
				.chooseTarget("义眼：请选择一名角色观看手牌", (card, player, t) => targets.includes(t))
				.set("ai", t => -get.attitude(player, t) + (t.countCards("h") > 2 ? 1 : 0))
				.forResult()).targets?.[0];
			if (!target) return;

			const cardToView = target.getCards("h").randomGet();
			await player.viewCards("义眼：" + get.translation(target) + "的一张手牌", [cardToView]);

			const discardResult = await player
				.chooseToDiscard("he", "义眼：请弃置一张牌，令" + get.translation(target) + "弃置所有同花色的手牌")
				.set("ai", card => {
					const suit = get.suit(card, player);
					return target.countCards("h", c => get.suit(c, target) === suit) - 3;
				})
				.forResult();
			if (!discardResult.bool || !discardResult.cards?.length) return;

			const discardedSuit = get.suit(discardResult.cards[0], player);
			const matchingCards = target.getCards("h").filter(c => get.suit(c, target) === discardedSuit);
			if (matchingCards.length) {
				await target.discard(matchingCards);
			}
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

export { getYitiList, getYitiBySubtype, STORAGE_KEY };
export default skill;
