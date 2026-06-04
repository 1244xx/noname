game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_hongxiuquan",

        character: {},

        skill: {
            // 灼掠：其他角色的出牌阶段开始时限一次，你可以失去1点体力，
            // 令其交给你一半数量的手牌（向下取整），并将其武将牌横置。
            zus_zhuolue: {
                trigger: {
                    global: "phaseUseBegin",
                },
                direct: true,

                filter: function (event, player) {
                    if (!event.player || event.player == player) return false;
                    if (!player.isIn() || !event.player.isIn()) return false;
                    if (player.hp <= 0) return false;
                    return true;
                },

                content: function () {
                    "step 0"
                    event.target = trigger.player;

                    player.chooseBool(
                        "是否发动【灼掠】，失去1点体力，令" +
                            get.translation(event.target) +
                            "交给你一半数量的手牌并将其横置？"
                    ).set("ai", function () {
                        var player = _status.event.player;
                        var target = _status.event.targetx;

                        if (!target) return false;

                        var att = get.attitude(player, target);
                        if (att >= 0) return false;

                        var num = Math.floor(target.countCards("h") / 2);
                        return num > 0 || !target.isLinked();
                    }).set("targetx", event.target);

                    "step 1"
                    if (!result.bool) {
                        event.finish();
                        return;
                    }

                    player.logSkill("zus_zhuolue", event.target);
                    player.loseHp();

                    "step 2"
                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    event.num = Math.floor(event.target.countCards("h") / 2);

                    if (event.num > 0) {
                        if (event.target.countCards("h") <= event.num) {
                            event.target.give(event.target.getCards("h"), player);
                            event.goto(4);
                        } else {
                            event.target.chooseCard(
                                "h",
                                true,
                                event.num,
                                "灼掠：交给" + get.translation(player) + event.num + "张手牌"
                            ).set("ai", function (card) {
                                return -get.value(card);
                            });
                        }
                    } else {
                        event.goto(4);
                    }

                    "step 3"
                    if (result.bool && result.cards && result.cards.length) {
                        event.target.give(result.cards, player);
                    }

                    "step 4"
                    if (event.target && event.target.isIn() && !event.target.isLinked()) {
                        event.target.link();
                    }
                },

                ai: {
                    expose: 0.25,
                },
            },

            // 均田：锁定技，你的手牌上限始终等于体力上限；
            // 当你获得牌后，或游戏初始发牌后，若你的手牌数不小于手牌上限，
            // 你须按任意顺序分给每名其他角色各1张手牌并弃置剩余手牌，然后选择一项。
            zus_juntian: {
                forced: true,
                locked: true,
                group: ["zus_juntian_check"],

                mod: {
                    maxHandcard: function (player, num) {
                        return player.maxHp;
                    },
                },
            },

            // 每次获得牌后、以及游戏初始发牌后检测【均田】
            zus_juntian_check: {
                trigger: {
                    player: "gainAfter",
                    global: "gameDrawAfter",
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    if (!player.isIn()) return false;
                    if (player.storage.zus_juntian_doing) return false;

                    var limit = player.maxHp;
                    if (limit < 0) return false;

                    return player.countCards("h") >= limit;
                },

                content: function () {
                    "step 0"
                    Sync.setStorage(player, "zus_juntian_doing", true);

                    event.targets = game.filterPlayer(function (current) {
                        return current != player && current.isIn();
                    });

                    event.given = [];
                    event.targets.sortBySeat(player);

                    "step 1"
                    if (!player.countCards("h") || event.given.length >= event.targets.length) {
                        event.goto(4);
                        return;
                    }

                    player.chooseTarget(
                        true,
                        "均田：选择一名未获得过牌的其他角色并交给其1张手牌",
                        function (card, player, target) {
                            return target != player &&
                                _status.event.targets.indexOf(target) != -1 &&
                                _status.event.given.indexOf(target) == -1;
                        }
                    ).set("targets", event.targets)
                        .set("given", event.given)
                        .set("ai", function (target) {
                            var player = _status.event.player;
                            return get.attitude(player, target);
                        });

                    "step 2"
                    if (!result.bool || !result.targets || !result.targets.length) {
                        event.goto(4);
                        return;
                    }

                    event.giveTarget = result.targets[0];
                    event.given.push(event.giveTarget);

                    player.chooseCard(
                        "h",
                        true,
                        1,
                        "均田：交给" + get.translation(event.giveTarget) + "一张手牌"
                    ).set("ai", function (card) {
                        return 6 - get.value(card);
                    });

                    "step 3"
                    if (result.bool && result.cards && result.cards.length && event.giveTarget && event.giveTarget.isIn()) {
                        player.give(result.cards, event.giveTarget);
                    }

                    event.goto(1);

                    "step 4"
                    var left = player.getCards("h");

                    if (left.length) {
                        player.discard(left);
                    }

                    "step 5"
                    var controls = [];

                    if (game.hasPlayer(function (current) {
                        return current != player && current.isIn() && get.distance(player, current, "attack") <= 1;
                    })) {
                        controls.push("造成火焰伤害");
                    }

                    if (player.maxHp > 1) {
                        controls.push("减上限并回满");
                    }

                    if (!controls.length) {
                        event.goto(10);
                        return;
                    }

                    player.chooseControl(controls)
                        .set("prompt", "均田：选择一项")
                        .set("ai", function () {
                            var player = _status.event.player;
                            var controls = _status.event.controls;

                            if (controls.indexOf("造成火焰伤害") != -1) {
                                var hasGood = game.hasPlayer(function (current) {
                                    return current != player &&
                                        current.isIn() &&
                                        get.distance(player, current, "attack") <= 1 &&
                                        get.damageEffect(current, player, player, "fire") > 0;
                                });

                                if (hasGood) return "造成火焰伤害";
                            }

                            return controls[0];
                        });

                    "step 6"
                    event.choice = result.control;

                    if (event.choice == "造成火焰伤害") {
                        player.chooseTarget(
                            true,
                            "均田：对攻击范围内一名角色造成1点火焰伤害",
                            function (card, player, target) {
                                return target != player &&
                                    target.isIn() &&
                                    get.distance(player, target, "attack") <= 1;
                            }
                        ).set("ai", function (target) {
                            var player = _status.event.player;
                            return get.damageEffect(target, player, player, "fire");
                        });
                    } else {
                        event.goto(8);
                    }

                    "step 7"
                    if (result.bool && result.targets && result.targets.length) {
                        var target = result.targets[0];
                        player.line(target, "fire");
                        target.damage("fire", player);
                    }

                    event.goto(10);

                    "step 8"
                    player.loseMaxHp();

                    "step 9"
                    if (player.isIn() && player.hp < player.maxHp) {
                        player.recover(player.maxHp - player.hp);
                    }

                    "step 10"
                    Sync.setStorage(player, "zus_juntian_doing", false);
                },
            },
        },

        translate: {
            zus_zhuolue: "灼掠",
            zus_zhuolue_info: "其他角色的出牌阶段开始时限一次，你可以失去1点体力，令其交给你一半数量的手牌（向下取整），并将其武将牌横置。",

            zus_juntian: "均田",
            zus_juntian_info: "锁定技，你的手牌上限始终等于体力上限。当你获得牌后或游戏初始发牌后，若你的手牌数不小于手牌上限，你须按任意顺序分给每名其他角色各1张手牌并弃置剩余手牌（或直到将手牌分完），然后选择一项：1. 对攻击范围内的一名角色造成1点火焰伤害；2. 减少1点体力上限并将体力回复至上限。",
        },
    };
});