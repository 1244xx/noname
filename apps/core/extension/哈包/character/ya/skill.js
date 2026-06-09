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

	// ==================== 开车 - 锁定技 ====================
	kaiche: {
		audio: 2,
		forced: true,
		locked: true,
		trigger: { player: "gameStart" },
		async content(event, trigger, player) {
			player.logSkill("kaiche");
			if (get.is.mountCombined()) {
				await player.disableEquip("equip3");
			} else {
				await player.disableEquip("equip3", "equip4");
			}
		},
		mod: {
			cardRecastable(card, player) {
				const sub = get.subtype(card);
				if (get.is.mountCombined()) return sub === "equip3_4";
				return sub === "equip3" || sub === "equip4";
			},
			globalFrom(from, to, distance) {
				if (from.hasSkill("kaiche")) return distance - 2;
			},
			globalTo(from, to, distance) {
				if (to.hasSkill("kaiche")) return distance + 1;
			},
		},
		ai: {
			threaten: 1.5,
		},
	},
	// ==================== 出租 ====================
	chuzu: {
		audio: 2,
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const { control } = await player
				.chooseControl("距离-1", "距离+1")
				.set("prompt", `出租：请为${get.translation(target)}选择距离调整方向`)
				.set("ai", () => {
					const enemiesNear = game.countPlayer(t => get.attitude(player, t) < 0 && get.distance(player, t) <= 2);
					return enemiesNear > 0 ? "距离-1" : "距离+1";
				})
				.forResult();
			const modValue = control === "距离-1" ? -1 : 1;
			player.storage.chuzu_target = { name: target.name, mod: modValue };
			target.storage.chuzu_source = { name: player.name, mod: modValue };
			player.markSkill("chuzu");
			target.markSkill("chuzu");
		},
		mark: true,
		intro: {
			content(storage, player) {
				const data = player.storage.chuzu_target || player.storage.chuzu_source;
				if (!data) return "";
				const other = game.findPlayer(p => p.name === data.name);
				if (!other) return "";
				const dir = data.mod === -1 ? "距离-1" : "别人算你的距离+1";
				return `与${get.translation(other)}：${dir}`;
			},
		},
		group: ["chuzu_reclaim"],
		subSkill: {
			reclaim: {
				audio: 2,
				trigger: { player: "phaseBegin" },
				filter(event, player) {
					return !!player.storage.chuzu_target;
				},
				forced: true,
				async content(event, trigger, player) {
					const data = player.storage.chuzu_target;
					const target = game.findPlayer(p => p.name === data.name);
					delete player.storage.chuzu_target;
					player.unmarkSkill("chuzu");
					if (target && target !== player && target.storage.chuzu_source) {
						delete target.storage.chuzu_source;
						target.unmarkSkill("chuzu");
					}
					player.logSkill("chuzu");
					if (target && target !== player && target.isAlive() && target.countCards("he") > 0) {
						const result = await target
							.chooseCard("he", true, `出租：请交给${get.translation(player)}一张牌`)
							.set("ai", card => 6 - get.value(card))
							.forResult();
						if (result.bool && result.cards?.length) {
							await target.give(result.cards, player);
						}
					}
				},
			},
		},
		mod: {
			globalFrom(from, to, distance) {
				const data = from.storage.chuzu_target || from.storage.chuzu_source;
				if (data && data.mod === -1) return distance - 1;
			},
			globalTo(from, to, distance) {
				const data = to.storage.chuzu_target || to.storage.chuzu_source;
				if (data && data.mod === 1) return distance + 1;
			},
		},
		ai: {
			order: 6,
			result: { target(player, target) {
				const att = get.attitude(player, target);
				if (att < 0) return 1;
				return 0;
			}},
		},
	},
	// ==================== 绝路 - 限定技 ====================
	juelu: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		filter(event, player) {
			return player.hp === 1 && player.countCards("h") === 0;
		},
		selectTarget: [1, Infinity],
		filterTarget(card, player, target) {
			return target !== player && get.distance(player, target) <= 1;
		},
		async content(event, trigger, player) {
			const targets = [...event.targets].sortBySeat();
			let remainDamage = 5;
			let remainDiscard = 10;
			const allocation = {};

			for (let i = 0; i < targets.length; i++) {
				const target = targets[i];
				const isLast = i === targets.length - 1;

				// 分配伤害
				let dmg = 0;
				if (remainDamage > 0) {
					const dmgOptions = [];
					const maxDmg = isLast ? remainDamage : remainDamage;
					for (let d = 0; d <= maxDmg; d++) {
						dmgOptions.push(`${d}点`);
					}
					const { control } = await player
						.chooseControl(...dmgOptions)
						.set("prompt", `绝路：请为${get.translation(target)}分配伤害（剩余${remainDamage}点）`)
						.set("ai", () => {
							const att = get.attitude(player, target);
							if (att < 0) return `${maxDmg}点`;
							return "0点";
						})
						.forResult();
					dmg = parseInt(control);
				}

				// 分配弃牌
				let dis = 0;
				const targetCards = target.countCards("he");
				if (remainDiscard > 0 && targetCards > 0) {
					const disOptions = [];
					const maxDis = isLast ? remainDiscard : Math.min(remainDiscard, targetCards);
					for (let d = 0; d <= maxDis; d++) {
						disOptions.push(`弃${d}张`);
					}
					const { control } = await player
						.chooseControl(...disOptions)
						.set("prompt", `绝路：请为${get.translation(target)}分配弃牌（剩余${remainDiscard}张）`)
						.set("ai", () => {
							const att = get.attitude(player, target);
							if (att < 0) return `弃${maxDis}张`;
							return "弃0张";
						})
						.forResult();
					dis = parseInt(control.match(/\d+/)?.[0] || 0);
				}

				allocation[target.name] = { dmg, dis };
				remainDamage -= dmg;
				remainDiscard -= dis;
			}

			// 执行伤害
			for (const target of targets) {
				const alloc = allocation[target.name];
				if (alloc.dmg > 0 && target.isAlive()) {
					await target.damage(player, alloc.dmg);
				}
			}

			// 执行弃牌
			for (const target of targets) {
				const alloc = allocation[target.name];
				if (alloc.dis > 0 && target.isAlive() && target.countCards("he") > 0) {
					await target.chooseToDiscard("he", alloc.dis, true);
				}
			}

			// 老司基死亡
			await player.die();
		},
		ai: {
			order: 10,
			halfneg: true,
			result: {
				target(player, target) {
					const att = get.attitude(player, target);
					if (att < 0) return -att * 3;
					return 0;
				},
			},
		},
	},

	// ==================== 纲纪 - 使命技 ====================
	gangji: {
		audio: 2,
		zhuSkill: true,
		mark: true,
		intro: {
			content(storage, player) {
				const tname = player.storage.gangji_target;
				if (player.storage.gangji_failed) {
					return `<span style="color:#888">使命失败</span>，存活：体力回复至3点`;
				}
				if (!tname) return "尚未选择约定目标";
				const violator = player.storage.gangji_violated;
				if (violator) {
					return `约定：${get.translation(tname)} <span style="color:#A40000">毁约者：${get.translation(violator)}</span>`;
				}
				return `约定：${get.translation(tname)} 双方不使用杀且不对其他角色造成伤害`;
			},
		},
		group: ["gangji_choose", "gangji_tracker_hp", "gangji_tracker_hand", "gangji_tracker_reset", "gangji_violation_sha", "gangji_violation_damage", "gangji_check", "gangji_fail"],
		ai: {
			order: 10,
			result: { player: 2 },
		},
	},
	// 纲纪：每轮选择约定目标
	gangji_choose: {
		audio: 2,
		trigger: { global: "roundStart" },
		filter(event, player) {
			if (player.storage.gangji_failed) return false;
			return true;
		},
		async cost(event, trigger, player) {
			const last = player.storage.gangji_last;
			event.result = await player
				.chooseTarget(`纲纪：请选择一名角色缔结公约`, (card, p, target) => {
					return target !== player && target.name !== last;
				})
				.set("ai", target => {
					const att = get.attitude(player, target);
					return -att * get.threaten(target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.storage.gangji_target = target.name;
			player.storage.gangji_last = target.name;
			delete player.storage.gangji_violated;
			player.markSkill("gangji");
			player.logSkill("gangji_choose", target);
		},
	},
	// 纲纪：毁约检测——使用杀
	gangji_violation_sha: {
		trigger: { global: "useCard" },
		filter(event, player) {
			if (player.storage.gangji_failed) return false;
			if (player.storage.gangji_violated) return false;
			if (event.card.name !== "sha") return false;
			const tname = player.storage.gangji_target;
			if (!tname) return false;
			const user = event.player;
			const target = game.findPlayer(p => p.name === tname);
			return user === player || user === target;
		},
		async content(event, trigger, player) {
			player.storage.gangji_violated = trigger.player.name;
			player.logSkill("gangji_violation_sha", trigger.player);
			const violator = trigger.player;
			if (violator.isAlive()) {
				await violator.loseHp();
				if (violator.countCards("he") > 0) {
					await violator.chooseToDiscard("he", 2, true).set("ai", card => {
						return 6 - get.value(card);
					});
				}
			}
			player.markSkill("gangji");
		},
	},
	// 纲纪：毁约检测——造成伤害
	gangji_violation_damage: {
		trigger: { global: "damageBegin" },
		filter(event, player) {
			if (player.storage.gangji_failed) return false;
			if (player.storage.gangji_violated) return false;
			if (!event.source) return false;
			const tname = player.storage.gangji_target;
			if (!tname) return false;
			const source = event.source;
			const target = game.findPlayer(p => p.name === tname);
			if (source === event.player) return false;  // 对方自己打自己不违约
			if (event.player === source) return false;  // 自己打自己不违约
			return source === player || source === target;
		},
		async content(event, trigger, player) {
			player.storage.gangji_violated = trigger.source.name;
			player.logSkill("gangji_violation_damage", trigger.source);
			const violator = trigger.source;
			if (violator.isAlive()) {
				await violator.loseHp();
				if (violator.countCards("he") > 0) {
					await violator.chooseToDiscard("he", 2, true).set("ai", card => {
						return 6 - get.value(card);
					});
				}
			}
			player.markSkill("gangji");
		},
	},
	// 纲纪：追踪检测——体力减少
	gangji_tracker_hp: {
		trigger: { global: "damageAfter" },
		filter(event, player) {
			return event.num > 0;
		},
		silent: true,
		content() {
			_status.gangji_hploss = true;
		},
	},
	// 纲纪：追踪检测——回合外失去手牌
	gangji_tracker_hand: {
		trigger: { global: "loseAfter" },
		filter(event, player) {
			if (event.type === "discard" && event.getParent("phaseDiscard")) return false;
			const current = _status.currentPhase;
			if (!current) return false;
			const lostCards = event.getl(trigger.player);
			if (!lostCards || !lostCards.length) return false;
			return lostCards.some(c => get.position(c, true) === "h") && trigger.player !== current;
		},
		silent: true,
		content() {
			_status.gangji_handloss = true;
		},
	},
	// 纲纪：每轮重置追踪标记
	gangji_tracker_reset: {
		trigger: { global: "roundStart" },
		silent: true,
		content() {
			delete _status.gangji_hploss;
			delete _status.gangji_handloss;
		},
	},
	// 纲纪：回合结束时判定成功
	gangji_check: {
		trigger: { global: "roundEnd" },
		filter(event, player) {
			if (player.storage.gangji_failed) return false;
			const tname = player.storage.gangji_target;
			if (!tname) return false;
			const target = game.findPlayer(p => p.name === tname);
			if (!target || !target.isAlive()) return false;
			return true;
		},
		async content(event, trigger, player) {
			player.logSkill("gangji");

			// 条件1：本轮未有角色体力减少
			if (_status.gangji_hploss) {
				game.log(player, "纲纪未达成：有角色体力减少");
				player.markSkill("gangji");
				return;
			}

			// 条件2：未有角色在回合外失去手牌
			if (_status.gangji_handloss) {
				game.log(player, "纲纪未达成：有角色在回合外失去手牌");
				player.markSkill("gangji");
				return;
			}

			// 条件3：场上没有乐不思蜀和兵粮寸断
			let hasDelayTrick = false;
			game.filterPlayer().forEach(p => {
				const jcards = p.getCards("j");
				if (jcards.some(c => c.name === "lebu" || c.name === "bingliang")) {
					hasDelayTrick = true;
				}
			});

			if (hasDelayTrick) {
				game.log(player, "纲纪未达成：场上存在延时锦囊");
				player.markSkill("gangji");
				return;
			}

			// ★ 阵营胜利
			game.log(player, "的纲纪达成，其所在阵营获得胜利！");
			_status.gameEnd = true;
			_status.winner = player.identity;
			player.markSkill("gangji");
		},
	},
	// 纲纪：使命失败——濒死时回复
	gangji_fail: {
		trigger: { player: "dying" },
		filter(event, player) {
			return !player.storage.gangji_failed;
		},
		async content(event, trigger, player) {
			player.storage.gangji_failed = true;
			player.logSkill("gangji", null, "失败");
			player.hp = 3;
			player.update();
			game.log(player, "纲纪失败，体力回复至3点");
			player.markSkill("gangji");
		},
		ai: {
			maixie: true,
			order: 10,
		},
	},
	// ==================== 民诉 ====================
	minsu: {
		audio: 2,
		zhuSkill: true,
		trigger: { global: "gameStart" },
		init(player) {
			// 游戏开始时如果已经过了 gameStart 时机，手动添加全局技能
			if (_status.minsu_rules) {
				game.addGlobalSkill("minsu_effect");
			}
		},
		onremove(player) {
			if (!game.hasPlayer(p => p !== player && p.hasSkill("minsu", null, null, false), true)) {
				game.removeGlobalSkill("minsu_effect");
				delete _status.minsu_rules;
			}
		},
		forced: true,
		async content(event, trigger, player) {
			const options = [
				"禁用并可重铸乐不思蜀",
				"禁用并可重铸兵粮寸断",
				"每回合至多两点伤害可造成",
				"每回合至多三张牌可获得",
				"每回合至多两张牌可弃置",
			];
			const voteMap = {};

			// 遍历所有存活玩家，每人投票
			const players = game.filterPlayer().sortBySeat();
			const pickCount = player.isZhu ? 4 : 3;

			for (const voter of players) {
				// 告知当前投票人
				if (voter !== player) {
					await game.wait(500);
				}
				const myVotes = [];
				// 逐项投票
				for (let i = 0; i < options.length; i++) {
					const result = await voter
						.chooseBool(`民诉：是否支持「${options[i]}」？`)
						.set("ai", () => {
							// AI 根据策略投票
							if (i === 0 || i === 1) return Math.random() < 0.5;
							if (i === 2) return voter.hp <= 2;
							if (i === 3) return true;
							if (i === 4) return false;
							return false;
						})
						.forResult();
					if (result.bool) {
						myVotes.push(i);
					}
				}
				// 如果选的项多于 pickCount，截取前 pickCount 个
				if (myVotes.length > pickCount) {
					myVotes.length = pickCount;
				}
				for (const vi of myVotes) {
					voteMap[vi] = (voteMap[vi] || 0) + 1;
				}
			}

			// 计票：取票数最多的 N 项，同票均采纳
			const entries = Object.entries(voteMap);
			entries.sort((a, b) => b[1] - a[1]);
			const threshold = entries[Math.min(pickCount - 1, entries.length - 1)]?.[1] || 0;
			const selected = entries
				.filter(([, count]) => count >= threshold)
				.slice(0, pickCount)
				.map(([idx]) => parseInt(idx));

			// 存储到全局状态
			_status.minsu_rules = selected;
			player.logSkill("minsu");
			game.log(player, "民诉表决结果：", selected.map(i => options[i]).join("、"));

			// 激活全局效果
			game.addGlobalSkill("minsu_effect");
		},
	},
	// ==================== 民诉全局效果 ====================
	minsu_effect: {
		// 不再声明 mark/intro，由子技能 minsu_limit 独立管理
		mod: {
			cardEnabled(card, player) {
				const rules = _status.minsu_rules || [];
				if (rules.includes(0) && card.name === "lebu") return false;
				if (rules.includes(1) && card.name === "bingliang") return false;
			},
			cardRecastable(card, player) {
				const rules = _status.minsu_rules || [];
				if (rules.includes(0) && card.name === "lebu") return true;
				if (rules.includes(1) && card.name === "bingliang") return true;
			},
		},
		group: ["minsu_limit"],
		subSkill: {
			limit: {
				// === 标记显示（在当前回合角色身上） ===
				mark: true,
				intro: {
					content(storage, player) {
						const rules = _status.minsu_rules || [];
						if (rules.length === 0) return "";
						let str = "";
						if (rules.includes(2)) {
							const done = player.storage.minsu_damage || 0;
							str += `伤害：<span style="color:#A40000">${done}</span>/2`;
						}
						if (rules.includes(3)) {
							if (str) str += " ";
							const done = player.storage.minsu_gain || 0;
							str += `获得：<span style="color:#00A400">${done}</span>/3`;
						}
						if (rules.includes(4)) {
							if (str) str += " ";
							const done = player.storage.minsu_discard || 0;
							str += `弃牌：<span style="color:#0044A4">${done}</span>/2`;
						}
						return str || "民诉";
					},
				},

				// === 回合开始：重置计数 + 标记 ===
				group: ["minsu_limit_reset", "minsu_limit_clear", "minsu_limit_damage", "minsu_limit_gain", "minsu_limit_discard"],

				subSkill: {
					reset: {
						trigger: { global: "phaseBegin" },
						filter(event, player) {
							const rules = _status.minsu_rules || [];
							return rules.length > 0;
						},
						silent: true,
						content() {
							const current = _status.currentPhase;
							current.storage.minsu_damage = 0;
							current.storage.minsu_gain = 0;
							current.storage.minsu_discard = 0;
							current.markSkill("minsu_limit");
						},
					},

					clear: {
						trigger: { global: "phaseAfter" },
						filter(event, player) {
							return trigger.player.storage.minsu_damage !== undefined;
						},
						silent: true,
						content() {
							const tp = trigger.player;
							tp.unmarkSkill("minsu_limit");
							delete tp.storage.minsu_damage;
							delete tp.storage.minsu_gain;
							delete tp.storage.minsu_discard;
						},
					},

					// === 每回合至多两点伤害 ===
					damage: {
						trigger: { global: "damageBegin" },
						filter(event, player) {
							const rules = _status.minsu_rules || [];
							if (!rules.includes(2)) return false;
							const current = _status.currentPhase;
							if (!current) return false;
							return (current.storage.minsu_damage || 0) + event.num > 2;
						},
						async content(event, trigger, player) {
							const current = _status.currentPhase;
							const done = current.storage.minsu_damage || 0;
							const allowed = 2 - done;

							if (allowed <= 0) {
								trigger.cancel();
								game.log(current, "本回合伤害已达上限");
							} else {
								trigger.num = allowed;
								current.storage.minsu_damage = 2;
							}
						},
					},

					// === 每回合至多三张牌获得 ===
					gain: {
						trigger: { global: "gainAfter" },
						filter(event, player) {
							const rules = _status.minsu_rules || [];
							if (!rules.includes(3)) return false;
							const current = _status.currentPhase;
							if (!current) return false;
							const gotCards = event.getg(trigger.player);
							if (!gotCards || !gotCards.length) return false;
							const newCount = (current.storage.minsu_gain || 0) + gotCards.length;
							return newCount > 3;
						},
						async content(event, trigger, player) {
							const current = _status.currentPhase;
							const done = current.storage.minsu_gain || 0;
							const gotCards = event.getg(trigger.player);
							const remaining = 3 - done;

							if (remaining <= 0) {
								// 已超上限，移出获得的牌
								for (const c of gotCards) {
									if (get.position(c, true) === "h" || get.position(c, true) === "e") {
										trigger.player.lose(c, "visible");
										c.discard(c);
									}
								}
								game.log(trigger.player, "本回合获得牌已达上限，取消获得的牌");
							} else if (gotCards.length > remaining) {
								// 部分超限，保留前 remaining 张
								const toRemove = gotCards.slice(remaining);
								for (const c of toRemove) {
									if (get.position(c, true) === "h" || get.position(c, true) === "e") {
										trigger.player.lose(c, "visible");
										c.discard(c);
									}
								}
								current.storage.minsu_gain = 3;
								game.log(trigger.player, `本回合获得牌已达上限，只保留${remaining}张`);
							}
							current.markSkill("minsu_limit");
						},
					},

					// === 每回合至多两张牌弃置 ===
					discard: {
						trigger: { global: "loseAfter" },
						filter(event, player, name) {
							const rules = _status.minsu_rules || [];
							if (!rules.includes(4)) return false;
							const current = _status.currentPhase;
							if (!current) return false;
							// 只统计因弃置而失去的牌
							if (event.type !== "discard") return false;
							const lostCards = event.getl(trigger.player);
							if (!lostCards || !lostCards.length) return false;
							const newCount = (current.storage.minsu_discard || 0) + lostCards.length;
							return newCount > 2;
						},
						async content(event, trigger, player) {
							const current = _status.currentPhase;
							const done = current.storage.minsu_discard || 0;
							const lostCards = event.getl(trigger.player);
							const remaining = 2 - done;

							if (remaining <= 0) {
								// 已超上限，不可弃置
								// 无法真正阻止已发生的弃置，标记已达上限
								game.log(trigger.player, "本回合弃牌已达上限");
							}
							current.storage.minsu_discard = Math.min(current.storage.minsu_discard + lostCards.length, 2);
							current.markSkill("minsu_limit");
						},
					},
				},
				// AI: 此技能无 AI 决策，纯粹是被动机制
			},
		},
	},

	// ==================== 骸枭 ====================
	haixiao: {
		audio: 2,
		enable: ["chooseToRespond", "chooseToUse"],
		viewAsFilter(player) {
			// 手牌中是否有未被选为被转化牌的基本/锦囊
			const used = player.storage.haixiao_targets || [];
			return player.countCards("h", c => {
				const type = get.type(c, "trick");
				return (type === "basic" || type === "trick") && !used.includes(c.cardid);
			}) > 0;
		},
		group: ["haixiao_guess"],
		chooseButton: {
			dialog(event, player) {
				const used = player.storage.haixiao_targets || [];
				const cards = player.getCards("h");
				const vcards = [];
				for (const c of cards) {
					const type = get.type(c, "trick");
					if ((type === "basic" || type === "trick") && !used.includes(c.cardid)) {
						vcards.push([type, "", c.name, c.cardid]);
					}
				}
				if (!vcards.length) return null;
				return ui.create.dialog("骸枭：选择转化成的牌", [vcards, "vcard"]);
			},
			check(button) {
				return _status.event.player.getUseValue({ name: button.link[2] });
			},
			backup(links, player) {
				const targetCardId = links[0][3];
				const targetName = links[0][2];

				return {
					audio: "haixiao",
					filterCard: true,
					selectCard: 1,
					position: "h",

					filterTarget(card, player, target) {
						return target !== player;
					},

					// 排除自己后是否有合法目标
					viewAsFilter(player) {
						const info = get.info({ name: targetName });
						const evt = _status.event;
						if (evt.name === "chooseToUse") {
							return game.hasPlayer(t => t !== player && lib.filter.targetEnabled2({ name: targetName, isCard: true }, player, t));
						}
						return true;
					},

					viewAs(cards, player) {
						if (!cards.length || cards[0].cardid == null) return null;
						return {
							name: targetName,
							isCard: true,
							storage: {
								haixiao: {
									targetCardId: targetCardId,
									originalCardId: cards[0].cardid,
									originalType: get.type(cards[0], "trick"),
									originalName: get.name(cards[0]),
								},
							},
						};
					},

					check(card) {
						const player = _status.event.player;
						return player.getUseValue({ name: targetName }) - get.value(card) / 6;
					},

					ai: {
						result: {
							target(player, target) {
								if (get.attitude(player, target) < 0) return 1;
								return 0;
							},
						},
					},
				};
			},
		},

		ai: {
			save: true,
			respondSha: true,
			respondShan: true,
			fireAttack: true,
			skillTagFilter(player, tag, arg) {
				const used = player.storage.haixiao_targets || [];
				if (!player.countCards("h", c => {
					const type = get.type(c, "trick");
					return (type === "basic" || type === "trick") && !used.includes(c.cardid);
				})) return false;
			},
			order: 5,
			result: { player: 0.5 },
		},
	},

	// 骸枭：猜牌效果
	haixiao_guess: {
		trigger: { player: "useCardToTargeted" },
		filter(event, player) {
			return event.card?.storage?.haixiao != null && event.target != null;
		},
		forced: true,
		async content(event, trigger, player) {
			const data = trigger.card.storage.haixiao;

			// 标记被转化牌 cardid：后续不能再被选
			player.storage.haixiao_targets ??= [];
			if (!player.storage.haixiao_targets.includes(data.targetCardId)) {
				player.storage.haixiao_targets.push(data.targetCardId);
			}

			const target = trigger.target;
			player.logSkill("haixiao", target);

			// 目标猜测原始牌类型
			const { control } = await target
				.chooseControl("基本牌", "锦囊牌", "装备牌")
				.set("prompt", `骸枭：请猜测${get.translation(trigger.card)}的原始类型`)
				.set("ai", () => {
					const evt = get.event().getTrigger();
					const p = evt.player;
					if (!p) return "基本牌";
					const basicCount = p.getCards("h").filter(c => get.type(c, "trick") === "basic").length;
					const trickCount = p.getCards("h").filter(c => get.type(c, "trick") === "trick").length;
					const equipCount = p.getCards("h").filter(c => get.type(c, "trick") === "equip").length;
					if (basicCount >= trickCount && basicCount >= equipCount) return "基本牌";
					if (equipCount >= basicCount && equipCount >= trickCount) return "装备牌";
					return "锦囊牌";
				})
				.forResult();

			const typeMap = { "基本牌": "basic", "锦囊牌": "trick", "装备牌": "equip" };
			const guessed = typeMap[control];
			const originalType = data.originalType;

			if (guessed === originalType) {
				// 正确：其摸一张牌
				if (target.isAlive()) await target.draw();

				const originalName = data.originalName;
				if (originalName !== trigger.card.name) {
					// 牌名不同 → 对其无效
					trigger.excluded.add(target);

					// 原始牌为杀 → 视为对其使用一张杀
					if (originalName === "sha" && target.isAlive()) {
						trigger.excluded.remove(target);
						await player.useCard({ name: "sha" }, target);
					}
				}
			} else {
				// 错误：其弃一张牌
				if (target.countCards("he") > 0) {
					await target.chooseToDiscard("he", true, "骸枭：请弃置一张牌")
						.set("ai", card => 6 - get.value(card));
				}

				// 原始牌和转化牌均为杀 → 伤害+1
				const originalName = data.originalName;
				if (originalName === "sha" && trigger.card.name === "sha") {
					trigger.getParent().baseDamage = (trigger.getParent().baseDamage || 1) + 1;
				}
			}
		},
	},

	// ==================== 莲雾 - 限定技 ====================
	lianwu: {
		audio: 2,
		enable: "phaseUse",
		limited: true,
		filter(event, player) {
			return player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			player.awakenSkill("lianwu");
			player.logSkill("lianwu");

			// Step 1: 手牌调整至 4 张
			const handCount = player.countCards("h");
			if (handCount < 4) {
				await player.draw(4 - handCount);
			} else if (handCount > 4) {
				await player.chooseToDiscard("h", handCount - 4, true)
					.set("ai", card => 6 - get.value(card));
			}

			// Step 2: 按类型分类手牌
			const cards = player.getCards("h");
			const groups = { basic: [], trick: [], equip: [] };
			for (const c of cards) {
				const type = get.type(c, "trick");
				if (groups[type]) groups[type].push(c);
			}

			// 类型→锦囊映射
			const typeToAOE = { basic: "taoyuan_jieyi", trick: "nanman_ruqin", equip: "wanjian_qifa" };
			const aoeToType = { taoyuan_jieyi: "basic", nanman_ruqin: "trick", wanjian_qifa: "equip" };

			// 构建可用列表
			const available = [];
			for (const [type, name] of Object.entries(typeToAOE)) {
				if (groups[type] && groups[type].length > 0) available.push(name);
			}
			if (!available.length) return;

			// Step 3: 按玩家选择的顺序依次使用
			const used = [];
			while (true) {
				const unused = available.filter(n => !used.includes(n));
				if (!unused.length) break;

				// 检查还有没有对应的手牌
				const hasCard = unused.some(n => {
					const t = aoeToType[n];
					return groups[t] && groups[t].length > 0;
				});
				if (!hasCard) break;

				const choices = unused.filter(n => {
					const t = aoeToType[n];
					return groups[t] && groups[t].length > 0;
				});
				if (!choices.length) break;

				const { control } = await player
					.chooseControl(...choices)
					.set("prompt", "莲雾：请选择要使用的锦囊")
					.set("ai", () => {
						const list = get.event()._controls;
						if (list.includes("nanman_ruqin")) return list.indexOf("nanman_ruqin");
						if (list.includes("wanjian_qifa")) return list.indexOf("wanjian_qifa");
						return 0;
					})
					.forResult();

				used.push(control);

				// 消耗对应类型的一张手牌
				const aoeType = aoeToType[control];
				if (!groups[aoeType] || !groups[aoeType].length) break;

				const discardCard = groups[aoeType].shift();
				if (get.position(discardCard, true) === "h") {
					await player.lose(discardCard, "visible");
					discardCard.discard();
				}

				// 使用虚拟 AOE 锦囊
				await player.useCard({ name: control }, player);
			}
		},
		ai: {
			order: 10,
			halfneg: true,
			result: {
				player(player) {
					const cards = player.countCards("h");
					if (cards < 2) return 0;
					const types = new Set(player.getCards("h").map(c => get.type(c, "trick")));
					return types.size;
				},
			},
		},
	},

};


export default skill;
