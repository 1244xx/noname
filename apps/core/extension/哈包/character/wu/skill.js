import { lib, game, ui, get, ai, _status } from "../../main/utils.js";
import { getYitiList, getYitiBySubtype, STORAGE_KEY, getAllYitiCards } from "../../card/yiti_skill.js";

/** @type { importCharacterConfig['skill'] } */
const skill = {
	// 威压 - 锁定技，包含两个效果
	weiya: {
		audio: 2,
		forced: true,
		locked: true,
		group: ["weiya_defense", "weiya_offense"],
	},
	// 子技能：防御效果 - 成为杀或延时锦囊目标时触发
	weiya_defense: {
		forced: true,
		locked: true,
		trigger: {
			target: "useCardToTarget",
		},
		filter(event, player) {
			// 必须是其他角色对威基使用的牌
			if (event.player === player) return false;
			
			const card = event.card;
			// 检查是否是杀或延时锦囊
			if (card.name === "sha") return true;
			// 延时锦囊包括：乐不思蜀、兵粮寸断、闪电
			if (get.type(event.card) == "delay") return true;
			
			return false;
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const source = trigger.player;
			player.logSkill("weiya", source);
			
			// 检查来源是否有杀或锦囊牌可以交出
			const hasRequiredCards = source.countCards("h", card => {
				return card.name === "sha" || 
						get.type(card) == "trick" || 
						get.type(card) == "delay";
			}) > 0;
			
			let giveSuccess = false;
			
			if (hasRequiredCards) {
				// 让来源选择一张杀或锦囊牌交给威基
				const result = await source.chooseToGive(
					player,
					"he",
					card => {
						return card.name === "sha" || 
								get.type(card) == "trick" || 
								get.type(card) == "delay";
					},
					"请选择一张杀或锦囊牌交给" + get.translation(player)
				).set("ai", card => {
					// 敌方交出最低价值牌
					return 6 - get.value(card);
				}).forResult();
				if (result?.bool) {
					giveSuccess = true;
				};
			}
			
			// 如果没有交出牌，则此牌对威基无效
			if (!giveSuccess) {
				trigger.getParent().targets.remove(player);
				game.log(trigger.card, "对", player, "无效");
			}
		},
		ai: {
			threaten(player, target) {
				// 对敌人威胁度评估
				if (get.attitude(player, target) < 0) {
					return 1.8; // 高威胁
				}
				return 0.5;
			}
		}
	},
	// 子技能：进攻效果 - 使用杀或锦囊指定目标时触发
	weiya_offense: {
		forced: true,
		locked: true,
		trigger: {
			player: "useCard",
		},
		filter(event, player) {
			// 必须是对其他角色使用的牌
			if (player === event.target) return false;
			const card = event.card;
			// 检查威基是否使用了杀或锦囊牌
			if (event.player !== player) return false;
			if (card.name === "sha") return true;
			if (get.type(card) == "trick") return true;
			
			return false;
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const targets = trigger.targets.filter(target => target !== player);
			
			if (targets.length === 0) return;
			
			for (const target of targets) {
				// 检查目标是否有牌可以交出
				if (target.countCards("he") > 0) {
					// 让目标选择一张牌交给威基
					const result = await target.chooseToGive(
						player,
						"he",
						1,
						"请选择一张牌交给" + get.translation(player)
					).set("ai", card => {
						// 敌方交出最低价值牌
						return 6 - get.value(card);
					}).forResult();
					
					if (!result?.bool) {
						// 如果没有交出牌，则此杀不可被响应，锦囊不可被无懈可击
						if (trigger.card.name === "sha") {
							trigger.directHit.add(target);
							game.log(trigger.card, "对", target, "不可被响应");
						} else if (get.type(trigger.card) == "trick") {
							trigger.nowuxie = true;
							game.log(trigger.card, "不可被无懈可击");
						}
					}
				}
			}
		},
		ai: {
			order: 7,
			result: {
				player: 1.5,
			}
		}
	},

	zhizi: {
		audio: 2,
		forced: true,
		locked: true,
		trigger: { global: "useCard" },
		filter(event, player) {
			return event.card && get.type(event.card, "trick") === "trick";
		},
		async content(event, trigger, player) {
			const user = trigger.player;
			player.logSkill("zhizi", user);
			const judgeEvent = user.judge(card => {
				if (get.suit(card) === "diamond") return -2;
				return 2;
			});
			judgeEvent.judge2 = result => result.bool;
			const result = await judgeEvent.forResult();
			if (result && !result.bool) {
				game.log(player, "发动了智子，", trigger.card, "被无效了");
				trigger.cancel();
			}
		},
		ai: {
			threaten: 1.2,
		},
	},
	liebian: {
		audio: 2,
		trigger: { global: "judge" },
		filter(event, player) {
			return player.countCards("h") > 0 || player.getExpansions("liebian").length > 0;
		},
		async cost(event, trigger, player) {
			const heCards = player.getExpansions("liebian").sort((a, b) => get.number(a) - get.number(b));
			const hasHand = player.countCards("h") > 0;
			const hasHe = heCards.length > 0;
			const choices = [];
			if (hasHand) choices.push("手牌");
			if (hasHe) choices.push("核");
			if (choices.length === 0) {
				event.result = { bool: false };
				return;
			}
			choices.push("取消");
			const controlResult = await player.chooseControl(choices)
				.set("prompt", "裂变：请选择用来代替判定牌的牌")
				.set("ai", () => {
					const judgeTarget = trigger.player;
					const att = get.attitude(player, judgeTarget);
					if (att > 0 && hasHe) return "核";
					if (hasHand) return "手牌";
					return "取消";
				}).forResult();
			if (!controlResult || controlResult.control === "取消") {
				event.result = { bool: false };
				return;
			}
			if (controlResult.control === "手牌") {
				const cardResult = await player.chooseCard("h", "裂变：请选择一张手牌代替判定牌")
					.set("ai", card => {
						const trigger = _status.event.getTrigger();
						const judgeTarget = trigger.player;
						const att = get.attitude(player, judgeTarget);
						if (att > 0) {
							const suit = get.suit(card);
							if (suit === "diamond") return 10;
							if (suit === "heart") return 8;
						} else {
							const suit = get.suit(card);
							if (suit === "spade" || suit === "club") return 10;
						}
						return 6 - get.value(card);
					}).forResult();
				event.result = {
					bool: cardResult.bool,
					cost_data: { type: "hand", cards: cardResult.cards },
				};
			} else {
				const buttonResult = await player.chooseButton(["裂变：请选择一个核代替判定牌", heCards], [1, 1])
					.set("ai", button => {
						const trigger = _status.event.getTrigger();
						const judgeTarget = trigger.player;
						const att = get.attitude(player, judgeTarget);
						const card = button.link;
						if (att > 0) {
							const suit = get.suit(card);
							if (suit === "diamond") return 10;
							if (suit === "heart") return 8;
						} else {
							const suit = get.suit(card);
							if (suit === "spade" || suit === "club") return 10;
						}
						return get.value(card);
					}).forResult();
				event.result = {
					bool: buttonResult.bool,
					cost_data: { type: "he", cards: buttonResult.links },
				};
			}
		},
		async content(event, trigger, player) {
			const { type, cards } = event.cost_data;
			const newCard = cards[0];
			const originalCard = trigger.player.judging[0];
			player.logSkill("liebian", trigger.player);
			if (trigger.player.judging[0].clone) {
				trigger.player.judging[0].clone.delete();
				game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
			}
			if (type === "hand") {
				await player.respond(cards, "highlight", "noOrdering");
			} else {
				await player.loseToDiscardpile([newCard]);
			}
			const next = player.addToExpansion(originalCard, player, "give");
			next.gaintag.add("liebian");
			await next;
			trigger.player.judging[0] = newCard;
			trigger.orderingCards.addArray([newCard]);
			game.log(player, "发动裂变，将", trigger.player, "的判定牌改为", newCard);
			await game.delay(2);
			const heCount = player.getExpansions("liebian").length;
			if ([4, 8, 12].includes(heCount)) {
				if (!player.storage.liebian_milestones) {
					player.storage.liebian_milestones = {};
				}
				if (!player.storage.liebian_milestones[heCount]) {
					player.storage.liebian_milestones[heCount] = true;
					player.popup("裂变");
					await player.draw(2);
				}
			}
		},
		marktext: "核",
		intro: {
			markcount: "expansion",
			mark(dialog, storage, player) {
				const cards = player.getExpansions("liebian");
				if (cards.length) {
					cards.sort((a, b) => get.number(a) - get.number(b));
					dialog.addSmall(cards);
				} else {
					return "暂无核";
				}
			},
			content(storage, player) {
				const cards = player.getExpansions("liebian");
				const points = new Set(cards.map(c => get.number(c)).filter(n => typeof n === "number"));
				return "已集" + points.size + "种点数，共" + cards.length + "个核";
			},
		},
		onremove(player) {
			const cards = player.getExpansions("liebian");
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
			delete player.storage.liebian_milestones;
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
			result: {
				player: 1,
			},
		},
	},
	manha: {
		audio: 2,
		enable: "phaseUse",
		filterTarget(card, player, target) {
			return true;
		},
		selectTarget: 1,
		filter(event, player) {
			if (player.storage.manha_used) return false;
			const heCards = player.getExpansions("liebian");
			const points = new Set(heCards.map(c => get.number(c)).filter(n => typeof n === "number"));
			return points.size >= 13;
		},
		async content(event, trigger, player) {
			player.storage.manha_used = true;
			const target = event.targets[0];
			player.logSkill("manha", target);
			const heCards = player.getExpansions("liebian");
			const pointMap = {};
			const cardsToRemove = [];
			for (const card of heCards) {
				const num = get.number(card);
				if (typeof num === "number" && !pointMap[num]) {
					pointMap[num] = true;
					cardsToRemove.push(card);
					if (cardsToRemove.length >= 13) break;
				}
			}
			if (cardsToRemove.length > 0) {
				player.loseToDiscardpile(cardsToRemove);
			}
			await target.loseHp(7);
			const allPlayers = game.filterPlayer(p => p.isIn());
			for (const p of allPlayers) {
				if (p.hujia > 0) {
					p.hujia = 0;
				}
			}
			for (const p of allPlayers) {
				await p.damage(1);
			}
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					return get.attitude(player, target) < 0 ? 10 : -10;
				},
			},
		},
	},

	fucong: {
		forced: true,
		locked: true,
		trigger: {
			global: ["phaseUseBegin", "phaseUseEnd", "loseAfter", "equipAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter", "damageAfter", "recoverAfter"],
		},
		filter(event, player) {
			const current = _status.currentPhase;
			if (!current || current === player) return false;
			if (event.name === "phaseUseBegin" || event.name === "phaseUseEnd") return true;
			if (!_status.event.getParent("phaseUse")) return false;
			let count = 0;
			if (current.countCards("h") > player.countCards("h")) count++;
			if (current.countCards("e") > player.countCards("e")) count++;
			if (current.hp > player.hp) count++;
			const meets = count >= 2 && current.countCards("h", "sha") > 0;
			return meets !== current.hasSkill("fucong_active");
		},
		async content(event, trigger, player) {
			const current = _status.currentPhase;
			if (trigger.name === "phaseUseEnd") {
				current.removeSkills("fucong_active");
				delete current.storage._fucong_used;
				return;
			}
			let count = 0;
			if (current.countCards("h") > player.countCards("h")) count++;
			if (current.countCards("e") > player.countCards("e")) count++;
			if (current.hp > player.hp) count++;
			const meets = count >= 2 && current.countCards("h", "sha") > 0;
			if (meets && trigger.name !== "phaseUseEnd") {
				current.addTempSkill("fucong_active", "phaseUseAfter");
			} else if (!meets && trigger.name !== "phaseUseBegin") {
				current.removeSkills("fucong_active");
			}
		},
		ai: {
			order: 6,
			result: { player: 0.5 },
		},
	},
	fucong_active: {
		enable: "phaseUse",
		filter(event, player) {
			return !player.storage._fucong_used && player.countCards("h", "sha") > 0;
		},
		async content(event, trigger, player) {
			player.storage._fucong_used = true;
			const baji = game.filterPlayer(p => p.hasSkill("fucong") && p.isIn())[0];
			if (!baji) return;
			const giveResult = await player.chooseToGive(baji, "h", "服从：请交给" + get.translation(baji) + "一张杀")
				.set("filterCard", card => card.name === "sha")
				.set("ai", card => {
					// 巴基队友交低价值杀，敌方不交
					if (get.attitude(player, baji) > 0) return 6 - get.value(card);
					return -1;
				})
				.forResult();
			if (!giveResult.bool) return;
			baji.logSkill("fucong", player);
			const targetResult = await player.chooseTarget("服从：请指定" + get.translation(baji) + "出杀的目标")
				.set("filterTarget", (card, cur, t) => t !== baji && baji.canUse({ name: "sha", isCard: true }, t, false))
				.set("ai", t => get.effect(t, { name: "sha" }, baji, baji))
				.forResult();
			if (targetResult.bool && targetResult.targets && targetResult.targets.length) {
				await baji.useCard({ name: "sha", isCard: true }, targetResult.targets, false);
			}
		},
		ai: {
			order: 5,
			result: {
				player(player) {
					const baji = game.filterPlayer(p => p.hasSkill("fucong") && p.isIn())[0];
					if (!baji) return 0;
					// 只有巴基的队友才值得给杀
					if (get.attitude(player, baji) > 0) return 1;
					return -1;
				},
			},
		},
	},
	xiaohui: {
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: 1,
		filterTarget(card, player, target) {
			return target !== player;
		},
		selectTarget: 1,
		position: "he",
		discard: false,
		lose: false,
		group: "xiaohui_block",
		subSkill: {
			block: {
				charlotte: true,
				trigger: { player: "phaseBegin" },
				silent: true,
				content() {
					player.removeSkill("xiaohui_block");
					delete player.storage._xiaohui_gave_to;
				},
				mod: {
					targetEnabled(card, player, target) {
						if (card && card.name === "sha" && player === target.storage._xiaohui_gave_to) return false;
					},
				},
			},
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.logSkill("xiaohui", target);
			const card = event.cards[0];
			await player.give(card, target);
			player.storage._xiaohui_gave_to = target;
			player.addSkill("xiaohui_block");
		},
		ai: {
			order: 5,
			result: {
				target(player, target) {
					// 小惠：给敌方交牌可封其杀，给队友交牌浪费
					const att = get.attitude(player, target);
					if (att < 0 && player.countCards("h", "sha") <= 1) return 1.5;
					if (att < 0) return 1;
					return 0;
				},
			},
		},
	},
	zhishi: {
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player;
		},
		selectTarget: 1,
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.logSkill("zhishi", target);
			const target2Result = await player.chooseTarget("指使：请指定一名" + get.translation(target) + "使用杀的目标（取消则结束技能）")
				.set("filterTarget", (card, p, t) => t !== target && target.canUse({ name: "sha", isCard: true }, t, false))
				.set("ai", t => get.effect(t, { name: "sha" }, target, target))
				.forResult();
			if (!target2Result.bool || !target2Result.targets || !target2Result.targets.length) return;
			const finalTarget = target2Result.targets[0];
			const confirm = await target.chooseBool("指使：" + get.translation(player) + "要求你对" + get.translation(finalTarget) + "使用一张杀并获得其一张牌，否则需交给" + get.translation(player) + "一张牌")
				.set("ai", () => get.effect(finalTarget, { name: "sha" }, target, target) > 0 ? 1 : 0)
				.forResult();
			if (confirm.bool) {
				const useResult = await target.chooseToUse({
					filterCard: (card) => get.name(card) === "sha" && lib.filter.cardEnabled(card, target, "forceEnable"),
					filterTarget: (card, p, t) => t === finalTarget,
					prompt: "指使：请对" + get.translation(finalTarget) + "使用一张杀",
					addCount: false,
				}).set("ai", () => 1).forResult();
				if (useResult?.bool && player.countCards("he") > 0) {
					await target.gainPlayerCard(player, "he", true);
				}
			} else {
				if (target.countCards("he") > 0) {
					await target.chooseToGive(player, "he", "指使：请交给" + get.translation(player) + "一张牌");
				}
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					return get.attitude(player, target) < 0 ? 1 : 0;
				},
			},
		},
	},

	fufeng: {
		audio: 2,
		forced: true,
		locked: true,
		trigger: { global: "useSkill" },
		filter(event, player) {
			if (event.skill !== "huaquan") return false;
			const hq = player.storage._huaquan_state;
			if (!hq || hq._fufeng_hooked) return false;
			return hq.target === player || event.player === player;
		},
		firstDo: true,
		async content(event, trigger, player) {
			const hq = player.storage._huaquan_state;
			if (!hq) return;
			hq._fufeng_hooked = true;
			if (!hq.onBeforeUse) hq.onBeforeUse = [];
			if (!hq.onResolve) hq.onResolve = [];

			const fufengOwner = player;

			hq.onBeforeUse.push(async (hq, hqInitiator, hqTarget) => {
				if (!fufengOwner.isIn()) return;
				const isInitiator = fufengOwner === hqInitiator;
				const myCard = isInitiator ? hq.playerCard : hq.targetCard;
				const oppCard = isInitiator ? hq.targetCard : hq.playerCard;
				const opponent = isInitiator ? hqTarget : hqInitiator;
				if (!myCard || !oppCard) return;
				const myType = get.type(myCard);
				if (myType !== "trick" && myType !== "equip") return;
				if (oppCard.name !== "sha") return;
				if (fufengOwner.canUse(myCard.name, opponent, false)) return;
				fufengOwner.logSkill("fufeng");
				hq._shaDisabled = true;
				game.log("浮风：", fufengOwner, "扣置的", myCard, "使", opponent, "的杀失效");
			});

			hq.onResolve.push(async (hq, hqInitiator, hqTarget) => {
				if (!fufengOwner.isIn()) return;
				const isInitiator = fufengOwner === hqInitiator;
				const opponent = isInitiator ? hqTarget : hqInitiator;
				const iUnusable = isInitiator ? hq._playerUnusable : hq._targetUnusable;
				const oppUnusable = isInitiator ? hq._targetUnusable : hq._playerUnusable;
				if (iUnusable && oppUnusable && !hq._fufeng_draw_done) {
					hq._fufeng_draw_done = true;
					fufengOwner.logSkill("fufeng");
					await fufengOwner.draw();
					if (opponent && opponent.isIn()) {
						await opponent.draw();
					}
					game.log("浮风：双方各摸一张牌");
				}
			});
		},
		ai: {
			order: 5,
			result: { player: 1 },
			threaten: 1.2,
		},
	},
	lunzhen: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player && target.countCards("h") >= player.countCards("h");
		},
		selectTarget: 1,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.logSkill("lunzhen", target);

			while (player.isIn() && target.isIn() && player.countCards("h") > 0 && target.countCards("h") > 0) {
				const hq = { target, cardsSet: [], damageBonus: false };
				player.storage._huaquan_state = hq;
				target.storage._huaquan_state = hq;
				await player.useSkill("huaquan", [target]);
				await game.delay(0);
			}
			if (player.isIn() && player.countCards("h") === 0) {
				game.log(player, "在论真划拳中手牌耗尽");
				await player.loseHp(1);
			}
			if (target.isIn() && target.countCards("h") === 0) {
				game.log(target, "在论真划拳中手牌耗尽");
				await target.loseHp(1);
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					const att = get.attitude(player, target);
					if (att < 0) {
						const handDiff = target.countCards("h") - player.countCards("h");
						return Math.min(3, 1 + handDiff * 0.5);
					}
					return -2;
				},
			},
		},
	},
	gefang: {
		audio: 2,
		zhuSkill: true,
		limited: true,
		trigger: { player: "phaseBegin" },
		filter(event, player) {
			return !player.storage.gefang_used;
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseBool("革放：是否改变全场摸牌规则，改为摸当前体力值数量的牌（最多为五）？")
				.set("ai", () => player.hp > 2)
				.forResult();
			event.result = { bool: result.bool };
		},
		async content(event, trigger, player) {
			player.storage.gefang_used = true;
			player.storage.gefang_active = true;
			player.logSkill("gefang");
		},
		group: ["gefang_effect"],
		subSkill: {
			effect: {
				zhuSkill: true,
				trigger: { global: "phaseDrawBegin1" },
				filter(event, player) {
					return !event.numFixed && player.storage.gefang_active;
				},
				forced: true,
				silent: true,
				async content(event, trigger, player) {
					trigger.num = Math.min(trigger.player.hp, 5);
				},
				ai: {
					order: 1,
					result: { player: 2 },
				},
			},
		},
		ai: {
			order: 10,
			result: { player: 2 },
		},
	},

	gehua: {
		enable: "phaseUse",
		filter(event, player) {
			if (player.countCards("h") < 2) return false;
			return player.hasEnabledSlot(1) || player.hasEnabledSlot(2) || player.hasEnabledSlot(5) || player.hasEnabledSlot("horse");
		},
		async content(event, trigger, player) {
			const { control: slot } = await player
				.chooseToDisable(true)
				.set("prompt", "铬化：请废除一种装备栏")
				.set("ai", function (event, player, list) {
					if (list.includes("equip2")) return "equip2";
					if (list.includes("equip5")) return "equip5";
					return list.randomGet();
				})
				.forResult();
			if (!slot) return;

			const discardResult = await player
				.chooseToDiscard("h", 2, "铬化：请弃置两张手牌", true)
				.forResult();
			if (!discardResult.bool) return;

			const allYiti = getAllYitiCards();
			const isMount = slot === "equip3_4";
			const matchingYiti = allYiti.filter(n => {
				const info = lib.card[n];
				const list = getYitiList(player);
				const match = isMount
					? (info.subtype === "equip3_4")
					: info.subtype === slot;
				return match && !list.some(i => i.subtype === info.subtype);
			});
			if (!matchingYiti.length) return;

			const yitiResult = await player
				.chooseButton(["铬化：请选择一件要装备的义体", [matchingYiti.map(n => [lib.card[n].cardcolor || "spade", lib.card[n].yitiNumber || 1, n]), "vcard"]], true)
				.set("ai", button => {
					const info = lib.card[button.link[2]];
					return info.ai?.basic?.equipValue || info.ai?.equipValue || 5;
				})
				.forResult();
			if (!yitiResult.bool || !yitiResult.links?.length) return;
			const yitiName = yitiResult.links[0][2];

			const cardDef = lib.card[yitiName];
			const subtype = cardDef.subtype;
			if (isMount) {
				await player.disableEquip(3, 4);
			} else {
				const num = parseInt(slot.slice(5));
				await player.disableEquip(num);
			}

			const skills = cardDef.skills ? cardDef.skills.slice() : [];
			const list = getYitiList(player);
			list.push({
				name: yitiName,
				subtype: subtype,
				suit: cardDef.cardcolor || "spade",
				number: cardDef.yitiNumber || 1,
				skills: skills,
			});
			player.storage[STORAGE_KEY] = list;

			if (skills.length) {
				player.addAdditionalSkill("_yiti_mark", skills, true);
			}

			player.markSkill("_yiti_mark");
		},
		ai: {
			order: 8,
			result: {
				player(player) {
					if (player.countCards("h") <= 2) return 0;
					return 1;
				},
			},
		},
	},
	chaoxian: {
		enable: "phaseUse",
		derivation: ["jieli"],
		filter(event, player) {
			let slotCount = 0;
			for (let i = 1; i <= 5; i++) {
				if (player.hasEnabledSlot(i)) slotCount++;
			}
			if (slotCount > 0) return false;
			if (player.countCards("he") < 1) return false;
			if (player.maxHp < 3) return false;
			const allYiti = getAllYitiCards();
			const list = getYitiList(player);
			const nonWeapon = allYiti.filter(n => {
				const info = lib.card[n];
				return info.subtype !== "equip1" && !list.some(i => i.name === n);
			});
			return nonWeapon.length > 0;
		},
		async content(event, trigger, player) {
			const discardResult = await player
				.chooseToDiscard("he", "超限：请弃置一张牌", true)
				.forResult();
			if (!discardResult.bool) {
				event.finish();
				return;
			}

			await player.loseMaxHp(2);

			const allYiti = getAllYitiCards();
			const list = getYitiList(player);
			const nonWeapon = allYiti.filter(n => {
				const info = lib.card[n];
				return info.subtype !== "equip1" && !list.some(i => i.name === n);
			});
			if (!nonWeapon.length) return;

			const yitiResult = await player
				.chooseButton(["超限：请选择一件要装备的义体", [nonWeapon.map(n => [lib.card[n].cardcolor || "spade", lib.card[n].yitiNumber || 1, n]), "vcard"]], true)
				.set("ai", button => {
					const info = lib.card[button.link[2]];
					return info.ai?.basic?.equipValue || info.ai?.equipValue || 5;
				})
				.forResult();
			if (!yitiResult.bool || !yitiResult.links?.length) return;
			const yitiName = yitiResult.links[0][2];

			const cardDef = lib.card[yitiName];
			const subtype = cardDef.subtype;
			const skills = cardDef.skills ? cardDef.skills.slice() : [];
			list.push({
				name: yitiName,
				subtype: subtype,
				suit: cardDef.cardcolor || "spade",
				number: cardDef.yitiNumber || 1,
				skills: skills,
			});
			player.storage[STORAGE_KEY] = list;

			if (skills.length) {
				player.addAdditionalSkill("_yiti_mark", skills, true);
			}

			player.markSkill("_yiti_mark");
			player.addSkill("jieli");
		},
		ai: {
			order: 9,
			result: {
				player: 2.5,
			},
		},
	},
	jieli: {
		locked: true,
		forced: true,
		trigger: { player: "useCard" },
		filter(event, player) {
			return event.targets && event.targets.length === 1 && event.targets[0] !== player;
		},
		async content(event, trigger, player) {
			let X;
			await player.judge(card => { X = get.number(card); return 0; }).forResult();
			if (typeof X !== "number") return;
			const Y = player.maxHp;
			if (!(X > 3 * Y - 2)) return;

			player.logSkill("jieli");

			const players = game.players.filter(p => p.isIn());
			const srcIndex = players.indexOf(player);
			const newIndex = (srcIndex + X) % players.length;
			const newTarget = players[newIndex];

			trigger.targets[0] = newTarget;
			player.storage._jieli_boost_target = newTarget;

			game.log(player, "发动解离，将", get.translation(trigger.card), "的目标改为", get.translation(newTarget), "(X=" + X + ")");
		},
		group: ["jieli_damage"],
		subSkill: {
			damage: {
				locked: true,
				forced: true,
				trigger: { source: "damageBegin" },
				filter(event, player) {
					return event.source === player && event.player === player.storage._jieli_boost_target;
				},
				async content(event, trigger, player) {
					trigger.num++;
					delete player.storage._jieli_boost_target;
					game.log(player, "发动解离，伤害+1");
				},
			},
		},
		ai: {
			threaten: 1.5,
		},
	},
};

export default skill;
