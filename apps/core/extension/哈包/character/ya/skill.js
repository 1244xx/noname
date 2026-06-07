import { lib, game, ui, get, ai, _status } from "../../main/utils.js";

/** @type { importCharacterConfig['skill'] } */
const skill = {
	// ==================== 花切 - 锁定技 ====================
	huaqie: {
		audio: 2,
		forced: true,
		locked: true,
		mod: {
			ignoredHandcard(card, player) {
				if (get.type(card, "trick") === "trick") return true;
			},
			cardDiscardable(card, player, name) {
				if (name === "phaseDiscard" && get.type(card, "trick") === "trick") return false;
			},
		},
		trigger: {
			player: "useCardAfter",
		},
		filter(event, player) {
			if (!event.card) return false;
			const type = get.type(event.card, "trick");
			return type === "basic" || type === "equip";
		},
		async content(event, trigger, player) {
			const type = get.type(trigger.card, "trick");
			if (type === "basic") {
				// 使用基本牌后：选择一张手牌，将其变为随机锦囊牌
				if (player.countCards("h") === 0) return;
				player.logSkill("huaqie");
				const result = await player.chooseCard("h", true, "花切：请选择一张手牌变为随机锦囊牌")
					.set("ai", card => 6 - get.value(card))
					.forResult();
				if (!result.bool || !result.cards?.length) return;
				// 丢弃选中的手牌
				await player.discard(result.cards);
				// 先随机决定锦囊牌名（等概率），再从牌堆获取对应牌的实体
				const trickNames = lib.inpile.filter(name => get.type(name, "trick") === "trick");
				if (trickNames.length === 0) return;
				const chosenName = trickNames.randomGet();
				const trickCard = get.cardPile(card => get.name(card) === chosenName, "random");
				if (trickCard) {
					await player.gain(trickCard, "draw");
					game.log(player, "将一张手牌变为", trickCard);
				}
			} else if (type === "equip") {
				// 使用装备牌后：从牌堆随机获得一张锦囊牌
				player.logSkill("huaqie");
				const trickCard = get.cardPile(card => get.type(card, "trick") === "trick", "random");
				if (trickCard) {
					await player.gain(trickCard, "draw");
					game.log(player, "从牌堆获得了", trickCard);
				}
			}
		},
		ai: {
			threaten: 1.2,
		},
	},

	// ==================== 巧手 ====================
	qiaoshou: {
		audio: 2,
		mark: true,
		intro: {
			content(storage, player) {
				let str = "";
				str += player.storage.qiaoshou_judge_round ? "效果一：<span style=\"color:#888\">已发动</span>" : "效果一：<span style=\"color:#0c0\">可发动</span>";
				str += "<br/>";
				str += player.storage.qiaoshou_view_round ? "效果二：<span style=\"color:#888\">已发动</span>" : "效果二：<span style=\"color:#0c0\">可发动</span>";
				str += "<br/>";
				str += player.storage.qiaoshou_shan_round ? "效果三：<span style=\"color:#888\">已发动</span>" : "效果三：<span style=\"color:#0c0\">可发动</span>";
				return str;
			},
		},
		group: ["qiaoshou_judge", "qiaoshou_view", "qiaoshou_shan", "qiaoshou_reset"],
	},

	// 巧手：每轮重置标记
	qiaoshou_reset: {
		trigger: { global: "roundStart" },
		silent: true,
		content() {
			const player = this.player;
			delete player.storage.qiaoshou_judge_round;
			delete player.storage.qiaoshou_view_round;
			delete player.storage.qiaoshou_shan_round;
		},
	},

	// 巧手效果1：判定牌生效前，使用场上所有区域的一张牌代替之
	qiaoshou_judge: {
		audio: 2,
		trigger: { global: "judge" },
		filter(event, player) {
			if (player.storage.qiaoshou_judge_round) return false;
			return game.hasPlayer(current => current.countCards("hej") > 0);
		},
		async cost(event, trigger, player) {
			const targetResult = await player
				.chooseTarget(`巧手：请选择一名角色，使用其区域的一张牌代替${get.translation(trigger.player)}的判定牌`)
				.set("filterTarget", (card, p, target) => target.countCards("hej") > 0)
				.set("ai", target => {
					const att = get.attitude(player, target);
					const triggerPlayer = get.event().getTrigger().player;
					if (att > 0) return att / get.attitude(player, triggerPlayer);
					return -att * get.attitude(player, triggerPlayer);
				})
				.forResult();
			if (!targetResult.bool || !targetResult.targets?.length) {
				event.result = { bool: false };
				return;
			}
			const target = targetResult.targets[0];
			const cardResult = await player
				.choosePlayerCard(target, "hej")
				.set("prompt2", `巧手：请选择${get.translation(target)}区域的一张牌代替判定牌`)
				.set("ai", card => {
					const trigger = get.event().getTrigger();
					const triggerPlayer = trigger.player;
					const result = trigger.judge(card) - trigger.judge(triggerPlayer.judging[0]);
					const attitude = get.attitude(player, triggerPlayer);
					if (attitude == 0 || result == 0) return 0;
					if (attitude > 0) return result;
					return -result;
				})
				.forResult();
			if (!cardResult.bool || !cardResult.cards?.length) {
				event.result = { bool: false };
				return;
			}
			event.result = {
				bool: true,
				cost_data: { card: cardResult.cards[0] },
			};
		},
		popup: false,
		async content(event, trigger, player) {
			player.storage.qiaoshou_judge_round = true;
			const { card } = event.cost_data;
			player.logSkill("qiaoshou_judge");
			const next = game.cardsGotoOrdering(card);
			next.relatedEvent = trigger;
			await next;
			player.$throw(card);
			if (trigger.player.judging[0].clone) {
				trigger.player.judging[0].clone.classList.remove("thrownhighlight");
				game.broadcast(function (c) {
					if (c.clone) c.clone.classList.remove("thrownhighlight");
				}, trigger.player.judging[0]);
				game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
			}
			await game.cardsDiscard(trigger.player.judging[0]);
			trigger.player.judging[0] = card;
			trigger.orderingCards.add(card);
			game.log(trigger.player, "的判定牌被", player, "改为", card);
			await game.delay(2);
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
		},
	},

	// 巧手效果2：其他角色出牌阶段开始时，查看其所有区域的牌并调换一张
	qiaoshou_view: {
		audio: 2,
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			if (player.storage.qiaoshou_view_round) return false;
			return event.player !== player && event.player.countCards("hej") > 0 && player.countCards("h", card => get.type(card, "trick") === "trick") > 0;
		},
		async cost(event, trigger, player) {
			const target = trigger.player;
			event.result = await player
				.chooseBool(`巧手：是否查看${get.translation(target)}所有区域的牌？`)
				.set("ai", () => get.attitude(player, target) < 0)
				.forResult();
		},
		async content(event, trigger, player) {
			player.storage.qiaoshou_view_round = true;
			const target = trigger.player;
			player.logSkill("qiaoshou_view", target);
			if (target.countCards("h") > 0) {
				await player.viewHandcards(target);
			}
			if (!player.countCards("h", card => get.type(card, "trick") === "trick")) return;
			
			const selfResult = await player
				.chooseCard("h", `巧手：请选择一张锦囊牌与${get.translation(target)}调换`)
				.set("filterCard", card => get.type(card, "trick") === "trick")
				.set("ai", card => {
					const att = get.attitude(player, target);
					if (att > 0) return 0;
					return 6 - get.value(card);
				})
				.forResult();
			if (!selfResult.bool || !selfResult.cards?.length) return;
			const selfCard = selfResult.cards[0];
			
			const targetResult = await player
				.choosePlayerCard(target, "hej", "visible")
				.set("prompt2", `巧手：请选择${get.translation(target)}区域的一张牌进行调换`)
				.set("ai", card => {
					if (!card || !get.info(card)) return 0;
					const att = get.attitude(player, target);
					if (att > 0) return 0;
					return get.value(card);
				})
				.forResult();
			if (!targetResult.bool || !targetResult.cards?.length) return;
			const targetCard = targetResult.cards[0];
			
			const targetOwner = get.owner(targetCard);
			await player.lose(selfCard, "visible");
			if (targetOwner === target) {
				await target.lose(targetCard, "visible");
			} else {
				await game.cardsDiscard(targetCard);
			}
			await game.delay(1);
			await target.gain(selfCard, "give");
			await player.gain(targetCard, "gain2");
			game.log(player, "用", selfCard, "与", target, "的", targetCard, "进行了调换");
		},
	},

	// 巧手效果3：将一张装备牌或锦囊牌当作闪使用或打出，并摸一张牌
	qiaoshou_shan: {
		audio: 2,
		enable: ["chooseToRespond", "chooseToUse"],
		filterCard(card) {
			const type = get.type(card);
			return type === "trick" || type === "equip";
		},
		viewAs: { name: "shan" },
		viewAsFilter(player) {
			if (player.storage.qiaoshou_shan_round) return false;
			return player.countCards("hes", card => {
				const type = get.type(card);
				return type === "trick" || type === "equip";
			}) > 0;
		},
		position: "hes",
		prompt: "巧手：将一张装备牌或锦囊牌当作闪使用或打出",
		check(card) {
			const type = get.type(card);
			if (type === "trick") return 6 - get.value(card);
			if (type === "equip" && get.subtype(card) !== "equip1") return 5 - get.value(card);
			return 4 - get.value(card);
		},
		group: "qiaoshou_shan_draw",
		ai: {
			respondShan: true,
			skillTagFilter(player, tag, arg) {
				if (player.storage.qiaoshou_shan_round) return false;
				if (player.countCards("hes", card => {
					const type = get.type(card);
					return type === "trick" || type === "equip";
				}) === 0) return false;
			},
			order: 4.5,
			useful: 1,
			value: 1,
			basic: {
				useful: 3.5,
				value: 3.5,
			},
			result: {
				player: 1,
			},
		},
	},
	qiaoshou_shan_draw: {
		trigger: {
			player: ["useCardAfter", "respondAfter"],
		},
		filter(event, player) {
			return event.skill === "qiaoshou_shan";
		},
		async content(event, trigger, player) {
			player.storage.qiaoshou_shan_round = true;
			player.logSkill("qiaoshou_shan");
			await player.draw();
		},
	},

	// ==================== 幻变 ====================
	huanbian: {
		audio: 2,
		group: ["huanbian_choose", "huanbian_trigger"],
	},

	// 幻变：游戏开始时暗定目标
	huanbian_choose: {
		audio: 2,
		trigger: { global: "gameStart" },
		forced: true,
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget(true, "幻变：请暗定一名角色")
				.set("ai", target => {
					if (target === player) return 2;
					const att = get.attitude(player, target);
					if (att < 0) return -att;
					return 0.5;
				})
				.forResult();
			if (result.bool && result.targets?.length) {
				player.storage.huanbian = result.targets[0];
				player.logSkill("huanbian_choose");
			}
		},
	},

	// 幻变：第三轮开始时触发变身
	huanbian_trigger: {
		audio: 2,
		forced: true,
		trigger: { global: "roundStart" },
		filter(event, player) {
			if (game.roundNumber < 3) return false;
			if (player.storage.huanbian_done) return false;
			return true;
		},
		async content(event, trigger, player) {
			player.storage.huanbian_done = true;
			let target = player.storage.huanbian;
			if (!target) return;
			
			const needReviveTarget = player.isAlive() && target.isDead();
			const needReviveSelf = player.isDead() && target === player;
			
			if (needReviveTarget) {
				await target.revive(1, true);
				game.log(target, "因", player, "的【幻变】复活");
				target = player.storage.huanbian;
			} else if (needReviveSelf) {
				await player.revive(1, true);
				game.log(player, "因【幻变】复活");
			}
			
			if (!target.isAlive() || !target.isIn()) return;
			
			player.logSkill("huanbian_trigger", target);
			
			const allCards = target.getCards("hej");
			if (allCards.length > 0) {
				await target.discard(allCards);
			}
			
			// 清除目标所有状态：标记、存储、技能
			for (const mark of Object.keys(target.marks)) {
				target.unmarkSkill(mark);
			}
			target.storage = {};
			for (const skill of [...target.skills]) {
				target.removeSkill(skill);
			}
			
			const allCharacters = Object.keys(lib.character).filter(name => {
				const info = lib.character[name];
				if (!info || typeof info !== "object") return false;
				if (game.hasPlayer(p => p.name === name || p.name1 === name || p.name2 === name)) return false;
				if (info.isBoss || info.isUnseen || info.group === "shen") return false;
				return true;
			});
			
			if (allCharacters.length === 0) return;
			
			const newChar = allCharacters.randomGet();
			const newInfo = lib.character[newChar];
			const oldName = target.name;
			
			await target.reinit(oldName, newChar, null, true);
			
			// 手动添加新技能
			if (newInfo.skills) {
				for (const s of newInfo.skills) target.addSkill(s);
			}
			
			const newMaxHp = newInfo.hp || 3;
			const newHp = Math.ceil(newMaxHp / 2);
			target.maxHp = newMaxHp;
			target.hp = Math.min(newHp, newMaxHp);
			target.update();
			
			await target.draw(3);
			
			game.log(target, "因", player, "的【幻变】变为了", get.translation(newChar));
		},
		ai: {
			order: 10,
			result: { player: 3 },
		},
	},
};

export default skill;
