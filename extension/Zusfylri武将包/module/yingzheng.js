(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = "Zusfylri\u6b66\u5c06\u5305";

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function zlib() {
        return globalThis.lib || lib;
    }

    function zgame() {
        return globalThis.game || game;
    }

    function zui() {
        return globalThis.ui || ui;
    }

    function getCardPileNodes() {
        var currentUi = zui();
        if (currentUi && currentUi.cardPile && currentUi.cardPile.childNodes) {
            return Array.from(currentUi.cardPile.childNodes);
        }
        try {
            var pile = document.querySelector("#cardPile");
            if (pile && pile.childNodes) {
                return Array.from(pile.childNodes);
            }
        } catch (e) {
        }
        return [];
    }

    function getCardPileMeta() {
        var currentUi = zui();
        var currentPile = currentUi && currentUi.cardPile ? currentUi.cardPile : null;
        var topUi = null;
        var topPile = null;
        var domPile = null;
        try {
            topUi = window && window.top && window.top.ui ? window.top.ui : null;
            topPile = topUi && topUi.cardPile ? topUi.cardPile : null;
        } catch (e) {
        }
        try {
            domPile = document.querySelector("#cardPile");
        } catch (e2) {
        }
        return {
            currentUiExists: !!currentUi,
            currentPileExists: !!currentPile,
            currentPileCount: currentPile && currentPile.childNodes ? currentPile.childNodes.length : 0,
            currentPileId: currentPile && currentPile.id ? currentPile.id : null,
            currentPileClass: currentPile && currentPile.className ? String(currentPile.className) : null,
            topUiExists: !!topUi,
            topPileExists: !!topPile,
            topPileCount: topPile && topPile.childNodes ? topPile.childNodes.length : 0,
            topPileId: topPile && topPile.id ? topPile.id : null,
            topPileClass: topPile && topPile.className ? String(topPile.className) : null,
            domPileExists: !!domPile,
            domPileCount: domPile && domPile.childNodes ? domPile.childNodes.length : 0,
            domPileId: domPile && domPile.id ? domPile.id : null,
            domPileClass: domPile && domPile.className ? String(domPile.className) : null,
        };
    }

    function appendXiaodiDebug(debug) {
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (!req) return;
            var fs = req("fs");
            fs.appendFileSync(
                "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/yingzheng_xiaodi_debug.log",
                JSON.stringify(debug) + "\n",
                "utf8"
            );
        } catch (e) {
        }
    }

    function writeXiaodiDebug(debug) {
        if (!debug) return;
        if (!debug.timestamp) debug.timestamp = Date.now();
        globalThis.zusYingzhengXiaodiDebug = debug;
        appendXiaodiDebug(debug);
        try {
            localStorage.setItem("zus_yingzheng_xiaodi_debug", JSON.stringify(debug));
        } catch (e) {
        }
    }

    function appendYimieAiDebug(debug) {
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (!req) return;
            var fs = req("fs");
            fs.appendFileSync(
                "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/yingzheng_yimie_ai_debug.log",
                JSON.stringify(debug) + "\n",
                "utf8"
            );
        } catch (e) {
        }
    }

    function safePlayerInfo(player) {
        if (!player) return null;
        var getter = zget();
        var translated = null;
        try {
            if (getter && getter.translation) translated = getter.translation(player);
        } catch (e) {
        }
        return {
            name: player.name || null,
            name1: player.name1 || null,
            name2: player.name2 || null,
            translated: translated,
            hp: typeof player.hp == "number" ? player.hp : null,
            maxHp: typeof player.maxHp == "number" ? player.maxHp : null,
            hand: player.countCards ? player.countCards("h") : null,
            equip: player.countCards ? player.countCards("e") : null,
            inGame: !!(!player.isIn || player.isIn()),
        };
    }

    function yimieCardInfo(card, player) {
        if (!card) return null;
        return {
            name: safeName(card, player) || card.name || null,
            suit: card.suit || null,
            number: card.number || null,
            color: safeColor(card, player) || null,
        };
    }

    function writeYimieAiDebug(stage, data) {
        var debug = data || {};
        debug.stage = stage;
        debug.timestamp = Date.now();
        globalThis.zusYingzhengYimieAiDebug = debug;
        appendYimieAiDebug(debug);
        try {
            localStorage.setItem("zus_yingzheng_yimie_ai_debug", JSON.stringify(debug));
        } catch (e) {
        }
    }

    function zget() {
        return globalThis.get || get;
    }

    function getCardListData() {
        var runtimeLib = zlib();
        if (runtimeLib && runtimeLib.card && Array.isArray(runtimeLib.card.list)) {
            return runtimeLib.card.list.slice(0);
        }
        return [];
    }

    function createCardFromData(data) {
        if (!data || data.length < 3) return null;
        var runtimeGame = zgame();
        if (!runtimeGame) return null;
        if (runtimeGame.createCard2) {
            return runtimeGame.createCard2(data[2], data[0], data[1], data[3]);
        }
        if (runtimeGame.createCard) {
            return runtimeGame.createCard(data[2], data[0], data[1], data[3]);
        }
        return null;
    }

    function removeDeckCardsByName(name) {
        if (!name) return 0;
        var removeByName = function (cardName) {
            var currentLib = globalThis.lib || (typeof lib != "undefined" ? lib : null);
            var currentUi = globalThis.ui || (typeof ui != "undefined" ? ui : null);
            var removed = 0;
            if (currentLib && currentLib.card && Array.isArray(currentLib.card.list)) {
                for (var i = 0; i < currentLib.card.list.length; i++) {
                    if (currentLib.card.list[i] && currentLib.card.list[i][2] == cardName) {
                        currentLib.card.list.splice(i--, 1);
                        removed++;
                    }
                }
            }
            try {
                if (currentUi && currentUi.cardPile && currentUi.cardPile.childNodes) {
                    var toRemove = [];
                    for (var j = 0; j < currentUi.cardPile.childNodes.length; j++) {
                        var card = currentUi.cardPile.childNodes[j];
                        if (card && card.name == cardName) toRemove.push(card);
                    }
                    for (var k = 0; k < toRemove.length; k++) {
                        var current = toRemove[k];
                        if (!current) continue;
                        if (current.fix) current.fix();
                        if (currentUi.special) currentUi.special.appendChild(current);
                        else if (current.remove) current.remove();
                        else if (current.parentNode) current.parentNode.removeChild(current);
                    }
                }
            } catch (e) {
            }
            return removed;
        };
        var runtimeGame = zgame();
        if (runtimeGame && typeof runtimeGame.broadcastAll == "function") {
            return runtimeGame.broadcastAll(removeByName, name) || 0;
        }
        return removeByName(name);
    }

    function safeName(card, player) {
        var getter = zget();
        try {
            return window.Zus && Zus.safeName ? Zus.safeName(card, player) : getter.name(card, player);
        } catch (e) {
        }
        return card && card.name || null;
    }

    function safeColor(card, player) {
        var getter = zget();
        try {
            var color = getter.color(card, player);
            if (color) return color;
        } catch (e) {
        }
        var suit = null;
        try {
            suit = getter.suit(card, player);
        } catch (e2) {
        }
        if (!suit && card) {
            suit = card.suit || (card.storage && card.storage.suit) || null;
        }
        if (suit == "heart" || suit == "diamond") return "red";
        if (suit == "spade" || suit == "club") return "black";
        return null;
    }

    function fallbackCardInfo(card, field) {
        if (!card) return null;
        if (card[field]) return card[field];
        var name = card.name || safeName(card);
        if (!name) return null;
        try {
            var info = zlib() && zlib().card ? zlib().card[name] : null;
            if (info && info[field]) return info[field];
        } catch (e) {
        }
        return null;
    }

    function safeType(card, player) {
        var getter = zget();
        try {
            var type = getter.type(card, player);
            if (type) return type;
        } catch (e) {
        }
        try {
            var type2 = getter.type2 ? getter.type2(card, player) : null;
            if (type2) return type2;
        } catch (e2) {
        }
        return fallbackCardInfo(card, "type");
    }

    function safeSubtype(card, player) {
        var getter = zget();
        try {
            var subtype = window.Zus && Zus.safeSubtype ? Zus.safeSubtype(card) : getter.subtype(card, player);
            if (subtype) return subtype;
        } catch (e) {
        }
        return fallbackCardInfo(card, "subtype");
    }

    function shaTargetEnabled(card, player, target) {
        if (!player || !target || target == player) return false;
        if (target.isIn && !target.isIn()) return false;
        var virtualCard = card || { name: "sha", isCard: true };
        try {
            if (typeof player.canUse == "function" && !player.canUse(virtualCard, target)) return false;
        } catch (e) {
            return false;
        }
        try {
            var runtimeLib = globalThis.lib || lib;
            if (runtimeLib && runtimeLib.filter) {
                if (runtimeLib.filter.targetEnabled && !runtimeLib.filter.targetEnabled(virtualCard, player, target)) return false;
                if (runtimeLib.filter.targetInRange && !runtimeLib.filter.targetInRange(virtualCard, player, target)) return false;
            }
        } catch (e3) {
            return false;
        }
        return true;
    }

    function yimieTargetValue(player, target) {
        if (!shaTargetEnabled({ name: "sha", isCard: true }, player, target)) return 0;
        var getter = globalThis.get || get;
        var shas = player && player.getCards
            ? player.getCards("h", function (card) {
                return globalThis.zusYingzhengSafeName(card, player) == "sha";
            })
            : [];
        var x = shas.length;
        if (!x) return 0;

        var attitude = 0;
        try {
            attitude = getter && getter.attitude ? getter.attitude(player, target) : 0;
        } catch (e0) {
            attitude = 0;
        }
        if (attitude >= 0) return 0;

        var effect = 0;
        try {
            effect = getter && getter.effect ? getter.effect(target, { name: "sha", isCard: true }, player, player) : 0;
        } catch (e) {
            effect = 0;
        }

        var value = effect > 0 ? effect : Math.max(0.8, Math.min(2.5, -attitude / 3));
        var handCount = 0;
        try {
            handCount = target.countCards ? target.countCards("h") : 0;
        } catch (e2) {
            handCount = 0;
        }
        if (handCount >= x) value += 1.5; // 不能闪
        if (handCount <= x) value += Math.max(1.2, x * 0.8); // 伤害改为x
        if (target.hp && target.hp <= x) value += 1.2;
        if (x >= 2) value += 0.5;
        if (x >= 3) value += 0.8;
        return value;
    }

    function isBannedEquip(card, banned, player) {
        if (!card || !banned || !banned.length) return false;
        var name = safeName(card, player);
        var subtype = safeSubtype(card, player);
        for (var i = 0; i < banned.length; i++) {
            if (banned[i].name == name && banned[i].subtype == subtype) {
                return true;
            }
        }
        return false;
    }

    function getReplaceCard(banned, player) {
        var z_game = zgame();
        var pileData = getCardListData();
        if (!pileData.length) {
            return null;
        }

        var list = [];
        for (var i = 0; i < pileData.length; i++) {
            var card = createCardFromData(pileData[i]);
            if (!card) continue;
            if (isBannedEquip(card, banned, player)) continue;
            list.push({
                data: pileData[i],
                card: card,
            });
        }

        if (!list.length) return null;
        var choice = null;
        if (typeof RNG != "undefined" && RNG.randomGet) choice = RNG.randomGet(list);
        else if (list.randomGet) choice = list.randomGet();
        else if (z_game && typeof z_game.random == "function") choice = list[z_game.random(list.length)];
        else choice = list[0];
        if (!choice) return null;
        var runtimeLib = zlib();
        if (runtimeLib && runtimeLib.card && Array.isArray(runtimeLib.card.list)) {
            for (var j = 0; j < runtimeLib.card.list.length; j++) {
                var current = runtimeLib.card.list[j];
                if (
                    current &&
                    current[0] == choice.data[0] &&
                    current[1] == choice.data[1] &&
                    current[2] == choice.data[2] &&
                    current[3] == choice.data[3]
                ) {
                    runtimeLib.card.list.splice(j, 1);
                    break;
                }
            }
        }
        return choice.card;
    }

    function collectEquipPools(player) {
        var z_game = zgame();
        var weaponPool = [];
        var armorPool = [];
        var pileNodes = getCardPileNodes();

        for (var i = 0; i < pileNodes.length; i++) {
            var pileCard = pileNodes[i];
            if (!pileCard) continue;
            if (safeType(pileCard, player) != "equip") continue;
            var pileSubtype = safeSubtype(pileCard, player);
            if (pileSubtype == "equip1") weaponPool.push(pileCard);
            else if (pileSubtype == "equip2") armorPool.push(pileCard);
        }

        var players = window.Zus && Zus.players ? Zus.players().slice(0) : (z_game && z_game.players ? z_game.players.slice(0) : []);
        if (z_game && z_game.dead && z_game.dead.length) {
            players = players.concat(z_game.dead);
        }

        for (var j = 0; j < players.length; j++) {
            var current = players[j];
            if (!current) continue;

            var cards = current.getCards ? current.getCards("h") : [];
            if (current.getExpansions) {
                cards = cards.concat(current.getExpansions());
            }

            for (var k = 0; k < cards.length; k++) {
                var card = cards[k];
                if (!card) continue;
                if (safeType(card, current) != "equip") continue;
                var subtype = safeSubtype(card, current);
                if (subtype == "equip1") weaponPool.push(card);
                else if (subtype == "equip2") armorPool.push(card);
            }
        }

        return {
            weaponPool: weaponPool,
            armorPool: armorPool,
        };
    }

    globalThis.zusYingzhengSafeName = safeName;
    globalThis.zusYingzhengSafeColor = safeColor;
    globalThis.zusYingzhengSafeType = safeType;
    globalThis.zusYingzhengSafeSubtype = safeSubtype;
    globalThis.zusYingzhengShaTargetEnabled = shaTargetEnabled;
    globalThis.zusYingzhengYimieTargetValue = yimieTargetValue;
    globalThis.zusYingzhengIsBannedEquip = isBannedEquip;
    globalThis.zusYingzhengGetReplaceCard = getReplaceCard;
    globalThis.zusYingzhengCollectEquipPools = collectEquipPools;
    globalThis.zusYingzhengGetCardPileNodes = getCardPileNodes;
    globalThis.zusYingzhengGetCardPileMeta = getCardPileMeta;
    globalThis.zusYingzhengGetCardListData = getCardListData;
    globalThis.zusYingzhengCreateCardFromData = createCardFromData;
    globalThis.zusYingzhengRemoveDeckCardsByName = removeDeckCardsByName;
    globalThis.zusWriteYingzhengXiaodiDebug = writeXiaodiDebug;
    globalThis.zusYingzhengSafePlayerInfo = safePlayerInfo;
    globalThis.zusYingzhengYimieCardInfo = yimieCardInfo;
    globalThis.zusWriteYingzhengYimieAiDebug = writeYimieAiDebug;
    writeXiaodiDebug({
        stage: "xiaodi_module_loaded",
        extName: EXT_NAME,
    });

    window.zusfylriModules["yingzheng"] = {
        key: "yingzheng",

        character: {
            zus_yingzheng: char(
                "male",
                "shen",
                4,
                ["zus_xiaodi", "zus_yimie", "zus_huangdao"],
                "zus_yingzheng",
                "png",
                ["zhu"]
            ),
        },

        skill: {
            zus_xiaodi: {
                group: "zus_xiaodi_probe",
                audio: "ext:Zusfylri武将包/audio/skill/skill_yingzheng/xiaodi.mp3",
                trigger: {
                    global: ["phaseBefore", "gameStart"],
                    player: "enterGame",
                },
                forced: true,
                locked: true,
                unique: true,
                priority: 99999,
                init: function (player) {
                    try {
                        globalThis.zusWriteYingzhengXiaodiDebug({
                            stage: "xiaodi_init",
                            player: player && player.name,
                            skills: player && player.getSkills ? player.getSkills(null, false, false).slice(0) : [],
                            additionalSkills: player && player.additionalSkills ? player.additionalSkills : null,
                            phaseNumber: (globalThis.game || game) && (globalThis.game || game).phaseNumber,
                        });
                    } catch (e) {
                    }
                },

                filter: function (event, player) {
                    if (player.storage && player.storage.zus_xiaodi_done) return false;
                    var currentGame = globalThis.game || game;
                    if (event && event.name == "phase") {
                        if (!currentGame || currentGame.phaseNumber !== 0) return false;
                    }
                    try {
                        globalThis.zusWriteYingzhengXiaodiDebug({
                            stage: "xiaodi_filter",
                            eventName: event && event.name,
                            phaseNumber: currentGame && currentGame.phaseNumber,
                            player: player && player.name,
                            done: !!(player.storage && player.storage.zus_xiaodi_done),
                        });
                    } catch (e) {
                    }
                    return true;
                },

                content: function () {
                    "step 0"
                    var zus_ui = globalThis.ui || ui;
                    var zus_game = globalThis.game || game;
                    var zus_get = globalThis.get || get;
                    event.weaponPool = [];
                    event.armorPool = [];
                    event.weaponButtons = [];
                    event.armorButtons = [];
                    event.banned = [];
                    event.cardCreateFailCount = 0;
                    event.cardCreateFailSamples = [];
                    try {
                        var runtimeLib = globalThis.lib || lib;
                        var pileData =
                            runtimeLib && runtimeLib.card && Array.isArray(runtimeLib.card.list)
                                ? runtimeLib.card.list.slice(0)
                                : [];
                        event.rawEquipSamples = [];
                        event.cardListCount = pileData.length;
                        event.cardListSamples = pileData.slice(0, 12).map(function (item) {
                            return item ? item.slice ? item.slice(0, 4) : item : item;
                        });
                        for (var pi = 0; pi < pileData.length; pi++) {
                            var pileItem = pileData[pi];
                            if (!pileItem || pileItem.length < 3) continue;
                            var pileName = pileItem[2];
                            var pileInfo = runtimeLib && runtimeLib.card ? runtimeLib.card[pileName] : null;
                            var pileType = pileInfo && pileInfo.type ? pileInfo.type : null;
                            var pileSubtype = pileInfo && pileInfo.subtype ? pileInfo.subtype : null;
                            if (pileType != "equip") continue;
                            if (event.rawEquipSamples.length < 12) {
                                event.rawEquipSamples.push({
                                    name: pileName,
                                    subtype: pileSubtype,
                                });
                            }
                            var pileCard = null;
                            if (zus_game && zus_game.createCard2) {
                                pileCard = zus_game.createCard2(pileItem[2], pileItem[0], pileItem[1], pileItem[3]);
                            } else if (zus_game && zus_game.createCard) {
                                pileCard = zus_game.createCard(pileItem[2], pileItem[0], pileItem[1], pileItem[3]);
                            } else if (globalThis.zusYingzhengCreateCardFromData) {
                                pileCard = globalThis.zusYingzhengCreateCardFromData(pileItem);
                            }
                            if (!pileCard) {
                                event.cardCreateFailCount++;
                                if (event.cardCreateFailSamples.length < 12) {
                                    event.cardCreateFailSamples.push({
                                        name: pileName,
                                        subtype: pileSubtype,
                                        raw: pileItem.slice ? pileItem.slice(0, 4) : pileItem,
                                    });
                                }
                            }
                            if (!pileCard) continue;
                            pileCard.name = pileName;
                            pileCard.subtype = pileSubtype;
                            pileCard.type = pileType;
                            if (!pileCard.suit) pileCard.suit = pileItem[0];
                            if (!pileCard.number) pileCard.number = pileItem[1];
                            if (pileSubtype == "equip1") event.weaponPool.push(pileCard);
                            else if (pileSubtype == "equip2") event.armorPool.push(pileCard);
                        }

                        var allPlayers = window.Zus && Zus.players
                            ? Zus.players().slice(0)
                            : (zus_game && zus_game.players ? zus_game.players.slice(0) : []);
                        if (zus_game && zus_game.dead && zus_game.dead.length) {
                            allPlayers = allPlayers.concat(zus_game.dead);
                        }
                        for (var ap = 0; ap < allPlayers.length; ap++) {
                            var current = allPlayers[ap];
                            if (!current) continue;
                            var cards = current.getCards ? current.getCards("h") : [];
                            if (current.getExpansions) cards = cards.concat(current.getExpansions());
                            for (var ci = 0; ci < cards.length; ci++) {
                                var card = cards[ci];
                                if (!card) continue;
                                if (globalThis.zusYingzhengSafeType(card, current) != "equip") continue;
                                var subtype = globalThis.zusYingzhengSafeSubtype(card, current);
                                if (subtype == "equip1") event.weaponPool.push(card);
                                else if (subtype == "equip2") event.armorPool.push(card);
                            }
                        }
                    } catch (e) {
                        try {
                            globalThis.zusWriteYingzhengXiaodiDebug({
                                stage: "xiaodi_step0_error",
                                player: player && player.name,
                                error: e && e.message ? e.message : String(e),
                                stack: e && e.stack ? String(e.stack) : null,
                            });
                        } catch (e2) {
                        }
                        event.finish();
                        return;
                    }
                    try {
                        globalThis.zusWriteYingzhengXiaodiDebug({
                            stage: "xiaodi_step0_begin",
                            player: player && player.name,
                            cardListCount: event.cardListCount,
                            cardListSamples: event.cardListSamples,
                            rawEquipSamples: event.rawEquipSamples,
                            cardCreateFailCount: event.cardCreateFailCount,
                            cardCreateFailSamples: event.cardCreateFailSamples,
                            weaponPoolCount: event.weaponPool.length,
                            armorPoolCount: event.armorPool.length,
                            pileCount: globalThis.zusYingzhengGetCardPileNodes
                                ? globalThis.zusYingzhengGetCardPileNodes().length
                                : 0,
                        });
                    } catch (e) {
                    }
                    if (!event.weaponPool.length && !event.armorPool.length) {
                        try {
                            globalThis.zusWriteYingzhengXiaodiDebug({
                                stage: "xiaodi_step0_empty",
                                player: player && player.name,
                                cardListCount: event.cardListCount,
                                cardListSamples: event.cardListSamples,
                                rawEquipSamples: event.rawEquipSamples,
                                cardCreateFailCount: event.cardCreateFailCount,
                                cardCreateFailSamples: event.cardCreateFailSamples,
                                pileMeta: globalThis.zusYingzhengGetCardPileMeta
                                    ? globalThis.zusYingzhengGetCardPileMeta()
                                    : null,
                                libMeta: {
                                    hasLib: !!(globalThis.lib || lib),
                                    hasCard: !!((globalThis.lib || lib) && (globalThis.lib || lib).card),
                                    hasCardList: !!((globalThis.lib || lib) && (globalThis.lib || lib).card && Array.isArray((globalThis.lib || lib).card.list)),
                                    cardListLength: ((globalThis.lib || lib) && (globalThis.lib || lib).card && Array.isArray((globalThis.lib || lib).card.list))
                                        ? (globalThis.lib || lib).card.list.length
                                        : null,
                                },
                            });
                        } catch (e) {
                        }
                        event.finish();
                        return;
                    }
                    player.storage = player.storage || {};
                    player.storage.zus_xiaodi_done = true;
                    if (typeof player.syncStorage == "function") {
                        player.syncStorage("zus_xiaodi_done");
                    }

                    var weaponMap = {};
                    for (var i = 0; i < event.weaponPool.length; i++) {
                        var weapon = event.weaponPool[i];
                        var weaponName = weapon && weapon.name ? weapon.name : globalThis.zusYingzhengSafeName(weapon, player);
                        var weaponSubtype = weapon && weapon.subtype ? weapon.subtype : globalThis.zusYingzhengSafeSubtype(weapon, player);
                        if (!weaponName || !weaponSubtype) continue;
                        var weaponKey = weaponName + "_" + weaponSubtype;
                        if (!weaponMap[weaponKey]) {
                            weaponMap[weaponKey] = true;
                            event.weaponButtons.push(weapon);
                        }
                    }

                    var armorMap = {};
                    for (var j = 0; j < event.armorPool.length; j++) {
                        var armor = event.armorPool[j];
                        var armorName = armor && armor.name ? armor.name : globalThis.zusYingzhengSafeName(armor, player);
                        var armorSubtype = armor && armor.subtype ? armor.subtype : globalThis.zusYingzhengSafeSubtype(armor, player);
                        if (!armorName || !armorSubtype) continue;
                        var armorKey = armorName + "_" + armorSubtype;
                        if (!armorMap[armorKey]) {
                            armorMap[armorKey] = true;
                            event.armorButtons.push(armor);
                        }
                    }
                    try {
                        globalThis.zusWriteYingzhengXiaodiDebug({
                            stage: "xiaodi_step0_buttons",
                            player: player && player.name,
                            weaponButtons: event.weaponButtons.map(function (card) {
                                return {
                                    name: card && card.name ? card.name : globalThis.zusYingzhengSafeName(card, player),
                                    subtype: card && card.subtype ? card.subtype : globalThis.zusYingzhengSafeSubtype(card, player),
                                };
                            }),
                            armorButtons: event.armorButtons.map(function (card) {
                                return {
                                    name: card && card.name ? card.name : globalThis.zusYingzhengSafeName(card, player),
                                    subtype: card && card.subtype ? card.subtype : globalThis.zusYingzhengSafeSubtype(card, player),
                                };
                            }),
                        });
                    } catch (e) {
                    }

                    if (event.weaponButtons.length) {
                        player.chooseButton(
                            true,
                            ["销镝：选择一种武器牌移出游戏", event.weaponButtons]
                        ).set("ai", function (button) {
                            var getter = globalThis.get || get;
                            return getter && getter.value ? getter.value(button.link) : 1;
                        });
                    } else {
                        event.goto(2);
                    }

                    "step 1"
                    if (result.bool && result.links && result.links.length) {
                        var weaponChoice = result.links[0];
                        event.banned.push({
                            name: globalThis.zusYingzhengSafeName(weaponChoice, player),
                            subtype: globalThis.zusYingzhengSafeSubtype(weaponChoice, player),
                            sample: weaponChoice,
                        });
                    }

                    "step 2"
                    if (event.armorButtons.length) {
                        player.chooseButton(
                            true,
                            ["销镝：选择一种防具牌移出游戏", event.armorButtons]
                        ).set("ai", function (button) {
                            var getter = globalThis.get || get;
                            return getter && getter.value ? getter.value(button.link) : 1;
                        });
                    } else {
                        event.goto(4);
                    }

                    "step 3"
                    if (result.bool && result.links && result.links.length) {
                        var armorChoice = result.links[0];
                        event.banned.push({
                            name: globalThis.zusYingzhengSafeName(armorChoice, player),
                            subtype: globalThis.zusYingzhengSafeSubtype(armorChoice, player),
                            sample: armorChoice,
                        });
                    }

                    "step 4"
                    if (!event.banned.length) {
                        event.finish();
                        return;
                    }
                    var runtimeGame2 = globalThis.game || game;

                    event.removed = [];
                    event.handReplace = [];
                    event.expansionReplace = [];

                    event.removedPileNames = [];
                    for (var bp = 0; bp < event.banned.length; bp++) {
                        var bannedInfo = event.banned[bp];
                        if (!bannedInfo || !bannedInfo.name) continue;
                        var removedCount = globalThis.zusYingzhengRemoveDeckCardsByName
                            ? globalThis.zusYingzhengRemoveDeckCardsByName(bannedInfo.name)
                            : 0;
                        if (removedCount > 0) {
                            event.removedPileNames.push({
                                name: bannedInfo.name,
                                count: removedCount,
                                sample: bannedInfo.sample,
                            });
                        }
                    }

                    var players = window.Zus && Zus.players
                        ? Zus.players().slice(0)
                        : (runtimeGame2 && runtimeGame2.players ? runtimeGame2.players.slice(0) : []);
                    if (runtimeGame2 && runtimeGame2.dead && runtimeGame2.dead.length) {
                        players = players.concat(runtimeGame2.dead);
                    }

                    for (var x = 0; x < players.length; x++) {
                        var current = players[x];
                        if (!current) continue;

                        var handCards = current.getCards ? current.getCards("h") : [];
                        for (var hh = 0; hh < handCards.length; hh++) {
                            var handCard = handCards[hh];
                            if (globalThis.zusYingzhengIsBannedEquip(handCard, event.banned, current)) {
                                event.handReplace.push({
                                    player: current,
                                    card: handCard,
                                });
                            }
                        }

                        if (current.getExpansions) {
                            var expansionCards = current.getExpansions();
                            for (var ee = 0; ee < expansionCards.length; ee++) {
                                var expansionCard = expansionCards[ee];
                                if (!globalThis.zusYingzhengIsBannedEquip(expansionCard, event.banned, current)) continue;

                                var tags = [];
                                if (expansionCard.gaintag && expansionCard.gaintag.slice) {
                                    tags = expansionCard.gaintag.slice(0);
                                }

                                event.expansionReplace.push({
                                    player: current,
                                    card: expansionCard,
                                    tags: tags,
                                });
                            }
                        }
                    }

                    "step 5"
                    var runtimeUi3 = globalThis.ui || ui;
                    if (event.removed.length) {
                        for (var r = 0; r < event.removed.length; r++) {
                            var removedCard = event.removed[r];
                            if (!removedCard) continue;
                            if (removedCard.fix) removedCard.fix();
                            if (runtimeUi3 && runtimeUi3.special) runtimeUi3.special.appendChild(removedCard);
                            else if (removedCard.remove) removedCard.remove();
                            else if (removedCard.parentNode) removedCard.parentNode.removeChild(removedCard);
                        }
                    }

                    for (var y = 0; y < event.handReplace.length; y++) {
                        var handTask = event.handReplace[y];
                        var owner = handTask.player;
                        var oldCard = handTask.card;
                        var newCard = globalThis.zusYingzhengGetReplaceCard(event.banned, owner);

                        if (owner && oldCard) {
                            if (owner.lose) {
                                owner.lose(
                                    oldCard,
                                    runtimeUi3 && runtimeUi3.special ? runtimeUi3.special : null
                                ).set("getlx", false).set("type", "zus_xiaodi_replace");
                            }
                            else if (runtimeUi3 && runtimeUi3.special) runtimeUi3.special.appendChild(oldCard);
                            else if (oldCard.remove) oldCard.remove();
                            event.removed.push(oldCard);
                        }

                        if (owner && newCard) {
                            owner.gain(newCard, "gain2");
                        }
                    }

                    for (var z = 0; z < event.expansionReplace.length; z++) {
                        var expansionTask = event.expansionReplace[z];
                        var owner2 = expansionTask.player;
                        var oldCard2 = expansionTask.card;
                        var newCard2 = globalThis.zusYingzhengGetReplaceCard(event.banned, owner2);

                        if (owner2 && oldCard2 && owner2.lose) {
                            owner2.lose(
                                oldCard2,
                                runtimeUi3 && runtimeUi3.special ? runtimeUi3.special : null
                            ).set("getlx", false).set("type", "zus_xiaodi_replace");
                            event.removed.push(oldCard2);
                        } else if (oldCard2) {
                            if (oldCard2.fix) oldCard2.fix();
                            if (runtimeUi3 && runtimeUi3.special) runtimeUi3.special.appendChild(oldCard2);
                            else if (oldCard2.remove) oldCard2.remove();
                            else if (oldCard2.parentNode) oldCard2.parentNode.removeChild(oldCard2);
                            event.removed.push(oldCard2);
                        }

                        if (owner2 && newCard2 && owner2.addToExpansion) {
                            var next = owner2.addToExpansion(newCard2, owner2, "giveAuto");
                            if (next && next.gaintag && expansionTask.tags && expansionTask.tags.length) {
                                if (next.gaintag.addArray) next.gaintag.addArray(expansionTask.tags);
                                else {
                                    for (var t = 0; t < expansionTask.tags.length; t++) {
                                        next.gaintag.add(expansionTask.tags[t]);
                                    }
                                }
                            }
                        }
                    }

                    "step 6"
                    var runtimeGet2 = globalThis.get || get;
                    var runtimeGame3 = globalThis.game || game;
                    var names = [];
                    for (var n = 0; n < event.banned.length; n++) {
                        names.push(runtimeGet2.translation(event.banned[n].sample || event.banned[n].name));
                    }

                    if (player.popup) player.popup("销镝");
                    runtimeGame3.log(player, "发动了", "【销镝】");
                    runtimeGame3.log("【销镝】禁用牌为：", names.join("、"));
                    if (event.removed.length) {
                        runtimeGame3.log("【销镝】移出的牌为：", event.removed);
                    }
                },
            },

            zus_xiaodi_probe: {
                trigger: {
                    player: "enterGame",
                    global: ["phaseBefore", "gameStart"],
                },
                forced: true,
                silent: true,
                popup: false,
                charlotte: true,
                content: function () {
                    try {
                        var currentGame = globalThis.game || game;
                        var triggerPlayer = trigger && trigger.player ? trigger.player : null;
                        var runtimeLib = globalThis.lib || lib;
                        var manualFilterResult = null;
                        var manualFilterError = null;
                        try {
                            if (
                                runtimeLib &&
                                runtimeLib.skill &&
                                runtimeLib.skill.zus_xiaodi &&
                                typeof runtimeLib.skill.zus_xiaodi.filter == "function"
                            ) {
                                manualFilterResult = runtimeLib.skill.zus_xiaodi.filter(trigger, player);
                            }
                        } catch (err) {
                            manualFilterError = err && err.message ? err.message : String(err);
                        }
                        globalThis.zusWriteYingzhengXiaodiDebug({
                            stage: "xiaodi_probe",
                            triggerName: trigger && trigger.name,
                            eventName: event && event.name,
                            owner: player && player.name,
                            triggerPlayer: triggerPlayer && triggerPlayer.name,
                            phaseNumber: currentGame && currentGame.phaseNumber,
                            skills: player && player.getSkills ? player.getSkills(null, false, false).slice(0) : [],
                            hasXiaodi:
                                !!(player && player.hasSkill && player.hasSkill("zus_xiaodi", null, null, false)),
                            done: !!(player && player.storage && player.storage.zus_xiaodi_done),
                            manualFilterResult: manualFilterResult,
                            manualFilterError: manualFilterError,
                        });
                    } catch (e) {
                    }
                },
            },

            zus_yimie: {
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    var shas = player.getCards ? player.getCards("h", function (card) {
                        return globalThis.zusYingzhengSafeName(card, player) == "sha";
                    }) : [];
                    var ok = shas.length > 0;
                    if (globalThis.zusWriteYingzhengYimieAiDebug) {
                        globalThis.zusWriteYingzhengYimieAiDebug("skill_filter", {
                            player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                            eventName: event && event.name || null,
                            shaCount: shas.length,
                            shaCards: shas.map(function (card) {
                                return globalThis.zusYingzhengYimieCardInfo
                                    ? globalThis.zusYingzhengYimieCardInfo(card, player)
                                    : { name: card && card.name || null };
                            }),
                            ok: ok,
                        });
                    }
                    return ok;
                },

                filterTarget: function (card, player, target) {
                    var ok = !!(globalThis.zusYingzhengShaTargetEnabled &&
                        globalThis.zusYingzhengShaTargetEnabled({ name: "sha", isCard: true }, player, target));
                    if (globalThis.zusWriteYingzhengYimieAiDebug) {
                        globalThis.zusWriteYingzhengYimieAiDebug("filter_target", {
                            player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                            target: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(target) : null,
                            ok: ok,
                        });
                    }
                    return ok;
                },

                selectTarget: 1,

                content: function () {
                    var shown = player.getCards("h", function (card) {
                        return globalThis.zusYingzhengSafeName(card, player) == "sha";
                    });

                    var num = shown.length;
                    if (!num) return;

                    var getter = globalThis.get || get;
                    player.showCards(shown, getter.translation(player) + "发动了【夷灭】");

                    player.storage = player.storage || {};
                    player.storage.zus_yimie_effect = {
                        x: num,
                        target: target,
                    };
                    if (typeof player.syncStorage == "function") {
                        player.syncStorage("zus_yimie_effect");
                    }

                    player.addTempSkill("zus_yimie_effect");
                    player.useCard({ name: "sha", isCard: true }, target);
                },

                ai: {
                    order: function (item, player) {
                        var getter = globalThis.get || get;
                        var shaOrder = 7;
                        try {
                            if (getter && getter.order) shaOrder = getter.order({ name: "sha" });
                        } catch (e) {
                        }
                        var order = Math.max(shaOrder + 3, 10);
                        if (globalThis.zusWriteYingzhengYimieAiDebug) {
                            globalThis.zusWriteYingzhengYimieAiDebug("ai_order", {
                                player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                                shaOrder: shaOrder,
                                order: order,
                            });
                        }
                        return order;
                    },
                    result: {
                        player: function (player) {
                            var shas = player.getCards("h", function (card) {
                                return globalThis.zusYingzhengSafeName(card, player) == "sha";
                            });
                            if (!shas.length) {
                                if (globalThis.zusWriteYingzhengYimieAiDebug) {
                                    globalThis.zusWriteYingzhengYimieAiDebug("ai_result_player_no_sha", {
                                        player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                                    });
                                }
                                return 0;
                            }

                            var x = shas.length;
                            var card = {
                                name: "sha",
                                isCard: true,
                            };
                            var currentGame = globalThis.game || game;
                            var debugTargets = [];
                            var canFindGoodTarget =
                                currentGame &&
                                typeof currentGame.hasPlayer == "function" &&
                                currentGame.hasPlayer(function (current) {
                                    if (!current || current == player) return false;
                                    var enabled = globalThis.zusYingzhengShaTargetEnabled(card, player, current);
                                    var value = enabled && globalThis.zusYingzhengYimieTargetValue
                                        ? globalThis.zusYingzhengYimieTargetValue(player, current)
                                        : 0;
                                    debugTargets.push({
                                        target: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(current) : { name: current && current.name || null },
                                        enabled: !!enabled,
                                        value: value,
                                    });
                                    return enabled && value > 0;
                                });
                            if (!canFindGoodTarget) {
                                var players = [];
                                try {
                                    players = window.Zus && Zus.players ? Zus.players() : (currentGame && currentGame.players ? currentGame.players : []);
                                } catch (e) {
                                    players = currentGame && currentGame.players ? currentGame.players : [];
                                }
                                for (var i = 0; i < players.length; i++) {
                                    var current = players[i];
                                    if (!current || current == player) continue;
                                    var enabled2 = globalThis.zusYingzhengShaTargetEnabled(card, player, current);
                                    var value2 = enabled2 && globalThis.zusYingzhengYimieTargetValue
                                        ? globalThis.zusYingzhengYimieTargetValue(player, current)
                                        : 0;
                                    debugTargets.push({
                                        target: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(current) : { name: current && current.name || null },
                                        enabled: !!enabled2,
                                        value: value2,
                                        fallback: true,
                                    });
                                    if (enabled2 && value2 > 0) {
                                        canFindGoodTarget = true;
                                        break;
                                    }
                                }
                            }
                            if (!canFindGoodTarget) {
                                if (globalThis.zusWriteYingzhengYimieAiDebug) {
                                    globalThis.zusWriteYingzhengYimieAiDebug("ai_result_player_no_good_target", {
                                        player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                                        shaCount: x,
                                        targets: debugTargets,
                                    });
                                }
                                if (!debugTargets.length) {
                                    if (globalThis.zusWriteYingzhengYimieAiDebug) {
                                        globalThis.zusWriteYingzhengYimieAiDebug("ai_result_player_target_scan_empty", {
                                            player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                                            shaCount: x,
                                            result: 0,
                                        });
                                    }
                                    return 0;
                                }
                                return 0;
                            }

                            var bonus = 0;
                            if (x >= 2) bonus += 0.3;
                            if (x >= 3) bonus += 0.5;
                            if (
                                currentGame &&
                                typeof currentGame.hasPlayer == "function" &&
                                currentGame.hasPlayer(function (current) {
                                    if (!current || current == player) return false;
                                    if (!globalThis.zusYingzhengShaTargetEnabled(card, player, current)) return false;
                                    return current.countCards("h") <= x && globalThis.zusYingzhengYimieTargetValue(player, current) > 0;
                                })
                            ) {
                                bonus += 0.7;
                            }
                            var result = 1 + bonus;
                            if (globalThis.zusWriteYingzhengYimieAiDebug) {
                                globalThis.zusWriteYingzhengYimieAiDebug("ai_result_player", {
                                    player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                                    shaCount: x,
                                    bonus: bonus,
                                    result: result,
                                    targets: debugTargets,
                                });
                            }
                            return result;
                        },
                        target: function (player, target) {
                            var getter = globalThis.get || get;
                            var attitude = 0;
                            try {
                                attitude = getter && getter.attitude ? getter.attitude(player, target) : 0;
                            } catch (e) {
                                attitude = 0;
                            }
                            if (attitude >= 0) {
                                if (globalThis.zusWriteYingzhengYimieAiDebug) {
                                    globalThis.zusWriteYingzhengYimieAiDebug("ai_result_target_ally_block", {
                                        player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                                        target: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(target) : null,
                                        attitude: attitude,
                                        targetResult: -8,
                                    });
                                }
                                return -8;
                            }
                            var value = globalThis.zusYingzhengYimieTargetValue
                                ? globalThis.zusYingzhengYimieTargetValue(player, target)
                                : 0;
                            var targetResult = value > 0 ? -value : 0;
                            if (globalThis.zusWriteYingzhengYimieAiDebug) {
                                globalThis.zusWriteYingzhengYimieAiDebug("ai_result_target", {
                                    player: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(player) : null,
                                    target: globalThis.zusYingzhengSafePlayerInfo ? globalThis.zusYingzhengSafePlayerInfo(target) : null,
                                    attitude: attitude,
                                    attackScore: value,
                                    targetResult: targetResult,
                                });
                            }
                            return targetResult;
                        },
                    },
                },
            },

            zus_yimie_effect: {
                charlotte: true,
                forced: true,
                popup: false,
                group: [
                    "zus_yimie_effect_directHit",
                    "zus_yimie_effect_damage",
                    "zus_yimie_effect_clear",
                ],
            },

            zus_yimie_effect_directHit: {
                trigger: {
                    global: "useCardToTargeted",
                },
                forced: true,
                charlotte: true,
                popup: false,

                filter: function (event, player) {
                    if (!player.storage || !player.storage.zus_yimie_effect) return false;
                    if (!event.card || globalThis.zusYingzhengSafeName(event.card, player) != "sha") return false;
                    if (event.player != player) return false;

                    var info = player.storage.zus_yimie_effect;
                    if (!info.target || event.target != info.target) return false;

                    var x = info.x || 0;
                    return event.target.countCards("h") >= x;
                },

                content: function () {
                    var info = player.storage.zus_yimie_effect;
                    var x = info.x || 0;
                    var evt = trigger.getParent();
                    var currentGame = globalThis.game || game;

                    if (!evt.directHit) {
                        evt.directHit = [];
                    }
                    evt.directHit.add(trigger.target);

                    currentGame.log(trigger.target, "手牌数不少于", x, "，不能使用【闪】响应此【杀】");
                },
            },

            zus_yimie_effect_damage: {
                trigger: {
                    source: "damageBegin1",
                },
                forced: true,
                charlotte: true,
                popup: false,

                filter: function (event, player) {
                    if (!player.storage || !player.storage.zus_yimie_effect) return false;
                    if (!event.card || globalThis.zusYingzhengSafeName(event.card, player) != "sha") return false;
                    if (!event.player || !event.player.isIn || !event.player.isIn()) return false;

                    var info = player.storage.zus_yimie_effect;
                    if (!info.target || event.player != info.target) return false;

                    var x = info.x || 0;
                    return event.player.countCards("h") <= x;
                },

                content: function () {
                    var info = player.storage.zus_yimie_effect;
                    var x = info.x || 0;
                    var currentGame = globalThis.game || game;
                    trigger.num = x;
                    currentGame.log(trigger.player, "手牌数不大于", x, "，此【杀】伤害改为", x);
                },
            },

            zus_yimie_effect_clear: {
                trigger: {
                    player: "useCardAfter",
                },
                forced: true,
                charlotte: true,
                popup: false,

                filter: function (event, player) {
                    if (!player.storage || !player.storage.zus_yimie_effect) return false;
                    return !!(event.card && globalThis.zusYingzhengSafeName(event.card, player) == "sha");
                },

                content: function () {
                    if (player.storage) {
                        delete player.storage.zus_yimie_effect;
                    }
                    if (typeof player.syncStorage == "function") {
                        player.syncStorage("zus_yimie_effect");
                    }
                    player.removeSkill("zus_yimie_effect");
                },
            },

            zus_huangdao: {
                zhuSkill: true,
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    var currentGame = globalThis.game || game;
                    var isZhu =
                        player.identity == "zhu" ||
                        currentGame.zhu == player ||
                        player.isZhu === true;

                    if (typeof player.hasZhuSkill == "function") {
                        if (!player.hasZhuSkill("zus_huangdao") && !isZhu) return false;
                    } else if (!isZhu) {
                        return false;
                    }

                    var cards = player.getCards ? player.getCards("h") : [];
                    for (var i = 0; i < cards.length; i++) {
                        if (globalThis.zusYingzhengSafeColor(cards[i], player) == "red") return true;
                    }
                    return false;
                },

                filterCard: function (card, player) {
                    return globalThis.zusYingzhengSafeColor(card, player) == "red";
                },

                position: "h",
                selectCard: 1,
                viewAs: {
                    name: "wugu",
                },
                prompt: "将一张红色手牌当【五谷丰登】使用",

                ai: {
                    order: 3,
                    result: {
                        player: 1,
                    },
                },
            },
        },

        translate: {
            zus_yingzheng: "嬴政",
            zus_yingzheng_ab: "嬴政",

            zus_xiaodi: "销镝",
            zus_xiaodi_info:
                "锁定技，游戏开始时，你选择一种武器牌和一种防具牌，将牌堆中同名牌移出游戏；若这些牌已在角色手牌或扩展区内，则将其移出游戏并用牌堆中的其他牌替换。",

            zus_yimie: "夷灭",
            zus_yimie_info:
                "出牌阶段限一次，你可以展示手牌中所有【杀】，视为使用一张【杀】；若目标角色的手牌数不小于X，则其不能使用【闪】响应；若目标角色的手牌数不大于X，则此【杀】伤害为X（X为你以此法展示的【杀】数）。",

            zus_huangdao: "皇道",
            zus_huangdao_info:
                "主公技，出牌阶段限一次，你可以将一张红色手牌当【五谷丰登】使用。",
        },

        sort: ["zus_yingzheng"],

        title: {
            zus_yingzheng: "始皇帝",
        },
    };
})();
