(function() {
if (typeof lib === "undefined") var lib = globalThis.lib;
if (typeof game === "undefined") var game = globalThis.game;
if (typeof ui === "undefined") var ui = globalThis.ui;
if (typeof get === "undefined") var get = globalThis.get;
if (typeof ai === "undefined") var ai = globalThis.ai;
if (typeof _status === "undefined") var _status = globalThis._status;
(function () {
    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = "Zusfylri武将包";
if (typeof lib === "undefined") var lib = globalThis.lib;
if (typeof game === "undefined") var game = globalThis.game;
if (typeof ui === "undefined") var ui = globalThis.ui;
if (typeof get === "undefined") var get = globalThis.get;
if (typeof ai === "undefined") var ai = globalThis.ai;
if (typeof _status === "undefined") var _status = globalThis._status;


    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function getAttitudeSafe(player, target) {
        try {
            if (get && get.attitude) return get.attitude(player, target);
        } catch (e) {}
        return 0;
    }

    function getAliveOthers(player) {
        var list = [];
        try {
            if (game && game.filterPlayer) {
                list = game.filterPlayer(function (current) {
                    return current && current != player && (!current.isIn || current.isIn());
                }) || [];
            } else if (game && game.players) {
                list = game.players.filter(function (current) {
                    return current && current != player && (!current.isIn || current.isIn());
                });
            }
        } catch (e) {}
        return list.slice(0);
    }

    function getCardValueSafe(card, player) {
        try {
            if (get && get.value) return get.value(card, player);
        } catch (e) {}
        return 4;
    }

    function getJuntianChoiceValue(player) {
        var bestDamage = 0;
        var others = getAliveOthers(player);
        for (var i = 0; i < others.length; i++) {
            var target = others[i];
            try {
                if (get.distance && get.distance(player, target, "attack") > 1) continue;
                if (get.damageEffect) {
                    bestDamage = Math.max(bestDamage, get.damageEffect(target, player, player, "fire") || 0);
                } else if (getAttitudeSafe(player, target) < 0) {
                    bestDamage = Math.max(bestDamage, 1.5);
                }
            } catch (e) {}
        }

        var recover = 0;
        if (player.maxHp > 1) {
            var expectedHp = player.hp - 1;
            var expectedMaxHp = player.maxHp - 1;
            var heal = Math.max(0, expectedMaxHp - expectedHp);
            recover = heal * 2 - 1.8;
        }
        return Math.max(0, bestDamage, recover);
    }

    function getJuntianValue(player, gainedCards) {
        var handCount = player.countCards ? player.countCards("h") : 0;
        var handAfter = handCount + gainedCards;
        if (handAfter < player.maxHp) return 0;

        var score = 0;
        var hand = player.getCards ? player.getCards("h") : [];
        for (var i = 0; i < hand.length; i++) {
            score -= getCardValueSafe(hand[i], player) * 0.45;
        }

        var others = getAliveOthers(player);
        others.sort(function (a, b) {
            return getAttitudeSafe(player, b) - getAttitudeSafe(player, a);
        });

        var giveCount = Math.min(handAfter, others.length);
        for (var j = 0; j < giveCount; j++) {
            var attitude = getAttitudeSafe(player, others[j]);
            if (attitude > 0) score += Math.min(2, attitude / 2) * 1.1;
            else if (attitude < 0) score -= Math.min(2, -attitude / 2) * 0.8;
        }

        score += getJuntianChoiceValue(player);
        return score;
    }

    function getZhuolueAiScore(player, target) {
        if (!player || !target || player.hp <= 1) return -Infinity;

        var attitude = getAttitudeSafe(player, target);
        if (attitude >= 0) return -Infinity;

        var gainedCards = Math.floor((target.countCards ? target.countCards("h") : 0) / 2);
        var hostility = Math.min(1.5, Math.max(0.8, -attitude / 3));
        var score = gainedCards * (2.4 + 0.8 * hostility);
        var linked = target.isLinked ? target.isLinked() : true;

        if (!linked) score += 0.8 * hostility;
        if (player.hp == 2) score -= 4.5;
        else if (player.hp == 3) score -= 2.2;
        else score -= 1.5;

        var handCount = player.countCards ? player.countCards("h") : 0;
        if (handCount + gainedCards >= player.maxHp) {
            score += getJuntianValue(player, gainedCards);
        } else {
            score += gainedCards * 0.5;
        }

        return score;
    }

    function zhuolueAi(player, target) {
        return getZhuolueAiScore(player, target) > 0;
    }

    globalThis.zusHongxiuquanGetZhuolueAiScore = getZhuolueAiScore;
    globalThis.zusHongxiuquanZhuolueAi = zhuolueAi;

    window.zusfylriModules["hongxiuquan"] = {
        key: "hongxiuquan",
        character: {
            zus_hongxiuquan: char("male", "shen", 4, ["zus_zhuolue", "zus_juntian"], "zus_hongxiuquan", "png")
        },
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
                        return globalThis.zusHongxiuquanZhuolueAi(player, target);
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
            zus_hongxiuquan: "洪秀全",
            zus_hongxiuquan_ab: "洪秀全",

            zus_zhuolue: "灼掠",
            zus_zhuolue_info: "其他角色的出牌阶段开始时限一次，你可以失去1点体力，令其交给你一半数量的手牌（向下取整），并将其武将牌横置。",

            zus_juntian: "均田",
            zus_juntian_info: "锁定技，你的手牌上限始终等于体力上限。当你的手牌数不小于手牌上限时，你须按任意顺序分给每名其他角色各1张手牌并弃置剩余手牌（或直到将手牌分完），然后选择一项：1. 对攻击范围内的一名角色造成1点火焰伤害；2. 减少1点体力上限并将体力回复至上限。",
        },
        sort: ["zus_hongxiuquan"],
        title: {
            zus_hongxiuquan: "天王"
        }
    };
})();

})();
