(function () {
    if (typeof window === "undefined") return;
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof _status === "undefined") var _status = globalThis._status;
    if (typeof ui === "undefined") var ui = globalThis.ui;

    window.Zus = window.Zus || {};
    window.Zus.helpers = window.Zus.helpers || {};
    window.Zus.helperAliases = window.Zus.helperAliases || {};
    window.Zus.helperErrors = window.Zus.helperErrors || [];

    var root = typeof globalThis !== "undefined" ? globalThis : window;

    window.Zus.runtime = function (options) {
        var opts = options || {};
        var topWindow = null;
        try {
            topWindow = window.top || null;
        } catch (e) {}
        var pick = function (override, topKey, rootKey, localValue) {
            if (override) return override;
            try {
                if (topWindow && topWindow[topKey]) return topWindow[topKey];
            } catch (e2) {}
            try {
                if (root && root[rootKey]) return root[rootKey];
            } catch (e3) {}
            return localValue || null;
        };
        return {
            lib: pick(opts.lib, "lib", "lib", lib),
            game: pick(opts.game, "game", "game", game),
            get: pick(opts.getter || opts.get, "get", "get", get),
            ui: pick(opts.ui, "ui", "ui", ui),
            status: pick(opts.status || opts._status, "_status", "_status", _status),
            event: opts.event || null,
            trigger: opts.trigger || null,
            player: opts.player || null,
        };
    };

    window.Zus.runtimeLib = function (options) {
        return window.Zus.runtime(options).lib;
    };

    window.Zus.runtimeGame = function (options) {
        return window.Zus.runtime(options).game;
    };

    window.Zus.runtimeGet = function (options) {
        return window.Zus.runtime(options).get;
    };

    window.Zus.runtimeUi = function (options) {
        return window.Zus.runtime(options).ui;
    };

    window.Zus.runtimeStatus = function (options) {
        return window.Zus.runtime(options).status;
    };

    window.Zus.reportHelperError = function (namespace, name, error) {
        var item = {
            namespace: namespace,
            name: name,
            message: error && error.message ? error.message : String(error),
        };
        window.Zus.helperErrors.push(item);
        if (window.Zus.helperErrors.length > 30) {
            window.Zus.helperErrors = window.Zus.helperErrors.slice(-30);
        }
        try {
            if (root.ZUS_DEBUG && root.console && console.warn) {
                console.warn("[Zus helper]", namespace + "." + name, item.message);
            }
        } catch (e) {}
        return null;
    };

    window.Zus.safeColor = function (card, player, options) {
        if (!card) return null;
        try {
            var getter = window.Zus.runtimeGet(options);
            if (getter && getter.color) return getter.color(card, player);
        } catch (e) {}
        try {
            return card.color || null;
        } catch (e2) {}
        return null;
    };

    window.Zus.safeSuit = function (card, player, options) {
        if (!card) return null;
        try {
            var getter = window.Zus.runtimeGet(options);
            if (getter && getter.suit) return getter.suit(card, player);
        } catch (e) {}
        try {
            return card.suit || null;
        } catch (e2) {}
        return null;
    };

    window.Zus.safeNumber = function (card, player, options) {
        if (!card) return null;
        try {
            var getter = window.Zus.runtimeGet(options);
            if (getter && getter.number) return getter.number(card, player);
        } catch (e) {}
        try {
            return typeof card.number === "number" ? card.number : null;
        } catch (e2) {}
        return null;
    };

    window.Zus.safeName = function (card, player, options) {
        if (!card) return null;
        try {
            var getter = window.Zus.runtimeGet(options);
            if (getter && getter.name) return getter.name(card, player);
        } catch (e) {}
        try {
            return card.name || null;
        } catch (e2) {}
        return null;
    };

    window.Zus.safeType = function (card, player, options) {
        if (!card) return null;
        try {
            var getter = window.Zus.runtimeGet(options);
            if (getter && getter.type) return getter.type(card, player);
        } catch (e) {}
        try {
            var getter2 = window.Zus.runtimeGet(options);
            if (getter2 && getter2.type2) return getter2.type2(card, player);
        } catch (e2) {}
        return null;
    };

    window.Zus.safeSubtype = function (card, player, options) {
        if (!card) return null;
        try {
            var getter = window.Zus.runtimeGet(options);
            if (getter && getter.subtype) return getter.subtype(card, player);
        } catch (e) {}
        return null;
    };

    window.Zus.players = function (options) {
        try {
            var currentGame = window.Zus.runtimeGame(options);
            if (currentGame && currentGame.filterPlayer) return currentGame.filterPlayer();
        } catch (e) {}
        try {
            var currentGame2 = window.Zus.runtimeGame(options);
            return (currentGame2 && currentGame2.players) ? currentGame2.players : [];
        } catch (e2) {}
        return [];
    };

    window.Zus.eventParent = function (event, name) {
        if (!event || typeof event.getParent !== "function") return null;
        try {
            return name ? event.getParent(name) : event.getParent();
        } catch (e) {
            return null;
        }
    };

    window.Zus.currentPhase = function (event, options) {
        try {
            var phase = window.Zus.eventParent(event, "phase");
            if (phase && phase.player) return phase.player;
        } catch (e) {}
        try {
            var status = window.Zus.runtimeStatus(options);
            return status && status.currentPhase;
        } catch (e2) {}
        return null;
    };

    window.Zus.inOwnPhase = function (event, player, options) {
        return window.Zus.currentPhase(event, options) == player;
    };

    window.Zus.inPhaseUse = function (event, player, options) {
        var phaseUse = window.Zus.eventParent(event, "phaseUse");
        if (phaseUse) return phaseUse.player == player;
        return window.Zus.inOwnPhase(event, player, options);
    };

    window.Zus.sameCard = function (cardA, cardB) {
        if (!cardA || !cardB) return false;
        if (cardA === cardB) return true;
        try {
            if (cardA.cardid && cardB.cardid) return cardA.cardid === cardB.cardid;
        } catch (e) {}
        return false;
    };

    window.Zus.safeCanUse = function (player, card, target, options) {
        if (!player || !card || !target) return false;
        var name = window.Zus.safeName(card, player, options);
        if (!name) return false;
        card.name = card.name || name;
        if (!target.isIn || !target.isIn()) return false;
        try {
            if (player.canUse) return player.canUse(card, target, false);
        } catch (e) {}
        try {
            var currentLib = window.Zus.runtimeLib(options);
            if (currentLib && currentLib.filter && currentLib.filter.targetEnabled) {
                return currentLib.filter.targetEnabled(card, player, target);
            }
        } catch (e2) {}
        return false;
    };

    window.Zus.storage = function (player, key, fallback) {
        if (window.Sync && typeof Sync.getStorage === "function") {
            return Sync.getStorage(player, key, fallback);
        }
        if (!player || !player.storage || !(key in player.storage)) return fallback;
        return player.storage[key];
    };

    window.Zus.setStorage = function (player, key, value) {
        if (window.Sync && typeof Sync.setStorage === "function") {
            return Sync.setStorage(player, key, value);
        }
        if (!player) return value;
        if (!player.storage) player.storage = {};
        player.storage[key] = value;
        if (typeof player.syncStorage === "function") player.syncStorage(key);
        return value;
    };

    window.Zus.deleteStorage = function (player, key) {
        if (window.Sync && typeof Sync.deleteStorage === "function") {
            return Sync.deleteStorage(player, key);
        }
        if (!player || !player.storage) return;
        delete player.storage[key];
        if (typeof player.syncStorage === "function") player.syncStorage(key);
    };

    window.Zus.ensureArray = function (player, key) {
        if (window.Sync && typeof Sync.ensureArray === "function") {
            return Sync.ensureArray(player, key);
        }
        if (!player) return [];
        if (!player.storage) player.storage = {};
        if (!Array.isArray(player.storage[key])) player.storage[key] = [];
        return player.storage[key];
    };

    window.Zus.pushUnique = function (player, key, value) {
        if (window.Sync && typeof Sync.pushUnique === "function") {
            return Sync.pushUnique(player, key, value);
        }
        var list = window.Zus.ensureArray(player, key);
        if (list.indexOf(value) === -1) list.push(value);
        return list;
    };

    window.Zus.pushValue = function (player, key, value) {
        if (window.Sync && typeof Sync.pushValue === "function") {
            return Sync.pushValue(player, key, value);
        }
        var list = window.Zus.ensureArray(player, key);
        list.push(value);
        return list;
    };

    window.Zus.removeValue = function (player, key, value) {
        if (window.Sync && typeof Sync.removeValue === "function") {
            return Sync.removeValue(player, key, value);
        }
        var list = window.Zus.ensureArray(player, key);
        for (var i = list.length - 1; i >= 0; i--) {
            if (list[i] === value) list.splice(i, 1);
        }
        return list;
    };

    window.Zus.eventCards = function (event, unique) {
        var cards = [];
        if (!event) return cards;
        try {
            if (typeof event.getd === "function") {
                var fromGetd = event.getd();
                if (fromGetd && fromGetd.length) cards.addArray ? cards.addArray(fromGetd) : cards.push.apply(cards, fromGetd);
            }
        } catch (e) {}
        if (event.cards && event.cards.length) {
            cards.addArray ? cards.addArray(event.cards) : cards.push.apply(cards, event.cards);
        }
        if (event.cards2 && event.cards2.length) {
            cards.addArray ? cards.addArray(event.cards2) : cards.push.apply(cards, event.cards2);
        }
        if (unique && cards.unique) return cards.unique();
        if (!unique) return cards;
        var deduped = [];
        for (var i = 0; i < cards.length; i++) {
            var exists = false;
            for (var j = 0; j < deduped.length; j++) {
                if (window.Zus.sameCard(cards[i], deduped[j])) {
                    exists = true;
                    break;
                }
            }
            if (!exists) deduped.push(cards[i]);
        }
        return deduped;
    };

    window.Zus.getDiscardCard = function (filter, start, options) {
        var getter = window.Zus.runtimeGet(options);
        if (!getter || typeof getter.discardPile !== "function") return null;
        try {
            return getter.discardPile(filter, start || "top");
        } catch (e) {
            return null;
        }
    };

    window.Zus.getDiscardCards = function (filter, start, options) {
        var list = [];
        var position = start || "top";
        var getter = window.Zus.runtimeGet(options);
        if (getter && typeof getter.cardPile === "function") {
            try {
                if (position === "random") {
                    var randomCard = getter.cardPile(filter, "discardPile", "random");
                    if (randomCard) list.push(randomCard);
                    return list;
                }
            } catch (e) {}
        }
        var currentUi = window.Zus.runtimeUi(options);
        if (!currentUi || !currentUi.discardPile || !currentUi.discardPile.childNodes) return list;
        var nodes = currentUi.discardPile.childNodes;
        if (position === "bottom") {
            for (var i = nodes.length - 1; i >= 0; i--) {
                if (!filter || filter(nodes[i])) list.push(nodes[i]);
            }
            return list;
        }
        for (var j = 0; j < nodes.length; j++) {
            if (!filter || filter(nodes[j])) list.push(nodes[j]);
        }
        return list;
    };

    window.Zus.getDiscardCardsSafe = function (filter, options) {
        var opts = options || {};
        var runtime = window.Zus.runtime(opts);
        var list = [];
        var getter = runtime.get;
        var currentGame = runtime.game;
        var currentUi = runtime.ui;
        var currentStatus = runtime.status;
        var debug = opts.debug || null;
        var debugHits = [];
        var debugSourceCount = {};
        var debugRejected = [];
        var debugAttempts = {};
        var allowRandom = !!opts.allowRandom;
        if (debug) {
            debug.safeDiscardRuntime = {
                hasGetter: !!getter,
                hasGetterOverride: !!(opts.getter || opts.get),
                hasCardPile: !!(getter && typeof getter.cardPile === "function"),
                hasDiscardPile: !!(getter && typeof getter.discardPile === "function"),
                hasPosition: !!(getter && typeof getter.position === "function"),
                hasGame: !!currentGame,
                hasGameOverride: !!opts.game,
                hasGlobalHistory: !!(currentGame && typeof currentGame.getAllGlobalHistory === "function"),
                hasStatus: !!currentStatus,
                hasStatusOverride: !!opts.status,
                statusDiscardedCount: currentStatus && currentStatus.discarded && currentStatus.discarded.length ? currentStatus.discarded.length : 0,
                hasUi: !!currentUi,
                hasUiOverride: !!opts.ui,
                hasDomDiscardPile: !!(currentUi && currentUi.discardPile && currentUi.discardPile.childNodes),
                allowRandom: allowRandom,
            };
        }
        var addDebugHit = function (card, source) {
            if (!debug || !source) return;
            debugSourceCount[source] = (debugSourceCount[source] || 0) + 1;
            var item = { source: source };
            try {
                item.name = window.Zus.safeName ? window.Zus.safeName(card) : card && card.name;
            } catch (e) {}
            try {
                item.position = getter && getter.position ? getter.position(card, true) : null;
            } catch (e2) {}
            debugHits.push(item);
        };
        var pass = function (card) {
            if (!card) return false;
            try {
                if (filter && !filter(card)) return false;
            } catch (e) {
                return false;
            }
            return true;
        };
        var reject = function (card, source, reason) {
            if (!debug || !source) return;
            debugRejected.push({
                source: source,
                reason: reason,
                name: card && card.name,
            });
        };
        var stillInDiscard = function (card) {
            if (!card) return false;
            try {
                if (getter && typeof getter.position === "function") {
                    return getter.position(card, true) === "d";
                }
            } catch (e) {}
            try {
                return !!(currentUi && currentUi.discardPile && card.parentNode === currentUi.discardPile);
            } catch (e2) {}
            return true;
        };
        var finish = function () {
            if (debug) {
                debug.safeDiscardAttempts = debugAttempts;
                debug.safeDiscardSourceCount = debugSourceCount;
                debug.safeDiscardHits = debugHits;
                debug.safeDiscardRejected = debugRejected;
                debug.safeDiscardSource = debugHits.length ? debugHits[0].source : null;
                debug.safeDiscardResultCount = list.length;
            }
            return opts.limit ? list.slice(0, opts.limit) : list;
        };
        var add = function (card, requireDiscardPosition, source) {
            if (source) debugAttempts[source] = (debugAttempts[source] || 0) + 1;
            if (!card) {
                reject(card, source, "empty");
                return false;
            }
            if (!pass(card)) {
                reject(card, source, "filter");
                return false;
            }
            if (requireDiscardPosition && !stillInDiscard(card)) {
                reject(card, source, "position");
                return false;
            }
            for (var i = 0; i < list.length; i++) {
                if (window.Zus.sameCard(list[i], card)) {
                    reject(card, source, "duplicate");
                    return false;
                }
            }
            list.push(card);
            addDebugHit(card, source);
            return true;
        };

        if (getter && typeof getter.cardPile === "function") {
            try {
                add(getter.cardPile(filter, "discardPile"), false, "get.cardPile.top");
            } catch (e) {}
            try {
                add(getter.cardPile(filter, "discardPile", "bottom"), false, "get.cardPile.bottom");
            } catch (e2) {}
            if (allowRandom) {
                try {
                    add(getter.cardPile(filter, "discardPile", "random"), false, "get.cardPile.random");
                } catch (e3) {}
            }
        }
        if (getter && typeof getter.discardPile === "function") {
            try {
                add(getter.discardPile(filter, "top"), false, "get.discardPile.top");
            } catch (e4) {}
            try {
                add(getter.discardPile(filter, "bottom"), false, "get.discardPile.bottom");
            } catch (e5) {}
            if (allowRandom) {
                try {
                    add(getter.discardPile(filter, "random"), false, "get.discardPile.random");
                } catch (e6) {}
            }
        }

        try {
            if (currentStatus && currentStatus.discarded && currentStatus.discarded.length) {
                for (var sd = 0; sd < currentStatus.discarded.length; sd++) {
                    var statusCard = currentStatus.discarded[sd];
                    var inDiscard = true;
                    try {
                        inDiscard = !statusCard.filterInD || statusCard.filterInD("d");
                    } catch (eStatus) {}
                    if (inDiscard) add(statusCard, false, "status.discarded");
                    else reject(statusCard, "status.discarded", "filterInD");
                }
                if (opts.limit && list.length >= opts.limit) return finish();
            }
        } catch (eStatus2) {}

        try {
            if (currentGame && typeof currentGame.getAllGlobalHistory === "function") {
                var history = currentGame.getAllGlobalHistory("cardMove") || [];
                for (var h = history.length - 1; h >= 0; h--) {
                    var evt = history[h];
                    if (!evt) continue;
                    var likelyDiscard =
                        evt.name === "cardsDiscard" ||
                        evt.name === "discard" ||
                        evt.name === "loseToDiscardpile" ||
                        (evt.name === "lose" && (!currentUi || !evt.position || evt.position === currentUi.discardPile));
                    if (!likelyDiscard) continue;
                    var cards = [];
                    if (evt.cards && evt.cards.length) cards = cards.concat(evt.cards);
                    if (evt.cards2 && evt.cards2.length) cards = cards.concat(evt.cards2);
                    if (typeof evt.getd === "function") {
                        try {
                            var d = evt.getd();
                            if (d && d.length) cards = cards.concat(d);
                        } catch (e7) {}
                    }
                    for (var c = 0; c < cards.length; c++) add(cards[c], true, "globalHistory");
                    if (opts.limit && list.length >= opts.limit) return finish();
                }
            }
        } catch (e8) {}

        if (!list.length && currentUi && currentUi.discardPile && currentUi.discardPile.childNodes) {
            // Legacy-engine/debug fallback only: primary discard access should use engine APIs/history, not DOM nodes.
            var nodes = currentUi.discardPile.childNodes;
            for (var j = 0; j < nodes.length; j++) add(nodes[j], false, "domFallback");
        }

        return finish();
    };

    window.Zus.exposeHelper = function (namespace, name, globalName) {
        if (!namespace || !name || !globalName) return null;
        var alias = String(globalName);
        window.Zus.helperAliases[alias] = namespace + "." + name;
        var wrapper = function () {
            var args = [namespace, name];
            for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
            return window.Zus.callHelper.apply(window.Zus, args);
        };
        root[alias] = wrapper;
        try {
            window[alias] = wrapper;
        } catch (e) {}
        return wrapper;
    };

    window.Zus.bindHelper = function (namespace, name, fn, options) {
        if (!namespace || !name || typeof fn !== "function") return fn;
        var opts = {};
        if (typeof options === "string") {
            opts.globalName = options;
        } else if (options) {
            opts = options;
        }
        if (!window.Zus.helpers[namespace]) window.Zus.helpers[namespace] = {};
        if (!window.Zus.helpers[namespace][name] || opts.overwrite) {
            window.Zus.helpers[namespace][name] = fn;
        }
        if (opts.globalName) {
            window.Zus.exposeHelper(namespace, name, opts.globalName);
        }
        return window.Zus.helpers[namespace][name];
    };

    window.Zus.hasHelper = function (namespace, name) {
        return !!(namespace && name && window.Zus.helpers[namespace] && typeof window.Zus.helpers[namespace][name] === "function");
    };

    window.Zus.getHelper = function (namespace, name) {
        if (!window.Zus.hasHelper(namespace, name)) return null;
        return window.Zus.helpers[namespace][name];
    };

    window.Zus.callHelper = function (namespace, name) {
        if (!namespace || !name) return null;
        var group = window.Zus.helpers[namespace];
        if (!group || typeof group[name] !== "function") return null;
        try {
            return group[name].apply(null, Array.prototype.slice.call(arguments, 2));
        } catch (e) {
            return window.Zus.reportHelperError(namespace, name, e);
        }
    };

    window.Zus.bindHelper("core", "safeName", window.Zus.safeName, "zusSafeName");
    window.Zus.bindHelper("core", "safeColor", window.Zus.safeColor, "zusSafeColor");
    window.Zus.bindHelper("core", "safeSuit", window.Zus.safeSuit, "zusSafeSuit");
    window.Zus.bindHelper("core", "safeNumber", window.Zus.safeNumber, "zusSafeNumber");
    window.Zus.bindHelper("core", "safeType", window.Zus.safeType, "zusSafeType");
    window.Zus.bindHelper("core", "safeSubtype", window.Zus.safeSubtype, "zusSafeSubtype");
    window.Zus.bindHelper("core", "safeCanUse", window.Zus.safeCanUse, "zusSafeCanUse");
    window.Zus.bindHelper("core", "players", window.Zus.players, "zusPlayers");
    window.Zus.bindHelper("core", "eventCards", window.Zus.eventCards, "zusEventCards");
    window.Zus.bindHelper("core", "getDiscardCards", window.Zus.getDiscardCards, "zusGetDiscardCards");
    window.Zus.bindHelper("core", "getDiscardCardsSafe", window.Zus.getDiscardCardsSafe, "zusGetDiscardCardsSafe");
    window.Zus.bindHelper("core", "runtime", window.Zus.runtime, "zusRuntime");
    window.Zus.bindHelper("core", "runtimeLib", window.Zus.runtimeLib, "zusRuntimeLib");
    window.Zus.bindHelper("core", "runtimeGame", window.Zus.runtimeGame, "zusRuntimeGame");
    window.Zus.bindHelper("core", "runtimeGet", window.Zus.runtimeGet, "zusRuntimeGet");
    window.Zus.bindHelper("core", "runtimeUi", window.Zus.runtimeUi, "zusRuntimeUi");
    window.Zus.bindHelper("core", "runtimeStatus", window.Zus.runtimeStatus, "zusRuntimeStatus");

    // Safe wrappers: prevent 1.11.2 arrangeTrigger/check phase from crashing on empty virtual cards.
    if (get && !get.zusSafeWrapped) {
        get.zusSafeWrapped = true;
        var oldName = get.name;
        var oldType = get.type;
        var oldType2 = get.type2;
        var oldSubtype = get.subtype;
        var oldColor = get.color;
        if (typeof oldName === "function") {
            get.name = function (card, player) {
                if (!card) return null;
                try { return oldName.apply(this, arguments); } catch (e) { return card && card.name || null; }
            };
        }
        if (typeof oldType === "function") {
            get.type = function (card, player) {
                if (!card) return null;
                try { return oldType.apply(this, arguments); } catch (e) {
                    try { return oldType2 ? oldType2.apply(this, arguments) : null; } catch (e2) { return null; }
                }
            };
        }
        if (typeof oldType2 === "function") {
            get.type2 = function (card, player) {
                if (!card) return null;
                try { return oldType2.apply(this, arguments); } catch (e) { return null; }
            };
        }
        if (typeof oldSubtype === "function") {
            get.subtype = function (card, player) {
                if (!card) return null;
                try { return oldSubtype.apply(this, arguments); } catch (e) { return null; }
            };
        }
        if (typeof oldColor === "function") {
            get.color = function (card, player) {
                if (!card) return null;
                try { return oldColor.apply(this, arguments); } catch (e) { return card && card.color || null; }
            };
        }
    }

    var currentGame3 = window.Zus.runtimeGame();
    if (currentGame3) {
        currentGame3.zusSafeName = window.Zus.safeName;
        currentGame3.zusSafeType = window.Zus.safeType;
        currentGame3.zusSafeColor = window.Zus.safeColor;
        currentGame3.zusSafeSubtype = window.Zus.safeSubtype;
        currentGame3.zusSafePlayers = window.Zus.players;
        currentGame3.zusCurrentPhase = window.Zus.currentPhase;
        currentGame3.zusSafeCanUse = window.Zus.safeCanUse;
        currentGame3.zusEventCards = window.Zus.eventCards;
        currentGame3.zusGetDiscardCard = window.Zus.getDiscardCard;
        currentGame3.zusGetDiscardCards = window.Zus.getDiscardCards;
        currentGame3.zusGetDiscardCardsSafe = window.Zus.getDiscardCardsSafe;
        currentGame3.zusRuntime = window.Zus.runtime;
    }
})();
