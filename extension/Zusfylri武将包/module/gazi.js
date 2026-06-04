(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = "Zusfylri武将包";

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function currentStatus() {
        try {
            if (window.Zus && Zus.runtime) {
                var runtimeStatus = Zus.runtime().status;
                if (runtimeStatus) return runtimeStatus;
            }
        } catch (e) {}
        return globalThis._status || _status || (window.__ZUS_TEST && window.__ZUS_TEST.core && window.__ZUS_TEST.core._status) || null;
    }

    function currentGame() {
        try {
            if (window.Zus && Zus.runtime) {
                var runtimeGame = Zus.runtime().game;
                if (runtimeGame) return runtimeGame;
            }
        } catch (e) {}
        try {
            if (typeof window != "undefined" && window.top && window.top.game) return window.top.game;
        } catch (e2) {}
        try {
            if (typeof window != "undefined" && window.game) return window.game;
        } catch (e3) {}
        return globalThis.game || game || (window.__ZUS_TEST && window.__ZUS_TEST.core && window.__ZUS_TEST.core.game) || null;
    }

    function currentGet() {
        try {
            if (window.Zus && Zus.runtime) {
                var runtimeGet = Zus.runtime().get;
                if (runtimeGet) return runtimeGet;
            }
        } catch (e) {}
        try {
            if (typeof window != "undefined" && window.top && window.top.get) return window.top.get;
        } catch (e2) {}
        try {
            if (typeof window != "undefined" && window.get) return window.get;
        } catch (e3) {}
        return globalThis.get || get || (window.__ZUS_TEST && window.__ZUS_TEST.core && window.__ZUS_TEST.core.get) || null;
    }

    function appendGaziDebug(debug) {
        var line = JSON.stringify(debug) + "\n";
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (req) {
                var fs = req("fs");
                fs.appendFileSync(
                    "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/gazi_debug.log",
                    line,
                    "utf8"
                );
            }
        } catch (e) {}
        try {
            var zgame = currentGame();
            if (zgame && typeof zgame.writeFile == "function") {
                zgame.writeFile(
                    line,
                    "extension/Zusfylri武将包/docs",
                    "gazi_debug_latest.log",
                    function () {}
                );
            }
        } catch (e2) {}
    }

    function writeGaziDebug(stage, data) {
        var debug = data || {};
        debug.stage = stage;
        debug.timestamp = Date.now();
        globalThis.zusGaziDebug = debug;
        appendGaziDebug(debug);
        try {
            if (window.localStorage) localStorage.setItem("zus_gazi_debug", JSON.stringify(debug));
        } catch (e) {}
        try {
            var zgame = currentGame();
            if (zgame && typeof zgame.saveConfig == "function") {
                zgame.saveConfig("zus_gazi_debug_ascii", debug);
            }
        } catch (e2) {}
    }

    globalThis.zusGaziWriteDebug = writeGaziDebug;

    function isJiuShenChanging() {
        var status = currentStatus();
        return !!(status && (status.zusJiuShenChanging || status.zus_jiushen_changing));
    }

    function isJiuShenDone() {
        var status = currentStatus();
        return !!(status && (status.zusJiuShenDone || status.zus_jiushen_done));
    }

    function setJiuShenChanging(value) {
        var status = currentStatus();
        if (!status) return;
        status.zusJiuShenChanging = !!value;
        status.zus_jiushen_changing = !!value;
    }

    function setJiuShenDone(value) {
        var status = currentStatus();
        if (!status) return;
        status.zusJiuShenDone = !!value;
        status.zus_jiushen_done = !!value;
    }

    function currentPlayers() {
        var players = [];
        try {
            if (window.Zus && Zus.players) players = Zus.players() || [];
        } catch (e) {}
        var zgame = currentGame();
        if ((!players || !players.length) && zgame && zgame.players) {
            players = zgame.players;
        }
        return (players || []).slice(0);
    }

    function resolveJiuShenTargets(owner, runtimeGame, skillEvent, triggerEvent) {
        var list = [];
        var seen = {};
        var add = function (target, source) {
            if (!target) return;
            if (target.isIn && !target.isIn()) return;
            var key = target.playerid || target.name || source + "_" + list.length;
            if (seen[key]) return;
            seen[key] = true;
            list.push(target);
        };
        var addArray = function (arr, source) {
            if (!arr || !arr.length) return;
            for (var i = 0; i < arr.length; i++) add(arr[i], source);
        };
        try {
            addArray(triggerEvent && triggerEvent.targets, "trigger.targets");
        } catch (e) {}
        try {
            addArray(skillEvent && skillEvent.targets, "event.targets");
        } catch (e2) {}
        try {
            if (runtimeGame && typeof runtimeGame.filterPlayer == "function") {
                addArray(runtimeGame.filterPlayer(function (current) {
                    return !!(current && (!current.isIn || current.isIn()));
                }), "game.filterPlayer");
            }
        } catch (e3) {}
        try {
            addArray(runtimeGame && runtimeGame.players, "game.players");
        } catch (e4) {}
        try {
            addArray(window.Zus && Zus.players ? Zus.players() : [], "Zus.players");
        } catch (e5) {}

        var start = null;
        try {
            start = (triggerEvent && triggerEvent.player) || owner;
        } catch (e6) {
            start = owner;
        }
        var current = start;
        var guard = 0;
        while (current && guard < 32) {
            add(current, "seat");
            current = current.getNext ? current.getNext() : current.next;
            guard++;
            if (!current || current == start) break;
        }
        return list;
    }

    function isJiuCard(card, player) {
        try {
            var getter = currentGet();
            return (window.Zus && Zus.safeName ? Zus.safeName(card, player) : getter.name(card, player)) == "jiu";
        } catch (e) {
            return !!(card && card.name == "jiu");
        }
    }

    function isInDiscard(card, player) {
        if (!card) return false;
        try {
            var getter = currentGet();
            if (getter && getter.position) {
                return getter.position(card, true) === "d";
            }
        } catch (e) {}
        try {
            return !!(ui && ui.discardPile && card.parentNode === ui.discardPile);
        } catch (e2) {}
        return false;
    }

    function eventCards(event, player) {
        var list = [];
        try {
            if (window.Zus && Zus.eventCards) list = Zus.eventCards(event, true) || [];
        } catch (e) {}
        if (!list.length && event) {
            if (typeof event.getd === "function") {
                try {
                    var fromGetd = event.getd();
                    if (fromGetd && fromGetd.length) list = list.concat(fromGetd);
                } catch (e2) {}
            }
            if (event.cards && event.cards.length) list = list.concat(event.cards);
            if (event.cards2 && event.cards2.length) list = list.concat(event.cards2);
        }
        var unique = [];
        for (var i = 0; i < list.length; i++) {
            var card = list[i];
            if (!card) continue;
            var exists = false;
            for (var j = 0; j < unique.length; j++) {
                if (unique[j] === card || (unique[j].cardid && card.cardid && unique[j].cardid === card.cardid)) {
                    exists = true;
                    break;
                }
            }
            if (!exists) unique.push(card);
        }
        return unique;
    }

    function createJiuCards(count, runtimeGame, runtimeUi) {
        var zgame = runtimeGame || currentGame();
        var zui = runtimeUi || null;
        if (!zgame || (!zgame.createCard2 && !zgame.createCard)) {
            try {
                if (typeof window != "undefined" && window.top && window.top.game) zgame = window.top.game;
            } catch (e) {}
        }
        if (!zgame || (!zgame.createCard2 && !zgame.createCard)) {
            try {
                if (typeof window != "undefined" && window.game) zgame = window.game;
            } catch (e2) {}
        }
        if (!zgame || (!zgame.createCard2 && !zgame.createCard)) {
            zgame = globalThis.game || game || null;
        }
        try {
            if (typeof window != "undefined" && window.top && window.top.ui) zui = window.top.ui;
        } catch (e3) {}
        if (!zui) {
            try {
                if (typeof window != "undefined" && window.ui) zui = window.ui;
            } catch (e4) {}
        }
        if (!zui) zui = globalThis.ui || ui || null;
        var cards = [];
        for (var i = 0; i < count; i++) {
            var card = null;
            if (zgame && zgame.createCard2) card = zgame.createCard2("jiu", "spade", 9);
            else if (zgame && zgame.createCard) card = zgame.createCard("jiu", "spade", 9);
            else if (zui && zui.create && typeof zui.create.card == "function") {
                card = zui.create.card(zui.special);
                if (card && typeof card.init == "function") {
                    card = card.init(["spade", 9, "jiu"]);
                    if (card.storage && card.storage.vanish) delete card.storage.vanish;
                }
            }
            if (card) cards.push(card);
        }
        return cards;
    }

    globalThis.zusGaziCreateJiuCards = createJiuCards;
    globalThis.zusGaziSetJiuShenChanging = setJiuShenChanging;
    globalThis.zusGaziResolveJiuShenTargets = resolveJiuShenTargets;

    var gaziModule = {
        key: "gazi",

        character: {
            zus_gazi: char("male", "zus_group_shi", 4, ["zus_jiushen", "zus_kuangyan"], "zus_gazi", "png"),
        },

        skill: {
            zus_jiushen: {
                trigger: { global: "gameDrawAfter" },
                forced: true,
                popup: false,
                filter: function (event, player) {
                    var zstatus = globalThis._status || _status;
                    var blocked = !!(zstatus && (zstatus.zusJiuShenDone || zstatus.zus_jiushen_done));
                    if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_filter", {
                        player: player && player.name,
                        eventName: event && event.name,
                        hasStatus: !!zstatus,
                        done: blocked,
                        result: !blocked,
                    });
                    if (blocked) return false;
                    return true;
                },

                content: function () {
                    "step 0"
                    var runtime = window.Zus && Zus.runtime ? Zus.runtime() : {};
                    var zgame = runtime.game || globalThis.game || game;
                    var zstatus = runtime.status || globalThis._status || _status;
                    if (!zgame || !zstatus) {
                        if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_abort_runtime", {
                            hasRuntime: !!runtime,
                            hasGame: !!zgame,
                            hasStatus: !!zstatus,
                        });
                        event.finish();
                        return;
                    }
                    zstatus.zusJiuShenDone = true;
                    zstatus.zus_jiushen_done = true;
                    zstatus.zusJiuShenChanging = true;
                    zstatus.zus_jiushen_changing = true;
                    event.zusJiuShenGame = zgame;

                    var players = globalThis.zusGaziResolveJiuShenTargets
                        ? globalThis.zusGaziResolveJiuShenTargets(player, zgame, event, trigger)
                        : [];
                    event.zusJiuShenTargets = players || [];
                    event.zusJiuShenIndex = 0;
                    if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_start", {
                        player: player && player.name,
                        hasGame: !!zgame,
                        hasStatus: !!zstatus,
                        playersCount: players ? players.length : 0,
                        triggerName: trigger && trigger.name,
                        triggerTargetsCount: trigger && trigger.targets ? trigger.targets.length : null,
                        gamePlayersCount: zgame && zgame.players ? zgame.players.length : null,
                        targets: event.zusJiuShenTargets.map(function (target) {
                            return {
                                name: target && target.name,
                                handCount: target && target.getCards ? target.getCards("h").length : null,
                                inGame: !!(target && (!target.isIn || target.isIn())),
                            };
                        }),
                    });

                    "step 1"
                    if (!event.zusJiuShenTargets || event.zusJiuShenIndex >= event.zusJiuShenTargets.length) {
                        if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_all_targets_done", {
                            index: event.zusJiuShenIndex,
                            total: event.zusJiuShenTargets ? event.zusJiuShenTargets.length : 0,
                        });
                        event.goto(4);
                        return;
                    }
                    event.zusJiuShenTarget = event.zusJiuShenTargets[event.zusJiuShenIndex];
                    event.zusJiuShenOldHands = event.zusJiuShenTarget && event.zusJiuShenTarget.getCards
                        ? event.zusJiuShenTarget.getCards("h")
                        : [];
                    if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_before_lose", {
                        index: event.zusJiuShenIndex,
                        target: event.zusJiuShenTarget && event.zusJiuShenTarget.name,
                        handCount: event.zusJiuShenOldHands ? event.zusJiuShenOldHands.length : 0,
                        hasLose: !!(event.zusJiuShenTarget && event.zusJiuShenTarget.lose),
                    });
                    if (event.zusJiuShenOldHands && event.zusJiuShenOldHands.length && event.zusJiuShenTarget.lose) {
                        var runtimeUi = globalThis.ui || ui;
                        event.zusJiuShenTarget.lose(
                            event.zusJiuShenOldHands,
                            runtimeUi && runtimeUi.special ? runtimeUi.special : null
                        ).set("getlx", false).set("type", "zus_jiushen_replace");
                        if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_lose_created", {
                            target: event.zusJiuShenTarget && event.zusJiuShenTarget.name,
                            handCount: event.zusJiuShenOldHands.length,
                            hasUiSpecial: !!(runtimeUi && runtimeUi.special),
                        });
                    } else {
                        if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_lose_skipped", {
                            target: event.zusJiuShenTarget && event.zusJiuShenTarget.name,
                            handCount: event.zusJiuShenOldHands ? event.zusJiuShenOldHands.length : 0,
                            hasLose: !!(event.zusJiuShenTarget && event.zusJiuShenTarget.lose),
                        });
                    }

                    "step 2"
                    var target = event.zusJiuShenTarget;
                    var runtimeGame2 = event.zusJiuShenGame || (window.Zus && Zus.runtime ? Zus.runtime().game : null);
                    var runtimeUi2 = globalThis.ui || ui;
                    var cards = globalThis.zusGaziCreateJiuCards
                        ? globalThis.zusGaziCreateJiuCards(3, runtimeGame2 || globalThis.game || game, runtimeUi2)
                        : [];
                    if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_before_gain", {
                        target: target && target.name,
                        createdCount: cards ? cards.length : 0,
                        hasRuntimeGame: !!runtimeGame2,
                        hasCreateCard2: !!(runtimeGame2 && runtimeGame2.createCard2),
                        hasCreateCard: !!(runtimeGame2 && runtimeGame2.createCard),
                        hasRuntimeUi: !!runtimeUi2,
                        hasUiCreateCard: !!(runtimeUi2 && runtimeUi2.create && runtimeUi2.create.card),
                        hasDirectgain: !!(target && target.directgain),
                        hasGain: !!(target && target.gain),
                        cardNames: cards ? cards.map(function (card) {
                            return card && card.name;
                        }) : [],
                    });
                    if (target && cards.length) {
                        if (target.directgain) {
                            target.directgain(cards);
                            if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_directgain_done", {
                                target: target && target.name,
                                count: cards.length,
                                handCountAfter: target.getCards ? target.getCards("h").length : null,
                            });
                        } else if (target.gain) {
                            target.gain(cards, "gain2").set("type", "zus_jiushen_gain");
                            if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_gain_created", {
                                target: target && target.name,
                                count: cards.length,
                            });
                        }
                        try {
                            var logGame = runtimeGame2 || globalThis.game || game;
                            if (logGame && logGame.log) logGame.log(target, "因【酒神】获得了", cards);
                        } catch (e) {}
                    }

                    "step 3"
                    if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_next_target", {
                        finishedTarget: event.zusJiuShenTarget && event.zusJiuShenTarget.name,
                        index: event.zusJiuShenIndex,
                    });
                    event.zusJiuShenIndex++;
                    event.goto(1);

                    "step 4"
                    var runtimeGame = globalThis.game || game;
                    if (runtimeGame && runtimeGame.updateRoundNumber) runtimeGame.updateRoundNumber();
                    if (globalThis.zusGaziSetJiuShenChanging) globalThis.zusGaziSetJiuShenChanging(false);
                    if (globalThis.zusGaziWriteDebug) globalThis.zusGaziWriteDebug("zus_jiushen_finish", {
                        hasGame: !!runtimeGame,
                        index: event.zusJiuShenIndex,
                        total: event.zusJiuShenTargets ? event.zusJiuShenTargets.length : 0,
                    });
                },
            },

            zus_kuangyan: {
                trigger: {
                    global: ["cardsDiscardAfter", "loseAfter", "loseAsyncAfter"],
                },
                forced: true,

                filter: function (event, player) {
                    var zstatus = globalThis._status || _status;
                    if (zstatus && (zstatus.zusJiuShenChanging || zstatus.zus_jiushen_changing)) return false;
                    if (!event || typeof event.getd !== "function") return false;
                    var cards = [];
                    try {
                        cards = event.getd() || [];
                    } catch (e) {}
                    if (!cards.length) return false;
                    for (var i = 0; i < cards.length; i++) {
                        var card = cards[i];
                        if (!card) continue;
                        var isJiu = false;
                        try {
                            isJiu = (window.Zus && Zus.safeName ? Zus.safeName(card, player) : get.name(card, player)) == "jiu";
                        } catch (e3) {
                            isJiu = !!(card && card.name == "jiu");
                        }
                        if (isJiu) return true;
                    }
                    return false;
                },

                content: function () {
                    var cards = [];
                    if (trigger && typeof trigger.getd === "function") {
                        try {
                            cards = trigger.getd() || [];
                        } catch (e) {}
                    }
                    var num = 0;
                    for (var i = 0; i < cards.length; i++) {
                        var card = cards[i];
                        if (!card) continue;
                        var isJiu = false;
                        try {
                            isJiu = (window.Zus && Zus.safeName ? Zus.safeName(card, player) : get.name(card, player)) == "jiu";
                        } catch (e3) {
                            isJiu = !!(card && card.name == "jiu");
                        }
                        if (isJiu) num++;
                    }
                    if (num > 0) player.draw(num);
                },
            },
        },

        translate: {
            zus_gazi: "谢孟伟",
            zus_gazi_ab: "嘎子",

            zus_jiushen: "酒神",
            zus_jiushen_info: "游戏开始时，你将所有角色的初始手牌改为3张【酒】。",

            zus_kuangyan: "狂宴",
            zus_kuangyan_info: "锁定技，每当一张【酒】进入弃牌堆，你摸一张牌。",
        },

        sort: ["zus_gazi"],

        title: {
            zus_gazi: "嘎子",
        },
    };

    window.zusfylriModules["gazi"] = gaziModule;

    var runtimeLib = globalThis.lib || lib;
    if (runtimeLib) {
        if (runtimeLib.character && gaziModule.character) Object.assign(runtimeLib.character, gaziModule.character);
        if (runtimeLib.skill && gaziModule.skill) Object.assign(runtimeLib.skill, gaziModule.skill);
        if (runtimeLib.translate && gaziModule.translate) Object.assign(runtimeLib.translate, gaziModule.translate);
        if (runtimeLib.characterTitle && gaziModule.title) Object.assign(runtimeLib.characterTitle, gaziModule.title);
    }
})();
