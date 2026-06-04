game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_makesi_kongfuzi",

        character: {},

        skill: {
            // 周礼：出牌阶段限一次，你令所有手牌数小于你的角色对你使用1张无距离限制的【杀】，
            // 否则交给你X张牌，不足则全交。X为你与其手牌数差值。
            zus_zhouli: {
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    return game.hasPlayer(function (current) {
                        return current != player && current.countCards("h") < player.countCards("h");
                    });
                },

                content: function () {
                    "step 0"
                    event.targets = game.filterPlayer(function (current) {
                        return current != player && current.countCards("h") < player.countCards("h");
                    });

                    event.targets.sortBySeat(player);
                    event.index = 0;

                    if (!event.targets.length) {
                        event.finish();
                    }

                    "step 1"
                    if (event.index >= event.targets.length) {
                        event.finish();
                        return;
                    }

                    event.target = event.targets[event.index];

                    if (!event.target || !event.target.isIn()) {
                        event.index++;
                        event.redo();
                        return;
                    }

                    event.x = Math.max(1, player.countCards("h") - event.target.countCards("h"));

                    player.line(event.target, "green");

                    event.target.chooseToUse({
                        prompt: "周礼：对" + get.translation(player) + "使用一张无距离限制的【杀】，否则交给其" + event.x + "张牌",
                        filterCard: function (card) {
                            return get.name(card) == "sha";
                        },
                        position: "h",
                        targetRequired: true,
                        filterTarget: function (card, user, target) {
                            return target == _status.event.sourcex;
                        },
                    }).set("sourcex", player).set("addCount", false).set("ai1", function (card) {
                        var player = _status.event.player;
                        var source = _status.event.sourcex;

                        if (get.effect(source, card, player, player) > 0) {
                            return 10 - get.value(card);
                        }

                        return 0;
                    }).set("ai2", function (target) {
                        var player = _status.event.player;
                        return get.effect(target, { name: "sha" }, player, player);
                    });

                    "step 2"
                    if (result.bool) {
                        event.index++;
                        event.goto(1);
                        return;
                    }

                    var cards = event.target.getCards("h");

                    if (!cards.length) {
                        event.index++;
                        event.goto(1);
                        return;
                    }

                    if (cards.length <= event.x) {
                        event.target.give(cards, player);
                        event.index++;
                        event.goto(1);
                    } else {
                        event.target.chooseCard(
                            "h",
                            true,
                            event.x,
                            "周礼：交给" + get.translation(player) + event.x + "张牌"
                        ).set("ai", function (card) {
                            return -get.value(card);
                        });
                    }

                    "step 3"
                    if (result.bool && result.cards && result.cards.length) {
                        event.target.give(result.cards, player);
                    }

                    event.index++;
                    event.goto(1);
                },

                ai: {
                    order: 7,
                    result: {
                        player: function (player) {
                            var num = 0;

                            game.countPlayer(function (current) {
                                if (current != player && current.countCards("h") < player.countCards("h")) {
                                    num++;
                                }
                            });

                            return num > 0 ? 1 : 0;
                        },
                    },
                },
            },

            // 风暴：锁定技，在你的出牌阶段结束时，你令场上手牌最多的一名角色受到2点伤害并弃置所有手牌，
            // 视为其使用【五谷丰登】与【桃园结义】各一张。
            zus_fengbao: {
                trigger: {
                    player: "phaseUseEnd",
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    return game.hasPlayer(function (current) {
                        return current.isIn();
                    });
                },

                content: function () {
                    "step 0"
                    var max = -1;
                    event.candidates = [];

                    game.countPlayer(function (current) {
                        var num = current.countCards("h");

                        if (num > max) {
                            max = num;
                            event.candidates = [current];
                        } else if (num == max) {
                            event.candidates.push(current);
                        }
                    });

                    if (!event.candidates.length) {
                        event.finish();
                        return;
                    }

                    if (event.candidates.length == 1) {
                        event.target = event.candidates[0];
                        event.goto(2);
                    } else {
                        player.chooseTarget(
                            true,
                            "风暴：选择一名手牌数最多的角色",
                            function (card, player, target) {
                                return _status.event.candidates.indexOf(target) != -1;
                            }
                        ).set("candidates", event.candidates).set("ai", function (target) {
                            var player = _status.event.player;
                            return get.damageEffect(target, player, player);
                        });
                    }

                    "step 1"
                    event.target = result.targets[0];

                    "step 2"
                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    player.line(event.target, "fire");
                    event.target.damage(2, player);

                    "step 3"
                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    var cards = event.target.getCards("h");

                    if (cards.length) {
                        event.target.discard(cards);
                    }

                    "step 4"
                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    var wugu = {
                        name: "wugu",
                        isCard: true,
                    };

                    var wuguTargets = game.filterPlayer(function (current) {
                        return current.isIn() && lib.filter.targetEnabled(wugu, event.target, current);
                    });

                    if (wuguTargets.length) {
                        event.target.useCard(wugu, wuguTargets);
                    }

                    "step 5"
                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    var taoyuan = {
                        name: "taoyuan",
                        isCard: true,
                    };

                    var taoyuanTargets = game.filterPlayer(function (current) {
                        return current.isIn() && lib.filter.targetEnabled(taoyuan, event.target, current);
                    });

                    if (taoyuanTargets.length) {
                        event.target.useCard(taoyuan, taoyuanTargets);
                    }
                },
            },
        },

        translate: {
            zus_zhouli: "周礼",
            zus_zhouli_info: "出牌阶段限一次，你令所有手牌数小于你的角色对你使用一张无距离限制的【杀】，否则交给你X张牌，不足则全交（X为你与其手牌数差值）。",

            zus_fengbao: "风暴",
            zus_fengbao_info: "锁定技，在你的出牌阶段结束时，你令场上手牌最多的一名角色受到2点伤害并弃置所有手牌，视为其使用【五谷丰登】与【桃园结义】各一张。",
        },
    };
});