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
        var candidates = [];
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().game;
                if (current) candidates.push(current);
            }
        } catch (e) {}
        try {
            if (typeof window != "undefined" && window.game) candidates.push(window.game);
        } catch (e2) {}
        try {
            if (typeof window != "undefined" && window.top && window.top.game) candidates.push(window.top.game);
        } catch (e3) {}
        if (globalThis.game && typeof globalThis.game == "object") candidates.push(globalThis.game);
        if (game && typeof game == "object") candidates.push(game);
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            if (candidate && Array.isArray(candidate.players) && candidate.players.length) return candidate;
        }
        return candidates[0] || null;
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

    function ensureMoGroup() {
        var currentLib = runtimeLib();
        if (!currentLib) return;
        if (currentLib.group) {
            if (typeof currentLib.group.add == "function") currentLib.group.add("zus_group_mo");
            else if (Array.isArray(currentLib.group) && currentLib.group.indexOf("zus_group_mo") == -1) currentLib.group.push("zus_group_mo");
        }
        currentLib.translate = currentLib.translate || {};
        currentLib.translate.zus_group_mo = "魔";
        currentLib.translate.zus_group_mo2 = "魔";
        currentLib.groupnature = currentLib.groupnature || {};
        currentLib.groupnature.zus_group_mo = "thunder";
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

    function safeTranslation(item) {
        try {
            var getter = runtimeGet();
            if (getter && getter.translation) return getter.translation(item);
        } catch (e) {}
        try {
            if (item && item.name) return item.name;
        } catch (e2) {}
        if (typeof item == "string") return item;
        return "";
    }

    function safeType(card, player) {
        var type = null;
        try {
            if (window.Zus && Zus.safeType) {
                type = Zus.safeType(card, player);
                if (type) return type;
            }
        } catch (e) {}
        try {
            var getter = runtimeGet();
            if (getter && getter.type) {
                type = getter.type(card, player);
                if (type) return type;
            }
        } catch (e2) {}
        try {
            var getter2 = runtimeGet();
            if (getter2 && getter2.type2) {
                type = getter2.type2(card, player);
                if (type) return type;
            }
        } catch (e3) {}
        if (card && card.type) return card.type;
        var name = safeName(card, player);
        var currentLib = runtimeLib();
        return name && currentLib && currentLib.card && currentLib.card[name] ? currentLib.card[name].type : null;
    }

    function cardTag(card, tag, player) {
        try {
            var getter = runtimeGet();
            if (getter && getter.tag) {
                var value = getter.tag(card, tag, player);
                if (value) return value;
            }
        } catch (e) {}
        try {
            var name = safeName(card, player);
            var currentLib = runtimeLib();
            var info = name && currentLib && currentLib.card ? currentLib.card[name] : null;
            if (info && info.ai && info.ai.tag && info.ai.tag[tag]) return info.ai.tag[tag];
        } catch (e2) {}
        return 0;
    }

    function writeKongnianDebug(stage, data) {
        var debug = data || {};
        debug.stage = stage;
        debug.timestamp = Date.now();
        try {
            globalThis.zusXiangqingKongnianDebug = globalThis.zusXiangqingKongnianDebug || [];
            globalThis.zusXiangqingKongnianDebug.push(debug);
            if (globalThis.zusXiangqingKongnianDebug.length > 100) {
                globalThis.zusXiangqingKongnianDebug = globalThis.zusXiangqingKongnianDebug.slice(-100);
            }
            if (globalThis.localStorage) {
                localStorage.setItem("zus_xiangqing_kongnian_debug", JSON.stringify(globalThis.zusXiangqingKongnianDebug));
            }
        } catch (e0) {}
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof window != "undefined" && window.top && window.top.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (req) {
                req("fs").appendFileSync(
                    "D:/app/noname/resources/app/extension/Zusfylri\u6b66\u5c06\u5305/docs/xiangqing_kongnian_debug.log",
                    JSON.stringify(debug) + "\n",
                    "utf8"
                );
            }
        } catch (e1) {}
        try {
            if (globalThis.console && console.log) console.log("[Zus][xiangqing][kongnian]", debug);
        } catch (e2) {}
    }

    function isDamageTrick(card, player, hook) {
        var name = safeName(card, player);
        var type = safeType(card, player);
        var damageTag = cardTag(card, "damage", player);
        var inFallbackList = ["nanman", "wanjian", "juedou", "huogong", "shuiyanqijunx", "shuiyanqijun"].indexOf(name) != -1;
        var blocked = !!card && (inFallbackList || type == "trick" && !!damageTag);
        var owner = null;
        try {
            owner = playerInfo(player);
        } catch (e) {}
        writeKongnianDebug("resolve", {
            hook: hook || "direct",
            player: owner,
            card: {
                rawName: card && card.name || null,
                rawType: card && card.type || null,
                rawNature: card && card.nature || null,
                resolvedName: name || null,
                resolvedType: type || null,
                damageTag: damageTag || 0,
                inFallbackList: inFallbackList,
            },
            blocked: blocked,
        });
        return blocked;
    }

    function getPlayerKey(target, fallback) {
        if (!target) return null;
        return target.playerid || target.dataset && target.dataset.position || fallback || null;
    }

    function addAlivePlayer(list, seen, target, source) {
        if (!target) return;
        if (list.indexOf(target) != -1) return;
        try {
            if (target.isIn && !target.isIn()) return;
        } catch (e) {}
        var key = getPlayerKey(target, source + "_" + list.length);
        if (key && seen[key]) return;
        if (key) seen[key] = true;
        list.push(target);
    }

    function addAlivePlayers(list, seen, players, source) {
        if (!players || !players.length) return;
        for (var i = 0; i < players.length; i++) addAlivePlayer(list, seen, players[i], source);
    }

    function getAlivePlayers(anchor) {
        var list = [];
        var seen = {};
        var sources = [];
        try {
            if (window.Zus && Zus.players) {
                addAlivePlayers(list, seen, Zus.players() || [], "Zus.players");
                if (list.length) sources.push("Zus.players");
            }
        } catch (e) {}
        var currentGame = runtimeGame();
        if (currentGame && typeof currentGame.filterPlayer == "function") {
            try {
                var filtered = currentGame.filterPlayer(function (current) {
                    return !!(current && (!current.isIn || current.isIn()));
                }) || [];
                addAlivePlayers(list, seen, filtered, "game.filterPlayer");
                if (filtered.length) sources.push("game.filterPlayer");
            } catch (e2) {}
        }
        if (currentGame && currentGame.players) {
            addAlivePlayers(list, seen, currentGame.players, "game.players");
            if (currentGame.players.length) sources.push("game.players");
        }
        var current = anchor || null;
        var guard = 0;
        while (current && guard < 32) {
            addAlivePlayer(list, seen, current, "seat");
            current = current.getNext ? current.getNext() : current.next;
            guard++;
            if (!current || current == anchor) break;
        }
        if (guard) sources.push("seat");
        try {
            if (globalThis.zusXiangqingWriteDebug) {
                globalThis.zusXiangqingWriteDebug("alive_players_resolve", {
                    source: sources.join("|") || "none",
                    count: list.length,
                    anchor: playerInfo(anchor),
                    targets: list.map(function (target) {
                        return playerInfo(target);
                    }),
                });
            }
        } catch (e3) {}
        return list.slice(0);
    }

    function playerInfo(target) {
        if (!target) return null;
        return {
            name: target.name || null,
            name1: target.name1 || null,
            name2: target.name2 || null,
            hp: typeof target.hp == "number" ? target.hp : null,
            maxHp: typeof target.maxHp == "number" ? target.maxHp : null,
            inGame: !!(!target.isIn || target.isIn()),
            hand: target.countCards ? target.countCards("h") : null,
            hasLoseMaxHp: typeof target.loseMaxHp == "function",
        };
    }

    function writeXiangqingDebug(stage, data) {
        var debug = data || {};
        debug.stage = stage;
        debug.timestamp = Date.now();
        try {
            globalThis.zusXiangqingLastDebug = debug;
            if (globalThis.localStorage) localStorage.setItem("zus_xiangqing_debug", JSON.stringify(debug));
        } catch (e0) {}
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof window != "undefined" && window.top && window.top.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (req) {
                req("fs").appendFileSync(
                    "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/xiangqing_debug.log",
                    JSON.stringify(debug) + "\n",
                    "utf8"
                );
            }
        } catch (e1) {}
        try {
            var currentGame = runtimeGame();
            if (currentGame && currentGame.log) currentGame.log("#y[相青调试]", stage);
        } catch (e2) {}
    }

    function getPreviousPlayer(player) {
        if (!player) return null;
        try {
            if (player.getPrevious) return player.getPrevious();
        } catch (e) {}
        return player.previous || null;
    }

    function getNextPlayer(player) {
        if (!player) return null;
        try {
            if (player.getNext) return player.getNext();
        } catch (e) {}
        return player.next || null;
    }

    function addStatusSkill(target, skill) {
        if (!target || !skill) return;
        if (target.addSkill) target.addSkill(skill);
        if (target.markSkill) target.markSkill(skill);
    }

    function noDamageThisTurn(player) {
        if (!player) return false;
        try {
            if (player.getHistory) {
                var history = player.getHistory("sourceDamage") || [];
                for (var i = 0; i < history.length; i++) {
                    if (!history[i] || history[i].num !== 0) return false;
                }
                return true;
            }
        } catch (e) {}
        return true;
    }

    function canUseNow(player, card) {
        if (!player || !card) return false;
        var currentLib = runtimeLib();
        try {
            if (currentLib && currentLib.filter && currentLib.filter.cardEnabled && !currentLib.filter.cardEnabled(card, player)) return false;
        } catch (e) {
            return false;
        }
        try {
            if (currentLib && currentLib.filter && currentLib.filter.cardUsable && !currentLib.filter.cardUsable(card, player)) return false;
        } catch (e2) {}
        try {
            if (player.hasUseTarget && player.hasUseTarget(card)) return true;
        } catch (e3) {}
        var name = safeName(card, player);
        if (name == "jiu") return true;
        if (name == "tao") return player.hp < player.maxHp;
        return false;
    }

    function allHandUnusable(player, cards) {
        if (!player || !cards || !cards.length) return false;
        for (var i = 0; i < cards.length; i++) {
            if (canUseNow(player, cards[i])) return false;
        }
        return true;
    }

    ensureMoGroup();

    globalThis.zusXiangqingSafeName = safeName;
    globalThis.zusXiangqingSafeTranslation = safeTranslation;
    globalThis.zusXiangqingIsDamageTrick = isDamageTrick;
    globalThis.zusXiangqingWriteKongnianDebug = writeKongnianDebug;
    globalThis.zusXiangqingGetAlivePlayers = getAlivePlayers;
    globalThis.zusXiangqingGetPreviousPlayer = getPreviousPlayer;
    globalThis.zusXiangqingGetNextPlayer = getNextPlayer;
    globalThis.zusXiangqingAddStatusSkill = addStatusSkill;
    globalThis.zusXiangqingNoDamageThisTurn = noDamageThisTurn;
    globalThis.zusXiangqingCanUseNow = canUseNow;
    globalThis.zusXiangqingAllHandUnusable = allHandUnusable;
    globalThis.zusXiangqingPlayerInfo = playerInfo;
    globalThis.zusXiangqingWriteDebug = writeXiangqingDebug;

    var xiangqingModule = {
        key: "xiangqing",

        character: {
            zus_xiangqing: char("male", "zus_group_mo", 5, ["zus_xuguo", "zus_konghua", "zus_jimie"], "zus_xiangqing", "png"),
        },

        skill: {
            zus_chijie: {
                charlotte: true,
                locked: true,
                mark: true,
                marktext: "戒",
                intro: { name: "持戒", content: "锁定技，你无法使用【杀】。" },
                mod: {
                    cardEnabled: function (card, player) {
                        if (globalThis.zusXiangqingSafeName(card, player) == "sha") return false;
                    },
                    cardEnabled2: function (card, player) {
                        if (globalThis.zusXiangqingSafeName(card, player) == "sha") return false;
                    },
                    cardUsable: function (card, player) {
                        if (globalThis.zusXiangqingSafeName(card, player) == "sha") return false;
                    },
                },
            },

            zus_chanding: {
                charlotte: true,
                locked: true,
                mark: true,
                marktext: "禅",
                intro: { name: "禅定", content: "锁定技，你无法使用或打出【闪】。" },
                mod: {
                    cardEnabled: function (card, player) {
                        if (globalThis.zusXiangqingSafeName(card, player) == "shan") return false;
                    },
                    cardEnabled2: function (card, player) {
                        if (globalThis.zusXiangqingSafeName(card, player) == "shan") return false;
                    },
                    cardRespondable: function (card, player) {
                        if (globalThis.zusXiangqingSafeName(card, player) == "shan") return false;
                    },
                },
            },

            zus_kongnian: {
                charlotte: true,
                locked: true,
                mark: true,
                marktext: "念",
                intro: { name: "空念", content: "锁定技，你无法使用伤害类锦囊牌。" },
                mod: {
                    cardEnabled: function (card, player) {
                        if (globalThis.zusXiangqingIsDamageTrick(card, player, "cardEnabled")) return false;
                    },
                    cardEnabled2: function (card, player) {
                        if (globalThis.zusXiangqingIsDamageTrick(card, player, "cardEnabled2")) return false;
                    },
                    cardUsable: function (card, player) {
                        if (globalThis.zusXiangqingIsDamageTrick(card, player, "cardUsable")) return false;
                    },
                },
            },

            zus_xuguo: {
                trigger: { global: "gameStart", player: "enterGame" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    return !(player.storage && player.storage.zus_xuguo_done);
                },
                content: function () {
                    player.storage = player.storage || {};
                    player.storage.zus_xuguo_done = true;
                    if (player.syncStorage) player.syncStorage("zus_xuguo_done");

                    var previous = globalThis.zusXiangqingGetPreviousPlayer ? globalThis.zusXiangqingGetPreviousPlayer(player) : null;
                    var next = globalThis.zusXiangqingGetNextPlayer ? globalThis.zusXiangqingGetNextPlayer(player) : null;
                    if (previous && previous != player) globalThis.zusXiangqingAddStatusSkill(previous, "zus_chijie");
                    if (next && next != player) globalThis.zusXiangqingAddStatusSkill(next, "zus_chanding");
                    globalThis.zusXiangqingAddStatusSkill(player, "zus_chijie");
                    globalThis.zusXiangqingAddStatusSkill(player, "zus_chanding");
                    globalThis.zusXiangqingAddStatusSkill(player, "zus_kongnian");
                    if (game && game.log) game.log(player, "发动了", "【虚果】");
                },
            },

            zus_konghua: {
                trigger: { global: "phaseJieshuBegin" },
                direct: true,
                filter: function (event, player) {
                    var target = event && event.player;
                    if (!target || !target.isIn || !target.isIn()) return false;
                    if (!target.countCards || target.countCards("hej") < 2) return false;
                    return !!(globalThis.zusXiangqingNoDamageThisTurn && globalThis.zusXiangqingNoDamageThisTurn(target));
                },
                content: function () {
                    "step 0"
                    var target = trigger.player;
                    event.target = target;
                    player.chooseBool("是否发动【空花】，弃置" + globalThis.zusXiangqingSafeTranslation(target) + "的两张牌？")
                        .set("target", target)
                        .set("ai", function () {
                            var status = globalThis._status || {};
                            var player = status.event && status.event.player;
                            var target = status.event && status.event.target;
                            var getter = globalThis.get || {};
                            return !!(getter.attitude && player && target && getter.attitude(player, target) < 0);
                        });

                    "step 1"
                    if (!result.bool || !event.target || !event.target.countCards || event.target.countCards("hej") < 2) {
                        event.finish();
                        return;
                    }
                    player.logSkill("zus_konghua", event.target);
                    player.discardPlayerCard(event.target, 2, "hej", true);
                },
            },

            zus_jimie: {
                trigger: { player: "phaseUseBegin" },
                direct: true,
                filter: function (event, player) {
                    var pass = !!(player && player.countCards && player.countCards("h") > 0);
                    if (globalThis.zusXiangqingWriteDebug) {
                        globalThis.zusXiangqingWriteDebug("jimie_filter", {
                            player: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(player) : null,
                            pass: pass,
                        });
                    }
                    return pass;
                },
                async content(event, trigger, player) {
                    var cards = player.getCards("h");
                    if (globalThis.zusXiangqingWriteDebug) {
                        globalThis.zusXiangqingWriteDebug("jimie_content_begin", {
                            player: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(player) : null,
                            cardCount: cards.length,
                            cardNames: cards.map(function (card) {
                                return globalThis.zusXiangqingSafeName ? globalThis.zusXiangqingSafeName(card, player) : card && card.name || null;
                            }),
                        });
                    }
                    var choose = await player.chooseBool("是否发动【寂灭】，展示所有手牌？")
                        .set("ai", function () {
                            var status = globalThis._status || {};
                            var player = status.event && status.event.player;
                            if (!player || !player.getCards) return false;
                            var cards = player.getCards("h");
                            return globalThis.zusXiangqingAllHandUnusable
                                ? globalThis.zusXiangqingAllHandUnusable(player, cards)
                                : false;
                        })
                        .forResult();
                    if (globalThis.zusXiangqingWriteDebug) {
                        globalThis.zusXiangqingWriteDebug("jimie_choose", {
                            player: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(player) : null,
                            bool: !!(choose && choose.bool),
                        });
                    }
                    if (!choose || !choose.bool || !cards.length) return;
                    await player.showCards(cards, globalThis.zusXiangqingSafeTranslation(player) + "发动了【寂灭】");
                    var unusable = !!(globalThis.zusXiangqingAllHandUnusable && globalThis.zusXiangqingAllHandUnusable(player, cards));
                    if (globalThis.zusXiangqingWriteDebug) {
                        globalThis.zusXiangqingWriteDebug("jimie_unusable_check", {
                            player: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(player) : null,
                            unusable: unusable,
                            cardCount: cards.length,
                        });
                    }
                    if (!unusable) return;
                    player.logSkill("zus_jimie");
                    var targets = globalThis.zusXiangqingGetAlivePlayers ? globalThis.zusXiangqingGetAlivePlayers(player) : [];
                    if (globalThis.zusXiangqingWriteDebug) {
                        globalThis.zusXiangqingWriteDebug("jimie_targets", {
                            count: targets.length,
                            targets: targets.map(function (target) {
                                return globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(target) : null;
                            }),
                        });
                    }
                    for (var i = 0; i < targets.length; i++) {
                        var target = targets[i];
                        if (!target || !target.loseMaxHp) {
                            if (globalThis.zusXiangqingWriteDebug) {
                                globalThis.zusXiangqingWriteDebug("jimie_loseMaxHp_skip", {
                                    index: i,
                                    target: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(target) : null,
                                });
                            }
                            continue;
                        }
                        var beforeMaxHp = target.maxHp;
                        if (globalThis.zusXiangqingWriteDebug) {
                            globalThis.zusXiangqingWriteDebug("jimie_loseMaxHp_before", {
                                index: i,
                                target: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(target) : null,
                                beforeMaxHp: beforeMaxHp,
                            });
                        }
                        await target.loseMaxHp();
                        if (globalThis.zusXiangqingWriteDebug) {
                            globalThis.zusXiangqingWriteDebug("jimie_loseMaxHp_after", {
                                index: i,
                                target: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(target) : null,
                                beforeMaxHp: beforeMaxHp,
                                afterMaxHp: target.maxHp,
                            });
                        }
                    }
                    var num = cards.length;
                    var currentCards = player.getCards("h");
                    if (globalThis.zusXiangqingWriteDebug) {
                        globalThis.zusXiangqingWriteDebug("jimie_discard_draw", {
                            player: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(player) : null,
                            discardCount: currentCards.length,
                            drawCount: num,
                        });
                    }
                    if (currentCards.length) await player.discard(currentCards);
                    if (num > 0) await player.draw(num);
                    if (globalThis.zusXiangqingWriteDebug) {
                        globalThis.zusXiangqingWriteDebug("jimie_content_end", {
                            player: globalThis.zusXiangqingPlayerInfo ? globalThis.zusXiangqingPlayerInfo(player) : null,
                        });
                    }
                },
            },
        },

        translate: {
            zus_group_mo: "魔",
            zus_group_mo2: "魔",
            zus_xiangqing: "相青",
            zus_xiangqing_ab: "相青",
            zus_xuguo: "虚果",
            zus_xuguo_info: "锁定技，游戏开始时，上家获得“持戒”，下家获得“禅定”，你获得“持戒”“禅定”“空念”。",
            zus_konghua: "空花",
            zus_konghua_info: "每名角色的回合结束阶段限一次，若其于本回合内未造成伤害，你可以弃置其两张牌。",
            zus_jimie: "寂灭",
            zus_jimie_info: "出牌阶段开始时，你可以展示所有手牌，若均为你无法立即使用的牌，场上所有角色减少1点体力上限，然后你弃置所有手牌并摸等量的牌。",
            zus_chijie: "持戒",
            zus_chijie_info: "锁定技，你无法使用【杀】。",
            zus_chanding: "禅定",
            zus_chanding_info: "锁定技，你无法使用或打出【闪】。",
            zus_kongnian: "空念",
            zus_kongnian_info: "锁定技，你无法使用伤害类锦囊牌。",
        },

        sort: ["zus_xiangqing"],

        title: {
            zus_xiangqing: "寂灭佛",
        },
    };

    window.zusfylriModules["xiangqing"] = xiangqingModule;

    var currentLib = runtimeLib();
    if (currentLib) {
        if (currentLib.character && xiangqingModule.character) Object.assign(currentLib.character, xiangqingModule.character);
        if (currentLib.skill && xiangqingModule.skill) Object.assign(currentLib.skill, xiangqingModule.skill);
        if (currentLib.translate && xiangqingModule.translate) Object.assign(currentLib.translate, xiangqingModule.translate);
        if (currentLib.characterTitle && xiangqingModule.title) Object.assign(currentLib.characterTitle, xiangqingModule.title);
    }
})();
