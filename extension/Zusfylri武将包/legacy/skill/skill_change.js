game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_change",

        character: {},

        skill: {
            // “镜”标记本体
            zus_jing: {
                marktext: "镜",
                intro: {
                    name: "镜",
                    content: "mark",
                },
            },

            // 月照：回合开始阶段限一次，你可以指定场上一名角色，
            // 令其打出1张闪并对你造成1点伤害，否则其减少1点体力上限。
            zus_yuezhao: {
                trigger: {
                    player: "phaseBegin",
                },
                direct: true,

                filter: function (event, player) {
                    return game.hasPlayer(function (current) {
                        return current.isIn();
                    });
                },

                content: function () {
                    "step 0"
                    player.chooseTarget(
                        "是否发动【月照】，令一名角色打出【闪】并对你造成1点伤害，否则其减少1点体力上限？",
                        function (card, player, target) {
                            return target.isIn();
                        }
                    ).set("ai", function (target) {
                        var player = _status.event.player;
                        var att = get.attitude(player, target);

                        if (att < 0) return -att + Math.max(0, 4 - target.countCards("h"));
                        if (target == player && player.hp > 1) return 0.5;
                        return 0;
                    });

                    "step 1"
                    if (!result.bool || !result.targets || !result.targets.length) {
                        event.finish();
                        return;
                    }

                    event.target = result.targets[0];
                    player.logSkill("zus_yuezhao", event.target);

                    event.target.chooseToRespond(
                        "月照：请打出一张【闪】，并对" + get.translation(player) + "造成1点伤害；否则你减少1点体力上限",
                        function (card, player) {
                            return get.name(card, player) == "shan";
                        }
                    ).set("ai", function (card) {
                        var player = _status.event.player;
                        var source = _status.event.sourcex;

                        // 若嫦娥是敌人，倾向打出闪来伤害她；若是队友，倾向不打
                        if (get.attitude(player, source) < 0) {
                            return 8 - get.value(card);
                        }

                        return 2 - get.value(card);
                    }).set("sourcex", player);

                    "step 2"
                    if (result.bool) {
                        if (event.target && event.target.isIn() && player.isIn()) {
                            // 嫦娥受到1点伤害，伤害来源为打出闪的角色
                            player.damage(1, event.target);
                        }
                    } else {
                        if (event.target && event.target.isIn()) {
                            event.target.loseMaxHp();
                        }
                    }
                },
            },

            // 蟾镜：每当你受到伤害，你令伤害来源获得1枚镜；
            // 每当有镜的角色受到伤害，你可移除其1枚镜，然后回复或月照。
            zus_chanjing: {
                forced: true,
                locked: true,
                group: ["zus_chanjing_gain", "zus_chanjing_trigger"],
            },

            // 你受到伤害后，伤害来源获得镜
            zus_chanjing_gain: {
                trigger: {
                    player: "damageEnd",
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    return event.source && event.source.isIn();
                },

                content: function () {
                    trigger.source.addMark("zus_jing", 1, false);
                    trigger.source.markSkill("zus_jing");
                    game.log(trigger.source, "获得了1枚", "#g【镜】");
                },
            },

            // 有镜角色受到伤害后，嫦娥可以移除镜并选择回复或月照
            zus_chanjing_trigger: {
                trigger: {
                    global: "damageEnd",
                },
                direct: true,

                filter: function (event, player) {
                    if (!event.player || !event.player.isIn()) return false;
                    if (event.player.countMark("zus_jing") <= 0) return false;
                    return player.isIn();
                },

                content: function () {
                    "step 0"
                    event.target = trigger.player;

                    player.chooseBool("是否发动【蟾镜】，移除" + get.translation(event.target) + "的1枚“镜”？")
                        .set("ai", function () {
                            var player = _status.event.player;
                            var target = _status.event.targetx;

                            if (get.attitude(player, target) < 0) return true;
                            if (player.isDamaged && player.isDamaged()) return true;
                            return false;
                        })
                        .set("targetx", event.target);

                    "step 1"
                    if (!result.bool || !event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    player.logSkill("zus_chanjing", event.target);

                    event.target.removeMark("zus_jing", 1, false);
                    if (event.target.countMark("zus_jing") > 0) {
                        event.target.markSkill("zus_jing");
                    } else {
                        event.target.unmarkSkill("zus_jing");
                    }

                    player.chooseControl("回复1点体力", "对其发动月照")
                        .set("prompt", "蟾镜：选择一项")
                        .set("ai", function () {
                            var player = _status.event.player;
                            var target = _status.event.targetx;

                            if (get.attitude(player, target) < 0) return "对其发动月照";
                            if (player.isDamaged && player.isDamaged()) return "回复1点体力";
                            return "对其发动月照";
                        })
                        .set("targetx", event.target);

                    "step 2"
                    if (result.control == "回复1点体力") {
                        if (player.isIn()) {
                            player.recover();
                        }
                        event.finish();
                        return;
                    }

                    if (!event.target || !event.target.isIn() || !player.isIn()) {
                        event.finish();
                        return;
                    }

                    event.target.chooseToRespond(
                        "蟾镜·月照：请打出一张【闪】，并对" + get.translation(player) + "造成1点伤害；否则你减少1点体力上限",
                        function (card, player) {
                            return get.name(card, player) == "shan";
                        }
                    ).set("ai", function (card) {
                        var player = _status.event.player;
                        var source = _status.event.sourcex;

                        // 若嫦娥是敌人，倾向打出闪来伤害她；若是队友，倾向不打
                        if (get.attitude(player, source) < 0) {
                            return 8 - get.value(card);
                        }

                        return 2 - get.value(card);
                    }).set("sourcex", player);

                    "step 3"
                    if (result.bool) {
                        if (event.target && event.target.isIn() && player.isIn()) {
                            // 嫦娥受到1点伤害，伤害来源为打出闪的角色
                            player.damage(1, event.target);
                        }
                    } else {
                        if (event.target && event.target.isIn()) {
                            event.target.loseMaxHp();
                        }
                    }
                },
            },
        },

        translate: {
            zus_yuezhao: "月照",
            zus_yuezhao_info: "回合开始阶段限一次，你可以指定场上一名角色，令其打出1张【闪】并对你造成1点伤害，否则其减少1点体力上限。",

            zus_chanjing: "蟾镜",
            zus_chanjing_info: "每当你受到伤害，你令伤害来源获得1枚“镜”；每当有“镜”的角色受到伤害，你可以移除其1枚“镜”，然后你选择一项：1. 你回复1点体力；2. 你立即对其发动一次【月照】。",

            zus_jing: "镜",
            zus_jing_info: "“镜”标记。拥有者受到伤害时，嫦娥可以移除其1枚“镜”，然后回复1点体力或对其发动一次【月照】。",
        },
    };
});