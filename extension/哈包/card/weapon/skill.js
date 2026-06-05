import { lib, game, ui, get, ai, _status } from "../../main/utils.js";

/** @type { importCharacterConfig['skill'] } */
const skill = {
	danfenzi_xian_skill: {
		trigger: { player: "useCardAfter" },
		filter(event, player) {
			return event.card.name == "sha" && event.targets && event.targets.length > 0 && event.targets[0].isIn();
		},
		async cost(event, trigger, player) {
			const target = trigger.targets[0];
			event.result = await player
				.chooseBool(`是否发动【单分子线】视为对${get.translation(target)}使用一张过河拆桥？`)
				.set("ai", () => get.attitude(player, target) <= 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const target = trigger.targets[0];
			await player.useCard(get.autoViewAs({ name: "guohe" }), [target]);
		},
	},

	shedan_fashe_xitong_skill: {
		trigger: { player: "useCard" },
		forced: true,
		locked: true,
		firstDo: true,
		filter(event, player) {
			return event.card.name == "sha" && event.targets && event.targets.length > 0;
		},
		async content(event, trigger, player) {
			const firstTarget = trigger.targets[0];
			const extras = game.filterPlayer(current => {
				if (current == player) return false;
				if (trigger.targets.includes(current)) return false;
				return get.distance(firstTarget, current) <= 1;
			});
			if (extras.length) {
				trigger.targets.addArray(extras);
				game.log(player, "发动了【射弹发射系统】，额外指定了", extras, "为目标");
			}
		},
	},

	daxingxing_shoubei_skill: {
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.player.isIn();
		},
		async cost(event, trigger, player) {
			const choices = [];
			if (player.hujia > 0) choices.push("失去1点护盾");
			if (player.hp > 0) choices.push("失去1点体力");
			choices.push("cancel2");
			if (choices.length <= 1) return false;
			event.result = await player
				.chooseControl(choices)
				.set("prompt", `是否发动【大猩猩手臂】令${get.translation(trigger.player)}本回合无法出牌？`)
				.set("ai", () => {
					if (player.hp <= 1 && player.hujia > 0) return choices.indexOf("失去1点护盾");
					if (player.hujia > 0) return choices.indexOf("失去1点护盾");
					if (get.attitude(player, trigger.player) < 0 && player.hp > 2) return choices.indexOf("失去1点体力");
					return choices.indexOf("cancel2");
				})
				.forResult();
			return event.result.control !== "cancel2";
		},
		async content(event, trigger, player) {
			const choice = event.result.control;
			if (choice === "失去1点护盾") {
				await player.changeHujia(-1);
			} else if (choice === "失去1点体力") {
				await player.loseHp();
			}
			trigger.player.addTempSkill("daxingxing_shoubei_block", "phaseAfter");
			trigger.player.addMark("daxingxing_shoubei_block", 1, false);
		},
	},

	daxingxing_shoubei_block: {
		mark: true,
		marktext: "封",
		intro: {
			content: "本回合无法出牌",
		},
		mod: {
			cardEnabled(card, player) {
				return false;
			},
			cardRespondable(card, player) {
				return false;
			},
		},
	},

	tanglang_dao_skill: {
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.card && event.card.name == "sha" && event.player.isIn();
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(`是否发动【螳螂刀】判定？若结果为红色则追加1点伤害。`)
				.set("ai", () => get.attitude(player, trigger.player) < 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const judgeEvent = player.judge(card => {
				if (get.color(card) == "red") return 2;
				return -2;
			});
			judgeEvent.judge2 = result => result.bool;
			const result = await judgeEvent.forResult();
			if (result.bool) {
				await trigger.player.damage();
			}
		},
	},
};

export default skill;
