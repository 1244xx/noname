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

    function runtimeGet() {
        if (get && typeof get == "object") return get;
        if (globalThis.get && typeof globalThis.get == "object") return globalThis.get;
        return null;
    }

    function runtimeLib() {
        if (lib && typeof lib == "object") return lib;
        if (globalThis.lib && typeof globalThis.lib == "object") return globalThis.lib;
        return null;
    }

    function safeAttitude(from, to) {
        var getter = runtimeGet();
        try {
            if (getter && typeof getter.attitude == "function") {
                return getter.attitude(from, to);
            }
        } catch (e) {}
        return 0;
    }

    function safeTranslation(target) {
        var getter = runtimeGet();
        try {
            if (getter && typeof getter.translation == "function") {
                return getter.translation(target);
            }
        } catch (e) {}
        try {
            return target && (target.name2 || target.name || target.playerid) || "\u8be5\u89d2\u8272";
        } catch (e2) {}
        return "\u8be5\u89d2\u8272";
    }

    globalThis.zusSafeAttitude = safeAttitude;
    globalThis.zusSafeTranslation = safeTranslation;

    function safeColor(card, player) {
        var getter = runtimeGet();
        try {
            if (getter && typeof getter.color == "function") {
                var directColor = getter.color(card, player);
                if (directColor) return directColor;
            }
        } catch (e) {}
        try {
            if (card && card.color) return card.color;
        } catch (e2) {}
        try {
            var suit = null;
            if (getter && typeof getter.suit == "function") {
                suit = getter.suit(card, player);
            }
            if (!suit && card) suit = card.suit;
            if (suit == "heart" || suit == "diamond") return "red";
            if (suit == "spade" || suit == "club") return "black";
        } catch (e3) {}
        return null;
    }

    function hasRedHand(player) {
        if (!player || typeof player.countCards != "function") return false;
        return player.countCards("h", function (card) {
            return safeColor(card, player) == "red";
        }) > 0;
    }

    function canUseHuangyiCard(card, player) {
        var info = huangyiCardInfo(card, player);
        return info.name == "wuxie" || info.color == "red";
    }

    function huangyiCardInfo(card, player) {
        var getter = runtimeGet();
        var name = null, color = null, suit = null, number = null;
        try {
            if (getter && typeof getter.name == "function") name = getter.name(card, player);
        } catch (e) {}
        try {
            color = safeColor(card, player);
        } catch (e2) {}
        try {
            if (getter && typeof getter.suit == "function") suit = getter.suit(card, player);
        } catch (e3) {}
        try {
            if (getter && typeof getter.number == "function") number = getter.number(card, player);
        } catch (e4) {}
        return {
            name: name || (card && card.name) || null,
            color: color || (card && card.color) || null,
            suit: suit || (card && card.suit) || null,
            number: number || (card && card.number) || null,
        };
    }

    function dumpHuangyiDebug(stage, payload) {
        try {
            var entry = {
                time: new Date().toISOString(),
                stage: stage,
                payload: payload || {},
            };
            globalThis.zus_huangyi_debug = globalThis.zus_huangyi_debug || [];
            globalThis.zus_huangyi_debug.push(entry);
            if (globalThis.zus_huangyi_debug.length > 20) {
                globalThis.zus_huangyi_debug = globalThis.zus_huangyi_debug.slice(-20);
            }
            if (globalThis.localStorage) {
                globalThis.localStorage.setItem("zus_huangyi_debug", JSON.stringify(globalThis.zus_huangyi_debug));
            }
        } catch (e) {}
    }

    function mergeRuntimeLib(runtimeLib, moduleData) {
        if (!runtimeLib || !moduleData) return;
        if (runtimeLib.character && moduleData.character) Object.assign(runtimeLib.character, moduleData.character);
        if (runtimeLib.skill && moduleData.skill) Object.assign(runtimeLib.skill, moduleData.skill);
        if (runtimeLib.translate && moduleData.translate) Object.assign(runtimeLib.translate, moduleData.translate);
        if (runtimeLib.characterTitle && moduleData.title) Object.assign(runtimeLib.characterTitle, moduleData.title);
    }

    function resolveFengzhaoTarget(player) {
        var directTarget = player && player.storage ? player.storage.zus_fengzhao_target : null;
        if (directTarget && directTarget.isIn && directTarget.isIn()) return directTarget;
        var targetId = player && player.storage ? player.storage.zus_fengzhao_target_id : null;
        if (!targetId) return null;
        var runtimeGame = game && Array.isArray(game.players) ? game : (globalThis.game && Array.isArray(globalThis.game.players) ? globalThis.game : null);
        if (runtimeGame && runtimeGame.players) {
            for (var i = 0; i < runtimeGame.players.length; i++) {
                var current = runtimeGame.players[i];
                if (!current || !current.isIn || !current.isIn()) continue;
                if (current.playerid == targetId) return current;
            }
        }
        var cursor = player && (player.getNext ? player.getNext() : player.next);
        var steps = 0;
        while (cursor && cursor != player && steps < 20) {
            if ((!cursor.isIn || cursor.isIn()) && cursor.playerid == targetId) return cursor;
            cursor = cursor.getNext ? cursor.getNext() : cursor.next;
            steps++;
        }
        return null;
    }

    globalThis.zusResolveFengzhaoTarget = resolveFengzhaoTarget;
    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("zhuluan", "runtimeGet", runtimeGet, "zusZhuluanRuntimeGet");
        Zus.bindHelper("zhuluan", "runtimeLib", runtimeLib, "zusZhuluanRuntimeLib");
        Zus.bindHelper("zhuluan", "safeColor", safeColor, "zusZhuluanSafeColor");
        Zus.bindHelper("zhuluan", "canUseHuangyiCard", canUseHuangyiCard, "zusZhuluanCanUseHuangyiCard");
        Zus.bindHelper("zhuluan", "huangyiCardInfo", huangyiCardInfo, "zusZhuluanHuangyiCardInfo");
        Zus.bindHelper("zhuluan", "dumpHuangyiDebug", dumpHuangyiDebug, "zusZhuluanDumpHuangyiDebug");
        Zus.bindHelper("zhuluan", "mergeRuntimeLib", mergeRuntimeLib, "zusZhuluanMergeRuntimeLib");
        Zus.bindHelper("zhuluan", "resolveFengzhaoTarget", resolveFengzhaoTarget, "zusResolveFengzhaoTarget");
    } else {
        globalThis.zusZhuluanRuntimeGet = runtimeGet;
        globalThis.zusZhuluanRuntimeLib = runtimeLib;
        globalThis.zusZhuluanSafeColor = safeColor;
        globalThis.zusZhuluanCanUseHuangyiCard = canUseHuangyiCard;
        globalThis.zusZhuluanHuangyiCardInfo = huangyiCardInfo;
        globalThis.zusZhuluanDumpHuangyiDebug = dumpHuangyiDebug;
        globalThis.zusZhuluanMergeRuntimeLib = mergeRuntimeLib;
    }

    var zhuluanModule = {
        key: "zhuluan",

        character: {
            zus_zhuluan: char("female", "zus_group_huan", 3, ["zus_huangyi", "zus_huangyi_wuxie", "zus_fengzhao"], "zus_zhuluan", "png"),
        },

        skill: {
            zus_huangyi: {
                mod: {
                    aiValue: function (player, card, num) {
                        var getter = globalThis.zusZhuluanRuntimeGet();
                        if (!getter || typeof player.getCards != "function") return;
                        if (getter.name(card) != "wuxie" && globalThis.zusZhuluanSafeColor(card, player) != "red") {
                            return;
                        }
                        var cards2 = player.getCards("hs", function (card2) {
                            return getter.name(card2) == "wuxie" || globalThis.zusZhuluanSafeColor(card2, player) == "red";
                        });
                        cards2.sort(function (a, b) {
                            return (getter.name(b) == "wuxie" ? 1 : 2) - (getter.name(a) == "wuxie" ? 1 : 2);
                        });
                        var geti = function () {
                            if (cards2.includes(card)) {
                                return cards2.indexOf(card);
                            }
                            return cards2.length;
                        };
                        if (getter.name(card) == "wuxie") {
                            return Math.min(num, [6, 4, 3][Math.min(geti(), 2)]) * 0.6;
                        }
                        return Math.max(num, [6, 4, 3][Math.min(geti(), 2)]);
                    },
                    aiUseful: function () {
                        var currentLib = globalThis.zusZhuluanRuntimeLib();
                        if (currentLib && currentLib.skill && currentLib.skill.zus_huangyi && currentLib.skill.zus_huangyi.mod && typeof currentLib.skill.zus_huangyi.mod.aiValue == "function") {
                            return currentLib.skill.zus_huangyi.mod.aiValue.apply(this, arguments);
                        }
                        return;
                    },
                },
                locked: false,
                enable: "chooseToUse",
                hiddenCard: function (player, name) {
                    if (name != "wuxie" || !(player && player.hp < player.maxHp) || typeof player.getCards != "function") return false;
                    return player.getCards("hs").some(function (card) {
                        return globalThis.zusZhuluanCanUseHuangyiCard(card, player);
                    });
                },
                hiddenWuxie: function (player, info) {
                    if (!(player && player.hp < player.maxHp) || typeof player.getCards != "function") return false;
                    return player.getCards("hs").some(function (card) {
                        return globalThis.zusZhuluanCanUseHuangyiCard(card, player);
                    });
                },
                filterCard: function (card, player) {
                    return globalThis.zusZhuluanCanUseHuangyiCard(card, player);
                },
                viewAsFilter: function (player) {
                    if (!(player && player.hp < player.maxHp) || typeof player.getCards != "function") return false;
                    var hand = player.getCards("hs");
                    var result = hand.some(function (card) {
                        return globalThis.zusZhuluanCanUseHuangyiCard(card, player);
                    });
                    globalThis.zusZhuluanDumpHuangyiDebug("parent_viewAsFilter", {
                        hp: player.hp,
                        maxHp: player.maxHp,
                        hand: hand.map(function (card) {
                            return globalThis.zusZhuluanHuangyiCardInfo(card, player);
                        }),
                        result: result,
                    });
                    return result;
                },
                viewAs: { name: "wuxie" },
                position: "hs",
                prompt: "\u5c06\u4e00\u5f20\u7ea2\u8272\u624b\u724c\u6216\u3010\u65e0\u61c8\u53ef\u51fb\u3011\u5f53\u3010\u65e0\u61c8\u53ef\u51fb\u3011\u4f7f\u7528",
                check: function (card) {
                    try {
                        var tri = _status && _status.event && typeof _status.event.getTrigger == "function" ? _status.event.getTrigger() : null;
                        if (tri && tri.card && tri.card.name == "chiling") {
                            return -1;
                        }
                        return 8 - get.value(card);
                    } catch (e) {
                        return 0;
                    }
                },
                threaten: 1.2,
            },

            zus_huangyi_wuxie: {
                mod: {
                    aiValue: function (player, card, num) {
                        var getter = globalThis.zusZhuluanRuntimeGet();
                        if (!getter || typeof player.getCards != "function") return;
                        if (getter.name(card) != "wuxie" && globalThis.zusZhuluanSafeColor(card, player) != "red") {
                            return;
                        }
                        var cards2 = player.getCards("hs", function (card2) {
                            return getter.name(card2) == "wuxie" || globalThis.zusZhuluanSafeColor(card2, player) == "red";
                        });
                        cards2.sort(function (a, b) {
                            return (getter.name(b) == "wuxie" ? 1 : 2) - (getter.name(a) == "wuxie" ? 1 : 2);
                        });
                        var geti = function () {
                            if (cards2.includes(card)) {
                                return cards2.indexOf(card);
                            }
                            return cards2.length;
                        };
                        if (getter.name(card) == "wuxie") {
                            return Math.min(num, [6, 4, 3][Math.min(geti(), 2)]) * 0.6;
                        }
                        return Math.max(num, [6, 4, 3][Math.min(geti(), 2)]);
                    },
                    aiUseful: function () {
                        var currentLib = globalThis.zusZhuluanRuntimeLib();
                        if (currentLib && currentLib.skill && currentLib.skill.zus_huangyi_wuxie && currentLib.skill.zus_huangyi_wuxie.mod && typeof currentLib.skill.zus_huangyi_wuxie.mod.aiValue == "function") {
                            return currentLib.skill.zus_huangyi_wuxie.mod.aiValue.apply(this, arguments);
                        }
                        return;
                    },
                },
                locked: false,
                hiddenSkill: true,
                enable: "chooseToUse",
                onChooseToUse: function (event) {
                    if (!event || event.type != "wuxie" || event.skill) return;
                    var player = event.player;
                    if (!(player && player.hp < player.maxHp)) return;
                    if (typeof player.getCards != "function") return;
                    var hs = [];
                    try {
                        hs = player.getCards ? player.getCards("hs").map(function (card) {
                            return globalThis.zusZhuluanHuangyiCardInfo(card, player);
                        }) : [];
                    } catch (e0) {}
                    var canUse = player.getCards("hs").some(function (card) {
                        return globalThis.zusZhuluanCanUseHuangyiCard(card, player);
                    });
                    globalThis.zusZhuluanDumpHuangyiDebug("onChooseToUse_before", {
                        eventType: event.type || null,
                        eventName: event.name || null,
                        eventSkill: event.skill || null,
                        hp: player.hp,
                        maxHp: player.maxHp,
                        hand: hs,
                        canUse: canUse,
                        skillChoice: event._skillChoice ? event._skillChoice.slice(0) : null,
                    });
                    if (!canUse) return;
                    if (typeof event.backup == "function") {
                        event.backup("zus_huangyi_wuxie");
                        globalThis.zusZhuluanDumpHuangyiDebug("onChooseToUse_after_backup", {
                            backedSkill: "zus_huangyi_wuxie",
                            eventSkill: event.skill || null,
                            position: event.position || null,
                        });
                    }
                },
                filterCard: function (card, player) {
                    var info = globalThis.zusZhuluanHuangyiCardInfo(card, player);
                    var allowWuxie = info.name == "wuxie";
                    if (allowWuxie) {
                        globalThis.zusZhuluanDumpHuangyiDebug("filterCard_allow_wuxie", {
                            card: info,
                        });
                        return true;
                    }
                    var allowRed = info.color == "red";
                    if (allowRed) {
                        globalThis.zusZhuluanDumpHuangyiDebug("filterCard_allow_red", {
                            card: info,
                        });
                    }
                    return allowRed;
                },
                viewAsFilter: function (player) {
                    if (!(player && player.hp < player.maxHp)) return false;
                    if (typeof player.getCards != "function") return false;
                    var hand = player.getCards("hs");
                    var result = hand.some(function (card) {
                        return globalThis.zusZhuluanCanUseHuangyiCard(card, player);
                    });
                    globalThis.zusZhuluanDumpHuangyiDebug("viewAsFilter", {
                        hp: player.hp,
                        maxHp: player.maxHp,
                        hand: hand.map(function (card) {
                            return globalThis.zusZhuluanHuangyiCardInfo(card, player);
                        }),
                        result: result,
                    });
                    return result;
                },
                viewAs: { name: "wuxie" },
                position: "hs",
                prompt: "\u5c06\u4e00\u5f20\u7ea2\u8272\u624b\u724c\u6216\u3010\u65e0\u61c8\u53ef\u51fb\u3011\u5f53\u3010\u65e0\u61c8\u53ef\u51fb\u3011\u4f7f\u7528",
                check: function (card) {
                    try {
                        var tri = _status && _status.event && typeof _status.event.getTrigger == "function" ? _status.event.getTrigger() : null;
                        if (tri && tri.card && tri.card.name == "chiling") {
                            return -1;
                        }
                        return 8 - get.value(card);
                    } catch (e) {
                        return 0;
                    }
                },
                threaten: 1.2,
            },

            zus_fengzhao: {
                trigger: { player: "phaseUseBegin" },
                direct: true,
                filter: function (event, player) {
                    if (!player) return false;
                    if (typeof player.getNext == "function") {
                        var next = player.getNext();
                        return !!(next && next != player && (!next.isIn || next.isIn()));
                    }
                    if (player.next && player.next != player) {
                        return !player.next.isIn || player.next.isIn();
                    }
                    return false;
                },
                content: function () {
                    "step 0";
                    player.chooseTarget(
                        "\u662f\u5426\u53d1\u52a8\u3010\u51e4\u8bcf\u3011\uff0c\u6307\u5b9a\u4e00\u540d\u5176\u4ed6\u89d2\u8272\uff1f",
                        function (card, player, target) {
                            return target != player && target.isIn && target.isIn();
                        }
                    ).set("ai", function (target) {
                        var player = _status.event.player;
                        var att = globalThis.zusSafeAttitude(player, target);
                        if (att > 0) return att + target.countCards("h") / 2;
                        return -att + target.countCards("h") / 3;
                    });

                    "step 1";
                    if (!result.bool || !result.targets || !result.targets.length) {
                        event.finish();
                        return;
                    }

                    event.target = result.targets[0];
                    player.logSkill("zus_fengzhao", event.target);

                    if (!player.storage) player.storage = {};
                    player.storage.zus_fengzhao_target = event.target;
                    player.storage.zus_fengzhao_target_id = event.target && event.target.playerid ? event.target.playerid : null;
                    player.storage.zus_fengzhao_disabled = false;
                    if (typeof player.syncStorage == "function") {
                        player.syncStorage("zus_fengzhao_target");
                        player.syncStorage("zus_fengzhao_target_id");
                        player.syncStorage("zus_fengzhao_disabled");
                    }

                    player.addTempSkill("zus_fengzhao_swap", { player: "phaseUseEnd" });
                    player.markSkill("zus_fengzhao_swap");
                },
            },

            zus_fengzhao_swap: {
                enable: "phaseUse",
                filter: function (event, player) {
                    if (player.storage && player.storage.zus_fengzhao_disabled) {
                        return false;
                    }

                    var target = globalThis.zusResolveFengzhaoTarget(player);
                    if (!target || !target.isIn || !target.isIn()) return false;
                    return player.countCards("h") > 0 && target.countCards("h") > 0;
                },
                content: function () {
                    "step 0";
                    event.target = globalThis.zusResolveFengzhaoTarget(player);
                    if (!event.target || !event.target.isIn || !event.target.isIn()) {
                        event.finish();
                        return;
                    }
                    if (!player.countCards("h") || !event.target.countCards("h")) {
                        event.finish();
                        return;
                    }
                    player.swapHandcards(event.target);

                    "step 1";
                    var playerMatched = player.countCards("h") == player.hp;
                    var targetMatched = event.target.countCards("h") == event.target.hp;
                    if (playerMatched) {
                        player.draw();
                    }
                    if (targetMatched) {
                        event.target.draw();
                    }
                    if (playerMatched || targetMatched) {
                        event.finish();
                        return;
                    }

                    player.loseHp();
                    if (!player.storage) player.storage = {};
                    player.storage.zus_fengzhao_disabled = true;
                    if (typeof player.syncStorage == "function") {
                        player.syncStorage("zus_fengzhao_disabled");
                    }

                    player.unmarkSkill("zus_fengzhao_swap");
                    player.removeSkill("zus_fengzhao_swap");
                    player.skip("phaseDiscard");
                    game.log(player, "\u56e0\u3010\u51e4\u8bcf\u3011\u8df3\u8fc7\u4e86\u672c\u56de\u5408\u7684\u5f03\u724c\u9636\u6bb5");
                },
                ai: {
                    order: 7,
                    result: {
                        player: function (player) {
                            var target = globalThis.zusResolveFengzhaoTarget(player);
                            if (!target || !target.isIn || !target.isIn()) return 0;

                            var att = globalThis.zusSafeAttitude(player, target);
                            if (att > 0) return 1;
                            if (target.countCards("h") > player.countCards("h") + 1) return 0.8;
                            return 0.3;
                        },
                    },
                },
                mark: true,
                intro: {
                    content: function (storage, player) {
                        var target = globalThis.zusResolveFengzhaoTarget(player);

                        if (player.storage && player.storage.zus_fengzhao_disabled) {
                            return "\u672c\u9636\u6bb5\u3010\u51e4\u8bcf\u3011\u4e0d\u53ef\u518d\u53d1\u52a8\u3002";
                        }

                        if (target && target.isIn && target.isIn()) {
                            return "\u672c\u9636\u6bb5\u53ef\u4e0e" + globalThis.zusSafeTranslation(target) + "\u4ea4\u6362\u5168\u90e8\u624b\u724c\u3002";
                        }

                        return "\u672a\u6307\u5b9a\u89d2\u8272\u3002";
                    },
                },
            },
        },

        translate: {
            zus_zhuluan: "\u6731\u9e3e",
            zus_zhuluan_ab: "\u6731\u9e3e",

            zus_huangyi: "\u7687\u4eea",
            zus_huangyi_info: "\u82e5\u4f60\u7684\u4f53\u529b\u503c\u4e0d\u4e3a\u6ee1\uff0c\u4f60\u89c6\u4e3a\u62e5\u6709\u3010\u7687\u4eea\u00b7\u65e0\u61c8\u3011\u3002",
            zus_huangyi_wuxie: "\u7687\u4eea",
            zus_huangyi_wuxie_info: "\u4f60\u53ef\u4ee5\u5c06\u4e00\u5f20\u7ea2\u8272\u624b\u724c\u5f53\u3010\u65e0\u61c8\u53ef\u51fb\u3011\u4f7f\u7528\u6216\u6253\u51fa\u3002",

            zus_fengzhao: "\u51e4\u8bcf",
            zus_fengzhao_info: "\u51fa\u724c\u9636\u6bb5\u5f00\u59cb\u65f6\uff0c\u4f60\u53ef\u4ee5\u6307\u5b9a\u4e00\u540d\u5176\u4ed6\u89d2\u8272\u3002\u672c\u9636\u6bb5\u5185\uff0c\u82e5\u4f60\u4e0e\u5176\u5747\u6709\u624b\u724c\uff0c\u4f60\u53ef\u4ee5\u4e0e\u5176\u4ea4\u6362\u5168\u90e8\u624b\u724c\u3002\u7136\u540e\uff0c\u4f60\u4e0e\u5176\u4e2d\u624b\u724c\u6570\u7b49\u4e8e\u5404\u81ea\u4f53\u529b\u503c\u7684\u89d2\u8272\u5404\u64781\u5f20\u724c\uff1b\u82e5\u53cc\u65b9\u5747\u4e0d\u6ee1\u8db3\uff0c\u5219\u4f60\u5931\u53bb1\u70b9\u4f53\u529b\uff0c\u672c\u9636\u6bb5\u6b64\u6280\u80fd\u4e0d\u53ef\u518d\u53d1\u52a8\uff0c\u7136\u540e\u8df3\u8fc7\u672c\u56de\u5408\u7684\u5f03\u724c\u9636\u6bb5\u3002",

            zus_fengzhao_swap: "\u51e4\u8bcf",
            zus_fengzhao_swap_info: "\u672c\u9636\u6bb5\u5185\uff0c\u4f60\u53ef\u4ee5\u4e0e\u3010\u51e4\u8bcf\u3011\u6307\u5b9a\u7684\u89d2\u8272\u4ea4\u6362\u5168\u90e8\u624b\u724c\u3002",
        },

        sort: ["zus_zhuluan"],

        title: {
            zus_zhuluan: "\u897f\u7687",
        },
    };

    window.zusfylriModules["zhuluan"] = zhuluanModule;

    mergeRuntimeLib(globalThis.lib || lib || null, zhuluanModule);
    Promise.resolve()
        .then(function () {
            return import("/noname.js");
        })
        .then(function (nonameModule) {
            if (nonameModule && nonameModule.lib) {
                mergeRuntimeLib(nonameModule.lib, zhuluanModule);
            }
        })
        .catch(function () {});
})();
