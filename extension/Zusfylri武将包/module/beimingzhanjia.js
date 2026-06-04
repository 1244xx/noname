(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof get === "undefined") var get = globalThis.get;
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

    function safeName(card, player) {
        if (!card) return null;
        try {
            if (window.Zus && Zus.safeName) {
                var zusName = Zus.safeName(card, player);
                if (zusName) return zusName;
            }
        } catch (e) {}
        try {
            var getter = globalThis.get || get;
            var name = getter && getter.name ? getter.name(card, player) : null;
            if (name) return name;
        } catch (e2) {}
        return card.name || null;
    }

    function runtimeGet() {
        try {
            if (window.Zus && Zus.runtimeGet) {
                var getter = Zus.runtimeGet();
                if (getter) return getter;
            }
        } catch (e) {}
        return globalThis.get || get || null;
    }

    function safeType(card, player) {
        if (!card) return null;
        try {
            if (window.Zus && Zus.safeType) {
                var zusType = Zus.safeType(card, player);
                if (zusType && zusType != "card") return zusType;
            }
        } catch (e) {}
        try {
            var getter = globalThis.get || get;
            var type = getter && getter.type ? getter.type(card, null, player) : null;
            if (type && type != "card") return type;
        } catch (e2) {}
        try {
            var getter1 = globalThis.get || get;
            var type1 = getter1 && getter1.type ? getter1.type(card, player) : null;
            if (type1 && type1 != "card") return type1;
        } catch (e3) {}
        try {
            var getter2 = globalThis.get || get;
            var type2 = getter2 && getter2.type2 ? getter2.type2(card, player) : null;
            if (type2 && type2 != "card") return type2;
        } catch (e4) {}
        try {
            var currentLib = globalThis.lib || lib;
            var name = safeName(card, player);
            return currentLib && currentLib.card && currentLib.card[name] && currentLib.card[name].type || null;
        } catch (e5) {}
        return null;
    }

    function isBasicCard(card, player) {
        var name = safeName(card, player);
        if (["sha", "shan", "tao", "jiu", "du"].indexOf(name) != -1) return true;
        return safeType(card, player) == "basic";
    }

    function eventCard(event, player) {
        if (!event) return null;
        var list = [
            event.card,
            event.responded,
            event.result && event.result.card,
            event.result && event.result.cards && event.result.cards[0],
            event.cards && event.cards[0],
            event.cards2 && event.cards2[0],
        ];
        for (var i = 0; i < list.length; i++) {
            if (list[i] && (safeName(list[i], player) || safeType(list[i], player))) return list[i];
        }
        return null;
    }

    function isSha(card, player) {
        return safeName(card, player) == "sha";
    }

    function hasNatureDamage(event) {
        if (!event) return false;
        try {
            if (event.hasNature && event.hasNature()) return true;
        } catch (e) {}
        return !!event.nature;
    }

    function cardHasNatureDamage(card, player) {
        if (!card) return false;
        var getter = runtimeGet();
        try {
            if (getter && getter.tag && getter.tag(card, "natureDamage")) return true;
            if (getter && getter.tag && getter.tag(card, "fireDamage")) return true;
            if (getter && getter.tag && getter.tag(card, "thunderDamage")) return true;
            if (getter && getter.tag && getter.tag(card, "iceDamage")) return true;
        } catch (e) {}
        try {
            if (card.nature) return true;
            if (getter && getter.nature && getter.nature(card, player)) return true;
            if (getter && getter.natureList && getter.natureList(card).length) return true;
        } catch (e2) {}
        try {
            var currentGame = globalThis.game || game;
            if (currentGame && currentGame.hasNature && currentGame.hasNature(card)) return true;
        } catch (e3) {}
        var name = safeName(card, player);
        return ["huogong", "huosha", "leisha", "icesha", "thundersha", "firesha", "firedamage", "thunderdamage", "icedamage"].indexOf(name) != -1;
    }

    function hujia(player) {
        return player && typeof player.hujia == "number" ? player.hujia : 0;
    }

    function changeHujia(player, num) {
        if (!player || !num) return;
        if (player.changeHujia) {
            player.changeHujia(num, null, true);
        } else {
            if (typeof player.hujia != "number") player.hujia = 0;
            player.hujia = Math.max(0, player.hujia + num);
            if (player.update) player.update();
            if (game && game.log) {
                game.log(player, num > 0 ? "获得了" : "失去了", Math.abs(num), "点护甲");
            }
        }
    }

    function addDirectHit(useEvent, target) {
        if (!useEvent || !target) return;
        if (!useEvent.directHit) useEvent.directHit = [];
        if (useEvent.directHit.add) useEvent.directHit.add(target);
        else if (useEvent.directHit.indexOf(target) == -1) useEvent.directHit.push(target);
    }

    function prompt(skill, target, fallback) {
        try {
            var getter = runtimeGet();
            if (getter && getter.prompt) return getter.prompt(skill, target);
        } catch (e) {}
        return fallback || ("是否发动【" + skill + "】？");
    }

    globalThis.zusBeimingSafeName = safeName;
    globalThis.zusBeimingRuntimeGet = runtimeGet;
    globalThis.zusBeimingSafeType = safeType;
    globalThis.zusBeimingIsBasicCard = isBasicCard;
    globalThis.zusBeimingEventCard = eventCard;
    globalThis.zusBeimingIsSha = isSha;
    globalThis.zusBeimingHasNatureDamage = hasNatureDamage;
    globalThis.zusBeimingCardHasNatureDamage = cardHasNatureDamage;
    globalThis.zusBeimingHujia = hujia;
    globalThis.zusBeimingChangeHujia = changeHujia;
    globalThis.zusBeimingAddDirectHit = addDirectHit;
    globalThis.zusBeimingPrompt = prompt;

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("beimingzhanjia", "safeName", safeName, { globalName: "zusBeimingSafeName", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "runtimeGet", runtimeGet, { globalName: "zusBeimingRuntimeGet", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "safeType", safeType, { globalName: "zusBeimingSafeType", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "isBasicCard", isBasicCard, { globalName: "zusBeimingIsBasicCard", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "eventCard", eventCard, { globalName: "zusBeimingEventCard", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "isSha", isSha, { globalName: "zusBeimingIsSha", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "hasNatureDamage", hasNatureDamage, { globalName: "zusBeimingHasNatureDamage", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "cardHasNatureDamage", cardHasNatureDamage, { globalName: "zusBeimingCardHasNatureDamage", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "hujia", hujia, { globalName: "zusBeimingHujia", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "changeHujia", changeHujia, { globalName: "zusBeimingChangeHujia", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "addDirectHit", addDirectHit, { globalName: "zusBeimingAddDirectHit", overwrite: true });
        Zus.bindHelper("beimingzhanjia", "prompt", prompt, { globalName: "zusBeimingPrompt", overwrite: true });
    }

    window.zusfylriModules["beimingzhanjia"] = {
        key: "beimingzhanjia",
        character: {
            zus_beimingzhanjia: char("male", "shen", 5, ["zus_baxue", "zus_xuanjia", "zus_chongzhen"], "zus_beimingzhanjia", "png"),
        },
        skill: {
            zus_baxue: {
                trigger: { player: ["useCard1", "respondAfter"] },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    var card = globalThis.zusBeimingEventCard(event, player);
                    return !!(card && globalThis.zusBeimingIsBasicCard(card, player));
                },
                content: function () {
                    "step 0"
                    player.loseHp();

                    "step 1"
                    globalThis.zusBeimingChangeHujia(player, 1);
                },
                ai: {
                    threaten: 1.4,
                },
            },

            zus_xuanjia: {
                locked: true,
                forced: true,
                group: ["zus_xuanjia_nature", "zus_xuanjia_recover", "zus_xuanjia_directHit"],
            },

            zus_xuanjia_nature: {
                trigger: { player: "damageBegin4" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    return globalThis.zusBeimingHujia(player) >= 1 && globalThis.zusBeimingHasNatureDamage(event);
                },
                content: function () {
                    trigger.cancel();
                },
                ai: {
                    nofire: true,
                    nothunder: true,
                    filterDamage: true,
                    skillTagFilter: function (player, tag, arg) {
                        return !!(player && globalThis.zusBeimingHujia(player) >= 1 && arg && globalThis.zusBeimingCardHasNatureDamage(arg.card, arg.player));
                    },
                    effect: {
                        target: function (card, player, target) {
                            if (target && globalThis.zusBeimingHujia(target) >= 1) {
                                if (globalThis.zusBeimingCardHasNatureDamage(card, player)) return "zeroplayertarget";
                            }
                        },
                    },
                },
            },

            zus_xuanjia_recover: {
                trigger: { player: "phaseBegin" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    return globalThis.zusBeimingHujia(player) >= 2 && player.isDamaged && player.isDamaged();
                },
                content: function () {
                    player.recover();
                },
            },

            zus_xuanjia_directHit: {
                trigger: { global: "useCardToTargeted" },
                forced: true,
                locked: true,
                popup: false,
                filter: function (event, player) {
                    if (globalThis.zusBeimingHujia(player) < 3) return false;
                    if (!event || !event.card || !globalThis.zusBeimingIsSha(event.card, event.player)) return false;
                    return event.player == player || event.target == player;
                },
                content: function () {
                    var target = trigger.player == player ? trigger.target : player;
                    var evt = trigger.getParent ? trigger.getParent() : trigger;
                    globalThis.zusBeimingAddDirectHit(evt, target);
                    if (game && game.log) game.log(trigger.card, "不可被", target, "使用【闪】响应");
                },
            },

            zus_chongzhen: {
                trigger: { player: "shaHit" },
                direct: true,
                filter: function (event, player) {
                    if (!event || !event.target || !event.card || !globalThis.zusBeimingIsSha(event.card, player)) return false;
                    return globalThis.zusBeimingHujia(player) + globalThis.zusBeimingHujia(event.target) > 0;
                },
                content: function () {
                    "step 0"
                    event.target = trigger.target;
                    event.sourceHujia = globalThis.zusBeimingHujia(player);
                    event.targetHujia = globalThis.zusBeimingHujia(event.target);
                    event.total = event.sourceHujia + event.targetHujia;
                    player.chooseBool(globalThis.zusBeimingPrompt("zus_chongzhen", event.target, "是否发动【衝陣】？"), "消除双方所有护甲值，令此【杀】伤害+" + event.total).set("ai", function () {
                        var status = globalThis._status || {};
                        var player = status.event && status.event.player;
                        var evt = status.event && status.event.getParent ? status.event.getParent() : null;
                        var target = evt && evt.target;
                        if (!player || !target) return false;
                        var getter = globalThis.zusBeimingRuntimeGet();
                        return getter && getter.attitude ? getter.attitude(player, target) < 0 : false;
                    });

                    "step 1"
                    if (!result.bool || !event.target || event.total <= 0) {
                        event.finish();
                        return;
                    }
                    player.logSkill("zus_chongzhen", event.target);
                    if (event.sourceHujia > 0) {
                        globalThis.zusBeimingChangeHujia(player, -event.sourceHujia);
                    }

                    "step 2"
                    if (event.targetHujia > 0) {
                        globalThis.zusBeimingChangeHujia(event.target, -event.targetHujia);
                    }

                    "step 3"
                    trigger.baseDamage = (trigger.baseDamage || 1) + event.total;
                    if (game && game.log) game.log(trigger.card, "追加了", event.total, "点伤害");
                },
            },
        },
        translate: {
            zus_beimingzhanjia: "北冥战甲",
            zus_beimingzhanjia_ab: "北冥",
            zus_baxue: "霸血",
            zus_baxue_info: "锁定技，每当你使用或打出1张基本牌，你失去1点体力，然后增加1点护甲。",
            zus_xuanjia: "玄甲",
            zus_xuanjia_info: "锁定技，若你的护甲值：不小于1，属性伤害对你无效；不小于2，在你的回合开始阶段回复1点体力；不小于3，你成为【杀】的来源或目标时，此【杀】不可被【闪】响应。",
            zus_xuanjia_nature: "玄甲",
            zus_xuanjia_recover: "玄甲",
            zus_xuanjia_directHit: "玄甲",
            zus_chongzhen: "衝陣",
            zus_chongzhen_info: "当你使用的【杀】未被【闪】响应，你可以消除双方所有护甲值，每消除1点，此【杀】追加1点伤害。",
        },
        title: {
            zus_beimingzhanjia: "破阵子",
        },
        sort: ["zus_beimingzhanjia"],
    };
})();
