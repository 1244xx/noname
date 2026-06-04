(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    window.zusfylriModules = window.zusfylriModules || {};
    var EXT_NAME = window.ZUS_EXTENSION_NAME || "Zusfylri武将包";
    var TRUE_SKILLS = ["zus_hechen", "zus_wuyou", "zus_daomeng"];
    var HUAN_SKILLS = ["zus_hedao", "zus_xiaoyao", "zus_miansan"];
    var SUITS = ["spade", "heart", "club", "diamond"];
    var FALLBACK_TRICKS = ["juedou", "guohe", "shunshou", "wuzhong", "taoyuan", "nanman", "wanjian", "wugu", "jiedao", "huogong", "tiesuo"];
    var DEBUG_ZHUANGZHOU = true;

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

    function runtimeLib() {
        try {
            if (typeof window != "undefined" && window.top && window.top.lib && typeof window.top.lib == "object") return window.top.lib;
        } catch (e) {
        }
        try {
            if (typeof window != "undefined" && window.lib && typeof window.lib == "object") return window.lib;
        } catch (e2) {
        }
        if (globalThis.lib && typeof globalThis.lib == "object") return globalThis.lib;
        if (lib && typeof lib == "object") return lib;
        return null;
    }

    function runtimeGet() {
        try {
            if (typeof window != "undefined" && window.top && window.top.get && typeof window.top.get == "object") return window.top.get;
        } catch (e) {
        }
        try {
            if (typeof window != "undefined" && window.get && typeof window.get == "object") return window.get;
        } catch (e2) {
        }
        if (globalThis.get && typeof globalThis.get == "object") return globalThis.get;
        if (get && typeof get == "object") return get;
        return null;
    }

    function debugText(value) {
        var getter = runtimeGet();
        if (value && value.name && getter && getter.translation) {
            try {
                return getter.translation(value);
            } catch (e) {
            }
        }
        if (Array.isArray(value)) return value.join(",");
        if (value === null) return "null";
        if (typeof value == "undefined") return "undefined";
        return String(value);
    }

    function debugLog() {
        if (!DEBUG_ZHUANGZHOU) return;
        var args = Array.prototype.slice.call(arguments);
        var parts = args.map(debugText);
        var debug = {
            stage: parts[0] || "debug",
            args: parts,
            timestamp: Date.now(),
        };
        try {
            globalThis.zusZhuangzhouLastDebug = debug;
            if (globalThis.localStorage) localStorage.setItem("zus_zhuangzhou_debug", JSON.stringify(debug));
        } catch (e0) {
        }
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof window != "undefined" && window.top && window.top.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (req) {
                req("fs").appendFileSync(
                    "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/zhuangzhou_debug.log",
                    JSON.stringify(debug) + "\n",
                    "utf8"
                );
            }
        } catch (e1) {
        }
        try {
            if (globalThis.console && console.log) console.log.apply(console, ["[庄周调试]"].concat(args));
        } catch (e) {
        }
        var currentGame = runtimeGame();
        if (currentGame && currentGame.log) {
            try {
                currentGame.log("#y[庄周调试]", parts.join(" "));
            } catch (e2) {
            }
        }
    }

    function isForm(player, state) {
        return !!(player && player.storage && player.storage.zus_zhuangzhou_state == state);
    }

    function hasNatureDamage(event) {
        if (!event) return false;
        try {
            if (event.hasNature && event.hasNature()) return true;
        } catch (e) {
        }
        return !!event.nature;
    }

    function cardName(card, player) {
        if (!card) return null;
        if (typeof card == "string") return card;
        try {
            var getter = runtimeGet();
            if (getter && getter.name) return getter.name(card, player);
        } catch (e) {
        }
        return card.name || null;
    }

    function cardHasNatureDamage(card, player) {
        if (!card) return false;
        var getter = runtimeGet();
        try {
            if (getter && getter.tag && getter.tag(card, "natureDamage")) return true;
            if (getter && getter.tag && getter.tag(card, "fireDamage")) return true;
            if (getter && getter.tag && getter.tag(card, "thunderDamage")) return true;
            if (getter && getter.tag && getter.tag(card, "iceDamage")) return true;
        } catch (e) {
        }
        try {
            if (card.nature) return true;
            if (getter && getter.nature && getter.nature(card, player)) return true;
            if (getter && getter.natureList && getter.natureList(card).length) return true;
        } catch (e2) {
        }
        var name = cardName(card, player);
        return name == "huosha" || name == "leisha" || name == "icesha" || name == "thundersha" || name == "firesha";
    }

    function isDamageCard(card, player) {
        if (!card) return false;
        var getter = runtimeGet();
        try {
            if (getter && getter.is && getter.is.damageCard && getter.is.damageCard(card, true)) return true;
        } catch (e) {
        }
        try {
            if (getter && getter.tag && getter.tag(card, "damage")) return true;
        } catch (e2) {
        }
        var name = cardName(card, player);
        if (name == "sha" || name == "huosha" || name == "leisha" || name == "icesha" || name == "thundersha" || name == "firesha") return true;
        return ["juedou", "nanman", "wanjian", "huogong", "shuiyanqijunx", "shuiyanqijun"].indexOf(name) != -1;
    }

    function zhuangzhouDamageAiEffect(card, player, target) {
        if (!target || !target.storage) return;
        var state = target.storage.zus_zhuangzhou_state;
        if (state != "true" && state != "huan") return;
        if (!isDamageCard(card, player)) return;
        var nature = cardHasNatureDamage(card, player);
        if (state == "true" && nature) return "zeroplayertarget";
        if (state == "huan" && !nature) return "zeroplayertarget";
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

    function refreshAvatar(player, state) {
        if (!player || !state) return;
        var path = "extension/" + EXT_NAME + "/image/character/zus_zhuangzhou_" + state + ".png";
        var apply = function (target, imgPath) {
            if (!target || !target.node) return;
            try {
                if (target.name == "zus_zhuangzhou" && target.node.avatar) {
                    target.node.avatar.setBackgroundImage(imgPath);
                }
                if (target.name2 == "zus_zhuangzhou" && target.node.avatar2) {
                    target.node.avatar2.setBackgroundImage(imgPath);
                }
                if (target == game.me && ui && ui.fakeme && target.node.avatar) {
                    ui.fakeme.style.backgroundImage = target.node.avatar.style.backgroundImage;
                }
            } catch (e) {
            }
        };
        apply(player, path);
        var currentGame = runtimeGame();
        if (currentGame && currentGame.broadcastAll) {
            currentGame.broadcastAll(function (target, imgPath) {
                if (!target || !target.node) return;
                try {
                    if (target.name == "zus_zhuangzhou" && target.node.avatar) {
                        target.node.avatar.setBackgroundImage(imgPath);
                    }
                    if (target.name2 == "zus_zhuangzhou" && target.node.avatar2) {
                        target.node.avatar2.setBackgroundImage(imgPath);
                    }
                    if (target == game.me && ui && ui.fakeme && target.node.avatar) {
                        ui.fakeme.style.backgroundImage = target.node.avatar.style.backgroundImage;
                    }
                } catch (e) {
                }
            }, player, path);
        }
    }

    function refreshSkills(player, state) {
        if (!player || !player.addAdditionalSkill) return;
        var list = state == "huan" ? HUAN_SKILLS : TRUE_SKILLS;
        player.addAdditionalSkill("zus_zhuangzhou_forms", list.slice(0));
        if (player.markSkill) player.markSkill("zus_zhuangzhou_forms");
        debugLog("refreshSkills", player, "state=" + state, "skills=" + list.join(","));
    }

    function setStorage(player, key, value) {
        if (!player) return value;
        player.storage = player.storage || {};
        player.storage[key] = value;
        if (player.syncStorage) player.syncStorage(key);
        return value;
    }

    function setForm(player, state, withEffect) {
        if (!player || (state != "true" && state != "huan")) return false;
        var oldState = player.storage && player.storage.zus_zhuangzhou_state;
        var changed = oldState != state;
        debugLog("setForm begin", player, "old=" + oldState, "new=" + state, "changed=" + changed, "withEffect=" + !!withEffect);
        setStorage(player, "zus_zhuangzhou_state", state);
        refreshSkills(player, state);
        refreshAvatar(player, state);
        if (changed && state == "huan") {
            debugLog("setForm effect clear xiaoyao declared", player);
            clearXiaoyaoDeclared(player);
        }
        if (oldState && changed) {
            try {
                if (player.popup) player.popup(state == "huan" ? "幻" : "真");
            } catch (e) {
                debugLog("setForm popup error", e && e.message ? e.message : e);
            }
            try {
                var currentGame = runtimeGame();
                if (currentGame && currentGame.log) currentGame.log(player, "转化为", state == "huan" ? "#g“幻”" : "#g“真”", "状态");
            } catch (e2) {
                debugLog("setForm game.log error", e2 && e2.message ? e2.message : e2);
            }
        }
        if (!withEffect || !changed) return changed;
        if (state == "true") {
            debugLog("setForm effect draw", player);
            player.draw();
        }
        return changed;
    }

    function xiaoyaoDeclaredCards(player) {
        if (!player) return [];
        player.storage = player.storage || {};
        if (!Array.isArray(player.storage.zus_xiaoyao_declared_cards)) {
            player.storage.zus_xiaoyao_declared_cards = [];
            if (player.syncStorage) player.syncStorage("zus_xiaoyao_declared_cards");
        }
        return player.storage.zus_xiaoyao_declared_cards;
    }

    function hasXiaoyaoDeclared(player, name) {
        if (!name) return false;
        return xiaoyaoDeclaredCards(player).indexOf(name) != -1;
    }

    function markXiaoyaoDeclared(player, name) {
        if (!player || !name) return;
        var list = xiaoyaoDeclaredCards(player);
        if (list.indexOf(name) == -1) list.push(name);
        if (player.syncStorage) player.syncStorage("zus_xiaoyao_declared_cards");
        debugLog("xiaoyao mark declared", player, "name=" + name, "declared=" + list.join(","));
    }

    function clearXiaoyaoDeclared(player) {
        if (!player) return;
        player.storage = player.storage || {};
        delete player.storage.zus_xiaoyao_declared_round;
        player.storage.zus_xiaoyao_declared_cards = [];
        if (player.syncStorage) {
            player.syncStorage("zus_xiaoyao_declared_round");
            player.syncStorage("zus_xiaoyao_declared_cards");
        }
        debugLog("xiaoyao clear declared", player);
    }

    function trickChoices(source, owner) {
        var currentLib = runtimeLib();
        var getter = runtimeGet();
        var list = [];
        if (!source) {
            debugLog("xiaoyao trickChoices early", source, "hasSource=" + !!source, "hasLib=" + !!currentLib, "hasInpile=" + !!(currentLib && currentLib.inpile));
            return list;
        }
        var inpile = currentLib && currentLib.inpile && currentLib.inpile.length ? currentLib.inpile : FALLBACK_TRICKS;
        for (var i = 0; i < inpile.length; i++) {
            var name = inpile[i];
            var type = null;
            var info = currentLib && currentLib.card && currentLib.card[name];
            if (currentLib && currentLib.inpile) {
                try {
                    type = getter && getter.type ? getter.type({ name: name, isCard: true }) : get.type({ name: name, isCard: true });
                    if (!type && getter && getter.type) type = getter.type(name);
                } catch (e) {
                }
                if (type != "trick") continue;
                if (!info || info.notarget) continue;
            }
            if (!canDeclareTrick(source, name)) continue;
            if (owner && hasXiaoyaoDeclared(owner, name)) continue;
            list.push(["锦囊", "", name]);
        }
        debugLog("xiaoyao trickChoices", source, "owner=" + (owner && owner.name), "declared=" + (owner ? xiaoyaoDeclaredCards(owner).join(",") : ""), "hasLib=" + !!currentLib, "hasInpile=" + !!(currentLib && currentLib.inpile), "pool=" + inpile.length, "count=" + list.length, "names=" + list.map(function (item) {
            return item[2];
        }).join(","));
        return list;
    }

    function canDeclareTrick(source, name) {
        if (!source || !name) return false;
        var currentGame = runtimeGame();
        var currentLib = runtimeLib();
        var card = { name: name, isCard: true };
        try {
            if (source.hasUseTarget && source.hasUseTarget(card)) return true;
        } catch (e) {
            debugLog("xiaoyao hasUseTarget error", source, "card=" + name, e && e.message ? e.message : e);
        }
        try {
            if (source.hasUseTarget && source.hasUseTarget(name)) return true;
        } catch (e0) {
        }
        try {
            if (!currentGame || !currentGame.hasPlayer || !currentLib || !currentLib.filter) return false;
            return currentGame.hasPlayer(function (target) {
                if (!target || !target.isIn || !target.isIn()) return false;
                try {
                    if (source.canUse && source.canUse(card, target)) return true;
                } catch (e2) {
                }
                try {
                    return !!(
                        currentLib.filter.cardEnabled &&
                        currentLib.filter.targetEnabled &&
                        currentLib.filter.targetInRange &&
                        currentLib.filter.cardEnabled(card, source) &&
                        currentLib.filter.targetEnabled(card, source, target) &&
                        currentLib.filter.targetInRange(card, source, target)
                    );
                } catch (e3) {
                    return false;
                }
            });
        } catch (e4) {
            debugLog("xiaoyao canDeclare error", source, "card=" + name, e4 && e4.message ? e4.message : e4);
            return false;
        }
    }

    function sameCard(cardA, cardB) {
        if (!cardA || !cardB) return false;
        if (cardA === cardB) return true;
        try {
            if (cardA.cardid && cardB.cardid) return cardA.cardid == cardB.cardid;
        } catch (e) {
        }
        return false;
    }

    function syncXiaoyao(player) {
        if (!player || !player.syncStorage) return;
        player.syncStorage("zus_xiaoyao_card");
        player.syncStorage("zus_xiaoyao_pending");
        player.syncStorage("zus_xiaoyao_resolving");
        player.syncStorage("zus_xiaoyao_first_card");
        player.syncStorage("zus_xiaoyao_declared_cards");
    }

    function declaredName(player, card) {
        if (!player || !player.storage) return null;
        if (player.storage.zus_xiaoyao_resolving && player.storage.zus_xiaoyao_first_card && !sameCard(card, player.storage.zus_xiaoyao_first_card)) return null;
        if (!player.storage.zus_xiaoyao_pending && !player.storage.zus_xiaoyao_resolving) return null;
        return player.storage.zus_xiaoyao_card || null;
    }

    function clearXiaoyao(player) {
        if (!player || !player.storage) return;
        delete player.storage.zus_xiaoyao_card;
        delete player.storage.zus_xiaoyao_pending;
        delete player.storage.zus_xiaoyao_resolving;
        delete player.storage.zus_xiaoyao_first_card;
        syncXiaoyao(player);
    }

    function gainHandCards(event, player) {
        if (!event || !event.getg || !player) return [];
        try {
            var cards = event.getg(player) || [];
            debugLog("gainHandCards", player, "event=" + event.name, "cards=" + cards.length, "state=" + (player.storage && player.storage.zus_zhuangzhou_state));
            if (!cards.length) return [];
            return cards.filter(function (card) {
                return !!card;
            });
        } catch (e) {
            return [];
        }
    }

    globalThis.zusZhuangzhouRuntimeGet = runtimeGet;
    globalThis.zusZhuangzhouRuntimeLib = runtimeLib;
    globalThis.zusZhuangzhouIsForm = isForm;
    globalThis.zusZhuangzhouHasNatureDamage = hasNatureDamage;
    globalThis.zusZhuangzhouDamageAiEffect = zhuangzhouDamageAiEffect;
    globalThis.zusZhuangzhouLostHandCards = lostHandCards;
    globalThis.zusZhuangzhouSetForm = setForm;
    globalThis.zusZhuangzhouXiaoyaoDeclaredCards = xiaoyaoDeclaredCards;
    globalThis.zusZhuangzhouHasXiaoyaoDeclared = hasXiaoyaoDeclared;
    globalThis.zusZhuangzhouMarkXiaoyaoDeclared = markXiaoyaoDeclared;
    globalThis.zusZhuangzhouClearXiaoyaoDeclared = clearXiaoyaoDeclared;
    globalThis.zusZhuangzhouTrickChoices = trickChoices;
    globalThis.zusZhuangzhouCanDeclareTrick = canDeclareTrick;
    globalThis.zusZhuangzhouDeclaredName = declaredName;
    globalThis.zusZhuangzhouSyncXiaoyao = syncXiaoyao;
    globalThis.zusZhuangzhouClearXiaoyao = clearXiaoyao;
    globalThis.zusZhuangzhouGainHandCards = gainHandCards;
    globalThis.zusZhuangzhouDebugLog = debugLog;

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("zhuangzhou", "runtimeGet", runtimeGet, { globalName: "zusZhuangzhouRuntimeGet", overwrite: true });
        Zus.bindHelper("zhuangzhou", "runtimeLib", runtimeLib, { globalName: "zusZhuangzhouRuntimeLib", overwrite: true });
        Zus.bindHelper("zhuangzhou", "isForm", isForm, { globalName: "zusZhuangzhouIsForm", overwrite: true });
        Zus.bindHelper("zhuangzhou", "hasNatureDamage", hasNatureDamage, { globalName: "zusZhuangzhouHasNatureDamage", overwrite: true });
        Zus.bindHelper("zhuangzhou", "damageAiEffect", zhuangzhouDamageAiEffect, { globalName: "zusZhuangzhouDamageAiEffect", overwrite: true });
        Zus.bindHelper("zhuangzhou", "lostHandCards", lostHandCards, { globalName: "zusZhuangzhouLostHandCards", overwrite: true });
        Zus.bindHelper("zhuangzhou", "setForm", setForm, { globalName: "zusZhuangzhouSetForm", overwrite: true });
        Zus.bindHelper("zhuangzhou", "xiaoyaoDeclaredCards", xiaoyaoDeclaredCards, { globalName: "zusZhuangzhouXiaoyaoDeclaredCards", overwrite: true });
        Zus.bindHelper("zhuangzhou", "hasXiaoyaoDeclared", hasXiaoyaoDeclared, { globalName: "zusZhuangzhouHasXiaoyaoDeclared", overwrite: true });
        Zus.bindHelper("zhuangzhou", "markXiaoyaoDeclared", markXiaoyaoDeclared, { globalName: "zusZhuangzhouMarkXiaoyaoDeclared", overwrite: true });
        Zus.bindHelper("zhuangzhou", "clearXiaoyaoDeclared", clearXiaoyaoDeclared, { globalName: "zusZhuangzhouClearXiaoyaoDeclared", overwrite: true });
        Zus.bindHelper("zhuangzhou", "trickChoices", trickChoices, { globalName: "zusZhuangzhouTrickChoices", overwrite: true });
        Zus.bindHelper("zhuangzhou", "canDeclareTrick", canDeclareTrick, { globalName: "zusZhuangzhouCanDeclareTrick", overwrite: true });
        Zus.bindHelper("zhuangzhou", "declaredName", declaredName, { globalName: "zusZhuangzhouDeclaredName", overwrite: true });
        Zus.bindHelper("zhuangzhou", "syncXiaoyao", syncXiaoyao, { globalName: "zusZhuangzhouSyncXiaoyao", overwrite: true });
        Zus.bindHelper("zhuangzhou", "clearXiaoyao", clearXiaoyao, { globalName: "zusZhuangzhouClearXiaoyao", overwrite: true });
        Zus.bindHelper("zhuangzhou", "gainHandCards", gainHandCards, { globalName: "zusZhuangzhouGainHandCards", overwrite: true });
        Zus.bindHelper("zhuangzhou", "debugLog", debugLog, { globalName: "zusZhuangzhouDebugLog", overwrite: true });
    }

    window.zusfylriModules["zhuangzhou"] = {
        key: "zhuangzhou",

        character: {
            zus_zhuangzhou: char("male", "shen", 3, ["zus_zhuangzhou_forms"], "zus_zhuangzhou_true", "png"),
        },

        skill: {
            zus_zhuangzhou_forms: {
                trigger: { global: "phaseBefore", player: "enterGame" },
                forced: true,
                silent: true,
                popup: false,
                charlotte: true,
                group: "zus_zhuangzhou_debug_gain",
                init: function (player) {
                    if (!player.storage || !player.storage.zus_zhuangzhou_state) {
                        globalThis.zusZhuangzhouSetForm(player, "true", false);
                    } else {
                        globalThis.zusZhuangzhouSetForm(player, player.storage.zus_zhuangzhou_state, false);
                    }
                },
                onremove: function (player) {
                    if (player && player.removeAdditionalSkill) player.removeAdditionalSkill("zus_zhuangzhou_forms");
                },
                filter: function (event, player) {
                    if (player.storage && player.storage.zus_zhuangzhou_state) return false;
                    return event.name != "phase" || game.phaseNumber == 0;
                },
                content: function () {
                    globalThis.zusZhuangzhouSetForm(player, "true", false);
                },
                mark: true,
                marktext: "蝶",
                intro: {
                    name: "梦蝶",
                    content: function (storage, player) {
                        var state = player && player.storage && player.storage.zus_zhuangzhou_state;
                        return "当前状态：" + (state == "huan" ? "幻" : "真");
                    },
                },
            },

            zus_zhuangzhou_debug_gain: {
                trigger: { global: "gainAfter" },
                forced: true,
                silent: true,
                popup: false,
                charlotte: true,
                filter: function (event, player) {
                    if (!player || player.name != "zus_zhuangzhou") return false;
                    var cards = globalThis.zusZhuangzhouGainHandCards(event, player);
                    return globalThis.zusZhuangzhouIsForm(player, "huan") || cards.length > 0;
                },
                content: function () {
                    var cards = globalThis.zusZhuangzhouGainHandCards(trigger, player);
                    globalThis.zusZhuangzhouDebugLog("debug_gain", player, "event=" + trigger.name, "state=" + (player.storage && player.storage.zus_zhuangzhou_state), "cards=" + cards.length, "has_miansan=" + (!!(player.hasSkill && player.hasSkill("zus_miansan"))));
                },
            },

            zus_hechen: {
                trigger: { player: "damageBegin4" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    return globalThis.zusZhuangzhouIsForm(player, "true") && globalThis.zusZhuangzhouHasNatureDamage(event);
                },
                content: function () {
                    trigger.cancel();
                },
                ai: {
                    nofire: true,
                    nothunder: true,
                    effect: {
                        target: function (card, player, target) {
                            if (globalThis.zusZhuangzhouDamageAiEffect) return globalThis.zusZhuangzhouDamageAiEffect(card, player, target);
                        },
                    },
                },
            },

            zus_wuyou: {
                trigger: { player: "damageBegin3" },
                direct: true,
                filter: function (event, player) {
                    return globalThis.zusZhuangzhouIsForm(player, "true") && event.source && event.source.isIn && event.source.isIn() && player.countCards("h") > 0 && event.source.countCards("h") > 0;
                },
                async content(event, trigger, player) {
                    var source = trigger.source;
                    var getter = globalThis.get || {};
                    var sourceName = getter.translation ? getter.translation(source) : "伤害来源";
                    var result = await player.chooseBool("是否发动【乌有】？", "弃置你与" + sourceName + "各一张手牌").set("ai", function () {
                        var evt = globalThis._status && globalThis._status.event;
                        var source = evt && evt.getParent ? evt.getParent().source : null;
                        var getter = globalThis.get || {};
                        if (getter.attitude && source) return getter.attitude(player, source) < 0 || player.countCards("h") > player.hp;
                        return false;
                    }).set("source", source).forResult();
                    if (!result.bool) return;
                    player.logSkill("zus_wuyou", source);
                    await player.chooseToDiscard("h", true);
                    if (source && source.isIn && source.isIn() && source.countCards("h") > 0) {
                        await player.discardPlayerCard(source, "h", true);
                    }
                },
                group: "zus_wuyou_discard",
            },

            zus_wuyou_discard: {
                trigger: { player: "phaseDiscardEnd" },
                direct: true,
                filter: function (event, player) {
                    if (!globalThis.zusZhuangzhouIsForm(player, "true")) return false;
                    for (var i = 0; i < SUITS.length; i++) {
                        if (player.countCards("h", { suit: SUITS[i] }) > 0) return true;
                    }
                    return false;
                },
                async content(event, trigger, player) {
                    var controls = [];
                    for (var i = 0; i < SUITS.length; i++) {
                        if (player.countCards("h", { suit: SUITS[i] }) > 0) controls.push(SUITS[i]);
                    }
                    controls.push("cancel2");
                    var result = await player.chooseControl(controls).set("prompt", "是否发动【乌有】？").set("prompt2", "弃置一种花色的所有手牌").set("ai", function () {
                        var evt = globalThis._status && globalThis._status.event;
                        var suits = evt && evt.controls ? evt.controls.slice(0) : ["cancel2"];
                        var best = "cancel2";
                        var bestValue = 0;
                        var getter = globalThis.get || {};
                        for (var i = 0; i < suits.length; i++) {
                            if (suits[i] == "cancel2") continue;
                            var cards = player.getCards("h", { suit: suits[i] });
                            var value = 0;
                            for (var j = 0; j < cards.length; j++) value += getter.value ? getter.value(cards[j], player) : 0;
                            if (!cards.length) continue;
                            var score = cards.length * 2 - value;
                            if (score > bestValue) {
                                bestValue = score;
                                best = suits[i];
                            }
                        }
                        return best;
                    }).forResult();
                    if (!result.control || result.control == "cancel2") return;
                    var cards = player.getCards("h", { suit: result.control });
                    if (!cards.length) return;
                    player.logSkill("zus_wuyou");
                    await player.discard(cards);
                },
            },

            zus_daomeng: {
                trigger: {
                    player: "loseAfter",
                    global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
                },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    var stateOk = globalThis.zusZhuangzhouIsForm(player, "true");
                    var empty = player.countCards("h") == 0;
                    var cards = globalThis.zusZhuangzhouLostHandCards(event, player);
                    var pass = stateOk && empty && cards.length > 0;
                    globalThis.zusZhuangzhouDebugLog("倒梦filter", player, "event=" + event.name, "triggerPlayer=" + (event.player && event.player.name), "stateOk=" + stateOk, "empty=" + empty, "lostHs=" + cards.length, "getlx=" + event.getlx, "type=" + event.type, "pass=" + pass);
                    return pass;
                },
                async content(event, trigger, player) {
                    globalThis.zusZhuangzhouDebugLog("倒梦content begin", player, "event=" + trigger.name, "hand=" + player.countCards("h"));
                    globalThis.zusZhuangzhouSetForm(player, "huan", false);
                },
            },

            zus_hedao: {
                trigger: { player: "damageBegin4" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    return globalThis.zusZhuangzhouIsForm(player, "huan") && !globalThis.zusZhuangzhouHasNatureDamage(event);
                },
                content: function () {
                    trigger.cancel();
                },
                ai: {
                    effect: {
                        target: function (card, player, target) {
                            if (globalThis.zusZhuangzhouDamageAiEffect) return globalThis.zusZhuangzhouDamageAiEffect(card, player, target);
                        },
                    },
                },
            },

            zus_xiaoyao: {
                trigger: { global: "phaseUseBegin" },
                direct: true,
                filter: function (event, player) {
                    var stateOk = globalThis.zusZhuangzhouIsForm(player, "huan");
                    var sourceOk = !!(event.player && event.player != player);
                    var choices = sourceOk ? globalThis.zusZhuangzhouTrickChoices(event.player, player) : [];
                    var pass = stateOk && sourceOk && choices.length > 0;
                    globalThis.zusZhuangzhouDebugLog("逍遥filter", player, "source=" + (event.player && event.player.name), "stateOk=" + stateOk, "sourceOk=" + sourceOk, "choices=" + choices.length, "pass=" + pass);
                    return pass;
                },
                async content(event, trigger, player) {
                    var source = trigger.player;
                    var list = globalThis.zusZhuangzhouTrickChoices(source, player);
                    globalThis.zusZhuangzhouDebugLog("逍遥content begin", player, "source=" + (source && source.name), "choices=" + list.length);
                    var result = await player.chooseButton(["逍遥：声明一张非延时类锦囊牌", [list, "vcard"]]).set("ai", function (button) {
                        var evt = globalThis._status && globalThis._status.event;
                        var source = evt && evt.getParent ? evt.getParent().source : null;
                        var name = button.link[2];
                        var getter = globalThis.get || {};
                        var att = getter.attitude && source ? getter.attitude(player, source) : 0;
                        if (att < 0) {
                            if (name == "juedou") return 9;
                            if (name == "guohe" || name == "shunshou") return 8;
                            if (name == "nanman" || name == "wanjian") return 7;
                            return 4;
                        }
                        if (name == "wuzhong" || name == "taoyuan") return 6;
                        return 1;
                    }).set("source", source).forResult();
                    globalThis.zusZhuangzhouDebugLog("逍遥choose result", player, "bool=" + (!!result.bool), "links=" + (result.links && result.links.length || 0));
                    if (!result.bool || !result.links || !result.links.length) return;
                    var name = result.links[0][2];
                    globalThis.zusZhuangzhouMarkXiaoyaoDeclared(player, name);
                    player.logSkill("zus_xiaoyao", source);
                    source.storage = source.storage || {};
                    source.storage.zus_xiaoyao_card = name;
                    source.storage.zus_xiaoyao_pending = true;
                    source.storage.zus_xiaoyao_resolving = false;
                    globalThis.zusZhuangzhouSyncXiaoyao(source);
                    source.addTempSkill("zus_xiaoyao_effect", { player: "phaseUseEnd" });
                    var currentGame = globalThis.game || null;
                    var getter = globalThis.get || {};
                    if (currentGame && currentGame.log) {
                        currentGame.log(source, "本阶段使用的第一张牌视为", "#y" + (getter.translation ? getter.translation(name) : name));
                    }
                },
            },

            zus_xiaoyao_effect: {
                charlotte: true,
                mod: {
                    cardname: function (card, player) {
                        return globalThis.zusZhuangzhouDeclaredName(player, card);
                    },
                },
                trigger: { player: "useCard1" },
                forced: true,
                silent: true,
                popup: false,
                filter: function (event, player) {
                    return !!(player.storage && player.storage.zus_xiaoyao_pending && player.storage.zus_xiaoyao_card);
                },
                content: function () {
                    player.storage.zus_xiaoyao_pending = false;
                    player.storage.zus_xiaoyao_resolving = true;
                    player.storage.zus_xiaoyao_first_card = trigger.card;
                    globalThis.zusZhuangzhouSyncXiaoyao(player);
                    game.countPlayer(function (current) {
                        if (current != player) current.addTempSkill("kanpo", { global: "useCardAfter" });
                    });
                },
                group: "zus_xiaoyao_clear",
            },

            zus_xiaoyao_clear: {
                trigger: { player: ["useCardAfter", "phaseUseEnd"] },
                forced: true,
                silent: true,
                popup: false,
                filter: function (event, player) {
                    return !!(player.storage && (player.storage.zus_xiaoyao_card || player.storage.zus_xiaoyao_resolving || player.storage.zus_xiaoyao_pending));
                },
                content: function () {
                    globalThis.zusZhuangzhouClearXiaoyao(player);
                    if (event.triggername == "phaseUseEnd") player.removeSkill("zus_xiaoyao_effect");
                },
            },

            zus_miansan: {
                trigger: { player: "gainAfter" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    var stateOk = globalThis.zusZhuangzhouIsForm(player, "huan");
                    var cards = globalThis.zusZhuangzhouGainHandCards(event, player);
                    var pass = stateOk && cards.length > 0;
                    globalThis.zusZhuangzhouDebugLog("眠散filter", player, "event=" + event.name, "stateOk=" + stateOk, "cards=" + cards.length, "pass=" + pass);
                    return pass;
                },
                async content(event, trigger, player) {
                    globalThis.zusZhuangzhouDebugLog("眠散content begin", player, "state=" + (player.storage && player.storage.zus_zhuangzhou_state), "hand=" + player.countCards("h"));
                    var changed = globalThis.zusZhuangzhouSetForm(player, "true", false);
                    globalThis.zusZhuangzhouDebugLog("眠散content after setForm", player, "changed=" + changed, "state=" + (player.storage && player.storage.zus_zhuangzhou_state), "hand=" + player.countCards("h"));
                    if (changed) {
                        await player.draw();
                        globalThis.zusZhuangzhouDebugLog("眠散content after draw", player, "hand=" + player.countCards("h"));
                    }
                },
            },
        },

        translate: {
            zus_zhuangzhou: "庄周",
            zus_zhuangzhou_ab: "庄周",

            zus_zhuangzhou_forms: "梦蝶",
            zus_zhuangzhou_forms_info: "锁定技，游戏开始时，你为“真”状态；你的形态改变时刷新当前形态的技能与武将牌图片。",
            zus_zhuangzhou_debug_gain: "庄周调试",

            zus_hechen: "合尘",
            zus_hechen_info: "锁定技，真状态下，你不受属性伤害。转化为此状态时，你摸一张牌。",
            zus_wuyou: "乌有",
            zus_wuyou_info: "真状态下，当你受到伤害时，你可以弃置你与伤害来源各一张手牌；你的弃牌阶段结束后，你可以弃置一种花色的所有手牌。",
            zus_wuyou_discard: "乌有",
            zus_daomeng: "倒梦",
            zus_daomeng_info: "锁定技，真状态下，当你失去最后的手牌后，你转化为“幻”状态。",

            zus_hedao: "合道",
            zus_hedao_info: "锁定技，幻状态下，你不受非属性伤害。转化为此状态时，清除“逍遥”的声明记录。",
            zus_xiaoyao: "逍遥",
            zus_xiaoyao_info: "幻状态下，每名其他角色的出牌阶段开始时，你可以声明一张你未声明过且有合法目标的非延时类锦囊牌。此阶段内，其使用的第一张牌视为你声明的牌；此牌结算期间，其余角色视为拥有“看破”。",
            zus_xiaoyao_effect: "逍遥",
            zus_xiaoyao_clear: "逍遥",
            zus_miansan: "眠散",
            zus_miansan_info: "锁定技，幻状态下，当你获得手牌后，你转化为“真”状态。",
        },

        sort: ["zus_zhuangzhou"],

        title: {
            zus_zhuangzhou: "齐物逍遥",
        },
    };
})();
