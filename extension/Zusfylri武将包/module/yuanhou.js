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
        if (globalThis.game && typeof globalThis.game == "object") return globalThis.game;
        if (game && typeof game == "object") return game;
        return null;
    }

    function runtimeGet() {
        if (globalThis.get && typeof globalThis.get == "object") return globalThis.get;
        if (get && typeof get == "object") return get;
        return null;
    }

    function setupGroup() {
        var currentLib = globalThis.lib || lib;
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

    function appendDebug(debug) {
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (!req) return;
            var fs = req("fs");
            fs.appendFileSync(
                "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/yuanhou_duoyuan_debug.log",
                JSON.stringify(debug) + "\n",
                "utf8"
            );
        } catch (e) {
        }
    }

    function writeDebug(debug) {
        if (!debug) return;
        if (!debug.timestamp) debug.timestamp = Date.now();
        globalThis.zusYuanhouDuoyuanDebug = debug;
        appendDebug(debug);
        try {
            localStorage.setItem("zus_yuanhou_duoyuan_debug", JSON.stringify(debug));
        } catch (e) {
        }
    }

    function isAlive(player) {
        if (!player) return false;
        try {
            if (typeof player.isIn == "function" && player.isIn()) return true;
        } catch (e) {
        }
        return !!(player.name && typeof player.hp == "number" && player.hp > 0);
    }

    function alivePlayers(seed) {
        var currentGame = runtimeGame();
        var result = [];
        var push = function (current) {
            if (!globalThis.zusYuanhouIsAlive(current)) return;
            if (result.indexOf(current) == -1) result.push(current);
        };
        push(seed);
        if (currentGame && typeof currentGame.hasPlayer == "function") {
            currentGame.hasPlayer(function (current) {
                push(current);
                return false;
            });
        }
        var players = currentGame && currentGame.players ? currentGame.players : [];
        for (var i = 0; i < players.length; i++) {
            push(players[i]);
        }
        if (currentGame && currentGame.me) push(currentGame.me);
        var current = seed && typeof seed.getNext == "function" ? seed.getNext() : seed && seed.next ? seed.next : null;
        var guard = 0;
        while (current && current != seed && guard < 20) {
            push(current);
            current = typeof current.getNext == "function" ? current.getNext() : current.next ? current.next : null;
            guard++;
        }
        return result;
    }

    function eachAlive(callback, seed) {
        var players = globalThis.zusYuanhouAlivePlayers ? globalThis.zusYuanhouAlivePlayers(seed) : [];
        for (var i = 0; i < players.length; i++) callback(players[i]);
    }

    function highestHp(player) {
        if (!player || typeof player.hp != "number") return false;
        var max = -Infinity;
        var seen = false;
        globalThis.zusYuanhouEachAlive(function (current) {
            if (typeof current.hp != "number") return;
            seen = true;
            if (current.hp > max) max = current.hp;
        }, player);
        return seen && player.hp === max;
    }

    function safeNumber(card) {
        try {
            var getter = runtimeGet();
            if (getter && getter.number) return getter.number(card);
        } catch (e) {
        }
        return card && typeof card.number == "number" ? card.number : 0;
    }

    function judgeCard(result) {
        if (!result) return null;
        if (result.card) return result.card;
        if (Array.isArray(result.cards) && result.cards.length) return result.cards[0];
        if (Array.isArray(result.cards2) && result.cards2.length) return result.cards2[0];
        if (result.judge && result.judge.card) return result.judge.card;
        return null;
    }

    function safeColor(card, player) {
        if (!card) return null;
        try {
            if (window.Zus && Zus.safeColor) {
                var zusColor = Zus.safeColor(card, player);
                if (zusColor) return zusColor;
            }
        } catch (e) {
        }
        try {
            var getter = runtimeGet();
            var color = getter && getter.color ? getter.color(card, player) : null;
            if (color) return color;
        } catch (e2) {
        }
        try {
            if (card.color) return card.color;
        } catch (e3) {
        }
        var suit = null;
        try {
            var getter2 = runtimeGet();
            suit = getter2 && getter2.suit ? getter2.suit(card, player) : null;
        } catch (e4) {
        }
        if (!suit) suit = card && card.suit;
        if (suit == "heart" || suit == "diamond") return "red";
        if (suit == "club" || suit == "spade") return "black";
        return null;
    }

    function safeValue(card, player) {
        try {
            var getter = runtimeGet();
            if (getter && getter.value) return getter.value(card, player);
        } catch (e) {
        }
        return 0;
    }

    function safeAttitude(player, target) {
        try {
            var getter = runtimeGet();
            if (getter && getter.attitude) return getter.attitude(player, target);
        } catch (e) {
        }
        return 0;
    }

    function safeTranslation(item) {
        try {
            var getter = runtimeGet();
            if (getter && getter.translation) return getter.translation(item);
        } catch (e) {
        }
        if (Array.isArray(item)) return item.map(safeTranslation).join("、");
        return item && item.name ? item.name : String(item || "");
    }

    function discardCards(event) {
        var cards = [];
        if (!event) return cards;
        var addCards = function (list) {
            if (!list || !list.length) return;
            for (var i = 0; i < list.length; i++) {
                if (list[i]) cards.push(list[i]);
            }
        };
        if (typeof event.getd == "function") {
            try {
                addCards(event.getd() || []);
            } catch (e) {
            }
        }
        addCards(event.cards);
        addCards(event.cards2);
        if (event.relatedEvent) {
            addCards(event.relatedEvent.cards);
            addCards(event.relatedEvent.cards2);
            addCards(event.relatedEvent.orderingCards);
            if (typeof event.relatedEvent.getd == "function") {
                try {
                    addCards(event.relatedEvent.getd() || []);
                } catch (e2) {
                }
            }
        }
        var result = [];
        for (var i = 0; i < cards.length; i++) {
            if (cards[i] && result.indexOf(cards[i]) == -1) result.push(cards[i]);
        }
        return result;
    }

    function lienMarks(player) {
        if (!player || !player.storage || !Array.isArray(player.storage.zus_liehen)) return [];
        return player.storage.zus_liehen.slice(0);
    }

    function addLienMark(player, number) {
        if (!player || !number) return false;
        player.storage = player.storage || {};
        if (!Array.isArray(player.storage.zus_liehen)) player.storage.zus_liehen = [];
        if (player.storage.zus_liehen.length >= 3) return false;
        player.storage.zus_liehen.push(number);
        if (typeof player.syncStorage == "function") player.syncStorage("zus_liehen");
        if (typeof player.addSkill == "function") player.addSkill("zus_liehen");
        if (typeof player.markSkill == "function") player.markSkill("zus_liehen");
        if (typeof player.updateMarks == "function") player.updateMarks();
        return true;
    }

    function hasLienNumber(player, number) {
        if (!number) return false;
        var marks = globalThis.zusYuanhouLienMarks(player);
        for (var i = 0; i < marks.length; i++) {
            if (marks[i] == number) return true;
        }
        return false;
    }

    function needLienRespond(event, target) {
        if (!event || !target) return false;
        if (!globalThis.zusYuanhouIsAlive(target)) return false;
        var cards = globalThis.zusYuanhouDiscardCards(event);
        for (var i = 0; i < cards.length; i++) {
            if (cards[i] && cards[i]._zus_yuanhou_liepo_done) continue;
            var number = globalThis.zusYuanhouSafeNumber(cards[i]);
            if (globalThis.zusYuanhouHasLienNumber(target, number)) return true;
        }
        return false;
    }

    function firstLienCard(event, target) {
        var cards = globalThis.zusYuanhouDiscardCards(event);
        for (var i = 0; i < cards.length; i++) {
            if (cards[i] && cards[i]._zus_yuanhou_liepo_done) continue;
            var number = globalThis.zusYuanhouSafeNumber(cards[i]);
            if (globalThis.zusYuanhouHasLienNumber(target, number)) return cards[i];
        }
        return null;
    }

    function countColorCards(player, color) {
        if (!player || !player.countCards || !color) return 0;
        return player.countCards("he", function (card) {
            return globalThis.zusYuanhouSafeColor(card, player) == color;
        });
    }

    function numberText(number) {
        var map = {
            1: "A",
            11: "J",
            12: "Q",
            13: "K",
        };
        return map[number] || String(number || "?");
    }

    setupGroup();

    globalThis.zusYuanhouRuntimeGame = runtimeGame;
    globalThis.zusYuanhouRuntimeGet = runtimeGet;
    globalThis.zusYuanhouWriteDebug = writeDebug;
    globalThis.zusYuanhouIsAlive = isAlive;
    globalThis.zusYuanhouAlivePlayers = alivePlayers;
    globalThis.zusYuanhouEachAlive = eachAlive;
    globalThis.zusYuanhouHighestHp = highestHp;
    globalThis.zusYuanhouSafeNumber = safeNumber;
    globalThis.zusYuanhouJudgeCard = judgeCard;
    globalThis.zusYuanhouSafeColor = safeColor;
    globalThis.zusYuanhouSafeValue = safeValue;
    globalThis.zusYuanhouSafeAttitude = safeAttitude;
    globalThis.zusYuanhouSafeTranslation = safeTranslation;
    globalThis.zusYuanhouDiscardCards = discardCards;
    globalThis.zusYuanhouLienMarks = lienMarks;
    globalThis.zusYuanhouAddLienMark = addLienMark;
    globalThis.zusYuanhouHasLienNumber = hasLienNumber;
    globalThis.zusYuanhouNeedLienRespond = needLienRespond;
    globalThis.zusYuanhouFirstLienCard = firstLienCard;
    globalThis.zusYuanhouCountColorCards = countColorCards;
    globalThis.zusYuanhouNumberText = numberText;

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("yuanhou", "runtimeGame", runtimeGame, "zusYuanhouRuntimeGame");
        Zus.bindHelper("yuanhou", "runtimeGet", runtimeGet, "zusYuanhouRuntimeGet");
        Zus.bindHelper("yuanhou", "writeDebug", writeDebug, "zusYuanhouWriteDebug");
        Zus.bindHelper("yuanhou", "isAlive", isAlive, "zusYuanhouIsAlive");
        Zus.bindHelper("yuanhou", "alivePlayers", alivePlayers, "zusYuanhouAlivePlayers");
        Zus.bindHelper("yuanhou", "eachAlive", eachAlive, "zusYuanhouEachAlive");
        Zus.bindHelper("yuanhou", "highestHp", highestHp, "zusYuanhouHighestHp");
        Zus.bindHelper("yuanhou", "safeNumber", safeNumber, "zusYuanhouSafeNumber");
        Zus.bindHelper("yuanhou", "judgeCard", judgeCard, "zusYuanhouJudgeCard");
        Zus.bindHelper("yuanhou", "safeColor", safeColor, "zusYuanhouSafeColor");
        Zus.bindHelper("yuanhou", "safeValue", safeValue, "zusYuanhouSafeValue");
        Zus.bindHelper("yuanhou", "safeAttitude", safeAttitude, "zusYuanhouSafeAttitude");
        Zus.bindHelper("yuanhou", "safeTranslation", safeTranslation, "zusYuanhouSafeTranslation");
        Zus.bindHelper("yuanhou", "discardCards", discardCards, "zusYuanhouDiscardCards");
        Zus.bindHelper("yuanhou", "lienMarks", lienMarks, "zusYuanhouLienMarks");
        Zus.bindHelper("yuanhou", "addLienMark", addLienMark, "zusYuanhouAddLienMark");
        Zus.bindHelper("yuanhou", "hasLienNumber", hasLienNumber, "zusYuanhouHasLienNumber");
        Zus.bindHelper("yuanhou", "needLienRespond", needLienRespond, "zusYuanhouNeedLienRespond");
        Zus.bindHelper("yuanhou", "firstLienCard", firstLienCard, "zusYuanhouFirstLienCard");
        Zus.bindHelper("yuanhou", "countColorCards", countColorCards, "zusYuanhouCountColorCards");
        Zus.bindHelper("yuanhou", "numberText", numberText, "zusYuanhouNumberText");
    }

    window.zusfylriModules["yuanhou"] = {
        key: "yuanhou",

        character: {
            zus_yuanhou: char("female", "zus_group_mo", "1/6", ["zus_duoyuan", "zus_liepo"], "zus_yuanhou", "png"),
        },

        skill: {
            zus_duoyuan: {
                trigger: { global: "phaseBefore", player: "enterGame" },
                forced: true,
                priority: 99999,
                filter: function (event, player) {
                    var currentGame = globalThis.zusYuanhouRuntimeGame && globalThis.zusYuanhouRuntimeGame();
                    if (event && event.name == "phase" && currentGame && typeof currentGame.phaseNumber == "number" && currentGame.phaseNumber !== 0) return false;
                    if (globalThis.zusYuanhouWriteDebug) {
                        var players = globalThis.zusYuanhouAlivePlayers ? globalThis.zusYuanhouAlivePlayers(player) : [];
                        globalThis.zusYuanhouWriteDebug({
                            stage: "duoyuan_filter",
                            eventName: event && event.name,
                            player: player && player.name,
                            phaseNumber: currentGame && currentGame.phaseNumber,
                            playerCount: players.length,
                            players: players.map(function (current) {
                                return {
                                    name: current && current.name,
                                    hp: current && current.hp,
                                    maxHp: current && current.maxHp,
                                };
                            }),
                            alreadyStarted: !!(player.storage && player.storage.zus_duoyuan_started),
                        });
                    }
                    return !player.storage || !player.storage.zus_duoyuan_started;
                },
                content: function () {
                    "step 0"
                    player.storage = player.storage || {};
                    player.storage.zus_duoyuan_started = true;
                    if (typeof player.syncStorage == "function") player.syncStorage("zus_duoyuan_started");
                    event.alivePlayers = globalThis.zusYuanhouAlivePlayers ? globalThis.zusYuanhouAlivePlayers(player) : [];
                    event.targets = [];
                    for (var i = 0; i < event.alivePlayers.length; i++) {
                        var current = event.alivePlayers[i];
                        if (current && typeof current.hp == "number" && current.hp == 4) event.targets.push(current);
                    }
                    if (globalThis.zusYuanhouWriteDebug) {
                        globalThis.zusYuanhouWriteDebug({
                            stage: "duoyuan_step0_targets",
                            player: player && player.name,
                            playerCount: event.alivePlayers.length,
                            targets: event.targets.map(function (current) {
                                return {
                                    name: current && current.name,
                                    hp: current && current.hp,
                                    maxHp: current && current.maxHp,
                                };
                            }),
                        });
                    }
                    event.index = 0;

                    "step 1"
                    if (event.index >= event.targets.length) {
                        event.goto(4);
                        return;
                    }
                    event.current = event.targets[event.index++];
                    if (event.current && event.current.loseHp) event.current.loseHp();

                    "step 2"
                    if (player && player.recover) player.recover();

                    "step 3"
                    event.goto(1);

                    "step 4"
                    event.alivePlayers = globalThis.zusYuanhouAlivePlayers ? globalThis.zusYuanhouAlivePlayers(player) : [];
                    event.highestHp = globalThis.zusYuanhouHighestHp(player);
                    event.beforeHasNidao = !!(player && player.hasSkill && player.hasSkill("zus_nidao"));
                    if (event.highestHp) {
                        if (player && typeof player.addSkill == "function") player.addSkill("zus_nidao");
                        if (player && typeof player.markSkill == "function") player.markSkill("zus_nidao");
                    }
                    if (globalThis.zusYuanhouWriteDebug) {
                        globalThis.zusYuanhouWriteDebug({
                            stage: "duoyuan_step3_nidao",
                            player: player && player.name,
                            hp: player && player.hp,
                            maxHp: player && player.maxHp,
                            highestHp: event.highestHp,
                            beforeHasNidao: event.beforeHasNidao,
                            afterHasNidao: !!(player && player.hasSkill && player.hasSkill("zus_nidao")),
                            addSkillAvailable: !!(player && typeof player.addSkill == "function"),
                            markSkillAvailable: !!(player && typeof player.markSkill == "function"),
                            playerCount: event.alivePlayers.length,
                            players: event.alivePlayers.map(function (current) {
                                return {
                                    name: current && current.name,
                                    hp: current && current.hp,
                                    maxHp: current && current.maxHp,
                                    hasNidao: !!(current && current.hasSkill && current.hasSkill("zus_nidao")),
                                };
                            }),
                        });
                    }
                },
            },

            zus_liepo: {
                enable: "phaseUse",
                usable: 1,
                group: "zus_liepo_check",
                filterTarget: function (card, player, target) {
                    if (!target || !globalThis.zusYuanhouIsAlive(target)) return false;
                    if (typeof target.hp != "number" || typeof target.maxHp != "number") return false;
                    if (target.hp >= target.maxHp) return false;
                    return globalThis.zusYuanhouLienMarks(target).length < 3;
                },
                content: function () {
                    "step 0"
                    target.judge(function () {
                        return 0;
                    });

                    "step 1"
                    var card = globalThis.zusYuanhouJudgeCard(result);
                    var number = globalThis.zusYuanhouSafeNumber(card);
                    var added = !!(target && card && globalThis.zusYuanhouAddLienMark(target, number));
                    if (globalThis.zusYuanhouWriteDebug) {
                        globalThis.zusYuanhouWriteDebug({
                            stage: "liepo_mark_add",
                            target: target && target.name,
                            resultKeys: result ? Object.keys(result) : [],
                            card: {
                                name: card && card.name,
                                number: number,
                                color: globalThis.zusYuanhouSafeColor(card),
                            },
                            added: added,
                            marks: target ? globalThis.zusYuanhouLienMarks(target) : [],
                        });
                    }
                },
                ai: {
                    order: 7,
                    result: {
                        target: function (player, target) {
                            return -1 - globalThis.zusYuanhouLienMarks(target).length;
                        },
                    },
                },
            },

            zus_liehen: {
                charlotte: true,
                mark: true,
                intro: {
                    markcount: function (storage, player) {
                        return globalThis.zusYuanhouLienMarks(player).length;
                    },
                    content: function (storage, player) {
                        var marks = globalThis.zusYuanhouLienMarks(player);
                        if (!marks.length) return "当前没有“裂痕”。";
                        var texts = [];
                        for (var i = 0; i < marks.length; i++) texts.push(globalThis.zusYuanhouNumberText(marks[i]));
                        return "当前共有" + marks.length + "个“裂痕”：<br>" + texts.join("、");
                    },
                },
            },

            zus_liepo_check: {
                trigger: { global: ["cardsDiscardAfter", "discardAfter", "loseAfter", "loseAsyncAfter", "loseToDiscardpileAfter", "orderingDiscardAfter"] },
                forced: true,
                popup: false,
                filter: function (event, player) {
                    var pass = false;
                    var cards = globalThis.zusYuanhouDiscardCards(event);
                    var aliveNames = [];
                    var debugTargets = [];
                    globalThis.zusYuanhouEachAlive(function (current) {
                        aliveNames.push(current && current.name);
                        var marks = globalThis.zusYuanhouLienMarks(current);
                        if (marks.length) {
                            debugTargets.push({
                                name: current && current.name,
                                marks: marks.slice(0),
                            });
                        }
                        if (!pass && globalThis.zusYuanhouNeedLienRespond(event, current)) pass = true;
                    }, player);
                    if (globalThis.zusYuanhouWriteDebug) {
                        globalThis.zusYuanhouWriteDebug({
                            stage: "liepo_check_filter",
                            eventName: event && event.name,
                            relatedEventName: event && event.relatedEvent && event.relatedEvent.name,
                            owner: player && player.name,
                            aliveNames: aliveNames,
                            cardCount: cards.length,
                            cards: cards.map(function (card) {
                                return {
                                    name: card && card.name,
                                    number: globalThis.zusYuanhouSafeNumber(card),
                                    color: globalThis.zusYuanhouSafeColor(card),
                                };
                            }),
                            markedTargets: debugTargets,
                            pass: pass,
                        });
                    }
                    return pass;
                },
                content: function () {
                    "step 0"
                    event.targets = [];
                    globalThis.zusYuanhouEachAlive(function (current) {
                        if (globalThis.zusYuanhouNeedLienRespond(trigger, current)) event.targets.push(current);
                    }, player);
                    event.index = 0;

                    "step 1"
                    if (event.index >= event.targets.length) {
                        event.finish();
                        return;
                    }
                    event.current = event.targets[event.index++];
                    event.card = globalThis.zusYuanhouFirstLienCard(trigger, event.current);
                    if (!event.card) {
                        event.goto(1);
                        return;
                    }
                    event.card._zus_yuanhou_liepo_done = true;
                    event.color = globalThis.zusYuanhouSafeColor(event.card);
                    if (globalThis.zusYuanhouWriteDebug) {
                        globalThis.zusYuanhouWriteDebug({
                            stage: "liepo_check_content",
                            target: event.current && event.current.name,
                            card: {
                                name: event.card && event.card.name,
                                number: globalThis.zusYuanhouSafeNumber(event.card),
                                color: event.color,
                            },
                            marks: globalThis.zusYuanhouLienMarks(event.current),
                            sameColorCount: globalThis.zusYuanhouCountColorCards(event.current, event.color),
                        });
                    }
                    if (!event.color || globalThis.zusYuanhouCountColorCards(event.current, event.color) < 2) {
                        if (event.current.loseHp) event.current.loseHp();
                        event.goto(1);
                        return;
                    }
                    var colorText = event.color == "red" ? "红色" : "黑色";
                    event.current.chooseToDiscard("he", 2, "裂痕：弃置两张" + colorText + "牌，否则失去1点体力", function (card) {
                        var status = globalThis._status;
                        return globalThis.zusYuanhouSafeColor(card, player) == (status && status.event && status.event.color);
                    }).set("color", event.color).set("ai", function (card) {
                        var status = globalThis._status;
                        var player = status && status.event && status.event.player;
                        return 7 - globalThis.zusYuanhouSafeValue(card, player);
                    });

                    "step 2"
                    if (!result.bool && event.current && event.current.loseHp) event.current.loseHp();
                    event.goto(1);
                },
            },

            zus_nidao: {
                trigger: { player: "loseHpBegin" },
                forced: true,
                filter: function (event, player) {
                    return event && event.num > 0 && player && player.recover;
                },
                content: function () {
                    var num = trigger.num || 1;
                    trigger.cancel();
                    player.recover(num);
                },
            },
        },

        translate: {
            zus_group_mo: "魔",
            zus_group_mo2: "魔",
            zus_yuanhou: "鸢后",
            zus_yuanhou_ab: "鸢后",
            zus_duoyuan: "夺元",
            zus_duoyuan_info: "游戏开始时，场上每名体力值为4的角色失去1点体力并令你回复1点体力。然后若你的体力值为全场最高（或之一），你获得技能“逆道”。",
            zus_liepo: "裂魄",
            zus_liepo_info: "出牌阶段限一次，你可以选择一名体力值不为满的角色，令其进行1次判定并获得1个点数与判定牌相同的“裂痕”标记（每名角色至多3个）。当一张与其“裂痕”相同点数的牌进入弃牌堆，该角色需要弃置两张与此牌同色的牌，否则失去1点体力。",
            zus_liehen: "裂痕",
            zus_liepo_check: "裂魄",
            zus_nidao: "逆道",
            zus_nidao_info: "锁定技，你受到的体力流失效果改为体力恢复。",
        },

        sort: ["zus_yuanhou"],

        title: {
            zus_yuanhou: "幽羽噬心",
        },
    };
})();
