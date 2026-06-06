import { lib, game, ui, get, ai, _status } from "../../main/utils.js";

function getArmorHorseYitiNames() {
	const names = [];
	for (const key in lib.card) {
		const info = lib.card[key];
		if (!info.yiti) continue;
		const sub = info.subtype;
		if (sub === "equip2" || sub === "equip3_4") {
			names.push(key);
		}
	}
	return names;
}

async function doZhuangzhiChoice(player) {
	const equippedNames = new Set(
		(player.storage._yiti_mark || []).map(i => i.name)
	);
	const available = getArmorHorseYitiNames().filter(name => !equippedNames.has(name));
	if (!available.length) {
		game.log(player, "没有可复制的防具或坐骑类义体");
		return;
	}
	const list = available.map(name => {
		const info = lib.card[name];
		return [info.cardcolor, info.yitiNumber, name];
	});
	const result = await player
		.chooseButton(["请选择要复制的防具或坐骑义体", [list, "vcard"]], true)
		.set("ai", button => {
			const name = button.link[2];
			const info = lib.card[name];
			return (info.skills ? info.skills.length : 0) + 1;
		})
		.forResult();
	if (!result.bool || !result.links) return;
	const chosenName = result.links[0][2];
	const chosenInfo = lib.card[chosenName];
	player.storage.zhuangzhi_jiansuo_chosen = chosenName;
	player.storage.zhuangzhi_jiansuo_blocked = (player.storage.zhuangzhi_jiansuo_blocked || []).concat(chosenName);
	const copiedSkills = chosenInfo.skills ? chosenInfo.skills.slice() : [];
	player.storage.zhuangzhi_jiansuo_copiedSkills = copiedSkills;
	if (copiedSkills.length) {
		player.addAdditionalSkill("zhuangzhi_jiansuo_skill", copiedSkills);
	}
	game.log(player, "发动了【装植减缩】，复制了", get.translation(chosenName), "的效果");
}

/** @type { importCharacterConfig['skill'] } */
const skill = {
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
			}
			player.addTempSkill("wangqu_control_end", { player: "phaseJieshuAfter" });
		},
		ai: {
			order: 9,
			result: {
				target(player, target) {
					if (get.attitude(player, target) < 0) return -1.5;
					// 对队友选控制也有代价（弃2牌），谨慎评估
					return -0.5;
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

	zhuangzhi_jiansuo_skill: {
		init(player) {
			if (!player.storage.zhuangzhi_jiansuo_chosen) {
				doZhuangzhiChoice(player);
			}
		},
		mod: {
			globalFrom(from, to, distance) {
				const copied = from.storage.zhuangzhi_jiansuo_chosen;
				if (copied) {
					const info = lib.card[copied];
					if (info && info.distance && typeof info.distance.globalFrom === "number") {
						return distance + info.distance.globalFrom;
					}
				}
			},
			attackFrom(from, to, range) {
				const copied = from.storage.zhuangzhi_jiansuo_chosen;
				if (copied) {
					const info = lib.card[copied];
					if (info && info.distance && typeof info.distance.attackFrom === "number") {
						return range + info.distance.attackFrom;
					}
				}
			},
		},
		onremove(player, skill) {
			const copiedSkills = player.storage.zhuangzhi_jiansuo_copiedSkills || [];
			for (const s of copiedSkills) {
				player.removeAdditionalSkill("zhuangzhi_jiansuo_skill", s);
			}
			delete player.storage.zhuangzhi_jiansuo_copiedSkills;
			delete player.storage.zhuangzhi_jiansuo_chosen;
			delete player.storage.zhuangzhi_jiansuo_blocked;
		},
	},

	kuangbao_skill1: {
		locked: true,
		forced: true,
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.card && event.card.name === "sha";
		},
		async content(event, trigger, player) {
			player.draw();
		},
		ai: {
			threaten: 1.2,
		},
	},

	kuangbao_skill2: {
		enable: "phaseUse",
		filter(event, player) {
			return !player.storage.kuangbao_active;
		},
		async content(event, trigger, player) {
			player.storage.kuangbao_active = true;
			player.addTempSkill("kuangbao_no_limit", { player: "phaseAfter" });
		},
		ai: {
			order: 8,
			result: {
				player(player) {
					// 血量太低不宜发动（可能结束阶段自杀）
					if (player.hp <= 2) return 0;
					// 手中至少2张杀才值得
					const shaCount = player.countCards("h", "sha");
					if (shaCount >= 3) return 3;
					if (shaCount >= 2) return 1.5;
					return 0;
				},
			},
		},
	},

	kuangbao_no_limit: {
		charlotte: true,
		onremove(player) {
			delete player.storage.kuangbao_active;
		},
		mod: {
			cardUsable: () => Infinity,
		},
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const history = player.getHistory("useCard");
			let shaCount = 0;
			for (const h of history) {
				if (h.card.name === "sha" && h.isPhaseUsing()) {
					shaCount++;
				}
			}
			const loseCount = Math.floor(shaCount / 2);
			if (loseCount > 0) {
				game.log(player, "【狂暴】本回合使用了" + shaCount + "次杀，失去" + loseCount + "点体力");
				await player.loseHp(loseCount);
			}
		},
	},

	sianweisi_tan_skill1: {
		locked: true,
		forced: true,
		trigger: { player: ["useCardAfter", "respondAfter"] },
		filter(event, player) {
			return event.card && event.card.name === "shan";
		},
		async content(event, trigger, player) {
			player.draw();
		},
		ai: {
			respondShan: true,
			skillTagFilter(player) {
				return true;
			},
		},
	},

	sianweisi_tan_skill2: {
		enable: "phaseUse",
		filter(event, player) {
			return !player.storage.sianweisi_tan_active;
		},
		async content(event, trigger, player) {
			player.storage.sianweisi_tan_active = true;
			player.addTempSkill("sianweisi_tan_force", { player: "phaseAfter" });
		},
		ai: {
			order: 7,
			result: {
				player(player) {
					// 手中至少1张闪才值得激活，否则纯亏弃牌
					if (player.countCards("h", "shan") >= 1) return 2;
					return 0;
				},
			},
		},
	},

	sianweisi_tan_force: {
		charlotte: true,
		onremove(player) {
			delete player.storage.sianweisi_tan_active;
		},
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			if (!player.storage.sianweisi_tan_active) return false;
			return event.card.name === "sha" && !event.getParent().directHit.includes(event.target);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToRespond({ name: "shan" }, `是否发动【斯安威斯坦】打出一张闪，令此杀强制命中？`)
				.set("ai", () => get.attitude(player, trigger.target) < 0)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.getParent().directHit.add(trigger.target);
			game.log(player, "发动了【斯安威斯坦】令杀强制命中");
		},
		group: "sianweisi_tan_discard",
		subSkill: {
			discard: {
				charlotte: true,
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				popup: false,
				async content(event, trigger, player) {
					await player.chooseToDiscard("he", 1, "斯安威斯坦：请弃置一张牌", true);
				},
			},
		},
	},
};

export { doZhuangzhiChoice };
export default skill;
