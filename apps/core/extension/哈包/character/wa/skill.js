import { lib, game, ui, get, ai, _status } from "../../main/utils.js";
import { getYitiList, getAllYitiCards, STORAGE_KEY } from "../../card/yiti_skill.js";

/** @type { importCharacterConfig['skill'] } */
const skill = {
	// 地租 - 锁定技，其他角色的出牌阶段结束时，若其身上没有标记烧和抢，则需交给你一张牌
	dizu: {
		audio: 2,
		forced: true,
		locked: true,
		trigger: {
			global: "phaseUseEnd",
		},
		filter(event, player) {
			// 不能是自己，且目标没有"烧"和"抢"标记
			return event.player !== player && 
			       !event.player.hasMark("daosuan_shao") && 
			       !event.player.hasMark("daosuan_qiang");
		},
		async content(event, trigger, player) {
			const target = trigger.player;
			player.logSkill("dizu", target);
			
			// 如果目标有手牌或装备，必须交给还乡基一张牌
			if (target.countCards("he") > 0) {
				await target.chooseToGive(player, 1, true, "he");
			}
		},
		ai: {
			threaten(player, target) {
				// 对敌人威胁度评估
				if (get.attitude(player, target) < 0) {
					return 1.5; // 高威胁
				}
				return 0.8;
			}
		}
	},
	// 倒算 - 锁定技，包含回合外标记获取和准备阶段触发
	daosuan: {
		audio: 2,
		forced: true,
		locked: true,
		derivation: ["shaosha", "qianglue"],
		group: ["daosuan_shao", "daosuan_qiang"],
		trigger: {
			player: "phaseZhunbeiBegin",
		},
		filter(event, player) {
			// 检查是否有角色带有标记
			return true;
		},
		async content(event, trigger, player) {
			// 遍历所有存活角色
			for (const target of game.players.filter(p => p.isIn())) {
				if (target === player) continue;
				
				// 处理"烧"标记
				if (target.hasMark("daosuan_shao")) {
					var num = target.countMark("daosuan_shao");
					
					// 调用useSkill
					await player.useSkill("shaosha", [target]);
					
					// 移除标记
					target.removeMark("daosuan_shao", num);
					game.log(target, "失去标记烧");
				}
				
				// 处理"抢"标记
				if (target.hasMark("daosuan_qiang")) {
					var num = target.countMark("daosuan_qiang");
					
					// 调用useSkill
					await player.useSkill("qianglue", [target]);
					
					// 移除标记
					target.removeMark("daosuan_qiang", num);
					game.log(target, "失去标记抢");
				}
			}
		},
		ai: {
			order: 8,
			result: {
				player: 2,
			}
		}
	},
	// 子技能：获得"烧"标记
	daosuan_shao: {
		marktext: "烧",
		intro: {
			content: "拥有#个烧标记",
		},
		forced: true,
		locked: true,
		trigger: {
			player: "damageEnd",
			target: "useCardToTarget",
		},
		filter(event, player, name) {
			// 必须是回合外，且还乡基受到伤害或被杀指定
			if (_status.currentPhase === player) return false;
			
			if (name === "damageEnd") {
				return true;
			}
			
			if (event.card.name === "sha") {
				return true;
			}

			return false;
		},
		logTarget: "source",
		async content(event, trigger, player) {
			if (trigger.name === "damage") {
				const {source} = trigger;
				source.addMark("daosuan_shao", 1);
				game.log(source, "获得标记烧");
			}else if (trigger.name === "useCardToTarget") {
				trigger.player.addMark("daosuan_shao", 1);
				game.log(trigger.player, "获得标记烧");
			}
		}
	},
	// 子技能：获得"抢"标记
	daosuan_qiang: {
		marktext: "抢",
		intro: {
			content: "拥有#个抢标记",
		},
		forced: true,
		locked: true,
		trigger: {
			player: "loseAfter",
			global: ["gainAfter", "loseAsyncAfter"],
		},
		filter(event, player) {
			// 必须是回合外
			if (_status.currentPhase === player) return false;

			const evt = event.getl(player);
			if (!(evt?.cards2 ?? []).length) {
				return false;
			}
			if (event.name === "gain" || event.type === "gain") {
				if (
					evt.cards2.some(card => {
						return game.hasPlayer(target => {
							if (target === player) {
								return false;
							}
							return event.getg?.(target)?.includes(card);
						});
					})
				) {
					return true;
				}
			}
			if (event.type === "discard" && event.getlx !== false) {
				const discarder = event.discarder || event.getParent(2).player;
				if (discarder && discarder !== player) {
					return true;
				}
			}
			return false;
		},
		async content(event, trigger, player) {
			let source = null;
        
			// 获取来源
			if (trigger.name === "gain" || trigger.type === "gain") {
				const evt = trigger.getl(player);
				source = game.findPlayer(target => {
					if (target === player) return false;
					return evt.cards2.some(card => 
						trigger.getg?.(target)?.includes(card)
					);
				});
			} else if (trigger.type === "discard") {
				source = trigger.discarder || trigger.getParent(2).player;
			}
			
			// 验证并使用
			if (source && source.isIn()) {
				player.logSkill("技能名", source);
				// 执行你的技能逻辑
				source.addMark("daosuan_qiang", 1);
				game.log(source, "获得标记抢");
			}
		}
	},
	// 烧杀 - 视为对目标使用一张火杀，此杀不可响应
	shaosha: {
		audio: 2,
		content(event, trigger, player) {
			const target = event.targets[0];
			// 监听即将触发的 useCard 事件
			player.when("useCard")
				.step(async (event, trigger, player) => {
					trigger.directHit.addArray(game.players);
					game.log(trigger.card, "不可被响应");
				});
			// 直接创建并使用火杀// 创建虚拟火杀
			const sha = { name: 'sha', isCard: true, nature: 'fire', directHit: true };
			const result = player.useCard(sha, target);
		},
		ai: {
			basic: {
				order: 4,
				useful: 1,
			},
			result: {
				target(player, target) {
					const att = get.attitude(player, target);
					if (att < 0) return 2;
					return -1;
				}
			}
		}
	},
	// 抢掠 - 获得目标一张牌，然后再弃置目标一张牌
	qianglue: {
		audio: 2,
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.logSkill("qianglue", target);
			
			// 获得目标一张牌
			if (target.countCards("he") > 0) {
				await player.gainPlayerCard(target, "he", true);
			}
			
			// 弃置目标一张牌
			if (target.countDiscardableCards(player, "he")) {
				await player.discardPlayerCard(target, "he", true);
			}
		},
		ai: {
			basic: {
				order: 6,
				useful: 1,
			},
			result: {
				target(player, target) {
					const att = get.attitude(player, target);
					if (att < 0) return 2.5;
					return -1.5;
				}
			}
		}
	},

	tuite: {
		forced: true,
		locked: true,
		mod: {
			suit(card, suit) {
				if (suit === "spade") return "heart";
			},
			cardsuit(card, player, suit) {
				if (suit === "spade") return "heart";
			},
			cardname(card, player, name) {
				if (card.suit === "spade") return "wugu";
			},
		},
		ai: {
			order: 5,
			result: { player: 0.5 },
			halfneg: true,
		},
	},
	gushi: {
		forced: true,
		locked: true,
		trigger: { global: "useCard1" },
		filter(event, player) {
			return event.card && get.name(event.card) === "wugu";
		},
		async content(event, trigger, player) {
			trigger.cancel();
			const user = trigger.player;
			const allPlayers = game.filterPlayer(p => p.isIn()).sortBySeat(user);
			const flipCount = Math.min(allPlayers.length, trigger.targets ? trigger.targets.length : game.countPlayer());
			const cards = get.cards(flipCount);
			const me = game.me;
			let skipWuxie = false;
			const skipWuxieBtn = (me && !_status.auto) ? ui.create.control("不无懈股市", function () {
				this.classList.toggle("glow");
				skipWuxie = !skipWuxie;
				if (skipWuxie && ui.confirm && _status.event.name === "chooseCard" && _status.event.player === me) {
					ui.click.cancel(ui.confirm.lastChild);
				}
			}, "stayleft") : null;
			game.log(user, "发动五谷丰登（股市效果），从使用者开始依次翻开牌堆顶一张牌");

			let ci = 0;
			for (const currentPlayer of allPlayers) {
				if (ci >= cards.length) break;
				const card = cards[ci++];
				game.broadcastAll(function(card) {
					ui.arena.classList.add("bright");
				}, card);
				game.log(currentPlayer, "翻开了牌堆顶一张牌：", card);
				await game.delay(1);

				var chainCards = [];
				while (true) {
					var found = null;
					for (const p of allPlayers) {
						if (chainCards.some(w => w.player === p)) continue;
						const avail = p.getCards("hs").filter(c => {
							var name = get.name(c, p);
							return name === "wuxie" && !chainCards.some(w => w.card === c);
						});
						if (!avail.length) continue;
						var prompt;
						if (!chainCards.length) {
							prompt = "是否使用无懈可击将" + get.translation(card) + "置入弃牌堆？";
						} else {
							prompt = "是否使用无懈可击抵消" + get.translation(chainCards[chainCards.length - 1].card) + "？";
						}
						if (p === me && skipWuxie) continue;
						const result = await p.chooseCard("hs", "是否使用？", prompt)
							.set("filterCard", c => {
								var name = get.name(c, p);
								return name === "wuxie" && !chainCards.some(w => w.card === c);
							})
							.set("ai", c => {
								if (get.attitude(p, currentPlayer) < 0) return 100;
								return -1;
							})
							.forResult();
						if (result.bool && result.cards && result.cards.length) {
							found = { player: p, card: result.cards[0] };
							break;
						}
					}
					if (!found) break;
					chainCards.push(found);
				}

				var wuxied = false;
				if (chainCards.length > 0 && chainCards.length % 2 === 1) {
					card.discard();
					game.log(chainCards[0].player, "使用了无懈可击，", card, "被弃置");
					wuxied = true;
				}
				for (const w of chainCards) {
					await w.player.discard([w.card]);
				}

				if (!wuxied) {
					await currentPlayer.gain(card, "draw");
					game.log(currentPlayer, "获得了", card);
					var suit = get.suit(card, currentPlayer);
					if (suit === "heart" || suit === "diamond") {
						await currentPlayer.draw(1);
					} else {
						if (currentPlayer.countCards("he") > 0) {
							await currentPlayer.chooseToDiscard("he", 2, true, "股市：获得黑色牌，请弃置两张牌（不足则全弃）");
						}
					}
				}

				game.broadcastAll(function() {
					ui.arena.classList.remove("bright");
				});
			}
			for (let i = ci; i < cards.length; i++) {
				cards[i].discard();
			}
			if (skipWuxieBtn) skipWuxieBtn.close();
		},
		ai: {
			order: 6,
			result: { player: 1 },
		},
	},
	zhasi: {
		trigger: { player: "dying" },
		filter(event, player) {
			return player.maxHp > 1;
		},
		async content(event, trigger, player) {
			player.logSkill("zhasi");
			await player.loseMaxHp();
			await player.recover(1 - player.hp);
			const spadeCard = get.discardPile(c => get.suit(c) === "spade");
			if (spadeCard) {
				await player.gain(spadeCard, "draw");
			}
		},
		ai: {
			order: 9,
			result: { player: 3 },
			maixie: true,
		},
	},
	zhanshou: {
		trigger: { player: "phaseBegin" },
		zhuSkill: true,
		filter(event, player) {
			return player.isZhu && player.hasCard(c => get.name(c, player) === "wugu", "he");
		},
		async cost(event, trigger, player) {
			const cardResult = await player.chooseCard("he", "斩首：请弃置一张五谷丰登并指定一名其他角色（取消则不发动）")
				.set("filterCard", card => get.name(card, player) === "wugu")
				.forResult();
			if (!cardResult.bool) {
				event.result = { bool: false };
				return;
			}
			const targetResult = await player.chooseTarget("斩首：请指定一名其他角色（取消则不发动）")
				.set("filterTarget", (card, p, target) => target !== p)
				.set("ai", target => -get.attitude(player, target))
				.forResult();
			if (!targetResult.bool) {
				event.result = { bool: false };
				return;
			}
			event.result = {
				bool: true,
				cost_data: { card: cardResult.cards[0], target: targetResult.targets[0] },
			};
		},
		async content(event, trigger, player) {
			const { card, target } = event.cost_data;
			await player.discard([card]);
			player.logSkill("zhanshou", target);
			for (const p of game.players) {
				if (p.isIn()) {
					p.storage._zhanshou_target = target;
					p.addTempSkill("zhanshou_effect", function(event, p2, name) {
						return name === "phaseBegin" && event.player === player;
					});
				}
			}
			game.log("直到" + get.translation(player) + "的下个回合开始阶段前，对" + get.translation(target) + "使用的杀无距离限制");
		},
		ai: {
			order: 8,
			result: { player: 1 },
		},
	},
	zhanshou_effect: {
		onremove(player) {
			delete player.storage._zhanshou_target;
		},
		mod: {
			targetInRange(card, player, target) {
				if (card && card.name === "sha" && target === player.storage._zhanshou_target) return true;
			},
		},
		ai: { order: 1 },
	},

	qiaole: {
		audio: 2,
		forced: true,
		locked: true,
		trigger: { player: "loseAfter" },
		filter(event, player) {
			if (!event.hs || !event.hs.length) return false;
			return event.hs.some(card => get.suit(card) === "spade");
		},
		async content(event, trigger, player) {
			const spadeCards = trigger.hs.filter(card => get.suit(card) === "spade");
			if (spadeCards.length > 0) {
				player.logSkill("qiaole");
				await player.draw(spadeCards.length);
			}
		},
		ai: {
			order: 3,
			result: { player: 1 },
		},
	},
	changpao: {
		audio: 2,
		frequent: false,
		trigger: { player: ["phaseBegin", "phaseEnd"] },
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(p => p !== player && p.isIn());
		},
		async content(event, trigger, player) {
			player.logSkill("changpao");
			await executeChangpao(player, 0);
		},
		ai: {
			order: 6,
			result: { player: 1 },
		},
	},
	feiqin: {
		audio: 2,
		frequent: false,
		round: 1,
		trigger: { player: "phaseAfter" },
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			player.logSkill("feiqin");
			const cards = get.cards(1);
			if (!cards || !cards.length) return;
			const card = cards[0];
			game.log(player, "翻开了牌堆顶牌", card);
			await game.cardsDiscard(card);
			const suit = get.suit(card);
			if (suit !== "spade") {
				game.log(player, "花色为", get.translation(suit), "，执行额外回合！");
				await player.phase("feiqin");
			} else {
				game.log(player, "花色为♠，体力扣至0！");
				await player.loseHp(player.hp);
			}
		},
		ai: {
			order: 9,
			result: {
				player(player) {
					// 有保命手段(桃/酒/濒死技能)或极高血量时才冒险
					if (player.countCards("h", card => get.name(card) === "tao" || get.name(card) === "jiu") > 0) return 2;
					if (player.hp >= 3) return 1;
					return 0;
				},
			},
			halfneg: true,
		},
	},

	duge: {
		forced: true,
		locked: true,
		trigger: { global: "gameStart" },
		async content(event, trigger, player) {
			player.logSkill("duge");
			for (let i = 1; i <= 5; i++) {
				player.disableEquip(i);
			}
			const allCards = getAllYitiCards();
			const weapons = allCards.filter(n => lib.card[n].subtype === "equip1");
			const armors = allCards.filter(n => lib.card[n].subtype === "equip2");
			const horses = allCards.filter(n => lib.card[n].subtype === "equip3_4");
			const treasures = allCards.filter(n => lib.card[n].subtype === "equip5");

			async function chooseAndEquip(player, candidates, count, prompt) {
				if (!candidates.length || count <= 0) return;
				const map = candidates.map(n => [lib.card[n].cardcolor || "spade", lib.card[n].yitiNumber || 1, n]);
				const result = await player.chooseButton([prompt, [map, "vcard"]], Math.min(count, map.length), true)
					.set("ai", button => {
						const info = lib.card[button.link[2]];
						return info.ai?.basic?.equipValue || info.ai?.equipValue || 5;
					})
					.forResult();
				if (result.bool && result.links) {
					const list = getYitiList(player);
					if (!player.storage[STORAGE_KEY]) player.storage[STORAGE_KEY] = list;
					for (const link of result.links) {
						const info = lib.card[link[2]];
						const skills = info.skills ? info.skills.slice() : [];
						list.push({
							name: link[2],
							subtype: info.subtype,
							suit: info.cardcolor || "spade",
							number: info.yitiNumber || 1,
							skills: skills,
						});
						if (skills.length) {
							player.addAdditionalSkill("_yiti_mark", skills, true);
						}
					}
					player.markSkill("_yiti_mark");
				}
			}

			await chooseAndEquip(player, weapons, 1, "镀铬：请选择一件武器类义体");
			await chooseAndEquip(player, armors, 2, "镀铬：请选择两件防具类义体");
			await chooseAndEquip(player, horses, 2, "镀铬：请选择两件坐骑类义体");
			await chooseAndEquip(player, treasures, 2, "镀铬：请选择两件宝物类义体");
		},
		ai: {
			order: 1,
			result: { player: 5 },
			halfneg: true,
		},
	},
};

