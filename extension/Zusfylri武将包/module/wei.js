(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof _status === "undefined") var _status = globalThis._status;

    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = window.ZUS_EXTENSION_NAME || "Zusfylri武将包";
    var DEBUG_WEI_SHIYUE = true;

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

    function safeName(card, player) {
        if (!card) return null;
        try {
            if (window.Zus && Zus.safeName) {
                var zusName = Zus.safeName(card, player);
                if (zusName) return zusName;
            }
        } catch (e) {}
        try {
            var getter = runtimeGet();
            var name = getter && getter.name ? getter.name(card, player) : null;
            if (name) return name;
        } catch (e2) {}
        return card && card.name || null;
    }

    function safeType(card, player) {
        if (!card) return null;
        try {
            if (window.Zus && Zus.safeType) {
                var zusType = Zus.safeType(card, player);
                if (zusType) return zusType;
            }
        } catch (e) {}
        try {
            var getter = runtimeGet();
            var type = getter && getter.type ? getter.type(card, player) : null;
            if (type) return type;
        } catch (e2) {}
        try {
            var getter2 = runtimeGet();
            var type2 = getter2 && getter2.type2 ? getter2.type2(card, player) : null;
            if (type2) return type2;
        } catch (e3) {}
        try {
            var currentLib = globalThis.lib || lib;
            var name = safeName(card, player);
            var libType = currentLib && currentLib.card && currentLib.card[name] && currentLib.card[name].type || null;
            if (libType) return libType;
        } catch (e4) {}
        var fallbackName = safeName(card, player);
        if (fallbackName) {
            if (["sha", "shan", "tao", "jiu"].indexOf(fallbackName) != -1) return "basic";
            if (["lebu", "bingliang", "shandian", "caomu", "fulei", "hongshui", "huoshan"].indexOf(fallbackName) != -1) return "delay";
            if ([
                "guohe", "shunshou", "wuzhong", "juedou", "taoyuan", "nanman", "wanjian", "wugu",
                "jiedao", "wuxie", "huogong", "tiesuo", "yuanjiao", "zhibi", "yiyi", "lulitongxin",
                "lianjunshengyan", "chiling", "diaohulishan", "dongzhuxianji", "suolianjia",
            ].indexOf(fallbackName) != -1) return "trick";
        }
        return null;
    }

    function safeValue(card, player) {
        try {
            var getter = runtimeGet();
            if (getter && getter.value) return getter.value(card, player);
        } catch (e) {}
        return 0;
    }

    function safeAttitude(player, target) {
        try {
            var getter = runtimeGet();
            if (getter && getter.attitude) return getter.attitude(player, target);
        } catch (e) {}
        return 0;
    }

    function isAlive(player) {
        if (!player) return false;
        try {
            if (player.isIn && player.isIn()) return true;
        } catch (e) {}
        return !!(player.name && typeof player.hp == "number" && player.hp > 0);
    }

    function playerDebugInfo(player) {
        if (!player) return null;
        return {
            name: player.name || null,
            name1: player.name1 || null,
            name2: player.name2 || null,
            key: playerKey(player),
            hp: player.hp,
            alive: isAlive(player),
        };
    }

    function cardDebugInfo(card) {
        if (!card) return null;
        var getter = runtimeGet();
        var position = null;
        try {
            if (getter && getter.position) position = getter.position(card, true);
        } catch (e) {}
        return {
            name: safeName(card) || card.name || null,
            type: safeType(card) || card.type || null,
            position: position,
            cardid: card.cardid || card.id || null,
            original: card.original || null,
        };
    }

    function cardsDebugInfo(cards) {
        var result = [];
        if (!cards || !cards.length) return result;
        for (var i = 0; i < cards.length; i++) {
            result.push(cardDebugInfo(cards[i]));
        }
        return result;
    }

    function debugLog(stage, data) {
        if (!DEBUG_WEI_SHIYUE) return;
        var payload = data || {};
        try {
            payload.stage = stage;
            payload.time = new Date().toISOString();
            globalThis.zusWeiDebugLogs = globalThis.zusWeiDebugLogs || [];
            globalThis.zusWeiDebugLogs.push(payload);
            if (globalThis.zusWeiDebugLogs.length > 80) globalThis.zusWeiDebugLogs.shift();
        } catch (e) {}
        try {
            if (globalThis.console && console.log) console.log("[薇誓约调试]", stage, payload);
        } catch (e2) {}
    }

    function playerKey(player) {
        if (!player) return null;
        return player.playerid || player.dataset && player.dataset.position || player.name1 || player.name || null;
    }

    function allPlayers() {
        var result = [];
        var add = function (list) {
            if (!list || !list.length) return;
            for (var i = 0; i < list.length; i++) {
                if (list[i] && result.indexOf(list[i]) == -1) result.push(list[i]);
            }
        };
        try {
            var currentGame = runtimeGame();
            add(currentGame && currentGame.players);
            add(currentGame && currentGame.dead);
            if (currentGame && currentGame.filterPlayer) add(currentGame.filterPlayer(function () { return true; }));
        } catch (e) {}
        return result;
    }

    function findPlayerByKey(key) {
        if (!key) return null;
        var players = allPlayers();
        for (var i = 0; i < players.length; i++) {
            var current = players[i];
            if (current == key) return current;
            if (playerKey(current) == key || current.name == key || current.name1 == key || current.name2 == key) return current;
        }
        return null;
    }

    function phaseUseEvent(event) {
        try {
            var phaseUse = event && event.getParent ? event.getParent("phaseUse") : null;
            if (phaseUse) return phaseUse;
        } catch (e) {}
        try {
            var status = globalThis._status || _status;
            return status && status.event && status.event.getParent ? status.event.getParent("phaseUse") : null;
        } catch (e2) {}
        return null;
    }

    function inPhaseUse(event, player) {
        var phaseUse = phaseUseEvent(event);
        if (phaseUse) return phaseUse.player == player;
        try {
            if (player && player.isPhaseUsing && player.isPhaseUsing()) return true;
        } catch (e) {}
        try {
            var status = globalThis._status || _status;
            if (status && status.currentPhase == player) return true;
        } catch (e2) {}
        return false;
    }

    function partner(player) {
        if (!player || !player.storage) return null;
        var target = player.storage.zus_shiyue_partner;
        if (isAlive(target)) return target;
        var key = player.storage.zus_shiyue_partner_key || player.storage.zus_shiyue_partner_id || playerKey(target);
        target = findPlayerByKey(key);
        return isAlive(target) ? target : null;
    }

    function hasPartnerRecord(player) {
        if (!player || !player.storage) return false;
        var target = player.storage.zus_shiyue_partner;
        return !!(target || player.storage.zus_shiyue_partner_key || player.storage.zus_shiyue_partner_id);
    }

    function setPartner(player, target) {
        if (!player || !target) return;
        var key = playerKey(target);
        if (window.Sync && Sync.setStorage) {
            Sync.setStorage(player, "zus_shiyue_partner", target);
            if (key) Sync.setStorage(player, "zus_shiyue_partner_key", key);
        } else {
            player.storage = player.storage || {};
            player.storage.zus_shiyue_partner = target;
            if (key) player.storage.zus_shiyue_partner_key = key;
            if (player.syncStorage) player.syncStorage("zus_shiyue_partner");
            if (key && player.syncStorage) player.syncStorage("zus_shiyue_partner_key");
        }
        if (player.addSkill) player.addSkill("zus_shiyue");
        if (player.markSkill) player.markSkill("zus_shiyue");
        debugLog("set_partner", {
            player: playerDebugInfo(player),
            target: playerDebugInfo(target),
            key: key,
        });
    }

    function countLongge(player) {
        try {
            if (player && player.countMark) return player.countMark("zus_changge_mark");
        } catch (e) {}
        return player && player.storage && typeof player.storage.zus_changge_mark == "number" ? player.storage.zus_changge_mark : 0;
    }

    function addLongge(player, num) {
        if (!player || !num) return;
        if (player.addMark) player.addMark("zus_changge_mark", num);
        else {
            player.storage = player.storage || {};
            player.storage.zus_changge_mark = (player.storage.zus_changge_mark || 0) + num;
            if (player.syncStorage) player.syncStorage("zus_changge_mark");
        }
        if (player.markSkill) player.markSkill("zus_changge_mark");
    }

    function removeLongge(player, num) {
        if (!player || !num) return;
        if (player.removeMark) player.removeMark("zus_changge_mark", num);
        else {
            player.storage = player.storage || {};
            player.storage.zus_changge_mark = Math.max(0, (player.storage.zus_changge_mark || 0) - num);
            if (player.syncStorage) player.syncStorage("zus_changge_mark");
        }
        if (player.markSkill) player.markSkill("zus_changge_mark");
    }

    function isTransferCard(event, player) {
        if (!event || !event.card) return false;
        var type = safeType(event.card, player);
        if (!inPhaseUse(event, player)) {
            try {
                if (!(player && player.hasSkill && player.hasSkill("zus_shiyue_effect"))) return false;
            } catch (e) {
                return false;
            }
        }
        return type == "basic" || type == "trick";
    }

    function eventCards(event) {
        var result = [];
        var add = function (cards) {
            if (!cards || !cards.length) return;
            for (var i = 0; i < cards.length; i++) {
                if (cards[i] && result.indexOf(cards[i]) == -1) result.push(cards[i]);
            }
        };
        add(event && event.cards);
        add(event && event.cards2);
        add(event && event.card && event.card.cards);
        if (!result.length) return result;
        try {
            if (result.filterInD) return result.filterInD("od");
        } catch (e) {}
        try {
            var getter = runtimeGet();
            if (getter && getter.position) {
                var filtered = [];
                for (var i = 0; i < result.length; i++) {
                    var position = getter.position(result[i], true);
                    if (position == "o" || position == "d") filtered.push(result[i]);
                }
                return filtered;
            }
        } catch (e2) {}
        return result;
    }

    function rawEventCards(event) {
        var result = [];
        var add = function (cards) {
            if (!cards || !cards.length) return;
            for (var i = 0; i < cards.length; i++) {
                if (cards[i] && result.indexOf(cards[i]) == -1) result.push(cards[i]);
            }
        };
        add(event && event.cards);
        add(event && event.cards2);
        add(event && event.card && event.card.cards);
        return result;
    }

    globalThis.zusWeiRuntimeGet = runtimeGet;
    globalThis.zusWeiRuntimeGame = runtimeGame;
    globalThis.zusWeiSafeName = safeName;
    globalThis.zusWeiSafeType = safeType;
    globalThis.zusWeiSafeValue = safeValue;
    globalThis.zusWeiSafeAttitude = safeAttitude;
    globalThis.zusWeiIsAlive = isAlive;
    globalThis.zusWeiDebugLog = debugLog;
    globalThis.zusWeiPlayerDebugInfo = playerDebugInfo;
    globalThis.zusWeiCardDebugInfo = cardDebugInfo;
    globalThis.zusWeiCardsDebugInfo = cardsDebugInfo;
    globalThis.zusWeiPlayerKey = playerKey;
    globalThis.zusWeiFindPlayerByKey = findPlayerByKey;
    globalThis.zusWeiPartner = partner;
    globalThis.zusWeiHasPartnerRecord = hasPartnerRecord;
    globalThis.zusWeiInPhaseUse = inPhaseUse;
    globalThis.zusWeiSetPartner = setPartner;
    globalThis.zusWeiCountLongge = countLongge;
    globalThis.zusWeiAddLongge = addLongge;
    globalThis.zusWeiRemoveLongge = removeLongge;
    globalThis.zusWeiIsTransferCard = isTransferCard;
    globalThis.zusWeiEventCards = eventCards;
    globalThis.zusWeiRawEventCards = rawEventCards;

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("wei", "runtimeGet", runtimeGet, { globalName: "zusWeiRuntimeGet", overwrite: true });
        Zus.bindHelper("wei", "runtimeGame", runtimeGame, { globalName: "zusWeiRuntimeGame", overwrite: true });
        Zus.bindHelper("wei", "safeName", safeName, { globalName: "zusWeiSafeName", overwrite: true });
        Zus.bindHelper("wei", "safeType", safeType, { globalName: "zusWeiSafeType", overwrite: true });
        Zus.bindHelper("wei", "safeValue", safeValue, { globalName: "zusWeiSafeValue", overwrite: true });
        Zus.bindHelper("wei", "safeAttitude", safeAttitude, { globalName: "zusWeiSafeAttitude", overwrite: true });
        Zus.bindHelper("wei", "isAlive", isAlive, { globalName: "zusWeiIsAlive", overwrite: true });
        Zus.bindHelper("wei", "debugLog", debugLog, { globalName: "zusWeiDebugLog", overwrite: true });
        Zus.bindHelper("wei", "playerDebugInfo", playerDebugInfo, { globalName: "zusWeiPlayerDebugInfo", overwrite: true });
        Zus.bindHelper("wei", "cardDebugInfo", cardDebugInfo, { globalName: "zusWeiCardDebugInfo", overwrite: true });
        Zus.bindHelper("wei", "cardsDebugInfo", cardsDebugInfo, { globalName: "zusWeiCardsDebugInfo", overwrite: true });
        Zus.bindHelper("wei", "playerKey", playerKey, { globalName: "zusWeiPlayerKey", overwrite: true });
        Zus.bindHelper("wei", "findPlayerByKey", findPlayerByKey, { globalName: "zusWeiFindPlayerByKey", overwrite: true });
        Zus.bindHelper("wei", "partner", partner, { globalName: "zusWeiPartner", overwrite: true });
        Zus.bindHelper("wei", "hasPartnerRecord", hasPartnerRecord, { globalName: "zusWeiHasPartnerRecord", overwrite: true });
        Zus.bindHelper("wei", "inPhaseUse", inPhaseUse, { globalName: "zusWeiInPhaseUse", overwrite: true });
        Zus.bindHelper("wei", "setPartner", setPartner, { globalName: "zusWeiSetPartner", overwrite: true });
        Zus.bindHelper("wei", "countLongge", countLongge, { globalName: "zusWeiCountLongge", overwrite: true });
        Zus.bindHelper("wei", "addLongge", addLongge, { globalName: "zusWeiAddLongge", overwrite: true });
        Zus.bindHelper("wei", "removeLongge", removeLongge, { globalName: "zusWeiRemoveLongge", overwrite: true });
        Zus.bindHelper("wei", "isTransferCard", isTransferCard, { globalName: "zusWeiIsTransferCard", overwrite: true });
        Zus.bindHelper("wei", "eventCards", eventCards, { globalName: "zusWeiEventCards", overwrite: true });
        Zus.bindHelper("wei", "rawEventCards", rawEventCards, { globalName: "zusWeiRawEventCards", overwrite: true });
    }

    window.zusfylriModules["wei"] = {
        key: "wei",
        character: {
            zus_wei: char("female", "zus_group_huan", 3, ["zus_changge"], "zus_wei", "png"),
        },
        skill: {
            zus_changge: {
                limited: true,
                skillAnimation: true,
                animationColor: "thunder",
                derivation: "zus_shiyue",
                trigger: { player: "phaseBegin" },
                direct: true,
                filter: function (event, player) {
                    if (!player || player.storage && player.storage.zus_changge_used) return false;
                    var currentGame = globalThis.zusWeiRuntimeGame && globalThis.zusWeiRuntimeGame();
                    if (currentGame && currentGame.hasPlayer) {
                        return currentGame.hasPlayer(function (current) {
                            return current != player && globalThis.zusWeiIsAlive(current);
                        });
                    }
                    return true;
                },
                content: function () {
                    "step 0"
                    globalThis.zusWeiChanggeAiPlayer = player;
                    player.chooseTarget("长歌：选择一名其他角色，与其各获得“誓约”", function (card, player, target) {
                        return target != player && globalThis.zusWeiIsAlive(target);
                    }).set("ai", function (target) {
                        var source = globalThis.zusWeiChanggeAiPlayer;
                        return source ? globalThis.zusWeiSafeAttitude(source, target) + 1 : 0;
                    });

                    "step 1"
                    globalThis.zusWeiChanggeAiPlayer = null;
                    if (!result.bool || !result.targets || !result.targets.length) {
                        event.finish();
                        return;
                    }
                    event.target = result.targets[0];
                    player.storage = player.storage || {};
                    player.storage.zus_changge_used = true;
                    if (player.syncStorage) player.syncStorage("zus_changge_used");
                    if (player.awakenSkill) player.awakenSkill("zus_changge");
                    player.logSkill("zus_changge", event.target);
                    globalThis.zusWeiSetPartner(player, event.target);
                    globalThis.zusWeiSetPartner(event.target, player);
                    if (player.recover) player.recover();
                    if (event.target.recover) event.target.recover();
                    globalThis.zusWeiAddLongge(player, 2);
                    globalThis.zusWeiAddLongge(event.target, 2);
                },
                ai: {
                    expose: 0.2,
                },
            },

            zus_changge_mark: {
                charlotte: true,
                mark: true,
                marktext: "歌",
                intro: {
                    name: "长歌",
                    content: "mark",
                },
            },

            zus_shiyue: {
                charlotte: true,
                mark: true,
                marktext: "约",
                intro: {
                    content: function (storage, player) {
                        var target = globalThis.zusWeiPartner(player);
                        var name = target && target.name ? (globalThis.zusWeiRuntimeGet() && globalThis.zusWeiRuntimeGet().translation ? globalThis.zusWeiRuntimeGet().translation(target) : target.name) : "无";
                        return "誓约对方：" + name + "；长歌数：" + globalThis.zusWeiCountLongge(player);
                    },
                },
                group: ["zus_shiyue_gain", "zus_shiyue_start", "zus_shiyue_damage"],
            },

            zus_shiyue_gain: {
                trigger: { player: "phaseJieshuBegin" },
                forced: true,
                filter: function (event, player) {
                    return !!globalThis.zusWeiHasPartnerRecord(player);
                },
                content: function () {
                    globalThis.zusWeiAddLongge(player, 1);
                },
            },

            zus_shiyue_start: {
                trigger: { player: "phaseUseBegin" },
                direct: true,
                filter: function (event, player) {
                    return !!(globalThis.zusWeiPartner(player) && globalThis.zusWeiCountLongge(player) > 0);
                },
                content: function () {
                    "step 0"
                    event.target = globalThis.zusWeiPartner(player);
                    event.count = Math.max(0, globalThis.zusWeiCountLongge(player));
                    globalThis.zusWeiShiyueAiPlayer = player;
                    player.chooseBool("是否移去1枚“长歌”，令本阶段前" + event.count + "张基本牌或非延时锦囊牌结算后交给誓约对方？").set("ai", function () {
                        var source = globalThis.zusWeiShiyueAiPlayer;
                        var target = globalThis.zusWeiPartner(source);
                        return !!(source && target && globalThis.zusWeiSafeAttitude(source, target) >= 0);
                    });

                    "step 1"
                    globalThis.zusWeiShiyueAiPlayer = null;
                    if (!result.bool || !event.target) {
                        event.finish();
                        return;
                    }
                    player.logSkill("zus_shiyue", event.target);
                    globalThis.zusWeiRemoveLongge(player, 1);
                    if (event.count <= 0) {
                        event.finish();
                        return;
                    }
                    if (window.Sync && Sync.setStorage) {
                        Sync.setStorage(player, "zus_shiyue_effect_partner", event.target);
                        Sync.setStorage(player, "zus_shiyue_effect_limit", event.count);
                        Sync.setStorage(player, "zus_shiyue_effect_count", 0);
                    } else {
                        player.storage = player.storage || {};
                        player.storage.zus_shiyue_effect_partner = event.target;
                        player.storage.zus_shiyue_effect_limit = event.count;
                        player.storage.zus_shiyue_effect_count = 0;
                    }
                    player.addTempSkill("zus_shiyue_effect", { player: "phaseUseEnd" });
                    globalThis.zusWeiDebugLog("shiyue_start_enabled", {
                        player: globalThis.zusWeiPlayerDebugInfo(player),
                        target: globalThis.zusWeiPlayerDebugInfo(event.target),
                        count: event.count,
                        longge_after_remove: globalThis.zusWeiCountLongge(player),
                        storage_partner_key: player.storage && player.storage.zus_shiyue_partner_key,
                    });
                },
            },

            zus_shiyue_effect: {
                charlotte: true,
                trigger: { player: ["useCardAfter", "respondAfter"] },
                forced: true,
                popup: false,
                filter: function (event, player) {
                    var storage = player && player.storage;
                    if (!storage || !storage.zus_shiyue_effect_limit) return false;
                    var rawCards = globalThis.zusWeiRawEventCards(event);
                    var cards = globalThis.zusWeiEventCards(event);
                    var target = globalThis.zusWeiPartner(player);
                    var count = storage.zus_shiyue_effect_count || 0;
                    var limit = storage.zus_shiyue_effect_limit || 0;
                    var cardType = globalThis.zusWeiSafeType(event && event.card, player);
                    var inPhase = globalThis.zusWeiInPhaseUse(event, player);
                    var transfer = globalThis.zusWeiIsTransferCard(event, player);
                    var pass = count < limit && !!target && transfer && cards.length > 0;
                    globalThis.zusWeiDebugLog("shiyue_effect_filter", {
                        pass: pass,
                        player: globalThis.zusWeiPlayerDebugInfo(player),
                        target: globalThis.zusWeiPlayerDebugInfo(target),
                        event_name: event && event.name,
                        triggername: event && event.triggername,
                        card: globalThis.zusWeiCardDebugInfo(event && event.card),
                        raw_cards: globalThis.zusWeiCardsDebugInfo(rawCards),
                        gainable_cards: globalThis.zusWeiCardsDebugInfo(cards),
                        count: count,
                        limit: limit,
                        has_target: !!target,
                        card_type: cardType,
                        transfer: transfer,
                        in_phase_use: inPhase,
                        storage_partner_key: storage.zus_shiyue_partner_key,
                    });
                    return pass;
                },
                content: function () {
                    var target = globalThis.zusWeiPartner(player);
                    var rawCards = globalThis.zusWeiRawEventCards(trigger);
                    var cards = globalThis.zusWeiEventCards(trigger);
                    if (!target || !cards.length) {
                        globalThis.zusWeiDebugLog("shiyue_effect_abort", {
                            player: globalThis.zusWeiPlayerDebugInfo(player),
                            target: globalThis.zusWeiPlayerDebugInfo(target),
                            raw_cards: globalThis.zusWeiCardsDebugInfo(rawCards),
                            gainable_cards: globalThis.zusWeiCardsDebugInfo(cards),
                            reason: target ? "no_gainable_cards" : "no_target",
                        });
                        event.finish();
                        return;
                    }
                    var count = (player.storage.zus_shiyue_effect_count || 0) + 1;
                    if (window.Sync && Sync.setStorage) Sync.setStorage(player, "zus_shiyue_effect_count", count);
                    else {
                        player.storage.zus_shiyue_effect_count = count;
                        if (player.syncStorage) player.syncStorage("zus_shiyue_effect_count");
                    }
                    globalThis.zusWeiDebugLog("shiyue_effect_gain_before", {
                        player: globalThis.zusWeiPlayerDebugInfo(player),
                        target: globalThis.zusWeiPlayerDebugInfo(target),
                        raw_cards: globalThis.zusWeiCardsDebugInfo(rawCards),
                        gainable_cards: globalThis.zusWeiCardsDebugInfo(cards),
                        count: count,
                        limit: player.storage && player.storage.zus_shiyue_effect_limit,
                    });
                    target.gain(cards, "gain2", "log");
                    globalThis.zusWeiDebugLog("shiyue_effect_gain_called", {
                        player: globalThis.zusWeiPlayerDebugInfo(player),
                        target: globalThis.zusWeiPlayerDebugInfo(target),
                        cards: globalThis.zusWeiCardsDebugInfo(cards),
                        count: count,
                    });
                },
                onremove: function (player) {
                    if (globalThis.zusWeiDebugLog) {
                        globalThis.zusWeiDebugLog("shiyue_effect_onremove", {
                            player: globalThis.zusWeiPlayerDebugInfo(player),
                            count: player && player.storage && player.storage.zus_shiyue_effect_count,
                            limit: player && player.storage && player.storage.zus_shiyue_effect_limit,
                            partner_key: player && player.storage && player.storage.zus_shiyue_partner_key,
                        });
                    }
                    if (!player) return;
                    if (window.Sync && Sync.deleteStorage) {
                        Sync.deleteStorage(player, "zus_shiyue_effect_partner");
                        Sync.deleteStorage(player, "zus_shiyue_effect_limit");
                        Sync.deleteStorage(player, "zus_shiyue_effect_count");
                    } else if (player.storage) {
                        delete player.storage.zus_shiyue_effect_partner;
                        delete player.storage.zus_shiyue_effect_limit;
                        delete player.storage.zus_shiyue_effect_count;
                    }
                },
            },

            zus_shiyue_damage: {
                trigger: { player: "damageBegin4" },
                direct: true,
                filter: function (event, player) {
                    return !!(event && !event.numFixed && event.num > 0 && globalThis.zusWeiCountLongge(player) > 0);
                },
                content: function () {
                    "step 0"
                    globalThis.zusWeiShiyueDamageAiPlayer = player;
                    globalThis.zusWeiShiyueDamageAiNum = trigger && trigger.num || 1;
                    player.chooseBool("誓约：是否移去1枚“长歌”，令此伤害-1？").set("ai", function () {
                        var source = globalThis.zusWeiShiyueDamageAiPlayer;
                        var num = globalThis.zusWeiShiyueDamageAiNum || 1;
                        if (!source) return false;
                        if (source.hp && num >= source.hp) return true;
                        return globalThis.zusWeiCountLongge(source) > 1;
                    });

                    "step 1"
                    globalThis.zusWeiShiyueDamageAiPlayer = null;
                    globalThis.zusWeiShiyueDamageAiNum = null;
                    if (!result.bool) {
                        event.finish();
                        return;
                    }
                    player.logSkill("zus_shiyue");
                    globalThis.zusWeiRemoveLongge(player, 1);
                    trigger.num--;
                },
            },
        },
        translate: {
            zus_wei: "薇",
            zus_wei_ab: "薇",
            zus_changge: "长歌",
            zus_changge_info: "限定技。回合开始时，你可以选择场上1名其他角色，你与其各获得“誓约”，各恢复1点体力，各获得两枚“长歌”。",
            zus_changge_mark: "长歌",
            zus_shiyue: "誓约",
            zus_shiyue_info: "回合结束时，你获得1枚“长歌”。出牌阶段开始时，你可以移去1枚“长歌”，令本阶段内你使用或打出的前X张基本牌或非延时类锦囊牌结算完成后立即置入誓约对方的手牌。当你受到伤害时，你可以移去1枚“长歌”，令此伤害-1。（X为你的“长歌”数）",
            zus_shiyue_gain: "誓约",
            zus_shiyue_start: "誓约",
            zus_shiyue_effect: "誓约",
            zus_shiyue_damage: "誓约",
        },
        title: {
            zus_wei: "吹落血",
        },
        sort: ["zus_wei"],
    };
})();
