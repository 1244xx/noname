import { lib, game, ui, get, ai, _status } from "../../main/utils.js";

/** @type { importCharacterConfig['skill'] } */
const skill = {
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
					const matchCount = target.countCards("h", c => get.suit(c, target) === suit);
					return matchCount - 3 - get.value(card) / 6;
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

	huaibu_jiagu_skill: {
		mod: {
			globalFrom(from, to, distance) {
				const mode = from.storage.huaibu_jiagu_mode;
				if (mode === 3) return distance - 2;
			},
			globalTo(from, to, distance) {
				const mode = to.storage.huaibu_jiagu_mode;
				if (mode === 2) return distance + 2;
			},
		},
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("he") >= 2;
		},
		filterCard: true,
		selectCard: 2,
		position: "he",
		discard: false,
		lose: false,
		async content(event, trigger, player) {
			const currentMode = player.storage.huaibu_jiagu_mode;
			const result = await player
				.chooseControl(["mode3", "mode2", "cancel2"])
				.set("prompt", `踝部加固：请选择距离模式（当前${currentMode === 3 ? "-3" : currentMode === 2 ? "-1和+2" : "-1"}）`)
				.set("choiceList", ["-3（你计算与其他角色距离-3）", "-1和+2（你计算与其他角色距离-1，其他角色计算与你距离+2）"])
				.set("ai", () => {
					// 有多个敌人在近距离时用mode3进攻，否则用mode2防守
					const enemyCount = game.countPlayer(current => get.attitude(player, current) < 0 && get.distance(player, current) <= 2);
					if (enemyCount >= 2) return "mode3";
					return currentMode === 3 ? "mode2" : "mode3";
				})
				.forResult();
			if (result.control === "cancel2") return;
			if (result.control === "mode3") {
				player.storage.huaibu_jiagu_mode = 3;
			} else {
				player.storage.huaibu_jiagu_mode = 2;
			}
			game.log(player, "发动了【踝部加固】，距离模式变为" + (result.control === "mode3" ? "-3" : "-1和+2"));
		},
	},

	qianghua_jijian_skill: {
		enable: ["chooseToUse", "chooseToRespond"],
		filterCard(card) {
			return get.suit(card) === "club";
		},
		viewAs: { name: "shan" },
		viewAsFilter(player) {
			if (!player.countCards("hs", { suit: "club" })) return false;
		},
		position: "hs",
		prompt: "将一张♣牌当闪使用或打出",
		check() { return 1; },
		ai: {
			order: 3,
			respondShan: true,
			skillTagFilter(player) {
				return player.countCards("hs", { suit: "club" }) > 0;
			},
		},
	},

	fanying_tiaoxieqi_skill: {
		trigger: { player: "chooseToRespondBegin" },
		ai: {
			maixie: true,
		},
		filter(event, player) {
			if (player.hp >= 2) return false;
			return event.respondName === "shan" || event.respondSkill?.viewAs?.name === "shan";
		},
		check(event, player) {
			return get.damageEffect(player, event.source, player) < 0;
		},
		async content(event, trigger, player) {
			const judgeEvent = player.judge(card => {
				if (get.color(card) === "red") return 2;
				return -2;
			});
			judgeEvent.judge2 = result => result.bool;
			const result = await judgeEvent.forResult();
			if (result.bool) {
				trigger.result = {
					bool: true,
					card: get.autoViewAs({ name: "shan" }),
					cards: [],
				};
				trigger.responded = true;
				trigger.untrigger = true;
				game.log(player, "发动了【反应调谐器】，视为使用了一张闪");
			}
		},
	},

	kelunqikefu_skill: {
		trigger: { player: ["useCardAfter", "respondAfter"] },
		filter(event, player) {
			if (!event.card || event.card.name !== "shan") return false;
			return player.canUse("sha");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("是否发动【克伦齐科夫】使用一张杀？")
				.set("ai", () => game.hasPlayer(current => {
					return get.attitude(player, current) < 0 && player.canUse("sha", current);
				}))
				.forResult();
		},
		async content(event, trigger, player) {
			await player
				.chooseToUse(function (card) {
					return card.name === "sha";
				}, "克伦齐科夫：请使用一张杀")
				.forResult();
		},
	},

	tuchu_jiasuqi_skill: {
		trigger: { global: "phaseZhunbeiBegin" },
		filter(event, player) {
			return event.player !== player && event.player.isIn();
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			if (!player.canUse("sha", target)) return false;
			event.result = await player
				.chooseBool(`是否发动【突触加速器】对${get.translation(target)}使用一张杀？`)
				.set("ai", () => get.attitude(player, target) < 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			await player
				.chooseToUse(function (card) {
					return card.name === "sha";
				}, `突触加速器：请对${get.translation(target)}使用一张杀`)
				.set("filterTarget", function (card, p, t) {
					return t === target;
				})
				.forResult();
		},
	},

	shenshangxiansu_zengqiangjian_skill: {
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.player && event.player.isIn() && get.distance(player, event.player) <= 1;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(`是否发动【肾上腺素增强件】判定？若为红色则回复1点体力。`)
				.set("ai", () => player.isDamaged())
				.forResult();
		},
		async content(event, trigger, player) {
			const judgeEvent = player.judge(card => {
				if (get.color(card) === "red") return 2;
				return -2;
			});
			judgeEvent.judge2 = result => result.bool;
			const result = await judgeEvent.forResult();
			if (result.bool) {
				await player.recover();
			}
		},
	},
};

export default skill;
