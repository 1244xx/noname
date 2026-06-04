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

    function runtimeGame() {
        try {
            if (typeof window != "undefined" && window.top && window.top.game) {
                return window.top.game;
            }
        } catch (e) {}
        return globalThis.game || game;
    }

    function runtimeUi() {
        var currentUi = null;
        try {
            if (typeof window != "undefined" && window.top && window.top.ui) {
                currentUi = window.top.ui;
            }
        } catch (e) {}
        if (!currentUi) currentUi = globalThis.ui || ui;
        if (currentUi) return currentUi;
        var discardPile = null;
        var ordering = null;
        try {
            var doc =
                (typeof window != "undefined" &&
                    window.top &&
                    window.top.document &&
                    window.top.document.querySelector &&
                    window.top.document) ||
                (typeof document != "undefined" && document.querySelector && document);
            if (doc) {
                discardPile = doc.querySelector("#discardPile");
                ordering = doc.querySelector("#ordering");
            }
        } catch (e) {}
        if (discardPile || ordering) {
            return {
                discardPile: discardPile,
                ordering: ordering,
            };
        }
        return null;
    }

    function runtimeGet() {
        try {
            if (typeof window != "undefined" && window.top && window.top.get) {
                return window.top.get;
            }
        } catch (e) {}
        return globalThis.get || get;
    }

    function setupHuanGroup() {
        var currentLib = null;
        try {
            if (typeof window != "undefined" && window.top && window.top.lib) currentLib = window.top.lib;
        } catch (e) {}
        if (!currentLib) currentLib = globalThis.lib || lib || null;
        if (!currentLib) return;
        if (currentLib.group) {
            if (typeof currentLib.group.add == "function") currentLib.group.add("zus_group_huan");
            else if (Array.isArray(currentLib.group) && currentLib.group.indexOf("zus_group_huan") == -1) currentLib.group.push("zus_group_huan");
        }
        currentLib.translate = currentLib.translate || {};
        currentLib.translate.zus_group_huan = "幻";
        currentLib.translate.zus_group_huan2 = "幻";
        currentLib.groupnature = currentLib.groupnature || {};
        currentLib.groupnature.zus_group_huan = "key";
    }

    setupHuanGroup();

    function runtimeStatus() {
        try {
            if (typeof window != "undefined" && window.top && window.top._status) {
                return window.top._status;
            }
        } catch (e) {}
        return globalThis._status || _status;
    }

    function safeName(card, player, runtime) {
        return Zus.safeName(card, player, runtime);
    }

    function isShuangmoSha(player, card) {
        var list = window.Zus && Zus.storage ? Zus.storage(player, "zus_shuangmo_sha", []) : [];
        return !!(card && list && list.indexOf(card) != -1);
    }

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("langyan", "safeName", safeName, "zusLangyanSafeName");
        Zus.bindHelper("langyan", "isShuangmoSha", isShuangmoSha, "zusLangyanIsShuangmoSha");
    } else {
        globalThis.zusLangyanSafeName = safeName;
        globalThis.zusLangyanIsShuangmoSha = isShuangmoSha;
    }

    function appendLangyanRuntimeDebug(debug) {
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (!req) return;
            var fs = req("fs");
            fs.appendFileSync(
                "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/langyan_debug_runtime.log",
                JSON.stringify(debug) + "\n",
                "utf8"
            );
        } catch (e) {}
    }

    function writeLangyanDebug(debug) {
        var currentGame = runtimeGame();
        if (!debug) return;
        if (!debug.timestamp) debug.timestamp = Date.now();
        globalThis.zusLangyanDebug = debug;
        appendLangyanRuntimeDebug(debug);
        try {
            localStorage.setItem("zus_langyan_debug", JSON.stringify(debug));
        } catch (e) {}
        try {
            if (currentGame && typeof currentGame.saveExtensionConfig == "function") {
                currentGame.saveExtensionConfig("Zusfylri武将包", "langyan_debug", debug);
                currentGame.saveConfig("zus_langyan_debug_ascii", debug);
            }
        } catch (e) {}
        try {
            if (currentGame && typeof currentGame.writeFile == "function") {
                currentGame.writeFile(
                    JSON.stringify(debug, null, 2),
                    "extension/Zusfylri武将包/docs",
                    "langyan_debug.json",
                    function () {}
                );
            }
        } catch (e) {}
    }
    globalThis.zusWriteLangyanDebug = writeLangyanDebug;

    function getDiscardShaCards(player, runtime) {
        var options = runtime || {};
        var normalizedRuntime = window.Zus && Zus.runtime ? Zus.runtime(options) : {};
        var currentUi = options.ui || normalizedRuntime.ui || runtimeUi();
        var currentGame = options.game || normalizedRuntime.game || runtimeGame();
        var currentGet = options.getter || options.get || normalizedRuntime.get || runtimeGet();
        var currentStatus = options.status || normalizedRuntime.status || runtimeStatus();
        var debug = {
            stage: "getDiscardShaCards",
            player: player && player.name,
            contentRuntime: options.debugRuntime || null,
            runtimeMeta: null,
            discardPileMeta: null,
            orderingMeta: null,
            fromUiDiscardPile: [],
            fromUiOrdering: [],
            fromZusHelper: [],
            fromDiscardCardsSafe: [],
            fromGetDiscardPile: null,
            fromGlobalHistory: [],
            rawCardMoveHistory: [],
            chosenSource: null,
            safeDiscardSource: null,
            safeDiscardSourceCount: null,
            safeDiscardAttempts: null,
            safeDiscardRejected: [],
            safeDiscardRuntime: null,
            safeDiscardHits: [],
            resultCount: 0,
        };
        var list = [];
        if (window.Zus && Zus.getDiscardCardsSafe) {
            try {
                var safeDebug = {};
                list = Zus.getDiscardCardsSafe(function (card) {
                    return safeName(card, player, { getter: currentGet }) == "sha";
                }, {
                    debug: safeDebug,
                    getter: currentGet,
                    game: currentGame,
                    ui: currentUi,
                    status: currentStatus,
                }) || [];
                debug.safeDiscardSource = safeDebug.safeDiscardSource || null;
                debug.safeDiscardSourceCount = safeDebug.safeDiscardSourceCount || {};
                debug.safeDiscardAttempts = safeDebug.safeDiscardAttempts || {};
                debug.safeDiscardRejected = safeDebug.safeDiscardRejected || [];
                debug.safeDiscardRuntime = safeDebug.safeDiscardRuntime || null;
                debug.safeDiscardHits = safeDebug.safeDiscardHits || [];
                for (var safeIndex = 0; safeIndex < list.length; safeIndex++) {
                    var safeCard = list[safeIndex];
                    var safeInfo = {
                        name: null,
                        suit: null,
                        color: null,
                        number: null,
                    };
                    try {
                        safeInfo.name = safeName(safeCard, player, { getter: currentGet });
                    } catch (e) {}
                    try {
                        safeInfo.suit = currentGet && currentGet.suit ? currentGet.suit(safeCard, player) : null;
                    } catch (e2) {}
                    try {
                        safeInfo.color = currentGet && currentGet.color ? currentGet.color(safeCard, player) : null;
                    } catch (e3) {}
                    try {
                        safeInfo.number = currentGet && currentGet.number ? currentGet.number(safeCard, player) : null;
                    } catch (e4) {}
                    debug.fromDiscardCardsSafe.push(safeInfo);
                }
                if (list.length) {
                    debug.chosenSource = "Zus.getDiscardCardsSafe";
                    debug.resultCount = list.length;
                    writeLangyanDebug(debug);
                    return list;
                }
                debug.chosenSource = "Zus.getDiscardCardsSafe";
                debug.resultCount = 0;
                writeLangyanDebug(debug);
                return list;
            } catch (e5) {}
        }
        try {
            var topDoc = null;
            var currentDoc = null;
            try {
                if (typeof window != "undefined" && window.top && window.top.document) {
                    topDoc = window.top.document;
                }
            } catch (e) {}
            try {
                if (typeof document != "undefined") {
                    currentDoc = document;
                }
            } catch (e) {}
            var topDiscard = null;
            var topOrdering = null;
            var currentDiscard = null;
            var currentOrdering = null;
            try {
                if (topDoc && topDoc.querySelector) {
                    topDiscard = topDoc.querySelector("#discardPile");
                    topOrdering = topDoc.querySelector("#ordering");
                }
            } catch (e) {}
            try {
                if (currentDoc && currentDoc.querySelector) {
                    currentDiscard = currentDoc.querySelector("#discardPile");
                    currentOrdering = currentDoc.querySelector("#ordering");
                }
            } catch (e) {}
            debug.runtimeMeta = {
                hasWindowTop: !!(typeof window != "undefined" && window.top),
                hasTopUi: !!(typeof window != "undefined" && window.top && window.top.ui),
                hasTopGame: !!(typeof window != "undefined" && window.top && window.top.game),
                hasTopGet: !!(typeof window != "undefined" && window.top && window.top.get),
                hasGlobalUi: !!globalThis.ui,
                hasModuleUi: !!ui,
                hasCurrentDocument: !!currentDoc,
                hasTopDocument: !!topDoc,
                currentHref:
                    typeof location != "undefined" && location && location.href ? location.href : null,
                topHref:
                    typeof window != "undefined" &&
                    window.top &&
                    window.top.location &&
                    window.top.location.href
                        ? window.top.location.href
                        : null,
                isTopWindow:
                    typeof window != "undefined" && window.top ? window.top === window : null,
                frameCount:
                    typeof window != "undefined" && typeof window.length == "number" ? window.length : null,
                currentTitle: currentDoc && currentDoc.title ? currentDoc.title : null,
                topTitle: topDoc && topDoc.title ? topDoc.title : null,
                currentBodyHasArena:
                    !!(currentDoc && currentDoc.querySelector && currentDoc.querySelector("#arena")),
                topBodyHasArena:
                    !!(topDoc && topDoc.querySelector && topDoc.querySelector("#arena")),
                topDiscardExists: !!topDiscard,
                topDiscardCount: topDiscard && topDiscard.childNodes ? topDiscard.childNodes.length : null,
                topOrderingExists: !!topOrdering,
                topOrderingCount: topOrdering && topOrdering.childNodes ? topOrdering.childNodes.length : null,
                currentDiscardExists: !!currentDiscard,
                currentDiscardCount: currentDiscard && currentDiscard.childNodes ? currentDiscard.childNodes.length : null,
                currentOrderingExists: !!currentOrdering,
                currentOrderingCount: currentOrdering && currentOrdering.childNodes ? currentOrdering.childNodes.length : null,
            };
        } catch (e) {}
        try {
            if (currentUi && currentUi.discardPile) {
                debug.discardPileMeta = {
                    exists: true,
                    id: currentUi.discardPile.id || null,
                    className: currentUi.discardPile.className || null,
                    childCount: currentUi.discardPile.childNodes ? currentUi.discardPile.childNodes.length : null,
                };
            } else {
                debug.discardPileMeta = { exists: false };
            }
        } catch (e) {}
        try {
            if (currentUi && currentUi.ordering) {
                debug.orderingMeta = {
                    exists: true,
                    id: currentUi.ordering.id || null,
                    className: currentUi.ordering.className || null,
                    childCount: currentUi.ordering.childNodes ? currentUi.ordering.childNodes.length : null,
                };
            } else {
                debug.orderingMeta = { exists: false };
            }
        } catch (e) {}
        if (currentUi && currentUi.discardPile && currentUi.discardPile.childNodes) {
            // Legacy-engine/debug fallback only. Normal discard reads should come from Zus.getDiscardCardsSafe.
            for (var i = 0; i < currentUi.discardPile.childNodes.length; i++) {
                var card = currentUi.discardPile.childNodes[i];
                var info = {
                    name: null,
                    suit: null,
                    color: null,
                    number: null,
                };
                try {
                    info.name = safeName(card, player);
                } catch (e) {}
                try {
                    info.suit = currentGet.suit(card, player);
                } catch (e) {}
                try {
                    info.color = currentGet.color(card, player);
                } catch (e) {}
                try {
                    info.number = currentGet.number(card, player);
                } catch (e) {}
                debug.fromUiDiscardPile.push(info);
                if (safeName(card, player) == "sha") {
                    list.push(card);
                }
            }
        }

        if (currentUi && currentUi.ordering && currentUi.ordering.childNodes) {
            for (var k = 0; k < currentUi.ordering.childNodes.length; k++) {
                var orderingCard = currentUi.ordering.childNodes[k];
                var orderingInfo = {
                    name: null,
                    suit: null,
                    color: null,
                    number: null,
                };
                try {
                    orderingInfo.name = safeName(orderingCard, player);
                } catch (e) {}
                try {
                    orderingInfo.suit = currentGet.suit(orderingCard, player);
                } catch (e) {}
                try {
                    orderingInfo.color = currentGet.color(orderingCard, player);
                } catch (e) {}
                try {
                    orderingInfo.number = currentGet.number(orderingCard, player);
                } catch (e) {}
                debug.fromUiOrdering.push(orderingInfo);
            }
        }

        if (list.length) {
            debug.chosenSource = "ui.discardPile";
            debug.resultCount = list.length;
            writeLangyanDebug(debug);
            return list;
        }

        if (window.Zus && Zus.getDiscardCards) {
            try {
                list = Zus.getDiscardCards(function (card) {
                    return safeName(card, player) == "sha";
                }) || [];
                for (var j = 0; j < list.length; j++) {
                    var helperCard = list[j];
                    var helperInfo = {
                        name: null,
                        suit: null,
                        color: null,
                        number: null,
                    };
                    try {
                        helperInfo.name = safeName(helperCard, player);
                    } catch (e) {}
                    try {
                        helperInfo.suit = currentGet.suit(helperCard, player);
                    } catch (e) {}
                    try {
                        helperInfo.color = currentGet.color(helperCard, player);
                    } catch (e) {}
                    try {
                        helperInfo.number = currentGet.number(helperCard, player);
                    } catch (e) {}
                    debug.fromZusHelper.push(helperInfo);
                }
            } catch (e) {}
        }

        try {
            if (currentGet && typeof currentGet.cardPile == "function") {
                var cardx = currentGet.cardPile(function (card) {
                    return safeName(card, player) == "sha";
                }, "discardPile");
                if (cardx) {
                    debug.fromGetDiscardPile = {
                        name: safeName(cardx, player),
                        suit: currentGet.suit(cardx, player),
                        color: currentGet.color(cardx, player),
                        number: currentGet.number(cardx, player),
                    };
                }
            }
        } catch (e) {}

        try {
            if (currentGame && typeof currentGame.getAllGlobalHistory == "function") {
                var rawHistory = currentGame.getAllGlobalHistory("cardMove") || [];
                for (var rh = Math.max(0, rawHistory.length - 12); rh < rawHistory.length; rh++) {
                    var rawEvt = rawHistory[rh];
                    if (!rawEvt) continue;
                    var rawInfo = {
                        name: rawEvt.name || null,
                        position: null,
                        cards: [],
                    };
                    try {
                        if (currentUi && rawEvt.position == currentUi.discardPile) rawInfo.position = "discardPile";
                        else if (currentUi && rawEvt.position == currentUi.ordering) rawInfo.position = "ordering";
                        else if (rawEvt.position && rawEvt.position.id) rawInfo.position = rawEvt.position.id;
                        else rawInfo.position = rawEvt.position || null;
                    } catch (e) {}
                    var rawCards = rawEvt.cards || [];
                    for (var rc = 0; rc < rawCards.length; rc++) {
                        var rawCard = rawCards[rc];
                        rawInfo.cards.push({
                            name: safeName(rawCard, player),
                            suit: currentGet.suit(rawCard, player),
                            color: currentGet.color(rawCard, player),
                            number: currentGet.number(rawCard, player),
                        });
                    }
                    debug.rawCardMoveHistory.push(rawInfo);
                }

                var history = currentGame.getAllGlobalHistory("cardMove", function (evt) {
                    if (!evt) return false;
                    if (evt.name == "lose") return currentUi && evt.position == currentUi.discardPile;
                    return evt.name == "cardsDiscard";
                }) || [];
                var historyCards = [];
                for (var h = 0; h < history.length; h++) {
                    var evt2 = history[h];
                    var cards = evt2 && evt2.cards ? evt2.cards : [];
                    for (var c = 0; c < cards.length; c++) {
                        var historyCard = cards[c];
                        var historyInfo = {
                            name: null,
                            suit: null,
                            color: null,
                            number: null,
                        };
                        try {
                            historyInfo.name = safeName(historyCard, player);
                        } catch (e) {}
                        try {
                            historyInfo.suit = currentGet.suit(historyCard, player);
                        } catch (e) {}
                        try {
                            historyInfo.color = currentGet.color(historyCard, player);
                        } catch (e) {}
                        try {
                            historyInfo.number = currentGet.number(historyCard, player);
                        } catch (e) {}
                        debug.fromGlobalHistory.push(historyInfo);
                        if (safeName(historyCard, player) == "sha") {
                            historyCards.push(historyCard);
                        }
                    }
                }
                if (historyCards.length) {
                    if (typeof historyCards.filterInD == "function") {
                        historyCards = historyCards.filterInD("d");
                    } else {
                        historyCards = historyCards.filter(function (card) {
                            try {
                                return currentGet.position(card, true) == "d";
                            } catch (e) {
                                return false;
                            }
                        });
                    }
                    if (historyCards.length) {
                        debug.chosenSource = "globalHistory";
                        debug.resultCount = historyCards.length;
                        writeLangyanDebug(debug);
                        return historyCards;
                    }
                }
            }
        } catch (e) {}

        debug.chosenSource = "Zus.getDiscardCards";
        debug.resultCount = list.length;
        writeLangyanDebug(debug);
        return list;
    }

    globalThis.zusLangyanGetDiscardShaCards = getDiscardShaCards;

    var isGuyanTarget = (window.Zus && Zus.bindHelper
        ? Zus.bindHelper("langyan", "isGuyanTarget", function (player, target) {
        var list = window.Zus && Zus.storage ? Zus.storage(player, "zus_guyan_targets", []) : [];
        return !!(target && list && list.indexOf(target) != -1);
        })
        : function (player, target) {
            var list = window.Zus && Zus.storage ? Zus.storage(player, "zus_guyan_targets", []) : [];
            return !!(target && list && list.indexOf(target) != -1);
        });

    window.zusfylriModules["langyan"] = {
        key: "langyan",

        character: {
            zus_langyan: {
                sex: "male",
                group: "zus_group_huan",
                hp: 2,
                maxHp: 2,
                hujia: 1,
                skills: ["zus_shuangmo", "zus_guyan"],
                img: image("zus_langyan", "png").replace(/^ext:/, "extension/"),
            },
        },

        skill: {
            zus_shuangmo: {
                trigger: { player: "phaseZhunbeiBegin" },
                forced: true,
                locked: true,
                group: ["zus_shuangmo_mod", "zus_shuangmo_directHit", "zus_shuangmo_clear"],

                content: function () {
                    "step 0"
                    try {
                        globalThis.zusWriteLangyanDebug({
                            stage: "shuangmo_step0_begin",
                            player: player && player.name,
                            timestamp: Date.now(),
                        });
                    } catch (e) {}
                    player.judge(function (card) {
                        return get.suit(card) == "club" ? 1 : -1;
                    }).set("judge2", function (result) {
                        return result.bool;
                    });

                    "step 1"
                    try {
                        globalThis.zusWriteLangyanDebug({
                            stage: "shuangmo_step1_afterJudge",
                            player: player && player.name,
                            judgeResult: !!result.bool,
                            timestamp: Date.now(),
                        });
                    } catch (e) {}
                    if (result.bool) {
                        event.finish();
                        return;
                    }

                    player.skip("phaseDraw");

                    var contentGet = typeof get != "undefined" ? get : globalThis.get;
                    var contentGame = typeof game != "undefined" ? game : globalThis.game;
                    var contentUi = typeof ui != "undefined" ? ui : globalThis.ui;
                    var contentStatus = typeof _status != "undefined" ? _status : globalThis._status;
                    var list = globalThis.zusLangyanGetDiscardShaCards(player, {
                        getter: contentGet,
                        game: contentGame,
                        ui: contentUi,
                        status: contentStatus,
                        debugRuntime: {
                            hasGet: !!contentGet,
                            hasCardPile: !!(contentGet && typeof contentGet.cardPile == "function"),
                            hasDiscardPile: !!(contentGet && typeof contentGet.discardPile == "function"),
                            hasGame: !!contentGame,
                            hasUi: !!contentUi,
                            hasStatus: !!contentStatus,
                            statusDiscardedCount: contentStatus && contentStatus.discarded && contentStatus.discarded.length ? contentStatus.discarded.length : 0,
                        },
                    }) || [];
                    try {
                        var debug1 = globalThis.zusLangyanDebug || {};
                        debug1.afterJudge = {
                            resultBool: !!result.bool,
                            candidateCount: list.length,
                            candidateNames: list.map(function (card) {
                                return get.name(card, player);
                            }),
                        };
                        globalThis.zusWriteLangyanDebug(debug1);
                    } catch (e) {}

                    if (!list.length) {
                        event.finish();
                        return;
                    }

                    player.chooseButton(true, ["霜漠：选择弃牌堆中一张【杀】加入手牌", list])
                        .set("ai", function (button) {
                            return get.value(button.link);
                        });

                    "step 2"
                    if (!result.bool || !result.links || !result.links.length) {
                        try {
                            var debug2 = globalThis.zusLangyanDebug || {};
                            debug2.chooseButton = {
                                success: false,
                                bool: !!result.bool,
                                links: result && result.links ? result.links.length : 0,
                            };
                            globalThis.zusWriteLangyanDebug(debug2);
                        } catch (e) {}
                        event.finish();
                        return;
                    }

                    var card = result.links[0];
                    try {
                            var debug3 = globalThis.zusLangyanDebug || {};
                            debug3.chooseButton = {
                                success: true,
                                picked: {
                                    name: globalThis.zusLangyanSafeName(card, player),
                                suit: get.suit(card, player),
                                color: get.color(card, player),
                                    number: get.number(card, player),
                                },
                            };
                            globalThis.zusWriteLangyanDebug(debug3);
                        } catch (e) {}

                    if (window.Zus && Zus.pushUnique) {
                        Zus.pushUnique(player, "zus_shuangmo_sha", card);
                    }

                    player.addTempSkill("zus_shuangmo_effect", { player: "phaseEnd" });
                    player.gain(card, "gain2");

                    if (player.addGaintag) {
                        player.addGaintag([card], "zus_shuangmo_tag");
                    }

                    if (!card.gaintag) card.gaintag = [];

                    if (card.gaintag.add) {
                        card.gaintag.add("zus_shuangmo_tag");
                    } else if (card.gaintag.indexOf("zus_shuangmo_tag") == -1) {
                        card.gaintag.push("zus_shuangmo_tag");
                    }

                    game.log(player, "因【霜漠】获得了", card);
                },
            },

            zus_shuangmo_effect: {
                charlotte: true,
                popup: false,
            },

            zus_shuangmo_mod: {
                mod: {
                    targetInRange: function (card, player, target) {
                        if (globalThis.zusLangyanSafeName(card, player) != "sha") return;
                        if (globalThis.zusLangyanIsShuangmoSha(player, card)) return true;

                        var cards = card && card.cards ? card.cards : [];
                        for (var i = 0; i < cards.length; i++) {
                            if (globalThis.zusLangyanIsShuangmoSha(player, cards[i])) return true;
                        }
                    },
                },
            },

            zus_shuangmo_directHit: {
                trigger: { player: "useCardToTargeted" },
                forced: true,
                charlotte: true,
                popup: false,

                filter: function (event, player) {
                    if (!event.card || globalThis.zusLangyanSafeName(event.card, player) != "sha") return false;
                    if (!event.cards || !event.cards.length) return false;

                    for (var i = 0; i < event.cards.length; i++) {
                        if (globalThis.zusLangyanIsShuangmoSha(player, event.cards[i])) return true;
                    }
                    return false;
                },

                content: function () {
                    var evt = trigger.getParent();

                    if (!evt.directHit) evt.directHit = [];

                    if (evt.directHit.add) {
                        evt.directHit.add(trigger.target);
                    } else if (evt.directHit.indexOf(trigger.target) == -1) {
                        evt.directHit.push(trigger.target);
                    }

                    game.log(trigger.target, "不能使用【闪】响应此【杀】");
                },
            },

            zus_shuangmo_clear: {
                trigger: { player: "phaseEnd" },
                forced: true,
                silent: true,
                popup: false,
                charlotte: true,

                content: function () {
                    if (player.removeGaintag) {
                        player.removeGaintag("zus_shuangmo_tag");
                    }

                    var list = window.Zus && Zus.storage ? Zus.storage(player, "zus_shuangmo_sha", []) : [];

                    for (var i = 0; i < list.length; i++) {
                        var card = list[i];
                        if (!card || !card.gaintag) continue;

                        if (card.gaintag.remove) {
                            card.gaintag.remove("zus_shuangmo_tag");
                        } else {
                            var index = card.gaintag.indexOf("zus_shuangmo_tag");
                            if (index != -1) card.gaintag.splice(index, 1);
                        }
                    }

                    if (window.Zus && Zus.setStorage) {
                        Zus.setStorage(player, "zus_shuangmo_sha", []);
                    }
                },
            },

            zus_guyan: {
                trigger: {
                    player: ["useCardToTargeted", "useCardToPlayered"],
                },
                forced: true,
                group: [
                    "zus_guyan_begin",
                    "zus_guyan_end",
                    "zus_guyan_sha_directHit",
                    "zus_guyan_redirect",
                    "zus_guyan_clear",
                    "zus_guyan_mark",
                ],

                filter: function (event, player) {
                    if (!event.card || safeName(event.card, player) != "sha") return false;

                    var target = event.target || event.player;
                    if (!target || target == player) return false;
                    if (!target.isIn || !target.isIn()) return false;

                    return true;
                },

                content: function () {
                    var target = trigger.target || trigger.player;

                    if (!target || !target.isIn || !target.isIn()) return;

                    if (window.Zus && Zus.pushUnique) {
                        Zus.pushUnique(player, "zus_guyan_targets", target);
                    }

                    player.markSkill("zus_guyan_mark");

                    var evt = trigger.getParent();

                    if (!evt.directHit) evt.directHit = [];

                    if (evt.directHit.add) {
                        evt.directHit.add(target);
                    } else if (evt.directHit.indexOf(target) == -1) {
                        evt.directHit.push(target);
                    }

                    player.line(target, "fire");
                    game.log(target, "成为了", player, "的【孤烟】目标");
                    game.log(target, "不能使用【闪】响应此【杀】");
                },
            },

            zus_guyan_mark: {
                mark: true,
                intro: {
                    content: function (storage, player) {
                        var list = window.Zus && Zus.storage ? Zus.storage(player, "zus_guyan_targets", []) : [];
                        if (!list.length) return "当前没有【孤烟】目标。";

                        var names = [];
                        for (var i = 0; i < list.length; i++) {
                            var target = list[i];
                            if (!target) continue;

                            try {
                                if (globalThis.get && globalThis.get.translation) {
                                    names.push(globalThis.get.translation(target));
                                } else {
                                    names.push(target.name || target.name1 || "未知角色");
                                }
                            } catch (e) {
                                names.push(target.name || target.name1 || "未知角色");
                            }
                        }

                        return "当前【孤烟】目标：" + names.join("、");
                    },
                },
            },

            zus_guyan_clear: {
                trigger: { player: "phaseBegin" },
                forced: true,
                silent: true,
                popup: false,

                filter: function (event, player) {
                    var list = window.Zus && Zus.storage ? Zus.storage(player, "zus_guyan_targets", []) : [];
                    return !!list.length;
                },

                content: function () {
                    if (window.Zus && Zus.setStorage) {
                        Zus.setStorage(player, "zus_guyan_targets", []);
                    }
                    player.unmarkSkill("zus_guyan_mark");
                },
            },

            zus_guyan_begin: {
                trigger: { global: "phaseBegin" },
                forced: true,
                popup: false,

                filter: function (event, player) {
                    return window.Zus && Zus.callHelper ? !!Zus.callHelper("langyan", "isGuyanTarget", player, event.player) : false;
                },

                content: function () {
                    if (player.changeHujia) {
                        player.changeHujia(1);
                    } else {
                        if (typeof player.hujia != "number") player.hujia = 0;
                        player.hujia++;
                        if (player.update) player.update();
                        game.log(player, "获得了1点护甲");
                    }
                },
            },

            zus_guyan_end: {
                trigger: { global: "phaseEnd" },
                forced: true,
                popup: false,

                filter: function (event, player) {
                    return window.Zus && Zus.callHelper ? !!Zus.callHelper("langyan", "isGuyanTarget", player, event.player) : false;
                },

                content: function () {
                    "step 0"
                    player.chooseControl(
                        "增加1点体力上限",
                        "恢复1点体力",
                        "摸两张牌"
                    ).set("prompt", "孤烟：选择一项")
                        .set("ai", function () {
                            var player = _status.event.player;
                            if (player.isDamaged && player.isDamaged()) return "恢复1点体力";
                            return "摸两张牌";
                        });

                    "step 1"
                    if (result.control == "增加1点体力上限") {
                        player.gainMaxHp();
                    } else if (result.control == "恢复1点体力") {
                        player.recover();
                    } else {
                        player.draw(2);
                    }
                },
            },

            zus_guyan_sha_directHit: {
                trigger: { global: ["useCardToTargeted", "useCardToPlayered"] },
                forced: true,
                charlotte: true,
                popup: false,

                filter: function (event, player) {
                    if (!(window.Zus && Zus.callHelper ? Zus.callHelper("langyan", "isGuyanTarget", player, event.player) : false)) return false;
                    if (!event.card || globalThis.zusLangyanSafeName(event.card, event.player) != "sha") return false;
                    return true;
                },

                content: function () {
                    var target = trigger.target || trigger.player;
                    var evt = trigger.getParent();

                    if (!target || !evt) return;

                    if (!evt.directHit) evt.directHit = [];

                    if (evt.directHit.add) {
                        evt.directHit.add(target);
                    } else if (evt.directHit.indexOf(target) == -1) {
                        evt.directHit.push(target);
                    }

                    game.log(target, "不能使用【闪】响应此【杀】");
                },
            },

            zus_guyan_redirect: {
                trigger: { global: "useCardToBefore" },
                forced: true,
                charlotte: true,
                popup: false,
                priority: 20,

                filter: function (event, player) {
                    if (!event.player || !(window.Zus && Zus.callHelper ? Zus.callHelper("langyan", "isGuyanTarget", player, event.player) : false)) return false;
                    if (!event.card) return false;
                    if (!event.target) return false;
                    if (!event.targets || event.targets.length != 1) return false;
                    if (event.target == event.player) return false;
                    if (event.target == player) return false;

                    var name = safeName(event.card, event.player);
                    var allowed = [
                        "sha",
                        "juedou",
                        "huogong",
                        "guohe",
                        "shunshou",
                        "lebu",
                        "bingliang",
                    ];

                    return allowed.indexOf(name) != -1;
                },

                content: function () {
                    var old = trigger.target;
                    var enabled = false;

                    try {
                        enabled = lib.filter.targetEnabled(
                            trigger.card,
                            trigger.player,
                            player
                        );
                    } catch (e) {
                        enabled = false;
                    }

                    if (enabled) {
                        if (trigger.targets) {
                            if (trigger.targets.remove) {
                                trigger.targets.remove(old);
                            } else {
                                var index = trigger.targets.indexOf(old);
                                if (index != -1) trigger.targets.splice(index, 1);
                            }

                            if (trigger.targets.add) {
                                trigger.targets.add(player);
                            } else if (trigger.targets.indexOf(player) == -1) {
                                trigger.targets.push(player);
                            }
                        }

                        trigger.target = player;
                        game.log(old, "作为目标被", player, "替代");
                    } else {
                        trigger.cancel();
                        game.log(trigger.card, "对", old, "无效");
                    }
                },
            },
        },

        translate: {
            zus_group_huan: "幻",
            zus_group_huan2: "幻",
            zus_langyan: "狼烟",
            zus_langyan_ab: "狼烟",

            zus_shuangmo: "霜漠",
            zus_shuangmo_info:
                "锁定技，你的判定区视为存在一张【兵粮寸断】。当其生效后，你挑选弃牌堆中任意一张【杀】加入手牌，本回合内，此【杀】无视距离且不可被【闪】响应。",

            zus_guyan: "孤烟",
            zus_guyan_info:
                "出牌阶段，你使用【杀】指定目标后，直到你的下个回合开始阶段：其使用的【杀】不可被【闪】响应；其回合开始阶段，你增加1点护甲；其回合结束阶段，你选择一项：增加1点体力上限、恢复1点体力、摸两张牌。其选择唯一其他角色为牌或技能的目标时，若你是合法目标，则目标转移至你；否则此牌对原目标无效。",

            zus_guyan_mark: "孤烟目标",
            zus_guyan_mark_info: "当前处于【孤烟】影响的角色。",
        },

        sort: ["zus_langyan"],

        title: {
            zus_langyan: "北帝",
        },
    };
})();
