import { lib, game, ui, get, ai, _status } from "../../main/utils.js";

/** @type { importCharacterConfig['skill'] } */
const skill = {
	xuanpi: {
		forced: true,
		locked: true,
		mod: {
			selectTarget(card, player, range) {
				if (card.name == "sha") {
					range[0] = 1;
					range[1] = Infinity;
				}
			},
			targetInRange(card, player, target) {
				if (card.name == "sha") {
					return player.inRange(target) && get.distance(player, target) == 1;
				}
			},
		},
		ai: {
			order: 4,
			effect: {
				player(card, player, target) {
					if (card.name == "sha") {
						const li = player.storage.gangren_li || 0;
						if (li > 0) return [0, 0, 0, 2];
						if (target.hp <= 1) return [1, 0, 0, 0];
						return [0, 0, 0.5, 0];
					}
				},
			},
		},
	},
	xunji: {
		forced: true,
		locked: true,
		init(player) {
			player.storage.xunji_x = 0;
			player.storage.xunji_out = true;
			player.storage.xunji_hidden = false;
		},
		mod: {
			globalFrom(from, to, distance) {
				return distance + from.storage.xunji_x;
			},
			globalTo(from, to, distance) {
				return distance + to.storage.xunji_x;
			},
		},
		trigger: {
			player: ["useCard", "respond", "discard"],
			global: ["dieEnd", "equip", "loseEquip"],
		},
		filter(event, player) {
			if (event.name === "useCard" || event.name === "respond") {
				return event.card;
			}
			if (event.name === "discard") {
				return event.cards && event.cards.length > 0;
			}
			return true;
		},
		async content(event, trigger, player) {
			if (trigger.name === "useCard" || trigger.name === "respond") {
				const card = trigger.card;
				if (!card) return;
				const color = get.color(card);
				if (color === "black") {
					player.storage.xunji_x--;
				} else if (color === "red") {
					player.storage.xunji_x++;
				}
				if (player.storage.xunji_x < -2) {
					player.storage.xunji_x = -2;
				} else if (player.storage.xunji_x > 2) {
					player.storage.xunji_x = 2;
				}
				player.syncStorage("xunji_x");
				player.updateMarks();
			} else if (trigger.name === "discard") {
				const cards = trigger.cards;
				for (const card of cards) {
					const color = get.color(card);
					if (color === "black") {
						player.storage.xunji_x--;
					} else if (color === "red") {
						player.storage.xunji_x++;
					}
				}
				if (player.storage.xunji_x < -2) {
					player.storage.xunji_x = -2;
				} else if (player.storage.xunji_x > 2) {
					player.storage.xunji_x = 2;
				}
				player.syncStorage("xunji_x");
				player.updateMarks();
			}
			const otherPlayers = game.players.filter(p => p !== player && p.isIn());
			if (otherPlayers.length === 0) return;
			const hidden = otherPlayers.every(other => !other.inRange(player));
			player.storage.xunji_hidden = hidden;
			if (!hidden) {
				player.storage.xunji_out = true;
			}
		},
		mark: true,
		marktext: "迅",
		intro: {
			content(storage, player) {
				const x = player.storage.xunji_x || 0;
				const hidden = player.storage.xunji_hidden;
				const status = hidden ? "脱离" : "在攻击范围内";
				return `当前X值为${x}（范围[-2,+2]），${status}`;
			},
		},
		group: ["xunji_draw"],
		subSkill: {
			xunji_draw: {
				trigger: {
					player: ["useCard", "respond", "discard"],
					global: ["dieEnd", "equip", "loseEquip"],
				},
				usable: 1,
				priority: -1,
				filter(event, player) {
					if (player.storage.xunji_out !== true) return false;
					const otherPlayers = game.players.filter(p => p !== player && p.isIn());
					if (otherPlayers.length === 0) return false;
					return otherPlayers.every(other => !other.inRange(player));
				},
				forced: true,
				async content(event, trigger, player) {
					player.storage.xunji_out = false;
					await player.draw(2);
				},
			},
		},
		ai: {
			order: 3,
			threaten(player, target) {
				const x = target.storage.xunji_x || 0;
				if (x > 0) return 0.8;
				if (x < 0) return 1.2;
				return 1;
			},
		},
	},
	gangren: {
		init(player) {
			player.storage.gangren_li = 0;
		},
		enable: "phaseUse",
		content() {
			"step 0"
			player.chooseToDiscard(1, "hej", true).set("prompt", "钢刃：弃置一张牌获得一枚<b><span style='color: #A40000'>利</span></b>标记");
			"step 1"
			if (result.bool) {
				player.storage.gangren_li++;
				player.syncStorage("gangren_li");
				player.updateMarks();
			}
		},
		mark: true,
		intro: {
			content(storage, player) {
				const li = player.storage.gangren_li || 0;
				return `拥有${li}枚<b><span style='color: #A40000'>利</span></b>标记`;
			},
		},
		ai: {
			order: 5,
			expose: 0.3,
			result: {
				player(player) {
					if (player.hasCards("he") && (player.storage.gangren_li || 0) < 2) {
						return 2;
					}
					return 0;
				},
			},
			effect: {
				player(card, player, target) {
					if (card.name === "sha") {
						const li = player.storage.gangren_li || 0;
						if (li > 0) return [0, 0, 0, 2];
						return [0, 0, 1, 0];
					}
				},
			},
		},
		group: ["gangren_damage"],
	},
	gangren_damage: {
		trigger: { player: "useCard", source: "damageBegin3" },
		forced: true,
		filter(event, player, name) {
			if (name === "useCard") return event.card && event.card.name === "sha";
			if (name === "damageBegin3") return player.storage._gangren_lower > 0;
		},
		async content(event, trigger, player) {
			if (event.triggername === "useCard") {
				const liCount = player.storage.gangren_li || 0;
				if (liCount > 0) {
					const result = await player.chooseControl(["弃置标记", "不弃置"])
						.set("prompt", `钢刃：你有${liCount}枚利标记，是否弃置一枚使此杀伤害+1？（不弃置则伤害-1并弃置目标一张牌）`)
						.set("ai", () => "弃置标记")
						.forResult();
					if (result.control === "弃置标记") {
						player.storage.gangren_li--;
						player.syncStorage("gangren_li");
						player.updateMarks();
						trigger.baseDamage = (trigger.baseDamage || 1) + 1;
						return;
					}
				}
				player.storage._gangren_lower = trigger.targets.length;
				for (const target of trigger.targets) {
					if (target && target.isIn() && target.countCards("he") > 0) {
						await player.discardPlayerCard(target, "he", true);
					}
				}
			} else if (event.triggername === "damageBegin3") {
				player.storage._gangren_lower--;
				trigger.num = Math.max(0, trigger.num - 1);
			}
		},
	},

	huaquan: {
		subSkill: {
			forced_shan: {
				mod: {
					cardRespondable(card, player) {
						if (player.storage._huaquan_forced_shan !== undefined && card.name === "shan" && card.cardid !== player.storage._huaquan_forced_shan) {
							return false;
						}
					},
					cardEnabled2(card, player) {
						if (player.storage._huaquan_forced_shan !== undefined && card.name === "shan" && card.cardid !== player.storage._huaquan_forced_shan) {
							return false;
						}
					},
				},
			},
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			if (!target || !target.isIn()) return;
			if (player.countCards("h") === 0 || target.countCards("h") === 0) {
				game.log("划拳双方必须均有手牌");
				return;
			}
			let hq = player.storage._huaquan_state;
			if (!hq) {
				hq = { target, cardsSet: [], damageBonus: false, _shaDisabled: false };
				player.storage._huaquan_state = hq;
				target.storage._huaquan_state = hq;
			}
			if (!hq.onResolve) hq.onResolve = [];
			if (!hq.onCleanup) hq.onCleanup = [];
			if (!hq.onBeforeUse) hq.onBeforeUse = [];

			const playerResult = await player.chooseCard("h", true, "划拳：请扣置一张手牌")
				.set("ai", card => 6 - get.value(card))
				.forResult();
			if (!playerResult.bool) { cleanup(); return; }
			const playerCard = playerResult.cards[0];
			const pName = playerCard.name;
			hq.playerCard = playerCard;
			hq.cardsSet.push({ name: pName, cardId: playerCard.cardid, owner: player, used: false });

			const targetResult = await target.chooseCard("h", true, "划拳：请扣置一张手牌")
				.set("ai", card => 6 - get.value(card))
				.forResult();
			if (!targetResult.bool) { cleanup(); return; }
			const targetCard = targetResult.cards[0];
			const tName = targetCard.name;
			hq.targetCard = targetCard;
			hq.cardsSet.push({ name: tName, cardId: targetCard.cardid, owner: target, used: false });

			await player.addToExpansion([playerCard], "give");
			await target.addToExpansion([targetCard], "give");

			const pShaTargetShan = pName === "sha" && tName === "shan";
			const tShaPlayerShan = tName === "sha" && pName === "shan";

			if (pShaTargetShan || tShaPlayerShan) {
				const shaUser = pShaTargetShan ? player : target;
				const shanUser = pShaTargetShan ? target : player;
				const shaCard = pShaTargetShan ? hq.playerCard : hq.targetCard;
				const shanCard = pShaTargetShan ? hq.targetCard : hq.playerCard;

				for (const fn of hq.onBeforeUse) await fn(hq, player, target);

				if (!hq._shaDisabled) {
					hq.cardsSet.forEach(c => c.used = true);

					await shaUser.gain([shaCard], "nodelay");
					await shanUser.gain([shanCard], "nodelay");

					game.log(shaUser, "翻开了扣置的", shaCard);
					game.log(shanUser, "翻开了扣置的", shanCard);

					shanUser.storage._huaquan_forced_shan = shanCard.cardid;
					shanUser.addTempSkill("huaquan_forced_shan");

					const useEvent = shaUser.useCard(shaCard, shanUser, false);
					if (hq.damageBonus) useEvent.baseDamage = (useEvent.baseDamage || 1) + 1;
					await useEvent;

					delete shanUser.storage._huaquan_forced_shan;
					shanUser.removeSkill("huaquan_forced_shan");

					if (get.position(shanCard) === "h") {
						shanUser.loseToDiscardpile([shanCard]);
						game.log(shanUser, "的扣置闪未使用，弃置之");
					} else {
						game.log(shanUser, "使用扣置闪响应了", shaUser, "的杀");
					}
				}
			} else {
				const pCard = hq.playerCard;
				const tCard = hq.targetCard;

				await player.gain([pCard], "nodelay");
				game.log(player, "翻开了扣置的", pCard);
				const playerCanUse = pName === "sha" || player.canUse(pName, target, false);
				if (playerCanUse) {
					if (pName === "sha") {
						for (const fn of hq.onBeforeUse) await fn(hq, player, target);
					}
					if (pName === "sha" && hq._shaDisabled) {
						game.log("浮风：", player, "的杀失效");
					} else {
						hq.cardsSet[0].used = true;
						const useEvent = player.useCard(pCard, [target], false);
						if (pName === "sha" && tName !== "shan") useEvent.directHit = [target];
						if (hq.damageBonus && pName === "sha") useEvent.baseDamage = (useEvent.baseDamage || 1) + 1;
						await useEvent;
					}
				} else {
					game.log(player, "的扣置牌", pCard, "无法对", target, "使用");
					hq._playerUnusable = true;
				}

				await target.gain([tCard], "nodelay");
				game.log(target, "翻开了扣置的", tCard);
				const targetCanUse = tName === "sha" || target.canUse(tName, player, false);
				if (targetCanUse) {
					if (tName === "sha") {
						for (const fn of hq.onBeforeUse) await fn(hq, player, target);
					}
					if (tName === "sha" && hq._shaDisabled) {
						game.log("浮风：", target, "的杀失效");
					} else {
						hq.cardsSet[1].used = true;
						const useEvent = target.useCard(tCard, [player], false);
						if (tName === "sha" && pName !== "shan") useEvent.directHit = [player];
						if (hq.damageBonus && tName === "sha") useEvent.baseDamage = (useEvent.baseDamage || 1) + 1;
						await useEvent;
					}
				} else {
					game.log(target, "的扣置牌", tCard, "无法对", player, "使用");
					hq._targetUnusable = true;
				}
			}

			for (const fn of hq.onResolve) {
				await fn(hq, player, target);
			}

			const pRest = hq.playerCard;
			const tRest = hq.targetCard;
			if (pRest && get.position(pRest) === "x") player.loseToDiscardpile([pRest]);
			if (tRest && get.position(tRest) === "x") target.loseToDiscardpile([tRest]);
			if (pRest && get.position(pRest) === "h") player.loseToDiscardpile([pRest]);
			if (tRest && get.position(tRest) === "h") target.loseToDiscardpile([tRest]);

			delete player.storage._huaquan_state;
			delete target.storage._huaquan_state;

			for (const fn of hq.onCleanup) {
				await fn(hq, player, target);
			}

			function cleanup() {
				if (hq.onCleanup) {
					for (const fn of hq.onCleanup) {
						fn(hq, player, target);
					}
				}
				if (hq.playerCard && get.position(hq.playerCard) === "x") player.loseToDiscardpile([hq.playerCard]);
				if (hq.targetCard && get.position(hq.targetCard) === "x") target.loseToDiscardpile([hq.targetCard]);
				delete player.storage._huaquan_state;
				delete target.storage._huaquan_state;
			}
		},
		ai: {
			basic: { order: 1, useful: 0 },
			order: 1,
			result: { target: -1 },
		},
	},

	tihu: {
		trigger: { player: "phaseUseBegin", global: "phaseUseBegin" },
		filter(event, player) {
			if (event.player === player) return player.countCards("h") > 0 && game.hasPlayer(target => target !== player && target.countCards("h") > 0);
			// 仅对敌方角色触发被动划拳，不对队友使用
			return player.countCards("h") > 0 && get.attitude(player, event.player) < 0;
		},
		async content(event, trigger, player) {
			let target;
			if (trigger.player === player) {
				const result = await player.chooseTarget("提壶：请选择一名其他角色划拳")
					.set("filterTarget", (card, p, target) => target !== p && target.countCards("h") > 0)
					.set("ai", target => get.attitude(player, target) < 0 ? 1 : 0)
					.forResult();
				if (!result.bool || !result.targets || !result.targets.length) return;
				target = result.targets[0];
			} else {
				target = trigger.player;
			}
			player.logSkill("tihu", target);
			const hq = { target, cardsSet: [], damageBonus: false };
			player.storage._huaquan_state = hq;
			target.storage._huaquan_state = hq;
			await player.useSkill("huaquan", [target]);
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
	hankuang: {
		forced: true,
		locked: true,
		trigger: { global: "useSkill" },
		filter(event, player) {
			if (event.skill !== "huaquan") return false;
			const hq = player.storage._huaquan_state;
			if (!hq || hq._hankuang_hooked) return false;
			return hq.target === player || event.player === player;
		},
		async content(event, trigger, player) {
			const hq = player.storage._huaquan_state;
			hq._hankuang_hooked = true;
			const p = trigger.player;
			const t = hq.target;

			for (const s of [p, t]) {
				s.addSkill("hankuang_jiu");
				s.storage.jiu = 1;
				s.addSkill("jiu");
				if (lib.config.jiu_effect && !s.node.jiu) {
					s.node.jiu = ui.create.div(".playerjiu", s.node.avatar);
					s.node.jiu2 = ui.create.div(".playerjiu", s.node.avatar2);
				}
			}

			if (!hq.onResolve) hq.onResolve = [];
			hq.onResolve.push(async (hq, p, t) => {
				const noSha = !hq.cardsSet.some(c => c.name && c.name === "sha");
				if (noSha) {
					if (p.hasSkill("hankuang")) {
						p.logSkill("hankuang");
						await p.draw(1);
					}
					if (t.hasSkill("hankuang")) {
						t.logSkill("hankuang");
						await t.draw(1);
					}
				}
			});

			if (!hq.onCleanup) hq.onCleanup = [];
			hq.onCleanup.push((hq, p, t) => {
				p.removeSkill("hankuang_jiu");
				t.removeSkill("hankuang_jiu");
			});
		},
		subSkill: {
			jiu: {
				charlotte: true,
				trigger: { player: "useCardAfter" },
				filter(event, player) {
					return event.card && event.card.name === "sha";
				},
				forced: true,
				async content(event, trigger, player) {
					player.storage.jiu = 1;
					player.addSkill("jiu");
					if (lib.config.jiu_effect && !player.node.jiu) {
						player.node.jiu = ui.create.div(".playerjiu", player.node.avatar);
						player.node.jiu2 = ui.create.div(".playerjiu", player.node.avatar2);
					}
				},
				onremove(player) {
					player.removeSkill("jiu");
				},
			},
		},
		ai: {
			order: 7,
			result: { player: 1 },
			damageBonus: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "damageBonus") return arg && arg.card && arg.card.name === "sha";
			},
		},
	},
	tingqiao: {
		forced: true,
		locked: true,
		trigger: { global: ["useCard", "respond"] },
		filter(event, player) {
			if (!event.card || event.card.name !== "shan") return false;
			if (!Array.isArray(event.respondTo)) return false;
			if (!event.respondTo[1] || event.respondTo[1].name !== "sha") return false;
			if (event.player !== player && event.respondTo[0] !== player) return false;
			return true;
		},
		async content(event, trigger, player) {
			player.logSkill("tingqiao");
			const shaSource = trigger.respondTo[0];
			const shaTarget = trigger.player;
			if (shaSource && shaSource.isIn() && shaTarget && shaTarget.isIn()) {
				const useEvent = shaTarget.useCard({ name: "sha", isCard: true }, shaSource, false);
				useEvent.directHit = [shaSource];
				await useEvent;
			}
			await player.draw();
		},
		ai: {
			order: 7,
			result: {
				player(player) {
					const trigger = _status.event.getTrigger();
					// 仅在被敌人攻击时用划拳反制
					if (trigger && trigger.player && get.attitude(player, trigger.player) < 0) return 1.5;
					return 0;
				},
			},
		},
	},

	chanmian: {
		forced: true,
		locked: true,
		trigger: { player: ["phaseUseBefore", "phaseDiscardBefore"] },
		async content(event, trigger, player) {
			trigger.cancel();
			const isDiscard = trigger.name === "phaseDiscard";
			game.log(player, "发动禅眠，跳过了" + (isDiscard ? "弃牌阶段" : "出牌阶段"));
			if (isDiscard) {
				player.logSkill("chanmian");
				const targetExists = game.hasPlayer(target => target !== player && target.isIn() && target.countCards("h") > 0);
				if (targetExists) {
					const result = await player.chooseTarget("禅眠：请选择一名其他角色划拳（取消则不发动）")
						.set("filterTarget", (card, p, target) => target !== p && target.countCards("h") > 0)
						.set("ai", target => get.attitude(player, target) < 0 ? 1 : 0)
						.forResult();
					if (result.bool && result.targets && result.targets.length) {
						const t = result.targets[0];
						const hq = { target: t, cardsSet: [], damageBonus: false };
						player.storage._huaquan_state = hq;
						t.storage._huaquan_state = hq;
						await player.useSkill("huaquan", [t]);
					}
				}
			}
		},
		ai: {
			order: 8,
			result: { player: 0.5 },
			halfneg: true,
		},
	},
	mengbu: {
		frequent: true,
		trigger: { global: "useSkill" },
		filter(event, player) {
			if (event.skill !== "huaquan") return false;
			const hq = player.storage._huaquan_state;
			if (!hq || hq._mengbu_hooked) return false;
			return hq.target === player || event.player === player;
		},
		firstDo: true,
		async content(event, trigger, player) {
			if (trigger && trigger.name === "useSkill" && trigger.skill === "huaquan") {
				const hq = player.storage._huaquan_state;
				if (!hq) return;
				hq._mengbu_hooked = true;
				if (!hq.onResolve) hq.onResolve = [];
				if (!hq.onCleanup) hq.onCleanup = [];
				hq.onResolve.push(async (hq, p, t) => {
					if (hq._playerUnusable && p.hasSkill("mengbu")) {
						p.logSkill("mengbu");
						await p.draw(2);
					}
					if (hq._targetUnusable && t.hasSkill("mengbu")) {
						t.logSkill("mengbu");
						await t.draw(2);
					}
				});
				hq.onCleanup.push(async (hq, p, t) => {
					if (p.hasSkill("mengbu")) await p.useSkill("mengbu");
					if (t.hasSkill("mengbu")) await t.useSkill("mengbu");
				});
				return;
			}
			if (!player.countCards("h")) return;
			player.logSkill("mengbu");
			const next = player.chooseToUse("梦步：你可使用一张牌");
			next.set("addCount", false);
			await next;
		},
		ai: {
			order: 7,
			result: { player: 1 },
		},
	},
	zhelong: {
		trigger: { global: ["useCard", "useSkill"] },
		firstDo: true,
		filter(event, player) {
			return !player.storage._huaquan_state &&
				event.player !== player &&
				event.player.isIn() &&
				get.attitude(player, event.player) < 0 &&
				event.targets && event.targets.includes(player) &&
				player.countCards("h") > 0;
		},
		async content(event, trigger, player) {
			const t = trigger.player;
			const hq = { target: t, cardsSet: [], damageBonus: false };
			player.storage._huaquan_state = hq;
			t.storage._huaquan_state = hq;
			await player.useSkill("huaquan", [t]);
		},
		ai: {
			order: 7,
			result: { player: 1 },
		},
	},

	niren: {
		forced: true,
		locked: true,
		trigger: {
			source: "damageBegin4",
		},
		filter(event, player) {
			return event.player && event.player.hp < player.hp;
		},
		async content(event, trigger, player) {
			player.logSkill("niren", trigger.player);
			trigger.cancel();
			const target = trigger.player;
			const available = target.countCards("he");
			if (available > 0) {
				await player.discardPlayerCard(target, "he", true, Math.min(available, 2));
			}
		},
		group: ["niren_sha"],
		subSkill: {
			sha: {
				charlotte: true,
				trigger: { player: "useCard" },
				round: 1,
				filter(event, player) {
					return event.card && event.card.name === "sha";
				},
				forced: true,
				async content(event, trigger, player) {
					trigger.baseDamage = (trigger.baseDamage || 1) + 1;
				},
			},
		},
		ai: {
			threaten: 1.2,
			damageBonus: true,
			skillTagFilter(player, tag, arg) {
				if (tag === "damageBonus") {
					return arg && arg.card && arg.card.name === "sha";
				}
			},
		},
	},
	huoxin: {
		trigger: { global: "phaseUseBegin" },
		filter(event, player) {
			if (event.player === player) return false;
			if (player.countCards("h") === 0 || event.player.countCards("h") === 0) return false;
			return true;
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseBool("是否对" + get.translation(trigger.player) + "发动活心？")
				.set("ai", () => get.attitude(player, trigger.player) < 0)
				.forResult();
			event.result = { bool: result.bool };
		},
		async content(event, trigger, player) {
			player.logSkill("huoxin", trigger.player);
			const target = trigger.player;
			const damageBefore = {};
			for (const p of game.filterPlayer()) {
				damageBefore[p.playerid] = p.getHistory("damage").length;
			}
			const hq = { target, cardsSet: [], damageBonus: false, _huoxin_damageBefore: damageBefore };
			player.storage._huaquan_state = hq;
			target.storage._huaquan_state = hq;
			if (!hq.onResolve) hq.onResolve = [];
			if (!hq.onCleanup) hq.onCleanup = [];
			hq.onCleanup.push((hq, p, t) => {
				let damaged = false;
				for (const pl of game.filterPlayer()) {
					if (pl.getHistory("damage").length > (hq._huoxin_damageBefore[pl.playerid] || 0)) {
						damaged = true;
						break;
					}
				}
				if (!damaged && t.isIn()) {
					t.addTempSkill("huoxin_block", { player: "phaseAfter" });
				}
			});
			await player.useSkill("huaquan", [target]);
		},
		subSkill: {
			block: {
				charlotte: true,
				mod: {
					cardEnabled2(card, player) {
						if (card.name === "sha") return false;
					},
					cardRespondable(card, player) {
						if (card.name === "sha") return false;
					},
				},
			},
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					// 仅对敌方发动划拳，禁杀效果
					if (get.attitude(player, target) < 0) return -1.5;
					return 0;
				},
			},
		},
	},
	feiyu: {
		frequent: true,
		trigger: { global: "useSkill" },
		filter(event, player) {
			if (event.skill !== "huaquan") return false;
			const hq = player.storage._huaquan_state;
			if (!hq) return false;
			if (hq._feiyu_triggered && hq._feiyu_triggered.includes(player)) return false;
			return true;
		},
		firstDo: true,
		async content(event, trigger, player) {
			const hq = player.storage._huaquan_state;
			if (!hq._feiyu_triggered) hq._feiyu_triggered = [];
			hq._feiyu_triggered.push(player);

			if (player.hp === 1) {
				hq.damageBonus = true;
				const result = await player
					.chooseBool("飞御：是否摸两张牌？")
					.set("ai", () => true)
					.forResult();
				if (result.bool) {
					await player.draw(2);
				}
			}

			const feiyuOwner = player;
			if (!hq.onResolve) hq.onResolve = [];
			hq.onResolve.push(async (hq, hqInitiator, hqTarget) => {
				if (!feiyuOwner.isIn()) return;
				const isInitiator = feiyuOwner === hqInitiator;
				const myCard = isInitiator ? hq.playerCard : hq.targetCard;
				const opponent = isInitiator ? hqTarget : hqInitiator;
				const otherCard = isInitiator ? hq.targetCard : hq.playerCard;
				if (!myCard || !otherCard || !opponent.isIn()) return;
				if (typeof myCard.number !== "number" || typeof otherCard.number !== "number") return;
				if (myCard.number > otherCard.number) {
					feiyuOwner.logSkill("feiyu", opponent);
					await feiyuOwner.chooseToUse({
						filterCard(card, player) {
							if (get.itemtype(card) !== "card" || get.position(card) !== "h") return false;
							return card.name === "sha" && lib.filter.cardEnabled(card, player);
						},
						filterTarget(card, player, target) {
							return target === opponent;
						},
						prompt: "飞御：你可使用一张杀",
						selectCard: [1, 1],
						addCount: false,
					}).set("ai", () => get.effect(opponent, { name: "sha" }, feiyuOwner, feiyuOwner) > 0 ? 1 : 0);
				}
			});
		},
		ai: {
			order: 5,
			result: { player: 1 },
		},
	},

	gongfang: {
		frequent: true,
		derivation: ["hengdao", "qingdun"],
		trigger: {
			global: "gameStart",
			player: ["useCardAfter", "respondAfter"],
		},
		filter(event, player, triggername) {
			if (triggername === "gameStart") return true;
			if (triggername === "useCardAfter" || triggername === "respondAfter") {
				return event.card && (event.card.name === "sha" || event.card.name === "shan");
			}
			return false;
		},
		async content(event, trigger, player) {
			if (event.triggername === "gameStart") {
				const result = await player
					.chooseControl(["横刀", "擎盾"])
					.set("prompt", "攻防：请选择初始第二技能")
					.set("ai", () => "横刀")
					.forResult();
				player.addSkill(result.control === "横刀" ? "hengdao" : "qingdun");
				game.log(player, "选择了初始第二技能" + result.control);
				await player.draw();
				return;
			}
			const hasHengdao = player.hasSkill("hengdao");
			const result = await player
				.chooseControl([hasHengdao ? "擎盾" : "横刀"], "cancel2")
				.set("prompt", "攻防：是否切换第二技能？（当前为" + (hasHengdao ? "横刀" : "擎盾") + "）")
				.set("ai", () => {
					// 根据战斗阶段决定切换：进攻阶段用横刀（闪多），防守阶段用擎盾
					if (hasHengdao) {
						// 当前横刀，考虑切换擎盾：低血量/闪少时切
						if (player.hp <= 2 || player.countCards("h", "shan") === 0) return "擎盾";
						return "cancel2";
					} else {
						// 当前擎盾，考虑切换横刀：杀多时切
						if (player.countCards("h", "sha") >= 2 && player.hujia > 0) return "横刀";
						return "cancel2";
					}
				})
				.forResult();
			if (result.control !== "cancel2") {
				player.logSkill("gongfang");
				player.removeSkill(hasHengdao ? "hengdao" : "qingdun");
				player.addSkill(result.control === "横刀" ? "hengdao" : "qingdun");
				game.log(player, "切换第二技能为" + result.control);
				await player.draw();
			}
		},
		ai: {
			order: 1,
			result: { player: 1 },
		},
	},
	hengdao: {
		enable: ["chooseToUse", "chooseToRespond"],
		position: "hs",
		prompt: "将闪当杀、杀当闪、桃当决斗使用或打出",
		viewAs(cards, player) {
			if (cards.length) {
				const name = get.name(cards[0], player);
				if (name === "sha") return { name: "shan" };
				if (name === "shan") return { name: "sha" };
				if (name === "tao") return { name: "juedou" };
			}
			return null;
		},
		filterCard(card, player, event) {
			event = event || _status.event;
			const filter = event._backup.filterCard;
			const name = get.name(card, player);
			if (name === "sha" && filter({ name: "shan", cards: [card] }, player, event)) return true;
			if (name === "shan" && filter({ name: "sha", cards: [card] }, player, event)) return true;
			if (name === "tao" && filter({ name: "juedou", cards: [card] }, player, event)) return true;
			return false;
		},
		filter(event, player) {
			const filter = event.filterCard;
			if (filter(get.autoViewAs({ name: "sha" }, "unsure"), player, event) && player.countCards("hs", "shan")) return true;
			if (filter(get.autoViewAs({ name: "shan" }, "unsure"), player, event) && player.countCards("hs", "sha")) return true;
			if (filter(get.autoViewAs({ name: "juedou" }, "unsure"), player, event) && player.countCards("hs", "tao")) return true;
			return false;
		},
		check(card) {
			const val = get.value(card);
			if (get.name(card) === "tao") return 7 - val;
			return 6 - val;
		},
		ai: {
			order: 2,
			result: { player: 1 },
			respondSha: true,
			respondShan: true,
			skillTagFilter(player, tag) {
				if (tag === "respondSha") return player.countCards("hs", "shan") > 0;
				if (tag === "respondShan") return player.countCards("hs", "sha") > 0;
			},
		},
		group: ["hengdao_drawphase", "hengdao_afterDraw", "hengdao_damage"],
		subSkill: {
			drawphase: {
				trigger: { player: "phaseDrawBegin1" },
				filter(event, player) {
					return !event.numFixed;
				},
				async content(event, trigger, player) {
					const hujia = player.hujia || 0;
					if (hujia > 0) {
						const result = await player
							.chooseBool("横刀：是否清空护盾（" + hujia + "点），多摸" + hujia * 2 + "张牌？")
							.set("ai", () => 1)
							.forResult();
						if (result.bool) {
							player.logSkill("hengdao");
							await player.changeHujia(-hujia);
							trigger.num += hujia * 2;
						}
					} else {
						const result = await player
							.chooseBool("横刀：你没有护盾，是否失去一点体力并令本回合使用转化牌造成的伤害+1？")
							.set("ai", () => player.hp > 2 ? 1 : 0)
							.forResult();
						if (result.bool) {
							player.logSkill("hengdao");
							await player.loseHp();
							player.addTempSkill("hengdao_damage", { player: "phaseAfter" });
							player.storage.hengdao_damage = true;
						}
					}
				},
			},
			afterDraw: {
				trigger: { player: ["useCard", "respond"] },
				filter(event, player) {
					return event.skill === "hengdao";
				},
				forced: true,
				async content(event, trigger, player) {
					player.logSkill("hengdao");
					await player.draw();
				},
			},
			damage: {
				charlotte: true,
				trigger: { player: "useCardToPlayered" },
				filter(event, player) {
					return event.skill === "hengdao" && player.storage.hengdao_damage;
				},
				forced: true,
				async content(event, trigger, player) {
					const evt = trigger.getParent();
					if (evt) evt.baseDamage = (evt.baseDamage || 1) + 1;
				},
			},
		},
	},
	qingdun: {
		mod: {
			cardname(card, player, name) {
				if (name === "shan") return "sha";
			},
		},
		enable: ["chooseToUse", "chooseToRespond"],
		position: "hs",
		prompt: "将一张闪当杀使用或打出",
		viewAs(cards, player) {
			if (cards.length && get.name(cards[0], player) === "shan") {
				return { name: "sha" };
			}
			return null;
		},
		filterCard(card, player, event) {
			event = event || _status.event;
			const filter = event._backup.filterCard;
			if (get.name(card, player) === "shan" && filter({ name: "sha", cards: [card] }, player, event)) return true;
			return false;
		},
		filter(event, player) {
			const filter = event.filterCard;
			return filter(get.autoViewAs({ name: "sha" }, "unsure"), player, event) && player.countCards("hs", "shan") > 0;
		},
		check(card) {
			return 5 - get.value(card);
		},
		ai: {
			order: 2,
			result: { player: 1 },
			respondSha: true,
			skillTagFilter(player) {
				return player.countCards("hs", "shan") > 0;
			},
		},
		group: ["qingdun_drawphase", "qingdun_prevent", "qingdun_counter", "qingdun_reset"],
		subSkill: {
			drawphase: {
				trigger: { player: "phaseDrawBegin1" },
				filter(event, player) {
					return !event.numFixed;
				},
				async content(event, trigger, player) {
					const result = await player
						.chooseBool("擎盾：是否少摸一张牌并获得一点护盾？")
						.set("ai", () => 1)
						.forResult();
					if (result.bool) {
						player.logSkill("qingdun");
						trigger.num--;
						await player.changeHujia(1);
					}
				},
			},
			prevent: {
				trigger: { player: "damageBegin3" },
				filter(event, player) {
					if (player.storage.qingdun_prevented) return false;
					if (!event.card || event.card.name !== "sha") return false;
					const evt = event.getParent("useCard");
					if (!evt || evt.player === player) return false;
					return true;
				},
				forced: true,
				async content(event, trigger, player) {
					player.logSkill("qingdun");
					player.storage.qingdun_prevented = true;
					trigger.cancel();
					game.log(player, "防止了" + get.translation(trigger.player) + "的杀伤害");
				},
			},
			counter: {
				trigger: { target: "useCardToPlayered" },
				filter(event, player) {
					if (!event.card || event.card.name !== "sha") return false;
					if (event.player === player) return false;
					return true;
				},
				async content(event, trigger, player) {
					const source = trigger.player;
					if (!source || !source.isIn()) return;
					const result = await player
						.chooseBool("擎盾：是否对" + get.translation(source) + "使用一张杀？")
						.set("ai", () => get.attitude(player, source) < 0 ? 1 : 0)
						.forResult();
					if (result.bool) {
						player.logSkill("qingdun", source);
						await player.chooseToUse({
							filterCard(card, player) {
								if (get.itemtype(card) === "card" && get.position(card) !== "h") return false;
								return (card.name === "sha" || card.name === "shan") && lib.filter.cardEnabled(card, player);
							},
							filterTarget(card, player, target) {
								return target === source;
							},
							prompt: "擎盾：对" + get.translation(source) + "使用一张杀",
							addCount: false,
						}).set("ai", () => get.effect(source, { name: "sha" }, player, player) > 0 ? 1 : 0);
					}
				},
			},
			reset: {
				trigger: { player: "roundStart" },
				forced: true,
				silent: true,
				content() {
					delete player.storage.qingdun_prevented;
				},
			},
		},
	},
	
	chifan: {
		forced: true,
		locked: true,
		trigger: { player: "phaseZhunbeiBegin" },
		async content(event, trigger, player) {
			let given = false;
			const others = game.players.filter(p => p !== player && p.isIn() && p.countCards("h") > 0).sortBySeat(player);
			for (const p of others) {
				const result = await p
					.chooseCard("h", "吃饭：是否给" + get.translation(player) + "一张牌？")
					.set("ai", card => {
						if (get.attitude(p, player) > 0) {
							if (get.name(card) === "sha") return 10 - get.value(card);
							return 6 - get.value(card);
						}
						return -1;
					})
					.forResult();
				if (result.bool) {
					given = true;
					const card = result.cards[0];
					await p.give(card, player);
					await p.draw();
					game.log(p, "给了", player, "一张", card);
					if (get.name(card) === "sha") {
						await p.draw();
						game.log(p, "因为给的是杀，再摸一张牌");
					}
				}
			}
			if (!given) await player.draw();
		},
	},
	youxi: {
		forced: true,
		locked: true,
		trigger: { global: "useCardToBefore" },
		filter(event, player) {
			return event.card.name === "sha" && (event.player === player || event.targets.includes(player));
		},
		async content(event, trigger, player) {
			const target = trigger.targets.find(t => t.isIn());
			if (!target) return;
			const result = await target
				.chooseToUse({
					filterCard: (card) => get.name(card) === "sha" && lib.filter.cardEnabled(card, target),
					filterTarget: (card, player, t) => t !== player,
					prompt: "游戏：是否使用一张杀（无距离限制）？若不使用则无法响应此杀",
					addCount: false,
				})
				.set("ai", () => {
					// 应该出杀回应，否则自身无法响应此杀（等于必中）
					return get.effect(target, { name: "sha" }, player, target) > 0 ? 1 : 0;
				})
				.forResult();
			if (!result.bool) {
				if (!Array.isArray(trigger.directHit)) trigger.directHit = [];
				trigger.directHit.push(target);
			}
		},
	},
	lingdi: {
		forced: true,
		locked: true,
		mod: {
			targetEnabled(card, player, target) {
				if (card.name === "sha" && target.hasSkill("lingdi") && target.isTurnedOver()) return false;
			},
		},
	},
	shuijiao: {
		frequent: true,
		trigger: { player: ["phaseDrawEnd", "phaseJieshu"] },
		filter(event, player) {
			if (event.name === "phaseDrawEnd" && player.isTurnedOver()) return false;
			return true;
		},
		async content(event, trigger, player) {
			const isDraw = event.triggername === "phaseDrawEnd";
			const prompt = isDraw
				? "睡觉：是否翻面并跳过回合，然后回复一点体力？"
				: "睡觉：是否翻面并摸三张牌？";
			const result = await player.chooseBool(prompt).set("logSkill", "shuijiao").set("ai", () => {
				if (isDraw) {
					// 摸牌结束翻面+回血：低血量/低手牌时值得
					if (player.isDamaged()) return 1;
					return 0.5;
				}
				// 结束阶段翻面+摸3牌：手牌少时值得
				if (player.countCards("h") <= 2) return 1;
				return 0.3;
			}).forResult();
			if (!result.bool) return;
			await player.turnOver();
			if (isDraw) {
				const phaseEvent = trigger.getParent("phase");
				if (phaseEvent && phaseEvent.phaseList) {
					phaseEvent.phaseList.length = phaseEvent.num + 1;
				}
				await player.recover();
			} else {
				await player.draw(3);
			}
		},
	},

	shazhang: {
		audio: 2,
		mod: {
			cardRecastable(card, player) {
				const info = get.info(card);
				if (info && info.type === "equip" && info.subtype === "equip1") {
					return true;
				}
			},
			targetInRange(card, player, target) {
				if (card.name === "sha" && get.suit(card) === "spade" && player.getEquips(1).length === 0) {
					return true;
				}
			},
			cardUsable(card, player, num) {
				if (card.name === "sha" && get.suit(card) === "spade" && player.getEquips(1).length === 0) {
					return true;
				}
			},
		},
		group: ["shazhang_spade_stat", "shazhang_spade_hit", "shazhang_club"],
		subSkill: {
			spade_stat: {
				trigger: { player: "useCardAfter" },
				forced: true,
				popup: false,
				filter(event, player) {
					if (!event.card || event.card.name !== "sha") return false;
					if (get.suit(event.card) !== "spade") return false;
					return player.getEquips(1).length === 0;
				},
				content(event, trigger, player) {
					var s = player.stat[player.stat.length - 1];
					if (s && s.card && s.card.sha > 0) s.card.sha--;
				},
			},
			spade_hit: {
				trigger: { player: "useCardToTargeted" },
				forced: true,
				filter(event, player) {
					if (!event.card || event.card.name !== "sha") return false;
					if (get.suit(event.card) !== "spade") return false;
					return player.getEquips(1).length === 0;
				},
				content(event, trigger, player) {
					player.logSkill("shazhang", trigger.targets[0]);
					trigger.directHit.addArray(trigger.targets);
				},
			},
			club: {
				trigger: { player: "shaHit" },
				filter(event, player) {
					if (!event.card || event.card.name !== "sha") return false;
					if (get.suit(event.card) !== "club") return false;
					return player.getEquips(1).length === 0;
				},
				forced: true,
				async content(event, trigger, player) {
					const target = trigger.target;
					player.logSkill("shazhang", target);
					player.storage._shazhang_club_card = trigger.card;
					player.addTempSkill("shazhang_club_damage");
					if (target && target.isIn()) {
						player.logSkill("shazhang", target);
						await applyShazhangSilent(target);
					}
				},
			},
			club_damage: {
				trigger: { source: "damageBegin1" },
				charlotte: true,
				forced: true,
				popup: false,
				filter(event, player) {
					return event.card && event.card === player.storage._shazhang_club_card;
				},
				content(event, trigger, player) {
					trigger.num++;
				},
			},
			club_silent: {
				init(player, skill) {
					player.addSkillBlocker(skill);
				},
				onremove(player, skill) {
					player.removeSkillBlocker(skill);
				},
				trigger: { player: ["phaseAfter", "dieBegin"] },
				forced: true,
				popup: false,
				content(event, trigger, player) {
					player.removeSkill("shazhang_club_silent");
				},
				charlotte: true,
				mark: true,
				marktext: "禁",
				intro: { content: "非锁定技失效" },
				skillBlocker(skill, player) {
					const info = get.info(skill);
					if (!info) return false;
					if (info.locked || info.forced || info.juexingji) return false;
					return true;
				},
			},
		},
		ai: {
			order: 5,
			threaten: 1.5,
			directHit_ai: true,
			result: { player: 1 },
		},
	},
	xuegong: {
		audio: 2,
		forced: true,
		locked: true,
		group: ["xuegong_damage", "xuegong_hurt", "xuegong_hurt_capture", "xuegong_tao"],
		mark: true,
		marktext: "剑",
		intro: {
			mark(dialog, storage, player) {
				if (player.hasSkill("xuegong")) {
					const allPoints = new Set();
					for (const p of game.players.concat(game.dead)) {
						const cards = p.getExpansions("xuegong");
						for (const card of cards) {
							const num = get.number(card);
							if (typeof num === "number") allPoints.add(num);
						}
					}
					const sorted = [...allPoints].sort((a, b) => a - b);
					return "七剑点数：" + (sorted.length ? sorted.join("、") : "无") + "（" + allPoints.size + "/7）";
				}
				const ownCards = player.getExpansions("xuegong");
				if (ownCards.length) {
					dialog.addSmall(ownCards);
				} else {
					return "暂无七剑标记";
				}
			},
			content(storage, player) {
				const allPoints = new Set();
				for (const p of game.players.concat(game.dead)) {
					const cards = p.getExpansions("xuegong");
					for (const card of cards) {
						const num = get.number(card);
						if (typeof num === "number") allPoints.add(num);
					}
				}
				const sorted = [...allPoints].sort((a, b) => a - b);
				return "七剑点数：" + (sorted.length ? sorted.join("、") : "无") + "（" + allPoints.size + "/7）";
			},
		},
		subSkill: {
			damage: {
				trigger: { source: "damageEnd" },
				forced: true,
				filter(event, player) {
					return event.num > 0;
				},
				async content(event, trigger, player) {
					for (let i = 0; i < trigger.num; i++) {
						const available = [];
						if (player.hp < Math.min(8, player.maxHp)) available.push("回复一点体力");
						if (player.maxHp < 8) available.push("增加一点体力上限（至多为八）");
						if (!available.length) return;

						let result;
						if (available.length === 1) {
							result = available[0];
						} else {
							const ctrl = await player.chooseControl(...available)
								.set("prompt", "血功：请选择一项（第" + (i + 1) + "/" + trigger.num + "次）")
								.set("ai", () => player.hp < player.maxHp ? "回复一点体力" : "增加一点体力上限（至多为八）")
								.forResult();
							result = ctrl.control;
						}
						if (result === "回复一点体力") {
							await player.recover(1);
						} else if (result === "增加一点体力上限（至多为八）") {
							const prevHp = player.hp;
							player.storage._xuegong_adjusting = true;
							await player.loseMaxHp(-1);
							delete player.storage._xuegong_adjusting;
							if (player.hp > prevHp) {
								player.hp = prevHp;
								player.update();
							}
						}
						const newAvailable = [];
						if (player.hp < Math.min(8, player.maxHp)) newAvailable.push("回复一点体力");
						if (player.maxHp < 8) newAvailable.push("增加一点体力上限（至多为八）");
						if (!newAvailable.length) return;
					}
				},
				ai: { order: 10, result: { player: 2 } },
			},
			hurt: {
				trigger: { player: "damageEnd" },
				forced: true,
				filter(event, player) {
					return event.source && event.source.isIn() && player.storage._xuegong_captured;
				},
				async content(event, trigger, player) {
					const source = trigger.source;
					if (!source.isIn()) return;
					const captured = player.storage._xuegong_captured;
					delete player.storage._xuegong_captured;
					const card = game.createCard({
						name: captured.name || "sha",
						suit: captured.suit || "none",
						number: typeof captured.number === "number" ? captured.number : 0,
					});
					if (card.$init) card.$init([card.suit, card.number, card.name, card.nature || ""]);
					const next = source.addToExpansion(card, source, "give");
					next.gaintag.add("xuegong");
					await next;
					await checkXuegongQijian(player);
				},
			},
			hurt_capture: {
				trigger: { player: "damageBegin1" },
				forced: true,
				silent: true,
				popup: false,
				filter(event, player) {
					return event.source && event.source.isIn() && event.card;
				},
				content(event, trigger, player) {
					const card = trigger.card;
					player.storage._xuegong_captured = {
						name: card.name,
						suit: card.suit,
						number: card.number,
					};
				},
			},
			tao: {
				trigger: { player: "useCardAfter" },
				forced: true,
				filter(event, player) {
					const card = event.card;
					if (!card || card.name !== "tao") return false;
					return get.suit(card) === "heart" && get.number(card) === 7;
				},
				async content(event, trigger, player) {
					player.logSkill("xuegong");
					for (const p of game.players.concat(game.dead)) {
						const cards = p.getExpansions("xuegong");
						if (cards.length) p.loseToDiscardpile(cards);
					}
				},
			},
		},
		ai: { order: 10, result: { player: 2 } },
	},

};

async function applyShazhangSilent(target) {
	target.addSkills("shazhang_club_silent");
}

async function checkXuegongQijian(heixinhu) {
	const allPoints = new Set();
	for (const p of game.players.concat(game.dead)) {
		const cards = p.getExpansions("xuegong");
		for (const card of cards) {
			const num = get.number(card);
			if (typeof num === "number") allPoints.add(num);
		}
	}
	if (allPoints.size >= 7) {
		heixinhu.logSkill("xuegong");
		game.log("七剑合璧！");
		for (const p of game.players.concat(game.dead)) {
			const cards = p.getExpansions("xuegong");
			if (cards.length) p.loseToDiscardpile(cards);
		}
		await heixinhu.loseMaxHp(7);
		const skills = heixinhu.getSkills(null, false);
		for (const skill of skills) {
			heixinhu.removeSkill(skill);
		}
	}
}

export default skill;
