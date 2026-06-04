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
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function runtimeGame() {
        var candidates = [];
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().game;
                if (current) candidates.push(current);
            }
        } catch (e) {
        }
        try {
            if (typeof window != "undefined" && window.game) candidates.push(window.game);
        } catch (e2) {
        }
        try {
            if (typeof window != "undefined" && window.top && window.top.game) candidates.push(window.top.game);
        } catch (e3) {
        }
        if (globalThis.game && typeof globalThis.game == "object") candidates.push(globalThis.game);
        if (game && typeof game == "object") candidates.push(game);
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            if (candidate && Array.isArray(candidate.players) && candidate.players.length) return candidate;
        }
        return candidates[0] || null;
    }

    function runtimeGet() {
        if (globalThis.get && typeof globalThis.get == "object") return globalThis.get;
        if (get && typeof get == "object") return get;
        return null;
    }

    function runtimeStatus() {
        var candidates = [];
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().status;
                if (current) candidates.push(current);
            }
        } catch (e) {
        }
        try {
            if (typeof window != "undefined" && window._status) candidates.push(window._status);
        } catch (e2) {
        }
        try {
            if (typeof window != "undefined" && window.top && window.top._status) candidates.push(window.top._status);
        } catch (e3) {
        }
        if (globalThis._status && typeof globalThis._status == "object") candidates.push(globalThis._status);
        if (_status && typeof _status == "object") candidates.push(_status);
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i] && candidates[i].currentPhase) return candidates[i];
        }
        for (var j = 0; j < candidates.length; j++) {
            if (candidates[j] && candidates[j].event) return candidates[j];
        }
        return candidates[0] || null;
    }

    function setStorage(player, key, value) {
        if (!player || !key) return;
        try {
            if (globalThis.Sync && typeof Sync.setStorage == "function") {
                Sync.setStorage(player, key, value);
                return;
            }
        } catch (e) {
        }
        player.storage = player.storage || {};
        player.storage[key] = value;
        if (typeof player.syncStorage == "function") player.syncStorage(key);
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

    function safeSuit(card, player) {
        try {
            var getter = runtimeGet();
            if (getter && getter.suit) return getter.suit(card, player);
        } catch (e) {
        }
        return card && card.suit || null;
    }

    function safeNumber(card, player) {
        try {
            var getter = runtimeGet();
            if (getter && getter.number) return getter.number(card, player);
        } catch (e) {
        }
        return card && card.number || 0;
    }

    function safeValue(card) {
        try {
            var getter = runtimeGet();
            if (getter && getter.value) return getter.value(card);
        } catch (e) {
        }
        return 0;
    }

    function eventParent(event, name) {
        if (!event || typeof event.getParent != "function") return null;
        try {
            return name ? event.getParent(name) : event.getParent();
        } catch (e) {
            return null;
        }
    }

    function currentPhase(event) {
        var phase = globalThis.zusZhaoyunEventParent && globalThis.zusZhaoyunEventParent(event, "phase");
        if (phase && phase.player) return phase.player;
        var phaseUse = globalThis.zusZhaoyunEventParent && globalThis.zusZhaoyunEventParent(event, "phaseUse");
        if (phaseUse && phaseUse.player) return phaseUse.player;
        var status = globalThis.zusZhaoyunRuntimeStatus && globalThis.zusZhaoyunRuntimeStatus();
        if (status && status.currentPhase) return status.currentPhase;
        var statusEvent = status && status.event;
        phase = globalThis.zusZhaoyunEventParent && globalThis.zusZhaoyunEventParent(statusEvent, "phase");
        if (phase && phase.player) return phase.player;
        phaseUse = globalThis.zusZhaoyunEventParent && globalThis.zusZhaoyunEventParent(statusEvent, "phaseUse");
        if (phaseUse && phaseUse.player) return phaseUse.player;
        return null;
    }

    function isOwnPhase(player, event) {
        return !!(player && globalThis.zusZhaoyunCurrentPhase && globalThis.zusZhaoyunCurrentPhase(event) == player);
    }

    function eventSuit(event, player) {
        if (!event) return null;
        if (event.cards && event.cards.length) {
            var cardsSuit = globalThis.zusZhaoyunCardSuit(event.cards[0], player);
            if (cardsSuit && cardsSuit != "none") return cardsSuit;
        }
        if (event.card) return globalThis.zusZhaoyunCardSuit(event.card, player);
        return null;
    }

    function cardSuit(card, player) {
        if (!card) return null;
        if (card.cards && card.cards.length) {
            var cardsSuit = globalThis.zusZhaoyunCardSuit(card.cards[0], player);
            if (cardsSuit && cardsSuit != "none") return cardsSuit;
        }
        return globalThis.zusZhaoyunSafeSuit(card, player);
    }

    function isJuexiaoMatchedSha(event, player) {
        var cardName = event && event.card && globalThis.zusZhaoyunSafeName(event.card, player);
        var ownPhase = !!(player && globalThis.zusZhaoyunIsOwnPhase(player, event));
        var lastSuit = player && player.storage && player.storage.zus_juexiao_lastSuit;
        var suit = globalThis.zusZhaoyunEventSuit(event, player);
        var pass = !!(event && player && event.card && cardName == "sha" && ownPhase && lastSuit && suit && suit != "none" && suit == lastSuit);
        if (typeof globalThis.zusZhaoyunDebug == "function") {
            globalThis.zusZhaoyunDebug("juexiao_match_probe", {
                player: player && player.name,
                eventName: event && event.name,
                cardName: cardName,
                rawCardName: event && event.card && event.card.name,
                rawCardSuit: event && event.card && event.card.suit,
                eventCards: event && event.cards && event.cards.map(function (card) {
                    return {
                        name: card && card.name,
                        suit: card && card.suit,
                    };
                }),
                ownPhase: ownPhase,
                currentPhase: globalThis.zusZhaoyunCurrentPhase && globalThis.zusZhaoyunCurrentPhase(event) && globalThis.zusZhaoyunCurrentPhase(event).name,
                lastSuit: lastSuit || null,
                suit: suit || null,
                addCount: event && event.addCount,
                baseDamage: event && event.baseDamage,
                pass: pass,
            });
        }
        return pass;
    }

    function isAlivePlayer(current) {
        if (!current) return false;
        try {
            if (typeof current.isIn == "function") return current.isIn();
        } catch (e) {
            return false;
        }
        return true;
    }

    function alivePlayers() {
        var result = [];
        var add = function (current) {
            if (!globalThis.zusZhaoyunIsAlivePlayer(current)) return;
            if (result.indexOf(current) == -1) result.push(current);
        };
        var currentGame = globalThis.zusZhaoyunRuntimeGame && globalThis.zusZhaoyunRuntimeGame();
        try {
            if (window.Zus && Zus.players) {
                var zusPlayers = Zus.players() || [];
                for (var i = 0; i < zusPlayers.length; i++) add(zusPlayers[i]);
            }
        } catch (e) {
        }
        try {
            if (currentGame && currentGame.players) {
                for (var j = 0; j < currentGame.players.length; j++) add(currentGame.players[j]);
            }
        } catch (e2) {
        }
        try {
            if (currentGame && typeof currentGame.filterPlayer == "function") {
                currentGame.filterPlayer(function (current) {
                    add(current);
                    return false;
                });
            }
        } catch (e3) {
        }
        return result;
    }

    function isLowestHp(player) {
        if (!player || typeof player.hp != "number") return false;
        var players = alivePlayers();
        var lowest = Infinity;
        for (var i = 0; i < players.length; i++) {
            if (typeof players[i].hp == "number" && players[i].hp < lowest) lowest = players[i].hp;
        }
        return players.length > 0 && player.hp <= lowest;
    }

    function isShaCard(event, player) {
        if (!event || !event.card) return false;
        var owner = event.player || player;
        var name = globalThis.zusZhaoyunSafeName(event.card, owner) || event.card.name || event.card.viewAs || event.card.name2;
        return name == "sha";
    }

    function zhaoyunDebug(stage, data) {
        var debug = data || {};
        debug.stage = stage;
        debug.timestamp = Date.now();
        try {
            globalThis.zusZhaoyunLastDebug = debug;
            if (globalThis.localStorage) localStorage.setItem("zus_zhaoyun_debug", JSON.stringify(debug));
        } catch (e) {
        }
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof window != "undefined" && window.top && window.top.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (req) {
                req("fs").appendFileSync(
                    "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/zhaoyun_juexiao_debug.log",
                    JSON.stringify(debug) + "\n",
                    "utf8"
                );
            }
        } catch (e2) {
        }
    }

    globalThis.zusZhaoyunRuntimeGame = runtimeGame;
    globalThis.zusZhaoyunRuntimeStatus = runtimeStatus;
    globalThis.zusZhaoyunEventParent = eventParent;
    globalThis.zusZhaoyunCurrentPhase = currentPhase;
    globalThis.zusZhaoyunSetStorage = setStorage;
    globalThis.zusZhaoyunSafeName = safeName;
    globalThis.zusZhaoyunSafeSuit = safeSuit;
    globalThis.zusZhaoyunSafeNumber = safeNumber;
    globalThis.zusZhaoyunSafeValue = safeValue;
    globalThis.zusZhaoyunIsOwnPhase = isOwnPhase;
    globalThis.zusZhaoyunEventSuit = eventSuit;
    globalThis.zusZhaoyunCardSuit = cardSuit;
    globalThis.zusZhaoyunIsJuexiaoMatchedSha = isJuexiaoMatchedSha;
    globalThis.zusZhaoyunIsAlivePlayer = isAlivePlayer;
    globalThis.zusZhaoyunAlivePlayers = alivePlayers;
    globalThis.zusZhaoyunIsLowestHp = isLowestHp;
    globalThis.zusZhaoyunIsShaCard = isShaCard;
    globalThis.zusZhaoyunDebug = zhaoyunDebug;

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("zhaoyun", "runtimeGame", runtimeGame, { globalName: "zusZhaoyunRuntimeGame", overwrite: true });
        Zus.bindHelper("zhaoyun", "runtimeStatus", runtimeStatus, { globalName: "zusZhaoyunRuntimeStatus", overwrite: true });
        Zus.bindHelper("zhaoyun", "eventParent", eventParent, { globalName: "zusZhaoyunEventParent", overwrite: true });
        Zus.bindHelper("zhaoyun", "currentPhase", currentPhase, { globalName: "zusZhaoyunCurrentPhase", overwrite: true });
        Zus.bindHelper("zhaoyun", "setStorage", setStorage, { globalName: "zusZhaoyunSetStorage", overwrite: true });
        Zus.bindHelper("zhaoyun", "safeName", safeName, { globalName: "zusZhaoyunSafeName", overwrite: true });
        Zus.bindHelper("zhaoyun", "safeSuit", safeSuit, { globalName: "zusZhaoyunSafeSuit", overwrite: true });
        Zus.bindHelper("zhaoyun", "safeNumber", safeNumber, { globalName: "zusZhaoyunSafeNumber", overwrite: true });
        Zus.bindHelper("zhaoyun", "safeValue", safeValue, { globalName: "zusZhaoyunSafeValue", overwrite: true });
        Zus.bindHelper("zhaoyun", "isOwnPhase", isOwnPhase, { globalName: "zusZhaoyunIsOwnPhase", overwrite: true });
        Zus.bindHelper("zhaoyun", "eventSuit", eventSuit, { globalName: "zusZhaoyunEventSuit", overwrite: true });
        Zus.bindHelper("zhaoyun", "cardSuit", cardSuit, { globalName: "zusZhaoyunCardSuit", overwrite: true });
        Zus.bindHelper("zhaoyun", "isJuexiaoMatchedSha", isJuexiaoMatchedSha, { globalName: "zusZhaoyunIsJuexiaoMatchedSha", overwrite: true });
        Zus.bindHelper("zhaoyun", "isAlivePlayer", isAlivePlayer, { globalName: "zusZhaoyunIsAlivePlayer", overwrite: true });
        Zus.bindHelper("zhaoyun", "alivePlayers", alivePlayers, { globalName: "zusZhaoyunAlivePlayers", overwrite: true });
        Zus.bindHelper("zhaoyun", "isLowestHp", isLowestHp, { globalName: "zusZhaoyunIsLowestHp", overwrite: true });
        Zus.bindHelper("zhaoyun", "isShaCard", isShaCard, { globalName: "zusZhaoyunIsShaCard", overwrite: true });
        Zus.bindHelper("zhaoyun", "debug", zhaoyunDebug, { globalName: "zusZhaoyunDebug", overwrite: true });
    }

    window.zusfylriModules["zhaoyun"] = {
        key: "zhaoyun",

        character: {
            zus_zhaoyun: char("male", "shen", 4, ["zus_juexiao", "zus_gudan"], "zus_zhaoyun", "png"),
        },

        skill: {
            zus_juexiao: {
                enable: "phaseUse",
                filterCard: function (card, player) {
                    return globalThis.zusZhaoyunSafeName(card, player) == "shan";
                },
                viewAs: function (cards, player) {
                    if (!cards || !cards.length) return { name: "sha" };
                    return {
                        name: "sha",
                        suit: globalThis.zusZhaoyunSafeSuit(cards[0], player),
                        number: globalThis.zusZhaoyunSafeNumber(cards[0], player),
                        cards: cards,
                    };
                },
                position: "hs",
                prompt: "将一张【闪】当【杀】使用",
                check: function (card) {
                    return 6 - globalThis.zusZhaoyunSafeValue(card);
                },
                mod: {
                    cardUsable: function (card, player, num) {
                        var ownPhase = globalThis.zusZhaoyunIsOwnPhase(player);
                        var cardName = card && globalThis.zusZhaoyunSafeName(card, player);
                        if (!ownPhase || cardName != "sha") return;
                        var lastSuit = player.storage && player.storage.zus_juexiao_lastSuit;
                        var suit = globalThis.zusZhaoyunCardSuit(card, player);
                        var pass = !!(lastSuit && suit && suit == lastSuit);
                        if (typeof globalThis.zusZhaoyunDebug == "function") {
                            globalThis.zusZhaoyunDebug("juexiao_cardUsable", {
                                player: player && player.name,
                                cardName: cardName,
                                rawCardName: card && card.name,
                                rawCardSuit: card && card.suit,
                                cardCards: card && card.cards && card.cards.map(function (current) {
                                    return {
                                        name: current && current.name,
                                        suit: current && current.suit,
                                    };
                                }),
                                ownPhase: ownPhase,
                                currentPhase: globalThis.zusZhaoyunCurrentPhase && globalThis.zusZhaoyunCurrentPhase() && globalThis.zusZhaoyunCurrentPhase().name,
                                lastSuit: lastSuit || null,
                                suit: suit || null,
                                num: num,
                                pass: pass,
                                registeredRecord: !!(globalThis.lib && globalThis.lib.skill && globalThis.lib.skill.zus_juexiao_record),
                                registeredNocount: !!(globalThis.lib && globalThis.lib.skill && globalThis.lib.skill.zus_juexiao_nocount),
                                registeredDamage: !!(globalThis.lib && globalThis.lib.skill && globalThis.lib.skill.zus_juexiao_damage),
                            });
                        }
                        if (pass) return Infinity;
                    },
                },
                group: ["zus_juexiao_clear", "zus_juexiao_record", "zus_juexiao_nocount", "zus_juexiao_damage"],
                subSkill: {
                    clear: {
                        trigger: { player: "phaseBegin" },
                        forced: true,
                        silent: true,
                        popup: false,
                        content: function () {
                            if (typeof globalThis.zusZhaoyunDebug == "function") {
                                globalThis.zusZhaoyunDebug("juexiao_clear", {
                                    player: player && player.name,
                                    previousLastSuit: player && player.storage && player.storage.zus_juexiao_lastSuit || null,
                                });
                            }
                            globalThis.zusZhaoyunSetStorage(player, "zus_juexiao_lastSuit", null);
                        },
                    },
                    record: {
                        trigger: { player: ["useCardAfter", "respondAfter"] },
                        forced: true,
                        silent: true,
                        popup: false,
                        filter: function (event, player) {
                            var ownPhase = globalThis.zusZhaoyunIsOwnPhase(player, event);
                            var suit = globalThis.zusZhaoyunEventSuit(event, player);
                            var pass = !!(ownPhase && suit && suit != "none");
                            if (typeof globalThis.zusZhaoyunDebug == "function") {
                                globalThis.zusZhaoyunDebug("juexiao_record_filter", {
                                    player: player && player.name,
                                    eventName: event && event.name,
                                    cardName: event && event.card && globalThis.zusZhaoyunSafeName(event.card, player),
                                    rawCardName: event && event.card && event.card.name,
                                    rawCardSuit: event && event.card && event.card.suit,
                                    eventCards: event && event.cards && event.cards.map(function (card) {
                                        return {
                                            name: card && card.name,
                                            suit: card && card.suit,
                                        };
                                    }),
                                    ownPhase: ownPhase,
                                    currentPhase: globalThis.zusZhaoyunCurrentPhase && globalThis.zusZhaoyunCurrentPhase(event) && globalThis.zusZhaoyunCurrentPhase(event).name,
                                    previousLastSuit: player && player.storage && player.storage.zus_juexiao_lastSuit || null,
                                    suit: suit || null,
                                    pass: pass,
                                });
                            }
                            return pass;
                        },
                        content: function () {
                            var suit = globalThis.zusZhaoyunEventSuit(trigger, player);
                            if (typeof globalThis.zusZhaoyunDebug == "function") {
                                globalThis.zusZhaoyunDebug("juexiao_record_content", {
                                    player: player && player.name,
                                    eventName: trigger && trigger.name,
                                    previousLastSuit: player && player.storage && player.storage.zus_juexiao_lastSuit || null,
                                    suit: suit || null,
                                });
                            }
                            globalThis.zusZhaoyunSetStorage(player, "zus_juexiao_lastSuit", suit);
                        },
                    },
                    nocount: {
                        trigger: { player: "useCard1" },
                        forced: true,
                        silent: true,
                        popup: false,
                        firstDo: true,
                        filter: function (event, player) {
                            var pass = !!(globalThis.zusZhaoyunIsJuexiaoMatchedSha && globalThis.zusZhaoyunIsJuexiaoMatchedSha(event, player));
                            if (typeof globalThis.zusZhaoyunDebug == "function") {
                                globalThis.zusZhaoyunDebug("juexiao_nocount_filter", {
                                    player: player && player.name,
                                    pass: pass,
                                });
                            }
                            return pass;
                        },
                        content: function () {
                            var beforeStat = player.getStat("card");
                            trigger.addCount = false;
                            var stat = beforeStat;
                            if (stat && typeof stat.sha == "number" && stat.sha > 0) stat.sha--;
                            if (typeof globalThis.zusZhaoyunDebug == "function") {
                                globalThis.zusZhaoyunDebug("juexiao_nocount_content", {
                                    player: player && player.name,
                                    addCount: trigger && trigger.addCount,
                                    statSha: stat && stat.sha,
                                });
                            }
                        },
                    },
                    damage: {
                        trigger: { player: "useCard1" },
                        forced: true,
                        popup: false,
                        filter: function (event, player) {
                            var pass = !!(globalThis.zusZhaoyunIsJuexiaoMatchedSha && globalThis.zusZhaoyunIsJuexiaoMatchedSha(event, player));
                            if (typeof globalThis.zusZhaoyunDebug == "function") {
                                globalThis.zusZhaoyunDebug("juexiao_damage_filter", {
                                    player: player && player.name,
                                    pass: pass,
                                });
                            }
                            return pass;
                        },
                        content: function () {
                            var previousBaseDamage = trigger && trigger.baseDamage;
                            trigger.baseDamage = (trigger.baseDamage || 1) + 1;
                            if (typeof globalThis.zusZhaoyunDebug == "function") {
                                globalThis.zusZhaoyunDebug("juexiao_damage_content", {
                                    player: player && player.name,
                                    previousBaseDamage: previousBaseDamage,
                                    baseDamage: trigger && trigger.baseDamage,
                                });
                            }
                        },
                    },
                },
            },

            zus_gudan: {
                trigger: { target: "useCardToTargeted" },
                forced: true,
                filter: function (event, player) {
                    var isSha = !!(globalThis.zusZhaoyunIsShaCard && globalThis.zusZhaoyunIsShaCard(event, player));
                    var lowest = !!(globalThis.zusZhaoyunIsLowestHp && globalThis.zusZhaoyunIsLowestHp(player));
                    if (typeof globalThis.zusZhaoyunDebug == "function") {
                        globalThis.zusZhaoyunDebug("gudan_filter", {
                            owner: player && player.name,
                            cardName: event && event.card && (event.card.name || event.card.viewAs || null),
                            source: event && event.player && event.player.name,
                            hp: player && player.hp,
                            isSha: isSha,
                            lowest: lowest,
                            aliveCount: globalThis.zusZhaoyunAlivePlayers ? globalThis.zusZhaoyunAlivePlayers().length : null,
                        });
                    }
                    return isSha && lowest;
                },
                content: function () {
                    if (typeof globalThis.zusZhaoyunDebug == "function") {
                        globalThis.zusZhaoyunDebug("gudan_content", {
                            owner: player && player.name,
                            hp: player && player.hp,
                        });
                    }
                    player.draw();
                },
            },
        },

        translate: {
            zus_zhaoyun: "赵云",
            zus_zhaoyun_ab: "赵云",
            zus_juexiao: "绝啸",
            zus_juexiao_info: "出牌阶段，你可以将【闪】当【杀】使用。当你使用的【杀】与你本回合使用或打出的上一张牌花色相同，此【杀】造成的伤害+1，无视次数限制且不计入出【杀】张数。",
            zus_gudan: "孤胆",
            zus_gudan_info: "锁定技，当你成为【杀】的目标时，若你的体力值为全场最低（或之一），你摸一张牌。",
        },

        sort: ["zus_zhaoyun"],

        title: {
            zus_zhaoyun: "苍天龙魂",
        },
    };
    if (typeof globalThis.zusZhaoyunDebug == "function") {
        globalThis.zusZhaoyunDebug("module_loaded", {
            module: "zhaoyun",
        });
    }
})();
