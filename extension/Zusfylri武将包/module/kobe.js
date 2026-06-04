(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    window.zusfylriModules = window.zusfylriModules || {};

    const EXT_NAME = window.ZUS_EXTENSION_NAME || "Zusfylri\u6b66\u5c06\u5305";

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function currentCore() {
        return (window.__ZUS_TEST && window.__ZUS_TEST.core) || null;
    }

    function currentGame() {
        if (game && Array.isArray(game.players)) return game;
        var core = currentCore();
        if (core && core.game && Array.isArray(core.game.players)) return core.game;
        if (globalThis.game && Array.isArray(globalThis.game.players)) return globalThis.game;
        return null;
    }

    function currentGet() {
        if (get && typeof get.distance == "function") return get;
        var core = currentCore();
        if (core && core.get && typeof core.get.distance == "function") return core.get;
        if (globalThis.get && typeof globalThis.get.distance == "function") return globalThis.get;
        return null;
    }

    function currentStatus() {
        if (_status) return _status;
        var core = currentCore();
        if (core && core._status) return core._status;
        if (globalThis._status) return globalThis._status;
        return null;
    }

    function readNumber(card, player) {
        if (!card) return null;
        try {
            if (window.Zus && Zus.safeNumber) {
                return Zus.safeNumber(card, player);
            }
        } catch (e) {}
        try {
            var getter = currentGet();
            if (getter && getter.number) {
                return getter.number(card, player);
            }
        } catch (e2) {}
        try {
            return typeof card.number == "number" ? card.number : null;
        } catch (e3) {}
        return null;
    }

    function readDistance(player, target) {
        try {
            var getter = currentGet();
            if (getter && getter.distance) {
                return getter.distance(player, target);
            }
        } catch (e) {}
        return null;
    }

    function getPlayers() {
        try {
            if (window.Zus && Zus.players) {
                var players = Zus.players() || [];
                if (players.length) return players;
            }
        } catch (e) {}
        var zgame = currentGame();
        if (zgame && Array.isArray(zgame.players)) {
            return zgame.players.slice(0);
        }
        return [];
    }

    function inOwnPhase(event, player) {
        try {
            if (window.Zus && Zus.currentPhase) {
                var phasePlayer = Zus.currentPhase(event);
                if (
                    phasePlayer &&
                    (
                        phasePlayer == player ||
                        (phasePlayer.playerid && player.playerid && phasePlayer.playerid == player.playerid) ||
                        (phasePlayer.name && player.name && phasePlayer.name == player.name)
                    )
                ) return true;
            }
        } catch (e) {}
        var status = currentStatus();
        var currentPhase = status && status.currentPhase;
        return !!(
            currentPhase &&
            (
                currentPhase == player ||
                (currentPhase.playerid && player.playerid && currentPhase.playerid == player.playerid) ||
                (currentPhase.name && player.name && currentPhase.name == player.name)
            )
        );
    }

    function hasDistanceOneTarget(player) {
        return getPlayers().some(function (current) {
            return current && current != player && (!current.isIn || current.isIn()) && readDistance(player, current) == 1;
        });
    }

    var kobeModule = {
        key: "kobe",

        character: {
            zus_kobe: char("male", "zus_group_shi", 4, ["zus_zhouji"], "zus_kobe", "png"),
        },

        skill: {
            zus_zhouji: {
                trigger: {
                    player: "useCardAfter",
                },
                forced: true,
                filter: function (event, player) {
                    var phaseUse = null;
                    try {
                        phaseUse = event.getParent ? event.getParent("phaseUse") : null;
                    } catch (ePhase) {}
                    if (!phaseUse || phaseUse.name != "phaseUse") {
                        try {
                            if (!player || !player.isPhaseUsing || !player.isPhaseUsing()) return false;
                        } catch (eUsing) {
                            return false;
                        }
                    }

                    var sourceCard = event.card;
                    if ((!sourceCard || !sourceCard.name) && event.cards && event.cards.length) {
                        sourceCard = event.cards[0];
                    }
                    if (!sourceCard) return false;

                    var number = sourceCard.number;
                    if (typeof number != "number" && event.cards && event.cards.length) {
                        number = event.cards[0] && event.cards[0].number;
                    }
                    if (typeof number != "number") {
                        number = readNumber(sourceCard, player);
                    }
                    number = parseInt(number, 10);
                    if (!number) return false;
                    if ([1, 2, 3, 4, 6, 8, 12].indexOf(number) == -1) return false;

                    if (!player || typeof player.distanceTo != "function") return false;

                    var current = player.getNext ? player.getNext() : player.next;
                    var count = 0;
                    while (current && current != player && count < 20) {
                        try {
                            if ((!current.isIn || current.isIn()) && player.distanceTo(current) == 1) return true;
                        } catch (eDistance) {}
                        current = current.getNext ? current.getNext() : current.next;
                        count++;
                    }
                    return false;
                },
                content: function () {
                    "step 0";
                    var targets = [];
                    var current = player.getNext ? player.getNext() : player.next;
                    var count = 0;
                    while (current && current != player && count < 20) {
                        try {
                            if ((!current.isIn || current.isIn()) && player.distanceTo && player.distanceTo(current) == 1) {
                                targets.push(current);
                            }
                        } catch (eDistance) {}
                        current = current.getNext ? current.getNext() : current.next;
                        count++;
                    }

                    if (!targets.length) {
                        event.finish();
                        return;
                    }

                    if (targets.length == 1) {
                        event.zhoujiTarget = targets[0];
                    } else {
                        player.chooseTarget(
                            true,
                            "肘击：选择一名距离为1的其他角色，对其造成1点伤害",
                            function (card, player, target) {
                                return (
                                    target != player &&
                                    (!target.isIn || target.isIn()) &&
                                    player.distanceTo &&
                                    player.distanceTo(target) == 1
                                );
                            }
                        ).set("ai", function (target) {
                            try {
                                return get && get.damageEffect ? get.damageEffect(target, player, player) : 1;
                            } catch (e) {}
                            return 1;
                        });
                    }

                    "step 1";
                    var target = event.zhoujiTarget;
                    if (!target && result.bool && result.targets && result.targets.length) {
                        target = result.targets[0];
                    }
                    if (target) {
                        player.line(target, "fire");
                        target.damage(1, player);
                        target.addTempSkill("zus_zhouji_lessdraw", { player: "phaseDrawAfter" });
                    }

                    "step 2";
                    player.skip("phaseDiscard");
                    var phaseUse = trigger.getParent ? trigger.getParent("phaseUse") : null;
                    if (phaseUse && phaseUse.finish) {
                        phaseUse.finish();
                    }
                },
            },

            zus_zhouji_lessdraw: {
                trigger: {
                    player: "phaseDrawBegin2",
                },
                forced: true,
                charlotte: true,
                filter: function (event, player) {
                    return !event.numFixed && typeof event.num == "number" && event.num > 0;
                },
                content: function () {
                    trigger.num--;
                },
                mark: true,
                intro: {
                    content: "下一个摸牌阶段少摸一张牌",
                },
            },
        },

        translate: {
            zus_kobe: "科比",
            zus_kobe_ab: "科比",
            zus_zhouji: "肘击",
            zus_zhouji_info: "锁定技，出牌阶段，当你使用点数为24因数的牌结算后，你选择一名距离为1的其他角色，对其造成1点伤害，并令其下一个摸牌阶段少摸一张牌，然后你结束此回合。",
            zus_zhouji_lessdraw: "肘击",
            zus_zhouji_lessdraw_info: "下一个摸牌阶段少摸一张牌。",
        },

        sort: ["zus_kobe"],

        title: {
            zus_kobe: "黄金拳王",
        },
    };

    window.zusfylriModules["kobe"] = kobeModule;

    var runtimeLib = globalThis.lib || lib || (currentCore() && currentCore().lib);
    if (runtimeLib) {
        if (runtimeLib.character && kobeModule.character) Object.assign(runtimeLib.character, kobeModule.character);
        if (runtimeLib.skill && kobeModule.skill) Object.assign(runtimeLib.skill, kobeModule.skill);
        if (runtimeLib.translate && kobeModule.translate) Object.assign(runtimeLib.translate, kobeModule.translate);
        if (runtimeLib.characterTitle && kobeModule.title) Object.assign(runtimeLib.characterTitle, kobeModule.title);
    }
})();
