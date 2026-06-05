import { lib, game, ui, get, ai, _status } from "../../main/utils.js";

const YITI_KEY = "_yiti_mark";

function _getYitiCount(player) {
	return (player.storage[YITI_KEY] || []).length;
}

/** @type { importCharacterConfig['skill'] } */
const skill = {
	hejin_tiegu_skill: {
		locked: true,
		forced: true,
		mod: {
			maxHandcard(player, num) {
				return num + _getYitiCount(player);
			},
		},
	},

	fu_xinzang_skill: {
		trigger: { player: "dying" },
		filter(event, player) {
			return !player.storage.fu_xinzang_used;
		},
		async cost(event, trigger, player) {
			const maxRecover = Math.min(3, player.maxHp - player.hp);
			if (maxRecover <= 0) return false;
			const choices = [];
			for (let i = 1; i <= maxRecover; i++) {
				choices.push("恢复" + i + "点体力");
			}
			choices.push("cancel2");
			event.result = await player
				.chooseControl(choices)
				.set("prompt", "是否发动【副心脏】恢复体力？")
				.set("ai", () => choices.indexOf("恢复" + maxRecover + "点体力"))
				.forResult();
			return event.result.control !== "cancel2";
		},
		async content(event, trigger, player) {
			const choice = event.result.control;
			const recoverCount = parseInt(choice.match(/\d+/)?.[0]) || 1;
			await player.recover(recoverCount);
			player.storage.fu_xinzang_used = true;
		},
	},

	huoxue_beng_skill: {
		group: ["huoxue_beng_jiu", "huoxue_beng_tao"],
		subSkill: {
			jiu: {
				enable: ["chooseToUse", "chooseToRespond"],
				filterCard: { name: "tao" },
				viewAs: { name: "jiu" },
				viewAsFilter(player) {
					return player.countCards("hs", "tao") > 0;
				},
				position: "hs",
				prompt: "将一张桃当酒使用或打出，然后摸一张牌",
				check() { return 1; },
				ai: {
					order() { return get.order({ name: "jiu" }); },
					respondSha: true,
				},
			},
			tao: {
				enable: ["chooseToUse", "chooseToRespond"],
				filterCard: { name: "jiu" },
				viewAs: { name: "tao" },
				viewAsFilter(player) {
					return player.countCards("hs", "jiu") > 0;
				},
				position: "hs",
				prompt: "将一张酒当桃使用或打出，然后摸一张牌",
				check() { return 1; },
				ai: {
					order() { return get.order({ name: "tao" }); },
				},
			},
		},
		trigger: { player: ["useCardAfter", "respondAfter"] },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.card && (event.card.name === "jiu" || event.card.name === "tao") && event.skill === "huoxue_beng_skill";
		},
		async content(event, trigger, player) {
			player.draw();
		},
	},

	pixia_hujia_skill: {
		locked: true,
		forced: true,
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return !player.hujia;
		},
		async content(event, trigger, player) {
			await player.changeHujia(1);
		},
	},

	tengtong_bianjiqi_skill: {
		trigger: { player: "damageEnd" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("是否发动【疼痛编辑器】判定？若为黑色则获得1点护甲。")
				.set("ai", () => player.hujia < 3)
				.forResult();
		},
		async content(event, trigger, player) {
			const judgeEvent = player.judge(card => {
				if (get.color(card) === "black") return 2;
				return -2;
			});
			judgeEvent.judge2 = result => result.bool;
			const result = await judgeEvent.forResult();
			if (result.bool) {
				await player.changeHujia(1);
			}
		},
	},

	tengtong_zhihuan_skill: {
		locked: true,
		forced: true,
		trigger: { player: ["damageBegin", "changeHp"] },
		filter(event, player) {
			if (event.name === "changeHp") return event.num < 0;
			return event.num > 0;
		},
		async content(event, trigger, player) {
			let num = Math.abs(trigger.num || 0);
			if (num <= 0) return;
			if (trigger.name === "changeHp") {
				trigger.num = 0;
				trigger.changeToZero();
			} else {
				trigger.cancel();
			}
			player.storage.tengtong_zhihuan_pending = (player.storage.tengtong_zhihuan_pending || 0) + num;
			game.log(player, "【疼痛置换】累计延迟" + player.storage.tengtong_zhihuan_pending + "点体力扣减");
			player.addTempSkill("tengtong_zhihuan_apply");
		},
	},

	tengtong_zhihuan_apply: {
		charlotte: true,
		trigger: { global: "phaseJieshuBegin" },
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			const deferred = player.storage.tengtong_zhihuan_deferred || 0;
			const pending = player.storage.tengtong_zhihuan_pending || 0;
			if (deferred > 0) {
				game.log(player, "【疼痛置换】延迟生效，失去" + deferred + "点体力");
				await player.loseHp(deferred);
			}
			player.storage.tengtong_zhihuan_deferred = pending;
			player.storage.tengtong_zhihuan_pending = 0;
			if (!pending) {
				player.removeTempSkill("tengtong_zhihuan_apply");
			}
		},
	},

	guangxue_micai_skill: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return !player.isTurnedOver();
		},
		async content(event, trigger, player) {
			await player.turnOver();
			player.addTempSkill("guangxue_micai_stealth", { player: "turnOver" });
		},
	},

	guangxue_micai_stealth: {
		charlotte: true,
		mod: {
			targetEnabled(card, player, target) {
				if (target.isTurnedOver()) return false;
			},
		},
	},

	zhimi_gusui_skill: {
		locked: true,
		forced: true,
		init(player) {
			if (!player.storage.zhimi_gusui_init) {
				player.storage.zhimi_gusui_init = true;
				player.changeHujia(1);
			}
		},
		onremove(player) {
			delete player.storage.zhimi_gusui_init;
		},
		trigger: { player: "useCardToPlayered" },
		filter(event, player) {
			return event.card.name === "sha" && !event.getParent().directHit.includes(event.target) && event.target.countCards("he") > 0;
		},
		async content(event, trigger, player) {
			const target = trigger.target;
			const result = await target
				.chooseToDiscard("he", `致密骨髓：请弃置一张牌，否则无法响应${get.translation(player)}的杀`)
				.set("ai", card => {
					if (target.hp <= 1) return 10 - get.value(card);
					return 8 - get.value(card);
				})
				.forResult();
			if (!result.bool) {
				trigger.getParent().directHit.add(target);
				game.log(target, "未弃置牌，无法响应杀");
			}
		},
	},

	fangsheng_guanjie_skill: {
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard: true,
		selectCard: 2,
		position: "hs",
		viewAs: {
			name: "unsure",
			storage: {},
		},
		viewAsFilter(player) {
			return player.countCards("hs") >= 2;
		},
		prompt: "将两张手牌当杀或闪使用或打出",
		async filter(event, player) {
			const func = () => player.countCards("hs") >= 2;
			return func();
		},
		async cost(event, trigger, player) {
			if (event.name !== "chooseToUse" && event.name !== "chooseToRespond") return;
			let choices = [];
			if (event.name === "chooseToRespond") {
				if (event.respondSkill?.viewAs?.name === "shan") choices.push("闪");
			} else {
				if (lib.filter.cardUsable(get.autoViewAs({ name: "sha" }), player, event)) choices.push("杀");
			}
			choices.push("闪");
			choices.push("cancel2");
			event.result = await player
				.chooseControl(choices)
				.set("prompt", "仿生关节：请选择当做什么牌使用")
				.set("ai", () => choices.includes("杀") ? choices.indexOf("杀") : choices.indexOf("闪"))
				.forResult();
		},
		onUse(result, player) {
			return {
				name: result.control === "杀" ? "sha" : "shan",
			};
		},
		check(card) {
			return 6 - get.value(card);
		},
		ai: {
			order() {
				if (_status.event.name === "chooseToRespond") {
					return get.order({ name: "shan" });
				}
				return get.order({ name: "sha" }) * 0.6;
			},
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "respondSha" && player.countCards("hs") >= 2) return true;
				if (tag === "respondShan" && player.countCards("hs") >= 2) return true;
				return false;
			},
		},
	},

	shengwu_suliao_xueguan_skill: {
		locked: true,
		forced: true,
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return player.countCards("h") < player.hp;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},

	neicun_peiping_skill: {
		trigger: { player: "loseAfter" },
		firstDo: true,
		round: 1,
		filter(event, player) {
			return !player.countCards("h") && event.hs && event.hs.length > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("是否发动【内存配平】摸两张牌？")
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
		},
	},

	zhineng_sharuan_skill: {
		enable: "chooseToUse",
		filterCard() {
			return false;
		},
		selectCard: -1,
		round: 1,
		viewAs: { name: "wuxie" },
		viewAsFilter(player) {
			return true;
		},
		prompt: "每轮限一次，视为使用一张无懈可击",
		ai: {
			order: 5,
			expose: 0.2,
		},
	},

	tezheng_tongbu_lianban_skill: {
		trigger: { global: "judge" },
		filter(event, player) {
			return player.countCards("hs") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard(`${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt("tezheng_tongbu_lianban_skill")}`, "hs", card => {
					const mod = game.checkMod(card, player, "unchanged", "cardEnabled2", player);
					if (mod !== "unchanged") return mod;
					return true;
				})
				.set("ai", card => {
					const trigger = get.event().getTrigger();
					const judging = trigger.player.judging[0];
					const result = trigger.judge(card) - trigger.judge(judging);
					const att = get.attitude(player, trigger.player);
					if (att > 0) return result - get.value(card) / 4;
					return -result - get.value(card) / 4;
				})
				.setHiddenSkill("tezheng_tongbu_lianban_skill")
				.forResult();
		},
		popup: false,
		async content(event, trigger, player) {
			const next = player.respond(event.cards, "tezheng_tongbu_lianban_skill", "highlight", "noOrdering");
			await next;
			const { cards } = next;
			if (cards?.length) {
				if (trigger.player.judging[0].clone) {
					trigger.player.judging[0].clone.classList.remove("thrownhighlight");
					game.broadcast(card => { if (card.clone) card.clone.classList.remove("thrownhighlight"); }, trigger.player.judging[0]);
					game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
				}
				await game.cardsDiscard(trigger.player.judging[0]);
				trigger.player.judging[0] = cards[0];
				trigger.orderingCards.addArray(cards);
				game.log(trigger.player, "的判定牌改为", cards);
				await game.delay(2);
			}
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
		},
	},
};

export default skill;
