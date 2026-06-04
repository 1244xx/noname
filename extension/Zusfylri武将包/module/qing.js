(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof get === "undefined") var get = globalThis.get;

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

    function runtimeGet() {
        try {
            if (window.Zus && Zus.runtimeGet) {
                var getter = Zus.runtimeGet();
                if (getter) return getter;
            }
        } catch (e) {}
        return globalThis.get || get || null;
    }

    function runtimeGame() {
        try {
            if (window.Zus && Zus.runtimeGame) {
                var current = Zus.runtimeGame();
                if (current) return current;
            }
        } catch (e) {}
        return globalThis.game || game || null;
    }

    function isAlive(player) {
        if (!player) return false;
        try {
            if (player.isIn && player.isIn()) return true;
        } catch (e) {}
        return !!(player.name && typeof player.hp == "number" && player.hp > 0);
    }

    function allPlayers(seed) {
        var result = [];
        var add = function (list) {
            if (!list || !list.length) return;
            for (var i = 0; i < list.length; i++) {
                if (isAlive(list[i]) && result.indexOf(list[i]) == -1) result.push(list[i]);
            }
        };
        try {
            var currentGame = runtimeGame();
            add(currentGame && currentGame.players);
            if (currentGame && currentGame.filterPlayer) add(currentGame.filterPlayer(function () { return true; }));
            if (currentGame && currentGame.hasPlayer) {
                currentGame.hasPlayer(function (current) {
                    add([current]);
                    return false;
                });
            }
        } catch (e) {}
        try {
            var currentGame2 = runtimeGame();
            add([currentGame2 && currentGame2.me]);
        } catch (e2) {}
        add([seed]);
        try {
            var current = seed && seed.getNext ? seed.getNext() : seed && seed.next ? seed.next : null;
            var guard = 0;
            while (current && current != seed && guard < 20) {
                add([current]);
                current = current.getNext ? current.getNext() : current.next ? current.next : null;
                guard++;
            }
        } catch (e3) {}
        return result;
    }

    function playerDebugInfo(player) {
        if (!player) return null;
        return {
            name: player.name || null,
            name1: player.name1 || null,
            name2: player.name2 || null,
            hp: player.hp,
            maxHp: player.maxHp,
            alive: isAlive(player),
        };
    }

    function debugLog(stage, data) {
        var payload = data || {};
        try {
            payload.stage = stage;
            payload.time = new Date().toISOString();
            globalThis.zusQingDebugLogs = globalThis.zusQingDebugLogs || [];
            globalThis.zusQingDebugLogs.push(payload);
            if (globalThis.zusQingDebugLogs.length > 80) globalThis.zusQingDebugLogs.shift();
        } catch (e) {}
        try {
            if (globalThis.console && console.log) console.log("[青调试]", stage, payload);
        } catch (e2) {}
    }

    function safeNumber(card) {
        if (!card) return null;
        try {
            var getter = runtimeGet();
            var num = getter && getter.number ? getter.number(card) : null;
            if (typeof num == "number") return num;
        } catch (e) {}
        return typeof card.number == "number" ? card.number : null;
    }

    function setBlock(target, number, judgeCard, source) {
        if (!target || !number) return;
        target.storage = target.storage || {};
        target.storage.zus_yejian_number = number;
        target.storage.zus_yejian_judge_card = judgeCard || null;
        target.storage.zus_yejian_source = source || null;
        if (target.syncStorage) {
            target.syncStorage("zus_yejian_number");
            target.syncStorage("zus_yejian_judge_card");
        }
        if (target.addSkill) target.addSkill("zus_yejian_block");
        if (target.markSkill) target.markSkill("zus_yejian_block");
    }

    function clearBlock(target) {
        if (!target || !target.storage) return;
        delete target.storage.zus_yejian_number;
        delete target.storage.zus_yejian_judge_card;
        delete target.storage.zus_yejian_source;
        if (target.syncStorage) {
            target.syncStorage("zus_yejian_number");
            target.syncStorage("zus_yejian_judge_card");
        }
        if (target.removeSkill) target.removeSkill("zus_yejian_block");
        if (target.unmarkSkill) target.unmarkSkill("zus_yejian_block");
    }

    function handCard(card, player) {
        if (!card || !player) return false;
        try {
            var getter = runtimeGet();
            if (getter && getter.position) return getter.position(card) == "h";
        } catch (e) {}
        try {
            return player.getCards && player.getCards("h").indexOf(card) != -1;
        } catch (e2) {}
        return false;
    }

    function discardCards(event) {
        var result = [];
        var add = function (cards) {
            if (!cards || !cards.length) return;
            for (var i = 0; i < cards.length; i++) {
                if (cards[i] && result.indexOf(cards[i]) == -1) result.push(cards[i]);
            }
        };
        try {
            if (event && event.name == "cardsDiscard") add(event.cards);
            else if (event && event.getd) add(event.getd());
        } catch (e) {}
        try {
            if (event && event.getl) {
                var players = allPlayers();
                for (var i = 0; i < players.length; i++) {
                    var lost = event.getl(players[i]);
                    add(lost && lost.cards2);
                }
            }
        } catch (e2) {}
        try {
            if (result.filterInD) return result.filterInD("d");
        } catch (e3) {}
        try {
            var getter = runtimeGet();
            if (getter && getter.position) {
                return result.filter(function (card) {
                    return getter.position(card, true) == "d";
                });
            }
        } catch (e4) {}
        return result;
    }

    function hasSameNumberDiscard(event, target) {
        if (!target || !target.storage) return false;
        var num = target.storage.zus_yejian_number;
        if (!num) return false;
        var judgeCard = target.storage.zus_yejian_judge_card;
        var cards = discardCards(event);
        for (var i = 0; i < cards.length; i++) {
            if (cards[i] != judgeCard && safeNumber(cards[i]) == num) return true;
        }
        return false;
    }

    function gainMaxHpOne(target) {
        if (!target) return;
        if (target.gainMaxHp) target.gainMaxHp();
        else {
            target.maxHp = (target.maxHp || 0) + 1;
            if (target.update) target.update();
        }
    }

    globalThis.zusQingRuntimeGet = runtimeGet;
    globalThis.zusQingRuntimeGame = runtimeGame;
    globalThis.zusQingIsAlive = isAlive;
    globalThis.zusQingAllPlayers = allPlayers;
    globalThis.zusQingPlayerDebugInfo = playerDebugInfo;
    globalThis.zusQingDebugLog = debugLog;
    globalThis.zusQingSafeNumber = safeNumber;
    globalThis.zusQingSetBlock = setBlock;
    globalThis.zusQingClearBlock = clearBlock;
    globalThis.zusQingHandCard = handCard;
    globalThis.zusQingDiscardCards = discardCards;
    globalThis.zusQingHasSameNumberDiscard = hasSameNumberDiscard;
    globalThis.zusQingGainMaxHpOne = gainMaxHpOne;

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("qing", "runtimeGet", runtimeGet, { globalName: "zusQingRuntimeGet", overwrite: true });
        Zus.bindHelper("qing", "runtimeGame", runtimeGame, { globalName: "zusQingRuntimeGame", overwrite: true });
        Zus.bindHelper("qing", "isAlive", isAlive, { globalName: "zusQingIsAlive", overwrite: true });
        Zus.bindHelper("qing", "allPlayers", allPlayers, { globalName: "zusQingAllPlayers", overwrite: true });
        Zus.bindHelper("qing", "playerDebugInfo", playerDebugInfo, { globalName: "zusQingPlayerDebugInfo", overwrite: true });
        Zus.bindHelper("qing", "debugLog", debugLog, { globalName: "zusQingDebugLog", overwrite: true });
        Zus.bindHelper("qing", "safeNumber", safeNumber, { globalName: "zusQingSafeNumber", overwrite: true });
        Zus.bindHelper("qing", "setBlock", setBlock, { globalName: "zusQingSetBlock", overwrite: true });
        Zus.bindHelper("qing", "clearBlock", clearBlock, { globalName: "zusQingClearBlock", overwrite: true });
        Zus.bindHelper("qing", "handCard", handCard, { globalName: "zusQingHandCard", overwrite: true });
        Zus.bindHelper("qing", "discardCards", discardCards, { globalName: "zusQingDiscardCards", overwrite: true });
        Zus.bindHelper("qing", "hasSameNumberDiscard", hasSameNumberDiscard, { globalName: "zusQingHasSameNumberDiscard", overwrite: true });
        Zus.bindHelper("qing", "gainMaxHpOne", gainMaxHpOne, { globalName: "zusQingGainMaxHpOne", overwrite: true });
    }

    window.zusfylriModules["qing"] = {
        key: "qing",
        character: {
            zus_qing: char("female", "zus_group_mo", 3, ["zus_yejian", "zus_xunquan"], "zus_qing", "png"),
        },
        skill: {
            zus_yejian: {
                enable: "phaseUse",
                usable: 1,
                filter: function (event, player) {
                    if (!player || !player.countCards || player.countCards("h") <= 0) return false;
                    var currentGame = globalThis.zusQingRuntimeGame && globalThis.zusQingRuntimeGame();
                    if (currentGame && currentGame.hasPlayer) {
                        return currentGame.hasPlayer(function (target) {
                            return target != player && globalThis.zusQingIsAlive(target) && target.countCards && target.countCards("h") > 0;
                        });
                    }
                    return true;
                },
                filterTarget: function (card, player, target) {
                    return target != player && globalThis.zusQingIsAlive(target) && target.countCards && target.countCards("h") > 0;
                },
                content: function () {
                    "step 0"
                    player.chooseToCompare(target).set("preserve", "lose");

                    "step 1"
                    event.win = !!result.bool;
                    if (event.win) {
                        if (target.recover) target.recover();
                        target.judge(function () { return 0; });
                    } else {
                        var cards = [result.player, result.target].filter(function (card) {
                            return !!card;
                        });
                        if (cards.length && target.gain) target.gain(cards, "gain2", "log");
                        globalThis.zusQingGainMaxHpOne(target);
                        event.finish();
                    }

                    "step 2"
                    if (event.win) {
                        var card = result && result.card || result && result.judge;
                        var num = globalThis.zusQingSafeNumber(card);
                        if (num) {
                            globalThis.zusQingSetBlock(target, num, card, player);
                        }
                    }
                },
                ai: {
                    order: 6,
                    result: {
                        target: function (player, target) {
                            try {
                                var getter = globalThis.zusQingRuntimeGet && globalThis.zusQingRuntimeGet();
                                var att = getter && getter.attitude ? getter.attitude(player, target) : 0;
                                return att >= 0 ? 1 : -0.5;
                            } catch (e) {
                                return 0;
                            }
                        },
                    },
                },
            },

            zus_yejian_block: {
                charlotte: true,
                mark: true,
                marktext: "谏",
                intro: {
                    content: function (storage, player) {
                        var num = player && player.storage && player.storage.zus_yejian_number;
                        return num ? "不能使用手牌并跳过弃牌阶段，直到另一张点数为" + num + "的牌进入弃牌堆或青的下个出牌阶段前" : "不能使用手牌并跳过弃牌阶段";
                    },
                },
                group: ["zus_yejian_block_discard", "zus_yejian_block_skip", "zus_yejian_block_phase"],
                mod: {
                    cardEnabled: function (card, player) {
                        if (globalThis.zusQingHandCard(card, player)) return false;
                    },
                    cardEnabled2: function (card, player) {
                        if (globalThis.zusQingHandCard(card, player)) return false;
                    },
                },
                onremove: function (player) {
                    if (!player || !player.storage) return;
                    delete player.storage.zus_yejian_number;
                    delete player.storage.zus_yejian_judge_card;
                    delete player.storage.zus_yejian_source;
                },
            },

            zus_yejian_block_discard: {
                trigger: { global: ["loseAfter", "loseAsyncAfter", "cardsDiscardAfter"] },
                forced: true,
                popup: false,
                filter: function (event, player) {
                    return globalThis.zusQingHasSameNumberDiscard(event, player);
                },
                content: function () {
                    globalThis.zusQingClearBlock(player);
                },
            },

            zus_yejian_block_skip: {
                trigger: { player: "phaseDiscardBefore" },
                forced: true,
                popup: false,
                content: function () {
                    trigger.cancel();
                },
            },

            zus_yejian_block_phase: {
                trigger: { global: "phaseUseBefore" },
                forced: true,
                popup: false,
                filter: function (event, player) {
                    return !!(player && player.storage && player.storage.zus_yejian_source && event.player == player.storage.zus_yejian_source);
                },
                content: function () {
                    globalThis.zusQingClearBlock(player);
                },
            },

            zus_xunquan: {
                trigger: { player: "phaseJieshuBegin" },
                forced: true,
                locked: true,
                content: function () {
                    "step 0"
                    event.targets = globalThis.zusQingAllPlayers(player);
                    event.index = 0;
                    event.total = 0;
                    event.debugTargets = [];
                    for (var i = 0; i < event.targets.length; i++) {
                        event.debugTargets.push({
                            player: globalThis.zusQingPlayerDebugInfo(event.targets[i]),
                            lose: Math.floor((event.targets[i] && event.targets[i].maxHp || 0) / 5),
                        });
                    }
                    globalThis.zusQingDebugLog("xunquan_begin", {
                        player: globalThis.zusQingPlayerDebugInfo(player),
                        targets: event.debugTargets,
                    });

                    "step 1"
                    if (!event.targets || event.index >= event.targets.length) {
                        event.goto(2);
                        return;
                    }
                    event.current = event.targets[event.index++];
                    event.num = Math.floor((event.current && event.current.maxHp || 0) / 5);
                    if (event.num > 0 && event.current.loseHp) {
                        event.total += event.num;
                        event.current.loseHp(event.num);
                    }
                    event.redo();

                    "step 2"
                    globalThis.zusQingDebugLog("xunquan_end", {
                        player: globalThis.zusQingPlayerDebugInfo(player),
                        total: event.total,
                    });
                    if (event.total > 0 && player.recover) player.recover(event.total);
                },
            },
        },
        translate: {
            zus_qing: "青",
            zus_qing_ab: "青",
            zus_yejian: "夜谏",
            zus_yejian_info: "出牌阶段限一次，你可以选择一名其他角色进行拼点。若你赢，其回复1点体力并进行一次判定，直到你的下一个出牌阶段前，若没有与判定牌同点数的另一张牌进入弃牌堆，则其不能使用手牌并跳过弃牌阶段；若你没赢，其获得双方的拼点牌并增加1点体力上限。",
            zus_yejian_block: "夜谏",
            zus_yejian_block_discard: "夜谏",
            zus_yejian_block_skip: "夜谏",
            zus_yejian_block_phase: "夜谏",
            zus_xunquan: "熏权",
            zus_xunquan_info: "锁定技。结束阶段，你令所有角色失去（自身体力上限/5）点体力，然后你回复等量体力值。（向下取整）",
        },
        title: {
            zus_qing: "帐中妖",
        },
        sort: ["zus_qing"],
    };
})();