async function executeChangpao(initiator, depth, fixedTarget = null) {
	if (depth >= 99) {
		game.log("长跑已达最大层数（99层），强制结束");
		return;
	}
	if (initiator.countCards("h") === 0) return;

	const discardResult = await initiator.chooseToDiscard("h", true, "长跑：请弃置一张点数为X的牌")
		.set("filterCard", card => {
			const num = get.number(card);
			return typeof num === "number" && num > 0;
		})
		.set("ai", card => {
			const num = get.number(card);
			return num - get.value(card);
		})
		.forResult();

	const discardedCard = discardResult.cards[0];
	const X = get.number(discardedCard);

	let target;
	if (fixedTarget) {
		target = fixedTarget;
	} else {
		const targetResult = await initiator.chooseTarget(true, "长跑：请选择一名其他角色")
			.set("filterTarget", (card, p, target) => target !== p)
			.set("ai", target => {
				const att = get.attitude(initiator, target);
				return att < 0 ? 1 : -1;
			})
			.forResult();
		target = targetResult.targets[0];
	}
	initiator.logSkill("changpao", target);

	const state = {
		initiator,
		target,
		X,
		currentFlipper: "initiator",
		flippedCount: 0,
		shaCard: null,
		shaFinder: null,
	};

	while (state.flippedCount < state.X && !state.shaCard) {
		const flipper = state.currentFlipper === "initiator" ? state.initiator : state.target;
		const judgeResult = await flipper.judge(card => {
			if (get.name(card) === "sha") return 1;
			return 0;
		}).forResult();
		state.flippedCount++;
		game.log(flipper, "判定了", judgeResult.card);

		if (judgeResult.bool) {
			state.shaCard = judgeResult.card;
			state.shaFinder = state.currentFlipper;
		} else {
			state.currentFlipper = state.currentFlipper === "initiator" ? "target" : "initiator";
		}
	}

	let vetoed = false;
	let vetoer = null;

	if (initiator.countCards("h") > 0) {
		const ctrlResult = await initiator.chooseControl(["不废除", "废除"])
			.set("prompt", "长跑：是否废除本轮翻牌结果？")
			.set("ai", () => {
				if (state.shaCard && state.shaFinder === "target") return "废除";
				return "不废除";
			})
			.forResult();
		if (ctrlResult.control === "废除") {
			vetoed = true;
			vetoer = initiator;
		}
	}

	if (!vetoed && target.countCards("h") > 0) {
		const ctrlResult = await target.chooseControl(["不废除", "废除"])
			.set("prompt", "长跑：是否废除本轮翻牌结果？")
			.set("ai", () => {
				if (state.shaCard && state.shaFinder === "initiator") return "废除";
				return "不废除";
			})
			.forResult();
		if (ctrlResult.control === "废除") {
			vetoed = true;
			vetoer = target;
		}
	}

	if (vetoed) {
		game.log(vetoer, "废除了长跑的结果");
		const opponent = vetoer === initiator ? target : initiator;
		await executeChangpao(vetoer, depth + 1, opponent);
	} else {
		if (state.shaCard) {
			const winner = state.shaFinder === "initiator" ? initiator : target;
			const loser = state.shaFinder === "initiator" ? target : initiator;
			game.log(winner, "翻到了杀，对", loser, "使用之");
			await winner.gain(state.shaCard, "nodelay");
			await winner.useCard(state.shaCard, loser, false);
		} else {
			game.log("长跑翻完" + X + "次牌，未翻到杀");
		}
	}
}

export default skill;
