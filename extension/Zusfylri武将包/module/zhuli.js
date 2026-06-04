(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = window.ZUS_EXTENSION_NAME || "Zusfylri武将包";

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "png");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function runtimeGame() {
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().game;
                if (current) return current;
            }
        } catch (e) {
        }
        try {
            if (typeof window != "undefined" && window.top && window.top.game) return window.top.game;
        } catch (e2) {
        }
        try {
            if (typeof window != "undefined" && window.game) return window.game;
        } catch (e3) {
        }
        if (globalThis.game && typeof globalThis.game == "object") return globalThis.game;
        if (game && typeof game == "object") return game;
        return null;
    }

    function runtimeGet() {
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().get;
                if (current) return current;
            }
        } catch (e) {
        }
        try {
            if (typeof window != "undefined" && window.top && window.top.get) return window.top.get;
        } catch (e2) {
        }
        try {
            if (typeof window != "undefined" && window.get) return window.get;
        } catch (e3) {
        }
        if (globalThis.get && typeof globalThis.get == "object") return globalThis.get;
        if (get && typeof get == "object") return get;
        return null;
    }

    function safeName(card, player) {
        try {
            if (window.Zus && Zus.safeName) return Zus.safeName(card, player);
        } catch (e) {
        }
        try {
            var getter = runtimeGet();
            if (getter && getter.name) return getter.name(card, player);
        } catch (e2) {
        }
        return card && card.name || null;
    }

    function safeTranslation(item) {
        try {
            var getter = runtimeGet();
            if (getter && getter.translation) return getter.translation(item);
        } catch (e) {
        }
        return item && item.name ? item.name : String(item);
    }

    function cardKey(card) {
        if (!card) return null;
        return card.cardid || card._cardid || card.uuid || null;
    }

    function sameCard(a, b) {
        if (!a || !b) return false;
        if (a === b) return true;
        var ak = cardKey(a);
        var bk = cardKey(b);
        return !!(ak && bk && ak === bk);
    }

    function uniqueCards(cards) {
        var result = [];
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (!card) continue;
            var exists = false;
            for (var j = 0; j < result.length; j++) {
                if (sameCard(card, result[j])) {
                    exists = true;
                    break;
                }
            }
            if (!exists) result.push(card);
        }
        return result;
    }

    function eventDiscardCards(event) {
        var cards = [];
        if (!event) return cards;
        if (typeof event.getd == "function") {
            try {
                cards = cards.concat(event.getd() || []);
            } catch (e) {
            }
        }
        if (event.cards && event.cards.length) cards = cards.concat(event.cards);
        if (event.cards2 && event.cards2.length) cards = cards.concat(event.cards2);
        return uniqueCards(cards);
    }

    function rememberNanmanCards(player, cards) {
        if (!player || !cards || !cards.length) return;
        player.storage = player.storage || {};
        if (!Array.isArray(player.storage.zus_zhuli_zhenshou_cards)) {
            player.storage.zus_zhuli_zhenshou_cards = [];
        }
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (!card) continue;
            var exists = false;
            for (var j = 0; j < player.storage.zus_zhuli_zhenshou_cards.length; j++) {
                if (sameCard(card, player.storage.zus_zhuli_zhenshou_cards[j])) {
                    exists = true;
                    break;
                }
            }
            if (!exists) player.storage.zus_zhuli_zhenshou_cards.push(card);
        }
        if (typeof player.syncStorage == "function") player.syncStorage("zus_zhuli_zhenshou_cards");
    }

    function takeRememberedNanmanCards(player, cards) {
        if (!player || !player.storage || !Array.isArray(player.storage.zus_zhuli_zhenshou_cards)) return [];
        var remembered = player.storage.zus_zhuli_zhenshou_cards;
        var result = [];
        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            for (var j = 0; j < remembered.length; j++) {
                if (sameCard(card, remembered[j])) {
                    result.push(card);
                    remembered.splice(j, 1);
                    break;
                }
            }
        }
        if (typeof player.syncStorage == "function") player.syncStorage("zus_zhuli_zhenshou_cards");
        return result;
    }

    function usedCardIndex(player, event) {
        if (!player || !event || typeof player.getHistory != "function") return 0;
        var history = [];
        try {
            history = player.getHistory("useCard") || [];
        } catch (e) {
        }
        for (var i = 0; i < history.length; i++) {
            if (history[i] === event) return i + 1;
        }
        return history.length || 0;
    }

    function damageUseCardIndex(player, event) {
        if (!player || !event || !event.card || typeof event.getParent != "function") return 0;
        var useEvent = null;
        try {
            useEvent = event.getParent("useCard");
        } catch (e) {
        }
        if (!useEvent || useEvent.player != player) return 0;
        return usedCardIndex(player, useEvent);
    }

    function canLiejingTarget(player, target) {
        if (!player || !target || player == target) return false;
        if (target.isIn && !target.isIn()) return false;
        try {
            if (player.inRange && player.inRange(target)) return true;
        } catch (e) {
        }
        try {
            var getter = runtimeGet();
            if (getter && getter.distance) return getter.distance(player, target) <= 1;
        } catch (e2) {
        }
        return false;
    }

    function liejingTargets(player) {
        var result = [];
        var seen = {};
        var add = function (target) {
            if (!target || !canLiejingTarget(player, target)) return;
            var key = target.playerid || target.name || result.length;
            if (seen[key]) return;
            seen[key] = true;
            result.push(target);
        };
        var addArray = function (list) {
            if (!list || !list.length) return;
            for (var i = 0; i < list.length; i++) add(list[i]);
        };
        var currentGame = runtimeGame();
        try {
            if (currentGame && typeof currentGame.filterPlayer == "function") {
                addArray(currentGame.filterPlayer(function (current) {
                    return canLiejingTarget(player, current);
                }));
            }
        } catch (e) {
        }
        try {
            addArray(currentGame && currentGame.players);
        } catch (e2) {
        }
        try {
            addArray(window.Zus && Zus.players ? Zus.players() : []);
        } catch (e3) {
        }
        var current = player;
        var guard = 0;
        while (current && guard < 32) {
            current = current.getNext ? current.getNext() : current.next;
            guard++;
            if (!current || current == player) break;
            add(current);
        }
        return result;
    }

    function safeAttitude(player, target) {
        try {
            var getter = runtimeGet();
            if (getter && typeof getter.attitude == "function") return getter.attitude(player, target);
        } catch (e) {
        }
        return 0;
    }

    function liejingTargetAi(target, player) {
        player = player || globalThis.zusZhuliLiejingAiPlayer;
        if (!player) {
            var status = globalThis._status || (typeof window != "undefined" && window._status) || _status;
            player = status && status.event ? status.event.player : null;
        }
        if (!player || !target || target == player) return 0;
        if (target.isIn && !target.isIn()) return 0;
        if (target.hasSkill && target.hasSkill("zus_jisui_gouyu")) return 0;
        var attitude = globalThis.zusZhuliSafeAttitude ? globalThis.zusZhuliSafeAttitude(player, target) : safeAttitude(player, target);
        var lostHp = 0;
        if (typeof target.hp == "number" && typeof target.maxHp == "number") {
            lostHp = Math.max(0, target.maxHp - target.hp);
        }
        var maxHp = typeof target.maxHp == "number" ? target.maxHp : 4;
        var hp = typeof target.hp == "number" ? target.hp : maxHp;

        // 裂劲会消耗9个“荒”，优先打敌方；目标已受伤时会立刻压低体力上限，收益明显更高。
        if (attitude < 0) return 5 - attitude * 1.2 + lostHp * 2 + Math.max(0, 4 - hp) * 0.6 + maxHp * 0.25;
        if (attitude > 0) return -8 - attitude;
        if (lostHp > 0) return 2 + lostHp * 1.5 + Math.max(0, 3 - hp) * 0.5;
        return maxHp >= 5 ? 1 : 0;
    }

    function enforceBrokenGouyu(player) {
        if (!player || typeof player.hp != "number") return false;
        var hp = player.hp;
        if (typeof player.maxHp == "number" && player.maxHp === hp) return false;
        player.maxHp = hp;
        if (player.hp > player.maxHp) player.hp = player.maxHp;
        var currentGame = runtimeGame();
        if (currentGame && typeof currentGame.broadcastAll == "function") {
            currentGame.broadcastAll(function (target, currentHp) {
                if (!target) return;
                target.maxHp = currentHp;
                if (target.hp > target.maxHp) target.hp = target.maxHp;
                if (target.update) target.update();
            }, player, hp);
        } else if (player.update) {
            player.update();
        }
        return true;
    }

    globalThis.zusZhuliSafeName = safeName;
    globalThis.zusZhuliSafeTranslation = safeTranslation;
    globalThis.zusZhuliRuntimeGame = runtimeGame;
    globalThis.zusZhuliEventDiscardCards = eventDiscardCards;
    globalThis.zusZhuliRememberNanmanCards = rememberNanmanCards;
    globalThis.zusZhuliTakeRememberedNanmanCards = takeRememberedNanmanCards;
    globalThis.zusZhuliUsedCardIndex = usedCardIndex;
    globalThis.zusZhuliDamageUseCardIndex = damageUseCardIndex;
    globalThis.zusZhuliCanLiejingTarget = canLiejingTarget;
    globalThis.zusZhuliLiejingTargets = liejingTargets;
    globalThis.zusZhuliSafeAttitude = safeAttitude;
    globalThis.zusZhuliLiejingTargetAi = liejingTargetAi;
    globalThis.zusZhuliEnforceBrokenGouyu = enforceBrokenGouyu;

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("zhuli", "safeName", safeName, "zusZhuliSafeName");
        Zus.bindHelper("zhuli", "runtimeGame", runtimeGame, "zusZhuliRuntimeGame");
        Zus.bindHelper("zhuli", "eventDiscardCards", eventDiscardCards, "zusZhuliEventDiscardCards");
        Zus.bindHelper("zhuli", "rememberNanmanCards", rememberNanmanCards, "zusZhuliRememberNanmanCards");
        Zus.bindHelper("zhuli", "takeRememberedNanmanCards", takeRememberedNanmanCards, "zusZhuliTakeRememberedNanmanCards");
        Zus.bindHelper("zhuli", "usedCardIndex", usedCardIndex, "zusZhuliUsedCardIndex");
        Zus.bindHelper("zhuli", "damageUseCardIndex", damageUseCardIndex, "zusZhuliDamageUseCardIndex");
        Zus.bindHelper("zhuli", "canLiejingTarget", canLiejingTarget, "zusZhuliCanLiejingTarget");
        Zus.bindHelper("zhuli", "liejingTargets", liejingTargets, "zusZhuliLiejingTargets");
        Zus.bindHelper("zhuli", "safeAttitude", safeAttitude, "zusZhuliSafeAttitude");
        Zus.bindHelper("zhuli", "liejingTargetAi", liejingTargetAi, { globalName: "zusZhuliLiejingTargetAi", overwrite: true });
        Zus.bindHelper("zhuli", "enforceBrokenGouyu", enforceBrokenGouyu, "zusZhuliEnforceBrokenGouyu");
    }

    var zhuliModule = {
        key: "zhuli",

        character: {
            zus_zhuli: char("male", "zus_group_huan", 4, ["zus_zhenshou", "zus_yuhuang", "zus_liejing"], "zus_zhuli", "png"),
        },

        skill: {
            zus_huang: {
                marktext: "荒",
                intro: {
                    name: "荒",
                    content: "mark",
                },
            },

            zus_jisui_gouyu: {
                charlotte: true,
                mark: true,
                marktext: "碎",
                intro: {
                    name: "击碎勾玉",
                    content: "体力上限始终调整至体力值。",
                },
                trigger: {
                    player: ["enterGame", "changeHp", "gainMaxHpAfter", "loseMaxHpAfter", "damageEnd", "recoverAfter", "phaseBegin", "phaseEnd"],
                },
                forced: true,
                silent: true,
                popup: false,
                init: function (player) {
                    if (globalThis.zusZhuliEnforceBrokenGouyu) globalThis.zusZhuliEnforceBrokenGouyu(player);
                },
                filter: function (event, player) {
                    return !!(player && typeof player.hp == "number" && player.maxHp !== player.hp);
                },
                content: function () {
                    if (globalThis.zusZhuliEnforceBrokenGouyu) globalThis.zusZhuliEnforceBrokenGouyu(player);
                },
            },

            zus_zhenshou: {
                group: ["zus_zhenshou_invalid", "zus_zhenshou_gain", "zus_zhenshou_start", "zus_zhenshou_damage"],
                locked: true,
            },

            zus_zhenshou_invalid: {
                trigger: { target: "useCardToTargeted" },
                forced: true,
                filter: function (event, player) {
                    return !!(
                        event &&
                        event.player &&
                        event.player != player &&
                        event.card &&
                        globalThis.zusZhuliSafeName(event.card, event.player) == "nanman"
                    );
                },
                content: function () {
                    var cards = trigger.cards && trigger.cards.length ? trigger.cards.slice(0) : [];
                    if (cards.length && globalThis.zusZhuliRememberNanmanCards) {
                        globalThis.zusZhuliRememberNanmanCards(player, cards);
                    }
                    var parent = trigger && trigger.getParent ? trigger.getParent() : null;
                    if (parent && parent.excluded && parent.excluded.add) {
                        parent.excluded.add(player);
                    }
                },
            },

            zus_zhenshou_gain: {
                trigger: { global: ["cardsDiscardAfter", "loseAfter", "loseAsyncAfter"] },
                forced: true,
                popup: false,
                filter: function (event, player) {
                    var cards = globalThis.zusZhuliEventDiscardCards ? globalThis.zusZhuliEventDiscardCards(event) : [];
                    if (!cards.length || !player.storage || !Array.isArray(player.storage.zus_zhuli_zhenshou_cards)) return false;
                    for (var i = 0; i < cards.length; i++) {
                        for (var j = 0; j < player.storage.zus_zhuli_zhenshou_cards.length; j++) {
                            if (cards[i] === player.storage.zus_zhuli_zhenshou_cards[j]) return true;
                            if (cards[i] && player.storage.zus_zhuli_zhenshou_cards[j] && cards[i].cardid && cards[i].cardid == player.storage.zus_zhuli_zhenshou_cards[j].cardid) return true;
                        }
                    }
                    return false;
                },
                content: function () {
                    var cards = globalThis.zusZhuliEventDiscardCards ? globalThis.zusZhuliEventDiscardCards(trigger) : [];
                    var gains = globalThis.zusZhuliTakeRememberedNanmanCards
                        ? globalThis.zusZhuliTakeRememberedNanmanCards(player, cards)
                        : [];
                    if (gains.length) player.gain(gains, "gain2");
                },
            },

            zus_zhenshou_start: {
                trigger: { global: "gameStart", player: "enterGame" },
                forced: true,
                filter: function (event, player) {
                    return !player.storage || !player.storage.zus_zhenshou_started;
                },
                content: function () {
                    player.storage = player.storage || {};
                    player.storage.zus_zhenshou_started = true;
                    if (typeof player.syncStorage == "function") player.syncStorage("zus_zhenshou_started");
                    player.addMark("zus_huang", 1);
                    player.markSkill("zus_huang");
                },
            },

            zus_zhenshou_damage: {
                trigger: { source: "damageEnd" },
                forced: true,
                filter: function (event, player) {
                    return globalThis.zusZhuliDamageUseCardIndex && globalThis.zusZhuliDamageUseCardIndex(player, event) > 0;
                },
                content: function () {
                    var index = globalThis.zusZhuliDamageUseCardIndex ? globalThis.zusZhuliDamageUseCardIndex(player, trigger) : 0;
                    if (index > 0) {
                        player.addMark("zus_huang", index);
                        player.markSkill("zus_huang");
                    }
                },
            },

            zus_yuhuang: {
                trigger: { player: "useCard" },
                direct: true,
                filter: function (event, player) {
                    if (!event || !player || player.hasSkill("zus_yuhuang_used")) return false;
                    var phaseUse = event.getParent ? event.getParent("phaseUse") : null;
                    if (!phaseUse || phaseUse.player != player) return false;
                    var count = player.countMark ? player.countMark("zus_huang") : 0;
                    if (count <= 0) return false;
                    return !!(globalThis.zusZhuliUsedCardIndex && globalThis.zusZhuliUsedCardIndex(player, event) == count);
                },
                content: function () {
                    "step 0"
                    event.num = player.countMark ? player.countMark("zus_huang") : 0;
                    if (event.num <= 0) {
                        event.finish();
                        return;
                    }
                    player.chooseBool("是否发动【御荒】，摸" + event.num + "张牌？").set("ai", function () {
                        return true;
                    });

                    "step 1"
                    if (!result.bool) {
                        event.finish();
                        return;
                    }
                    player.addTempSkill("zus_yuhuang_used", "phaseUseAfter");
                    player.logSkill("zus_yuhuang");
                    player.draw(event.num);
                },
            },

            zus_yuhuang_used: {
                charlotte: true,
            },

            zus_liejing: {
                trigger: { player: "phaseJieshuBegin" },
                direct: true,
                filter: function (event, player) {
                    if (!player || !player.countMark || player.countMark("zus_huang") < 9) return false;
                    var targets = globalThis.zusZhuliLiejingTargets
                        ? globalThis.zusZhuliLiejingTargets(player)
                        : [];
                    return !!(targets && targets.length);
                },
                content: function () {
                    "step 0"
                    globalThis.zusZhuliLiejingAiPlayer = player;
                    player.chooseTarget(
                        "裂劲：移去9个“荒”，击碎攻击范围内一名角色的所有勾玉",
                        function (card, player, target) {
                            return globalThis.zusZhuliCanLiejingTarget(player, target);
                        }
                    ).set("ai", function (target) {
                        return globalThis.zusZhuliLiejingTargetAi
                            ? globalThis.zusZhuliLiejingTargetAi(target, globalThis.zusZhuliLiejingAiPlayer)
                            : 0;
                    });

                    "step 1"
                    globalThis.zusZhuliLiejingAiPlayer = null;
                    if (!result.bool || !result.targets || !result.targets.length) {
                        event.finish();
                        return;
                    }
                    event.target = result.targets[0];
                    player.logSkill("zus_liejing", event.target);
                    player.removeMark("zus_huang", 9);

                    "step 2"
                    if (!event.target || event.target.isIn && !event.target.isIn()) return;
                    event.target.addSkill("zus_jisui_gouyu");
                    event.target.markSkill("zus_jisui_gouyu");
                    if (globalThis.zusZhuliEnforceBrokenGouyu) globalThis.zusZhuliEnforceBrokenGouyu(event.target);
                    var currentGame = globalThis.zusZhuliRuntimeGame && globalThis.zusZhuliRuntimeGame();
                    if (currentGame && currentGame.log) currentGame.log(event.target, "的所有勾玉被击碎");
                },
            },
        },

        translate: {
            zus_zhuli: "祝黎",
            zus_zhuli_ab: "祝黎",
            zus_zhenshou: "镇兽",
            zus_zhenshou_info: "锁定技，其他角色使用的【南蛮入侵】对你无效，且此牌进入弃牌堆时，你获得之。游戏开始时，你获得1个“荒”。当你使用本回合第X张牌造成伤害后，你获得X个“荒”。",
            zus_yuhuang: "御荒",
            zus_yuhuang_info: "出牌阶段限一次，当你使用本回合第Y张牌时，若Y为你的“荒”数，你可以摸Y张牌。",
            zus_liejing: "裂劲",
            zus_liejing_info: "回合结束阶段，你可以移去9个“荒”，击碎攻击范围内一名角色的所有勾玉。",
            zus_huang: "荒",
            zus_jisui_gouyu: "击碎勾玉",
            zus_jisui_gouyu_info: "一种状态：体力上限始终调整至体力值。",
        },

        title: {
            zus_zhuli: "南王",
        },

        sort: ["zus_zhuli"],
    };

    window.zusfylriModules["zhuli"] = zhuliModule;

    var runtimeLib = globalThis.lib || lib;
    if (runtimeLib) {
        if (runtimeLib.character && zhuliModule.character) Object.assign(runtimeLib.character, zhuliModule.character);
        if (runtimeLib.skill && zhuliModule.skill) Object.assign(runtimeLib.skill, zhuliModule.skill);
        if (runtimeLib.translate && zhuliModule.translate) Object.assign(runtimeLib.translate, zhuliModule.translate);
        if (runtimeLib.characterTitle && zhuliModule.title) Object.assign(runtimeLib.characterTitle, zhuliModule.title);
    }
})();
