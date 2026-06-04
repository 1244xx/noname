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
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function setStorage(player, key, value) {
        if (typeof Sync !== "undefined" && Sync && typeof Sync.setStorage === "function") {
            Sync.setStorage(player, key, value);
            return;
        }
        if (!player.storage) player.storage = {};
        player.storage[key] = value;
        if (typeof player.syncStorage === "function") {
            player.syncStorage(key);
        }
    }

    globalThis.zusLierSetStorage = setStorage;

    function appendSanqingDebug(debug) {
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (!req) return;
            var fs = req("fs");
            fs.appendFileSync(
                "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/lier_sanqing_debug.log",
                JSON.stringify(debug) + "\n",
                "utf8"
            );
        } catch (e) {
        }
    }

    function writeSanqingDebug(debug) {
        if (!debug) return;
        if (!debug.timestamp) debug.timestamp = Date.now();
        globalThis.zusLierSanqingDebug = debug;
        appendSanqingDebug(debug);
        try {
            localStorage.setItem("zus_lier_sanqing_debug", JSON.stringify(debug));
        } catch (e) {
        }
    }

    function getSanqingInfo(player) {
        if (!player || !player.storage || !player.storage.zus_sanqing_card) return null;
        var info = player.storage.zus_sanqing_card;
        if (!info || !info.name) return null;
        return {
            name: info.name,
            nature: info.nature || null,
        };
    }

    function buildSanqingViewAs(player, cards) {
        var info = getSanqingInfo(player);
        if (!info) return null;
        var card = {
            name: info.name,
            isCard: true,
        };
        if (info.nature) card.nature = info.nature;
        var realCards = [];
        try {
            if (cards && typeof cards.length == "number") {
                for (var i = 0; i < cards.length; i++) {
                    if (cards[i]) realCards.push(cards[i]);
                }
            }
        } catch (e) {
        }
        if (realCards.length) {
            card.cards = realCards.slice(0);
        }
        return card;
    }

    function sanqingName(card, player) {
        var getter = globalThis.get || get;
        try {
            return getter && getter.name ? getter.name(card, player) : (card && card.name) || null;
        } catch (e) {
        }
        return (card && card.name) || null;
    }

    function sanqingValue(card, player) {
        var getter = globalThis.get || get;
        try {
            if (getter && getter.value) return getter.value(card, player);
        } catch (e) {
        }
        try {
            if (getter && getter.value) return getter.value(card);
        } catch (e2) {
        }
        return 0;
    }

    function sanqingTranslation(item) {
        var getter = globalThis.get || get;
        try {
            if (getter && getter.translation) return getter.translation(item);
        } catch (e) {
        }
        if (item && item.name) return item.name;
        return item || "";
    }

    function sanqingType(card, player) {
        var getter = globalThis.get || get;
        var name = sanqingName(card, player);
        var delayNames = {
            lebu: true,
            bingliang: true,
            shandian: true,
            fulei: true,
            caomu: true,
        };
        var basicNames = {
            sha: true,
            shan: true,
            tao: true,
            jiu: true,
            du: true,
        };
        var equipNames = {
            zhuge: true,
            cixiong: true,
            qinggang: true,
            qinglong: true,
            zhangba: true,
            guanshi: true,
            fangtian: true,
            qilin: true,
            bagua: true,
            renwang: true,
            tengjia: true,
            baiyin: true,
            muniu: true,
            hualiu: true,
            zhuahuang: true,
            dilu: true,
            jueying: true,
            chitu: true,
            dawan: true,
            zixin: true,
            wufengjian: true,
            feilongduofeng: true,
            taipingyaoshu: true,
            dinglanyemingzhu: true,
        };
        try {
            var type = getter && getter.type ? getter.type(card, player) : null;
            if (type) return type;
        } catch (e) {
        }
        try {
            var typeSimple = getter && getter.type ? getter.type(card) : null;
            if (typeSimple) return typeSimple;
        } catch (e) {
        }
        try {
            var type2 = getter && getter.type2 ? getter.type2(card, player) : null;
            if (type2) return type2;
        } catch (e) {
        }
        try {
            var type2Simple = getter && getter.type2 ? getter.type2(card) : null;
            if (type2Simple) return type2Simple;
        } catch (e) {
        }
        if (card && card.type) return card.type;
        try {
            var plainType = getter && getter.type ? getter.type({ name: name }, player) : null;
            if (plainType) return plainType;
        } catch (e) {
        }
        try {
            var plainTypeSimple = getter && getter.type ? getter.type({ name: name }) : null;
            if (plainTypeSimple) return plainTypeSimple;
        } catch (e) {
        }
        try {
            var plainType2 = getter && getter.type2 ? getter.type2({ name: name }, player) : null;
            if (plainType2) return plainType2;
        } catch (e) {
        }
        var runtimeLib =
            globalThis.lib ||
            lib ||
            (typeof window != "undefined" && window.top && window.top.lib ? window.top.lib : null);
        if (runtimeLib && runtimeLib.card && name && runtimeLib.card[name] && runtimeLib.card[name].type) {
            return runtimeLib.card[name].type;
        }
        if (name) {
            if (basicNames[name]) return "basic";
            if (delayNames[name]) return "delay";
            if (equipNames[name]) return "equip";
            return "trick";
        }
        return null;
    }

    function lostHandCards(event, player) {
        if (!event || !player) return [];
        try {
            if (event.player == player && event.hs && event.hs.length) return event.hs.slice(0);
        } catch (e) {
        }
        try {
            var evt = event.getl && event.getl(player);
            if (evt && evt.player == player && evt.hs && evt.hs.length) return evt.hs.slice(0);
        } catch (e2) {
        }
        return [];
    }

    globalThis.zusLierWriteSanqingDebug = writeSanqingDebug;
    globalThis.zusLierBuildSanqingViewAs = buildSanqingViewAs;
    globalThis.zusLierGetSanqingInfo = getSanqingInfo;
    globalThis.zusLierSanqingName = sanqingName;
    globalThis.zusLierSanqingValue = sanqingValue;
    globalThis.zusLierSanqingTranslation = sanqingTranslation;
    globalThis.zusLierSanqingType = sanqingType;
    globalThis.zusLierLostHandCards = lostHandCards;
    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("lier", "getSanqingInfo", getSanqingInfo, "zusLierGetSanqingInfo");
        Zus.bindHelper("lier", "buildSanqingViewAs", buildSanqingViewAs, "zusLierBuildSanqingViewAs");
        Zus.bindHelper("lier", "sanqingName", sanqingName, "zusLierSanqingName");
        Zus.bindHelper("lier", "sanqingValue", sanqingValue, "zusLierSanqingValue");
        Zus.bindHelper("lier", "sanqingTranslation", sanqingTranslation, "zusLierSanqingTranslation");
        Zus.bindHelper("lier", "sanqingType", sanqingType, "zusLierSanqingType");
        Zus.bindHelper("lier", "lostHandCards", lostHandCards, "zusLierLostHandCards");
    }
    writeSanqingDebug({
        stage: "sanqing_module_loaded",
        extName: EXT_NAME,
    });


    window.zusfylriModules["lier"] = {
        key: "lier",

        character: {
            zus_lier: char("male", "shen", 3, ["zus_sanqing", "zus_sunbu"], "zus_lier", "png"),
        },

        skill: {
            zus_sanqing: {
                trigger: {
                    player: "useCardAfter",
                },
                direct: true,
                init: function (player) {
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_init",
                        player: player && player.name,
                        skills: player && player.getSkills ? player.getSkills(null, false, false).slice(0) : [],
                    });
                },
                filter: function (event, player) {
                    var sourceCard =
                        event && event.cards && event.cards.length
                            ? event.cards[0]
                            : event && event.card
                              ? event.card
                              : null;
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_filter_enter",
                        player: player && player.name,
                        eventName: event && event.name,
                        cardName: sourceCard ? globalThis.zusLierSanqingName(sourceCard, player) : null,
                        skill: event && event.skill ? event.skill : null,
                        used: !!(player.storage && player.storage.zus_sanqing_used),
                        rawEventCardName: event && event.card ? globalThis.zusLierSanqingName(event.card, player) : null,
                        rawCardsLength: event && event.cards ? event.cards.length : 0,
                    });
                    var phaseUse = event.getParent("phaseUse");
                    var phaseUsePlayer = phaseUse ? (phaseUse.player || phaseUse.source || null) : null;
                    var samePlayer =
                        phaseUsePlayer === player ||
                        !!(
                            phaseUsePlayer &&
                            player &&
                            phaseUsePlayer.playerid &&
                            player.playerid &&
                            phaseUsePlayer.playerid == player.playerid
                        );
                    var hasPhaseUse = !!(phaseUse && phaseUse.name == "phaseUse");
                    var hasCard = !!sourceCard;
                    var alreadyUsed = !!(player.storage && player.storage.zus_sanqing_used);
                    var fromSelfViewAs = event.skill == "zus_sanqing_viewas";
                    var type = hasCard ? globalThis.zusLierSanqingType(sourceCard, player) : null;
                    var pass = samePlayer && hasPhaseUse && hasCard && !alreadyUsed && !fromSelfViewAs && (type == "basic" || type == "trick");
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_filter_decision",
                        player: player && player.name,
                        eventName: event && event.name,
                        phaseUsePlayerName: phaseUsePlayer && phaseUsePlayer.name,
                        phaseUsePlayerId: phaseUsePlayer && phaseUsePlayer.playerid,
                        playerId: player && player.playerid,
                        samePlayer: samePlayer,
                        phaseUseName: phaseUse && phaseUse.name,
                        hasPhaseUse: hasPhaseUse,
                        hasCard: hasCard,
                        alreadyUsed: alreadyUsed,
                        fromSelfViewAs: fromSelfViewAs,
                        cardName: hasCard ? globalThis.zusLierSanqingName(sourceCard, player) : null,
                        cardType: type,
                        pass: pass,
                    });
                    if (!pass) return false;
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_trigger_ok",
                        player: player && player.name,
                        eventName: event && event.name,
                        cardName: sourceCard && globalThis.zusLierSanqingName(sourceCard, player),
                        cardType: type,
                        skill: event.skill || null,
                    });
                    return true;
                },
                content: function () {
                    "step 0"
                    event.zusSanqingSourceCard =
                        trigger && trigger.cards && trigger.cards.length
                            ? trigger.cards[0]
                            : trigger && trigger.card
                              ? trigger.card
                              : null;
                    event.zusSanqingCardName = globalThis.zusLierSanqingName(event.zusSanqingSourceCard, player);
                    event.zusSanqingCardNature =
                        event.zusSanqingSourceCard && event.zusSanqingSourceCard.nature
                            ? event.zusSanqingSourceCard.nature
                            : null;
                    player.chooseBool(
                        "\u662f\u5426\u53d1\u52a8\u3010\u4e09\u6e05\u3011\uff0c\u4ee4\u4f60\u7684\u4e0b\u4e24\u5f20\u724c\u53ef\u89c6\u4e3a\u3010" +
                        globalThis.zusLierSanqingTranslation(event.zusSanqingCardName) +
                        "\u3011\u4f7f\u7528\uff1f"
                    ).set("ai", function () {
                        return true;
                    });

                    "step 1"
                    if (!result.bool) return;

                    player.logSkill("zus_sanqing");
                    globalThis.zusLierSetStorage(player, "zus_sanqing_used", true);
                    globalThis.zusLierSetStorage(player, "zus_sanqing_card", {
                        name: event.zusSanqingCardName,
                        nature: event.zusSanqingCardNature,
                    });
                    globalThis.zusLierSetStorage(player, "zus_sanqing_count", 2);
                    trigger.zus_sanqing_origin = true;
                    player.addTempSkill("zus_sanqing_viewas", { player: "phaseUseEnd" });
                    player.markSkill("zus_sanqing_viewas");
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_recorded",
                        player: player && player.name,
                        record: player.storage && player.storage.zus_sanqing_card,
                        count: player.storage && player.storage.zus_sanqing_count,
                    });
                },
                group: ["zus_sanqing_clear", "zus_sanqing_probe"],
            },

            zus_sanqing_probe: {
                trigger: {
                    player: "useCardAfter",
                },
                forced: true,
                silent: true,
                popup: false,
                charlotte: true,
                content: function () {
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_probe",
                        player: player && player.name,
                        triggerName: trigger && trigger.name,
                        cardName: trigger && trigger.card ? globalThis.zusLierSanqingName(trigger.card, player) : null,
                        cardType: trigger && trigger.card ? globalThis.zusLierSanqingType(trigger.card, player) : null,
                        skill: trigger && trigger.skill ? trigger.skill : null,
                        currentPhaseName:
                            (globalThis._status || _status) &&
                            (globalThis._status || _status).currentPhase &&
                            (globalThis._status || _status).currentPhase.name,
                    });
                },
            },

            zus_sanqing_viewas: {
                enable: ["chooseToUse", "chooseToRespond"],
                usable: Infinity,
                hiddenCard: function (player, name) {
                    var info = globalThis.zusLierGetSanqingInfo(player);
                    if (!info || !name) return false;
                    return info.name == name && player.countCards("h") > 0 && !!(player.storage && player.storage.zus_sanqing_count > 0);
                },
                viewAsFilter: function (player) {
                    if (!player.storage || !player.storage.zus_sanqing_card) return false;
                    if (!player.storage.zus_sanqing_count || player.storage.zus_sanqing_count <= 0) return false;
                    return player.countCards("h") > 0;
                },
                filter: function (event, player) {
                    if (!player.storage || !player.storage.zus_sanqing_card) return false;
                    if (!player.storage.zus_sanqing_count || player.storage.zus_sanqing_count <= 0) return false;
                    if (player.countCards("h") <= 0) return false;
                    var vcard = globalThis.zusLierBuildSanqingViewAs
                        ? globalThis.zusLierBuildSanqingViewAs(player)
                        : null;
                    if (!vcard) return false;
                    var pass = true;
                    try {
                        pass = !!event.filterCard(vcard, player, event);
                    } catch (e) {
                        pass = false;
                    }
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_viewas_filter",
                        player: player && player.name,
                        eventName: event && event.name,
                        recorded: player.storage && player.storage.zus_sanqing_card,
                        count: player.storage && player.storage.zus_sanqing_count,
                        handCount: player.countCards("h"),
                        pass: pass,
                    });
                    return pass;
                },
                filterCard: true,
                position: "h",
                selectCard: 1,
                viewAs: function (cards, player) {
                    return globalThis.zusLierBuildSanqingViewAs
                        ? globalThis.zusLierBuildSanqingViewAs(player, cards)
                        : null;
                },
                onuse: function (result, player) {
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_viewas_onuse",
                        player: player && player.name,
                        recorded: player.storage && player.storage.zus_sanqing_card,
                        countBefore: player.storage && player.storage.zus_sanqing_count,
                        card: result && result.card ? {
                            name: result.card.name,
                            nature: result.card.nature || null,
                        } : null,
                    });
                },
                prompt: "\u5c06\u4e00\u5f20\u624b\u724c\u5f53\u4f5c\u3010\u4e09\u6e05\u3011\u8bb0\u5f55\u7684\u724c\u4f7f\u7528",
                check: function (card) {
                    return 6 - globalThis.zusLierSanqingValue(card);
                },
                ai: {
                    order: 8,
                    result: {
                        player: 1,
                    },
                },
                group: "zus_sanqing_viewas_count",
                mark: true,
                intro: {
                    content: function (storage, player) {
                        var info = (player.storage && player.storage.zus_sanqing_card) || {};
                        var count = (player.storage && player.storage.zus_sanqing_count) || 0;
                        return "\u4f60\u7684\u540e" + count + "\u5f20\u724c\u53ef\u89c6\u4e3a\u3010" + globalThis.zusLierSanqingTranslation(info.name || "sha") + "\u3011\u4f7f\u7528";
                    },
                },
            },

            zus_sanqing_viewas_count: {
                trigger: {
                    player: "useCardAfter",
                },
                forced: true,
                silent: true,
                popup: false,
                filter: function (event, player) {
                    if (!player.storage || !player.storage.zus_sanqing_card) return false;
                    if (!player.storage.zus_sanqing_count || player.storage.zus_sanqing_count <= 0) return false;
                    if (!event.cards || !event.cards.length) return false;
                    if (event.zus_sanqing_origin) return false;
                    if (event.zus_sanqing_counted) return false;
                    return true;
                },
                content: function () {
                    trigger.zus_sanqing_counted = true;
                    globalThis.zusLierSetStorage(
                        player,
                        "zus_sanqing_count",
                        (player.storage.zus_sanqing_count || 0) - 1
                    );

                    if (player.storage.zus_sanqing_count <= 0) {
                        globalThis.zusLierSetStorage(player, "zus_sanqing_count", 0);
                        globalThis.zusLierSetStorage(player, "zus_sanqing_card", null);
                        player.unmarkSkill("zus_sanqing_viewas");
                        player.removeSkill("zus_sanqing_viewas");
                    } else {
                        player.markSkill("zus_sanqing_viewas");
                    }
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_count_after_use",
                        player: player && player.name,
                        count: player.storage && player.storage.zus_sanqing_count,
                        cardName: trigger.card && globalThis.zusLierSanqingName(trigger.card, player),
                        skill: trigger.skill || null,
                    });
                },
            },

            zus_sanqing_clear: {
                trigger: {
                    player: "phaseUseEnd",
                },
                forced: true,
                silent: true,
                popup: false,
                content: function () {
                    globalThis.zusLierSetStorage(player, "zus_sanqing_used", false);
                    globalThis.zusLierSetStorage(player, "zus_sanqing_count", 0);
                    globalThis.zusLierSetStorage(player, "zus_sanqing_card", null);
                    player.unmarkSkill("zus_sanqing_viewas");
                    player.removeSkill("zus_sanqing_viewas");
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sanqing_cleared",
                        player: player && player.name,
                    });
                },
            },

            zus_sunbu: {
                trigger: {
                    player: ["phaseDrawBegin2", "loseAfter", "loseAsyncAfter"],
                },
                forced: true,
                filter: function (event, player) {
                    if (event.name == "phaseDraw") {
                        var drawPass = !event.numFixed && player.countCards("h") == 0;
                        globalThis.zusLierWriteSanqingDebug({
                            stage: "sunbu_filter_draw",
                            player: player && player.name,
                            handCount: player && player.countCards ? player.countCards("h") : null,
                            numFixed: !!event.numFixed,
                            pass: drawPass,
                        });
                        return drawPass;
                    }
                    var handEmpty = player.countCards("h") == 0;
                    var lostCards = globalThis.zusLierLostHandCards ? globalThis.zusLierLostHandCards(event, player) : [];
                    var damaged = player.isDamaged();
                    var pass = handEmpty && lostCards.length > 0 && damaged;
                    globalThis.zusLierWriteSanqingDebug({
                        stage: "sunbu_filter_lose",
                        player: player && player.name,
                        eventName: event && event.name,
                        triggerPlayer: event && event.player && event.player.name,
                        handEmpty: handEmpty,
                        lostHs: lostCards.length,
                        damaged: damaged,
                        getlx: event && event.getlx,
                        type: event && event.type,
                        pass: pass,
                    });
                    return pass;
                },
                async content(event, trigger, player) {
                    if (trigger.name == "phaseDraw") {
                        trigger.num += 2;
                        globalThis.zusLierWriteSanqingDebug({
                            stage: "sunbu_content_draw",
                            player: player && player.name,
                            num: trigger.num,
                        });
                    } else {
                        globalThis.zusLierWriteSanqingDebug({
                            stage: "sunbu_content_recover_begin",
                            player: player && player.name,
                            hp: player.hp,
                            maxHp: player.maxHp,
                            triggerName: trigger && trigger.name,
                            getlx: trigger && trigger.getlx,
                            type: trigger && trigger.type,
                        });
                        await player.recover();
                        globalThis.zusLierWriteSanqingDebug({
                            stage: "sunbu_content_recover_after",
                            player: player && player.name,
                            hp: player.hp,
                            maxHp: player.maxHp,
                        });
                    }
                },
                mod: {
                    globalTo: function (from, to, distance) {
                        if (to.countCards("h") == 0) {
                            return distance + 1;
                        }
                    },
                },
            },
        },

        translate: {
            zus_lier: "\u674e\u8033",
            zus_lier_ab: "\u674e\u8033",

            zus_sanqing: "\u4e09\u6e05",
            zus_sanqing_info: "\u51fa\u724c\u9636\u6bb5\u9650\u4e00\u6b21\uff0c\u4f60\u4f7f\u7528\u4e00\u5f20\u57fa\u672c\u724c\u6216\u9526\u56ca\u724c\u7ed3\u7b97\u540e\uff0c\u53ef\u4ee5\u8bb0\u5f55\u6b64\u724c\u724c\u540d\u3002\u82e5\u5982\u6b64\u505a\uff0c\u4f60\u7684\u4e0b\u4e24\u5f20\u724c\u5747\u53ef\u89c6\u4f5c\u6b64\u724c\u4f7f\u7528\u3002",

            zus_sanqing_viewas: "\u4e09\u6e05",
            zus_sanqing_viewas_info: "\u4f60\u53ef\u4ee5\u5c06\u4e00\u5f20\u624b\u724c\u5f53\u4f5c\u201c\u4e09\u6e05\u201d\u8bb0\u5f55\u7684\u724c\u4f7f\u7528\u3002",

            zus_sanqing_viewas_count: "\u4e09\u6e05",
            zus_sanqing_viewas_count_info: "\u6bcf\u901a\u8fc7\u201c\u4e09\u6e05\u201d\u4f7f\u7528\u4e00\u5f20\u724c\uff0c\u5269\u4f59\u6b21\u6570-1\u3002",

            zus_sunbu: "\u635f\u8865",
            zus_sunbu_info: "\u9501\u5b9a\u6280\uff0c\u82e5\u4f60\u6ca1\u6709\u624b\u724c\uff0c\u6478\u724c\u9636\u6bb5\u7684\u6478\u724c\u6570+2\u4e14\u5176\u4ed6\u89d2\u8272\u8ba1\u7b97\u4e0e\u4f60\u7684\u8ddd\u79bb+1\uff1b\u5f53\u4f60\u5931\u53bb\u6700\u540e\u7684\u624b\u724c\u65f6\uff0c\u4f60\u56de\u590d1\u70b9\u4f53\u529b\u3002",
        },

        sort: ["zus_lier"],

        title: {
            zus_lier: "\u9053\u5fb7\u5929\u5c0a",
        },
    };
})();
