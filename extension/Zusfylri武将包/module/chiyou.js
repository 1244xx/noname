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
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "png");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function runtimeLib() {
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().lib;
                if (current) return current;
            }
        } catch (e) {}
        try {
            if (typeof window != "undefined" && window.top && window.top.lib) return window.top.lib;
        } catch (e2) {}
        return globalThis.lib || lib || null;
    }

    function runtimeGame() {
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().game;
                if (current) return current;
            }
        } catch (e) {}
        try {
            if (typeof window != "undefined" && window.top && window.top.game) return window.top.game;
        } catch (e2) {}
        return globalThis.game || game || null;
    }

    function runtimeGet() {
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().get;
                if (current) return current;
            }
        } catch (e) {}
        try {
            if (typeof window != "undefined" && window.top && window.top.get) return window.top.get;
        } catch (e2) {}
        return globalThis.get || get || null;
    }

    function safeName(card, player) {
        try {
            if (window.Zus && Zus.safeName) return Zus.safeName(card, player);
        } catch (e) {}
        try {
            var getter = runtimeGet();
            if (getter && getter.name) return getter.name(card, player);
        } catch (e2) {}
        return card && card.name || null;
    }

    function safeColor(card, player) {
        var info = cardColorInfo(card, player);
        return info && info.color || null;
    }

    function normalizeColor(color) {
        if (!color) return null;
        color = String(color).toLowerCase();
        if (color == "black" || color == "red") return color;
        if (color == "spade" || color == "club") return "black";
        if (color == "heart" || color == "diamond") return "red";
        if (color == "黑" || color == "黑色") return "black";
        if (color == "红" || color == "红色") return "red";
        return null;
    }

    function normalizeSuit(suit) {
        if (!suit) return null;
        suit = String(suit).toLowerCase();
        if (suit == "spade" || suit == "club" || suit == "heart" || suit == "diamond") return suit;
        if (suit == "♠" || suit == "黑桃") return "spade";
        if (suit == "♣" || suit == "梅花") return "club";
        if (suit == "♥" || suit == "红桃") return "heart";
        if (suit == "♦" || suit == "方片" || suit == "方块") return "diamond";
        return null;
    }

    function cardColorInfo(card, player) {
        var info = {
            color: null,
            source: null,
            rawColor: null,
            suit: null,
        };
        if (!card) return info;
        try {
            if (window.Zus && Zus.safeColor) {
                info.rawColor = Zus.safeColor(card, player);
                info.color = normalizeColor(info.rawColor);
                if (info.color) {
                    info.source = "Zus.safeColor";
                    return info;
                }
            }
        } catch (e) {}
        try {
            var getter = runtimeGet();
            if (getter && getter.color) {
                info.rawColor = getter.color(card, player);
                info.color = normalizeColor(info.rawColor);
                if (info.color) {
                    info.source = "get.color";
                    return info;
                }
            }
            if (getter && getter.suit) {
                info.suit = normalizeSuit(getter.suit(card, player));
                info.color = normalizeColor(info.suit);
                if (info.color) {
                    info.source = "get.suit";
                    return info;
                }
            }
        } catch (e2) {}
        var directColor = card.color || card.cardcolor || card.cardColor || card.cardColour || card.cardcolour ||
            (card.storage && (card.storage.color || card.storage.cardcolor || card.storage.cardColor));
        info.rawColor = directColor;
        info.color = normalizeColor(directColor);
        if (info.color) {
            info.source = "card.color";
            return info;
        }
        var suit = card.suit || card.cardsuit || card.cardSuit || card.cardsuit ||
            (card.storage && (card.storage.suit || card.storage.cardsuit || card.storage.cardSuit));
        info.suit = normalizeSuit(suit);
        info.color = normalizeColor(info.suit);
        if (info.color) {
            info.source = "card.suit";
            return info;
        }
        try {
            if (card.dataset) {
                info.rawColor = card.dataset.color || card.dataset.cardcolor || card.dataset.cardColor || null;
                info.color = normalizeColor(info.rawColor);
                if (info.color) {
                    info.source = "dataset.color";
                    return info;
                }
                info.suit = normalizeSuit(card.dataset.suit || card.dataset.cardsuit || card.dataset.cardSuit);
                info.color = normalizeColor(info.suit);
                if (info.color) {
                    info.source = "dataset.suit";
                    return info;
                }
            }
        } catch (e3) {}
        try {
            if (card.getAttribute) {
                info.rawColor = card.getAttribute("data-color") || card.getAttribute("cardcolor") || null;
                info.color = normalizeColor(info.rawColor);
                if (info.color) {
                    info.source = "attribute.color";
                    return info;
                }
                info.suit = normalizeSuit(card.getAttribute("data-suit") || card.getAttribute("cardsuit"));
                info.color = normalizeColor(info.suit);
                if (info.color) {
                    info.source = "attribute.suit";
                    return info;
                }
            }
        } catch (e4) {}
        try {
            var className = card.className ? String(card.className) : "";
            if (className.indexOf("black") != -1) {
                info.color = "black";
                info.source = "className";
                return info;
            }
            if (className.indexOf("red") != -1) {
                info.color = "red";
                info.source = "className";
                return info;
            }
        } catch (e5) {}
        return info;
    }

    function safePlayerInfo(player) {
        if (!player) return null;
        var translated = null;
        try {
            var getter = runtimeGet();
            if (getter && getter.translation) translated = getter.translation(player);
        } catch (e) {}
        return {
            name: player.name || null,
            name1: player.name1 || null,
            name2: player.name2 || null,
            translated: translated,
            hp: typeof player.hp == "number" ? player.hp : null,
            maxHp: typeof player.maxHp == "number" ? player.maxHp : null,
            inGame: !!(!player.isIn || player.isIn()),
            hand: player.countCards ? player.countCards("h") : null,
            equip: player.countCards ? player.countCards("e") : null,
        };
    }

    function appendMoyiDebug(debug) {
        var line = JSON.stringify(debug) + "\n";
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (req) {
                var fs = req("fs");
                fs.appendFileSync(
                    "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/chiyou_moyi_debug.log",
                    line,
                    "utf8"
                );
            }
        } catch (e) {}
        try {
            var currentGame = runtimeGame();
            if (currentGame && typeof currentGame.writeFile == "function") {
                currentGame.writeFile(
                    line,
                    "extension/Zusfylri武将包/docs",
                    "chiyou_moyi_debug_latest.log",
                    function () {}
                );
            }
        } catch (e2) {}
    }

    function writeMoyiDebug(stage, data) {
        var debug = data || {};
        debug.stage = stage;
        debug.timestamp = Date.now();
        globalThis.zusChiyouMoyiDebug = debug;
        appendMoyiDebug(debug);
        try {
            if (window.localStorage) localStorage.setItem("zus_chiyou_moyi_debug", JSON.stringify(debug));
        } catch (e) {}
        try {
            var currentGame = runtimeGame();
            if (currentGame && typeof currentGame.saveConfig == "function") {
                currentGame.saveConfig("zus_chiyou_moyi_debug_ascii", debug);
            }
        } catch (e2) {}
    }

    function resolveDamageSource(damageEvent, player) {
        if (!damageEvent) return null;
        if (damageEvent.zus_moyi_source) return damageEvent.zus_moyi_source;
        if (damageEvent.source) return damageEvent.source;

        var current = damageEvent;
        for (var i = 0; i < 4; i++) {
            if (!current || !current.getParent) break;
            current = current.getParent();
            if (current && current.source) return current.source;
        }
        return null;
    }

    function lostBloodModes(beforeHp, damageNum, fixedMaxHp) {
        var result = [];
        var fixed = fixedMaxHp || 4;
        var num = Math.max(0, Math.floor(damageNum || 0));
        var startHp = Math.max(0, Math.min(fixed, Math.floor(beforeHp || fixed)));
        for (var i = 0; i < num; i++) {
            var hpBeforeThisPoint = startHp - i;
            if (hpBeforeThisPoint <= 0) break;
            var mode = fixed - hpBeforeThisPoint;
            // 猰/狰/狻由 damageEnd 处理；貙保留给 dying 分支。
            if (mode >= 0 && mode <= 2) result.push(mode);
        }
        return result;
    }

    function addDirectHit(useEvent, target) {
        if (!useEvent || !target) return;
        if (!useEvent.directHit) useEvent.directHit = [];
        if (useEvent.directHit.add) useEvent.directHit.add(target);
        else if (useEvent.directHit.indexOf(target) == -1) useEvent.directHit.push(target);
    }

    function enforceMaxHp(player) {
        if (!player) return false;
        player.storage = player.storage || {};
        var fixed = player.storage.zus_moyi_fixed_maxHp || 4;
        player.storage.zus_moyi_fixed_maxHp = fixed;
        var changed = false;
        if (player.maxHp !== fixed) {
            player.maxHp = fixed;
            changed = true;
        }
        if (player.hp > player.maxHp) {
            player.hp = player.maxHp;
            changed = true;
        }
        try {
            if (player.hasSkill && player.hasSkill("zus_jisui_gouyu")) {
                player.removeSkill("zus_jisui_gouyu");
                changed = true;
            }
        } catch (e) {}
        if (changed && player.update) player.update();
        return changed;
    }

    function blackCards(player) {
        if (!player || !player.getCards) return [];
        var cards = player.getCards("he") || [];
        var result = [];
        for (var i = 0; i < cards.length; i++) {
            if (safeColor(cards[i], player) == "black") result.push(cards[i]);
        }
        return result;
    }

    function firstTargetableEnemy(player, card) {
        var currentGame = runtimeGame();
        var list = [];
        try {
            if (window.Zus && Zus.players) list = Zus.players() || [];
        } catch (e) {}
        if ((!list || !list.length) && currentGame && currentGame.players) list = currentGame.players;
        for (var i = 0; i < list.length; i++) {
            var target = list[i];
            if (!target || target == player || target.isIn && !target.isIn()) continue;
            try {
                if (player.canUse && player.canUse(card, target, false)) return target;
            } catch (e2) {}
        }
        return null;
    }

    function countSourceDamageTo(player, target) {
        if (!player || !target || !player.getHistory) return 0;
        var history = [];
        try {
            history = player.getHistory("sourceDamage") || [];
        } catch (e) {
            history = [];
        }
        var count = 0;
        for (var i = 0; i < history.length; i++) {
            var evt = history[i];
            if (!evt) continue;
            if (evt.player && evt.player != target) continue;
            count++;
        }
        return count;
    }

    function countSourceDamageAmong(player, targets) {
        if (!player || !targets || !targets.length || !player.getHistory) return 0;
        var history = [];
        try {
            history = player.getHistory("sourceDamage") || [];
        } catch (e) {
            history = [];
        }
        var count = 0;
        for (var i = 0; i < history.length; i++) {
            var evt = history[i];
            if (!evt || !evt.player) continue;
            if (targets.indexOf(evt.player) != -1) count++;
        }
        return count;
    }

    function nanmanTargets(player) {
        var currentGame = runtimeGame();
        var currentLib = runtimeLib();
        var targets = [];
        var card = { name: "nanman", isCard: true };
        var canTarget = function (target) {
            if (!target || target == player || target.isIn && !target.isIn()) return false;
            try {
                if (currentLib && currentLib.filter && currentLib.filter.targetEnabled2 && currentLib.filter.targetEnabled2(card, player, target)) {
                    return true;
                }
            } catch (e) {}
            try {
                if (currentLib && currentLib.filter && currentLib.filter.targetEnabled && currentLib.filter.targetEnabled(card, player, target)) {
                    return true;
                }
            } catch (e2) {}
            try {
                var info = currentLib && currentLib.card && currentLib.card.nanman;
                if (info && typeof info.filterTarget == "function" && info.filterTarget(card, player, target)) {
                    return true;
                }
            } catch (e3) {}
            try {
                if (player.canUse && player.canUse(card, target, false)) return true;
            } catch (e4) {}
            return false;
        };
        var add = function (target) {
            if (!target || target == player || target.isIn && !target.isIn()) return;
            if (targets.indexOf(target) != -1) return;
            if (canTarget(target)) targets.push(target);
        };
        try {
            if (window.Zus && Zus.players) {
                var list = Zus.players() || [];
                for (var i = 0; i < list.length; i++) add(list[i]);
            }
        } catch (e2) {}
        try {
            if (currentGame && currentGame.players) {
                for (var j = 0; j < currentGame.players.length; j++) add(currentGame.players[j]);
            }
        } catch (e3) {}
        if (!targets.length) {
            var fallback = [];
            try {
                if (window.Zus && Zus.players) fallback = Zus.players() || [];
            } catch (e4) {}
            if ((!fallback || !fallback.length) && currentGame && currentGame.players) fallback = currentGame.players;
            for (var k = 0; k < fallback.length; k++) {
                var target = fallback[k];
                if (!target || target == player || target.isIn && !target.isIn()) continue;
                if (targets.indexOf(target) == -1) targets.push(target);
            }
        }
        if (targets.sortBySeat) targets.sortBySeat();
        return targets;
    }

    globalThis.zusChiyouSafeName = safeName;
    globalThis.zusChiyouSafeColor = safeColor;
    globalThis.zusChiyouCardColorInfo = cardColorInfo;
    globalThis.zusChiyouSafePlayerInfo = safePlayerInfo;
    globalThis.zusChiyouWriteMoyiDebug = writeMoyiDebug;
    globalThis.zusChiyouResolveDamageSource = resolveDamageSource;
    globalThis.zusChiyouLostBloodModes = lostBloodModes;
    globalThis.zusChiyouAddDirectHit = addDirectHit;
    globalThis.zusChiyouEnforceMaxHp = enforceMaxHp;
    globalThis.zusChiyouBlackCards = blackCards;
    globalThis.zusChiyouFirstTargetableEnemy = firstTargetableEnemy;
    globalThis.zusChiyouCountSourceDamageTo = countSourceDamageTo;
    globalThis.zusChiyouCountSourceDamageAmong = countSourceDamageAmong;
    globalThis.zusChiyouNanmanTargets = nanmanTargets;

    var chiyouModule = {
        key: "chiyou",

        character: {
            zus_chiyou: char("male", "zus_group_mo", 4, ["zus_moyi", "zus_huoyuan"], "zus_chiyou", "png"),
        },

        skill: {
            zus_moyi: {
                locked: true,
                forced: true,
                group: [
                    "zus_moyi_tao_invalid",
                    "zus_moyi_maxhp",
                    "zus_moyi_damage_record",
                    "zus_moyi_damage",
                    "zus_moyi_dying",
                ],
                init: function (player) {
                    player.storage = player.storage || {};
                    player.storage.zus_moyi_fixed_maxHp = 4;
                    if (globalThis.zusChiyouEnforceMaxHp) globalThis.zusChiyouEnforceMaxHp(player);
                },
                mark: true,
                intro: {
                    content: "桃对你无效；你的体力上限不会增加、减少或被击碎。",
                },
            },

            zus_moyi_tao_invalid: {
                trigger: { target: "useCardToTargeted" },
                forced: true,
                popup: false,
                filter: function (event, player) {
                    return !!(event && event.card && globalThis.zusChiyouSafeName(event.card, event.player) == "tao");
                },
                content: function () {
                    var parent = trigger && trigger.getParent ? trigger.getParent() : null;
                    if (parent && parent.excluded && parent.excluded.add) parent.excluded.add(player);
                    game.log(player, "令此【桃】对其无效");
                },
            },

            zus_moyi_maxhp: {
                trigger: {
                    player: ["enterGame", "gainMaxHpAfter", "loseMaxHpAfter", "changeHp", "phaseBegin", "phaseEnd"],
                },
                forced: true,
                silent: true,
                popup: false,
                filter: function (event, player) {
                    if (!player) return false;
                    if (player.hasSkill && player.hasSkill("zus_jisui_gouyu")) return true;
                    return player.maxHp !== (player.storage && player.storage.zus_moyi_fixed_maxHp || 4);
                },
                content: function () {
                    if (globalThis.zusChiyouEnforceMaxHp) globalThis.zusChiyouEnforceMaxHp(player);
                },
            },

            zus_moyi_damage_record: {
                trigger: { player: "damageBegin4" },
                forced: true,
                silent: true,
                popup: false,
                filter: function (event, player) {
                    return !!event;
                },
                content: function () {
                    trigger.zus_moyi_beforeHp = player.hp;
                    if (globalThis.zusChiyouWriteMoyiDebug) {
                        globalThis.zusChiyouWriteMoyiDebug("damage_record_before_hp", {
                            beforeHp: player.hp,
                            damageNum: trigger && trigger.num || 1,
                            player: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(player) : null,
                        });
                    }
                },
            },

            zus_moyi_damage: {
                trigger: { player: "damageEnd" },
                forced: true,
                filter: function (event, player) {
                    var source = globalThis.zusChiyouResolveDamageSource
                        ? globalThis.zusChiyouResolveDamageSource(event, player)
                        : event && event.source;
                    if (event) event.zus_moyi_source = source || null;
                    if (globalThis.zusChiyouWriteMoyiDebug) {
                        globalThis.zusChiyouWriteMoyiDebug("damage_filter", {
                            player: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(player) : null,
                            source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(source) : null,
                            triggerName: event && event.name || null,
                            hasSource: !!source,
                            sourceInGame: !!(source && (!source.isIn || source.isIn())),
                        });
                    }
                    return !!(source && (!source.isIn || source.isIn()));
                },
                content: function () {
                    "step 0"
                    if (!event.zus_moyi_started) {
                        player.storage = player.storage || {};
                        event.zus_moyi_started = true;
                        event.zus_moyi_index = 0;
                        event.damageNum = Math.max(1, Math.floor((trigger && trigger.num) || 1));
                        event.beforeHp = typeof trigger.zus_moyi_beforeHp == "number"
                            ? trigger.zus_moyi_beforeHp
                            : player.hp + event.damageNum;
                        event.afterHp = typeof player.hp == "number" ? player.hp : event.beforeHp - event.damageNum;
                        event.lostHp = Math.max(0, Math.floor(event.beforeHp - event.afterHp));
                        event.bloodModes = globalThis.zusChiyouLostBloodModes
                            ? globalThis.zusChiyouLostBloodModes(event.beforeHp, event.lostHp, 4)
                            : [];
                        event.total = event.bloodModes.length;
                        event.source = globalThis.zusChiyouResolveDamageSource
                            ? globalThis.zusChiyouResolveDamageSource(trigger, player)
                            : trigger.source;
                        if (globalThis.zusChiyouWriteMoyiDebug) {
                            globalThis.zusChiyouWriteMoyiDebug("damage_content_begin", {
                                damageNum: event.damageNum,
                                lostHp: event.lostHp,
                                beforeHp: event.beforeHp,
                                afterHp: event.afterHp,
                                bloodModes: event.bloodModes,
                                total: event.total,
                                player: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(player) : null,
                                source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                                triggerName: trigger && trigger.name || null,
                                triggerHasCachedSource: !!(trigger && trigger.zus_moyi_source),
                                triggerHasSource: !!(trigger && trigger.source),
                            });
                        }
                        if (!event.total) {
                            if (globalThis.zusChiyouWriteMoyiDebug) {
                                globalThis.zusChiyouWriteMoyiDebug("damage_no_damage_end_blood", {
                                    damageNum: event.damageNum,
                                    lostHp: event.lostHp,
                                    beforeHp: event.beforeHp,
                                    afterHp: event.afterHp,
                                    reason: "lost blood is handled by dying or outside named gouyu range",
                                });
                            }
                            event.finish();
                            return;
                        }
                    }
                    if (!event.source || event.source.isIn && !event.source.isIn()) {
                        if (globalThis.zusChiyouWriteMoyiDebug) {
                            globalThis.zusChiyouWriteMoyiDebug("damage_no_source", {
                                index: event.zus_moyi_index,
                                player: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(player) : null,
                                source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                            });
                        }
                        event.finish();
                        return;
                    }
                    event.mode = event.bloodModes[event.zus_moyi_index];
                    event.modeName = ["猰", "狰", "狻"][event.mode] || null;
                    event.recover = false;
                    event.recoverCheck = null;
                    event.recoverDamageBefore = 0;
                    event.recoverDamageTarget = null;
                    event.skipReason = null;
                    if (globalThis.zusChiyouWriteMoyiDebug) {
                        globalThis.zusChiyouWriteMoyiDebug("damage_iteration_begin", {
                            index: event.zus_moyi_index,
                            total: event.total,
                            mode: event.mode,
                            modeName: event.modeName,
                            bloodModes: event.bloodModes,
                            beforeHp: event.beforeHp,
                            damageNum: event.damageNum,
                            lostHp: event.lostHp,
                            player: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(player) : null,
                            source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                        });
                    }
                    if (event.mode === 0) {
                        event.cards = event.source.getCards ? event.source.getCards("he") : [];
                        if (!event.cards.length) {
                            event.skipReason = "source_no_card";
                            if (globalThis.zusChiyouWriteMoyiDebug) {
                                globalThis.zusChiyouWriteMoyiDebug("damage_ya_no_card", {
                                    index: event.zus_moyi_index,
                                    source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                                });
                            }
                        } else {
                            var card = event.cards[0];
                            var colorInfo = globalThis.zusChiyouCardColorInfo
                                ? globalThis.zusChiyouCardColorInfo(card, event.source)
                                : { color: globalThis.zusChiyouSafeColor ? globalThis.zusChiyouSafeColor(card, event.source) : null };
                            event.recover = colorInfo && colorInfo.color == "black";
                            var special = globalThis.ui && globalThis.ui.special;
                            event.source.lose(card, special).set("getlx", false).set("type", "zus_moyi_mo");
                            player.gain(card, "gain2");
                            if (globalThis.zusChiyouWriteMoyiDebug) {
                                globalThis.zusChiyouWriteMoyiDebug("damage_ya_gain", {
                                    index: event.zus_moyi_index,
                                    card: {
                                        name: globalThis.zusChiyouSafeName ? globalThis.zusChiyouSafeName(card, event.source) : card && card.name || null,
                                        suit: card && card.suit || null,
                                        rawColor: colorInfo && colorInfo.rawColor || null,
                                        finalSuit: colorInfo && colorInfo.suit || null,
                                        finalColor: colorInfo && colorInfo.color || null,
                                        colorSource: colorInfo && colorInfo.source || null,
                                    },
                                    recover: !!event.recover,
                                    source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                                });
                            }
                        }
                        game.log(player, "触发了", "#g【魔裔·猰】");
                    } else if (event.mode === 1) {
                        if (!player.canUse || !player.canUse({ name: "sha", isCard: true }, event.source, false)) {
                            event.skipReason = "cannot_use_sha";
                            if (globalThis.zusChiyouWriteMoyiDebug) {
                                globalThis.zusChiyouWriteMoyiDebug("damage_zheng_cannot_sha", {
                                    index: event.zus_moyi_index,
                                    source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                                });
                            }
                        } else {
                            event.recoverCheck = "zheng_sha_damage";
                            event.recoverDamageTarget = event.source;
                            event.recoverDamageBefore = globalThis.zusChiyouCountSourceDamageTo
                                ? globalThis.zusChiyouCountSourceDamageTo(player, event.source)
                                : 0;
                            player.useCard({ name: "sha", isCard: true }, event.source);
                        }
                        game.log(player, "触发了", "#g【魔裔·狰】");
                    } else {
                        if (!player.canUse || !player.canUse({ name: "juedou", isCard: true }, event.source, false)) {
                            event.skipReason = "cannot_use_juedou";
                            if (globalThis.zusChiyouWriteMoyiDebug) {
                                globalThis.zusChiyouWriteMoyiDebug("damage_suan_cannot_juedou", {
                                    index: event.zus_moyi_index,
                                    source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                                });
                            }
                        } else {
                            player.draw();
                            event.recoverCheck = "suan_juedou_damage";
                            event.recoverDamageTarget = event.source;
                            event.recoverDamageBefore = globalThis.zusChiyouCountSourceDamageTo
                                ? globalThis.zusChiyouCountSourceDamageTo(player, event.source)
                                : 0;
                            player.useCard({ name: "juedou", isCard: true }, event.source);
                        }
                        game.log(player, "触发了", "#g【魔裔·狻】");
                    }

                    "step 1"
                    if (event.recoverCheck == "zheng_sha_damage" || event.recoverCheck == "suan_juedou_damage") {
                        var after = globalThis.zusChiyouCountSourceDamageTo
                            ? globalThis.zusChiyouCountSourceDamageTo(player, event.recoverDamageTarget)
                            : event.recoverDamageBefore;
                        event.recover = after > event.recoverDamageBefore;
                        if (globalThis.zusChiyouWriteMoyiDebug) {
                            globalThis.zusChiyouWriteMoyiDebug(event.recoverCheck == "suan_juedou_damage" ? "damage_suan_recover_check" : "damage_zheng_recover_check", {
                                index: event.zus_moyi_index,
                                before: event.recoverDamageBefore,
                                after: after,
                                recover: !!event.recover,
                                target: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.recoverDamageTarget) : null,
                            });
                        }
                    }
                    if (globalThis.zusChiyouWriteMoyiDebug) {
                        globalThis.zusChiyouWriteMoyiDebug("damage_iteration_end", {
                            index: event.zus_moyi_index,
                            total: event.total,
                            mode: event.mode,
                            modeName: event.modeName,
                            recovered: !!event.recover,
                            skipReason: event.skipReason,
                            player: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(player) : null,
                            source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                        });
                    }
                    if (event.recover && player.isIn && player.isIn()) player.recover();
                    if (globalThis.zusChiyouEnforceMaxHp) globalThis.zusChiyouEnforceMaxHp(player);
                    event.zus_moyi_index++;
                    if (event.zus_moyi_index < event.total && player.isIn && player.isIn()) {
                        event.goto(0);
                    } else if (globalThis.zusChiyouWriteMoyiDebug) {
                        globalThis.zusChiyouWriteMoyiDebug("damage_content_end", {
                            total: event.total,
                            bloodModes: event.bloodModes,
                            beforeHp: event.beforeHp,
                            afterHp: player.hp,
                            player: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(player) : null,
                            source: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(event.source) : null,
                        });
                    }
                },
            },

            zus_moyi_dying: {
                trigger: { player: "dying" },
                forced: true,
                filter: function (event, player) {
                    return !!(player && player.isIn && player.isIn());
                },
                content: function () {
                    "step 0"
                    player.storage = player.storage || {};
                    player.storage.zus_moyi_qu_count = (player.storage.zus_moyi_qu_count || 0) + 1;
                    if (player.syncStorage) player.syncStorage("zus_moyi_qu_count");
                    var nanman = { name: "nanman", isCard: true };
                    event.required = player.storage.zus_moyi_qu_count;
                    event.targets = globalThis.zusChiyouNanmanTargets ? globalThis.zusChiyouNanmanTargets(player) : [];
                    event.damageBefore = globalThis.zusChiyouCountSourceDamageAmong
                        ? globalThis.zusChiyouCountSourceDamageAmong(player, event.targets)
                        : 0;
                    if (event.targets.length && player.useCard) {
                        player.useCard(nanman, event.targets);
                        game.log(player, "触发了", "#g【魔裔·貙】");
                    } else {
                        event.skipReason = "no_nanman_target";
                    }

                    "step 1"
                    event.damageAfter = globalThis.zusChiyouCountSourceDamageAmong
                        ? globalThis.zusChiyouCountSourceDamageAmong(player, event.targets)
                        : event.damageBefore;
                    event.hitCount = Math.max(0, event.damageAfter - event.damageBefore);
                    if (globalThis.zusChiyouWriteMoyiDebug) {
                        globalThis.zusChiyouWriteMoyiDebug("dying_qu_recover_check", {
                            required: event.required,
                            targets: event.targets ? event.targets.length : 0,
                            hitCount: event.hitCount,
                            damageBefore: event.damageBefore,
                            damageAfter: event.damageAfter,
                            recover: event.hitCount >= event.required,
                            skipReason: event.skipReason || null,
                            player: globalThis.zusChiyouSafePlayerInfo ? globalThis.zusChiyouSafePlayerInfo(player) : null,
                        });
                    }
                    if (event.hitCount >= event.required && player.isIn && player.isIn()) player.recover();
                    if (globalThis.zusChiyouEnforceMaxHp) globalThis.zusChiyouEnforceMaxHp(player);
                },
            },

            zus_huoyuan: {
                trigger: { global: "useCard2" },
                direct: true,
                filter: function (event, player) {
                    if (!event || !event.player || event.player == player) return false;
                    if (!event.card || globalThis.zusChiyouSafeName(event.card, event.player) != "sha") return false;
                    return !!(event.player.countCards && event.player.countCards("he") > 0);
                },
                content: function () {
                    "step 0"
                    event.source = trigger.player;
                    player.chooseBool("是否发动【祸源】，弃置" + get.translation(event.source) + "一张牌，使此【杀】不可被【闪】响应？")
                        .set("ai", function () {
                            var player = _status.event.player;
                            var source = _status.event.getParent().source;
                            return get.attitude(player, source) < 0;
                        });

                    "step 1"
                    if (!result.bool || !event.source || !event.source.countCards || event.source.countCards("he") <= 0) {
                        event.finish();
                        return;
                    }
                    player.logSkill("zus_huoyuan", event.source);
                    player.discardPlayerCard(event.source, "he", true);

                    "step 2"
                    if (!trigger.targets) trigger.targets = [];
                    if (trigger.targets.indexOf(player) == -1) {
                        if (trigger.targets.add) trigger.targets.add(player);
                        else trigger.targets.push(player);
                    }
                    for (var i = 0; i < trigger.targets.length; i++) {
                        if (globalThis.zusChiyouAddDirectHit) globalThis.zusChiyouAddDirectHit(trigger, trigger.targets[i]);
                    }
                    game.log(trigger.card, "不可被【闪】响应");
                },
            },
        },

        translate: {
            zus_chiyou: "蚩尤",
            zus_chiyou_ab: "蚩尤",
            zus_moyi: "魔裔",
            zus_moyi_info: "锁定技，桃对你无效，你的体力上限不会增加、减少或被击碎；四枚勾玉依次固定名为“猰”“狰”“狻”“貙”。当你受到伤害并失去对应勾玉时，触发其效果：猰：获得伤害来源1张牌，若获得的牌为黑色，你回复1点体力；狰：视为对伤害来源使用1张【杀】，若此【杀】未被【闪】响应，你回复1点体力；狻：摸1张牌并视为对伤害来源使用1张【决斗】，若你赢，你回复1点体力。濒死结算前，你触发“貙”，视为使用【南蛮入侵】，若除你以外不小于X名角色未打出【杀】，你回复1点体力（X为你发动此技能的次数）。",
            zus_moyi_tao_invalid: "魔裔",
            zus_moyi_maxhp: "魔裔",
            zus_moyi_damage: "魔裔",
            zus_moyi_dying: "魔裔",
            zus_huoyuan: "祸源",
            zus_huoyuan_info: "其他角色使用【杀】时，你可以弃置其1张牌，使此【杀】不可被【闪】响应，若你不为此【杀】的目标，你成为额外目标。",
        },

        sort: ["zus_chiyou"],

        title: {
            zus_chiyou: "荒古神魔",
        },
    };

    window.zusfylriModules["chiyou"] = chiyouModule;

    var currentLib = runtimeLib();
    if (currentLib) {
        if (currentLib.character && chiyouModule.character) Object.assign(currentLib.character, chiyouModule.character);
        if (currentLib.skill && chiyouModule.skill) Object.assign(currentLib.skill, chiyouModule.skill);
        if (currentLib.translate && chiyouModule.translate) Object.assign(currentLib.translate, chiyouModule.translate);
        if (currentLib.characterTitle && chiyouModule.title) Object.assign(currentLib.characterTitle, chiyouModule.title);
    }
})();
