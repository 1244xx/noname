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
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "png");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function runtimeGet() {
        try {
            if (window.Zus && Zus.runtime) {
                var current = Zus.runtime().get;
                if (current) return current;
            }
        } catch (e) {}
        try {
            if (typeof window != "undefined" && window.top && window.top.get) return window.top.get;
        } catch (e2) {}
        try {
            if (typeof window != "undefined" && window.get) return window.get;
        } catch (e3) {}
        return globalThis.get || get || null;
    }

    function setStorage(player, key, value) {
        if (!player) return;
        if (globalThis.Sync && Sync.setStorage) {
            Sync.setStorage(player, key, value);
            return;
        }
        player.storage = player.storage || {};
        player.storage[key] = value;
        if (player.syncStorage) player.syncStorage(key);
    }

    function getStorage(player, key, fallback) {
        if (!player) return fallback;
        try {
            if (window.Zus && Zus.storage) return Zus.storage(player, key, fallback);
        } catch (e) {}
        return player.storage && Object.prototype.hasOwnProperty.call(player.storage, key) ? player.storage[key] : fallback;
    }

    function stageCardName(eventName) {
        if (eventName == "phase" || eventName == "phaseBegin") return "shunshou";
        if (eventName == "phaseZhunbei" || eventName == "phaseZhunbeiBegin") return "guohe";
        if (eventName == "phaseUse" || eventName == "phaseUseBegin") return "jiu";
        if (eventName == "phaseJieshu" || eventName == "phaseJieshuBegin") return "jiedao";
        return null;
    }

    function makeVirtualCard(name) {
        return { name: name, isCard: true };
    }

    function canUseCardWithTarget(player, card) {
        if (!player || !card) return false;
        try {
            if (player.hasUseTarget) return !!player.hasUseTarget(card, null, true);
        } catch (e) {}
        try {
            if (game && game.hasPlayer) {
                return game.hasPlayer(function (current) {
                    return !!(current && (!current.isIn || current.isIn()) && player.canUse && player.canUse(card, current, null, true));
                });
            }
        } catch (e2) {}
        return false;
    }

    function isDrunk(player) {
        if (!player) return false;
        try {
            if (player.hasSkill && player.hasSkill("jiu")) return true;
        } catch (e) {}
        return !!(player.storage && player.storage.jiu);
    }

    function safeTranslation(item) {
        try {
            var getter = runtimeGet();
            if (getter && getter.translation) return getter.translation(item);
        } catch (e) {}
        return item && item.name ? item.name : String(item || "");
    }

    globalThis.zusJingyouSetStorage = setStorage;
    globalThis.zusJingyouGetStorage = getStorage;
    globalThis.zusJingyouStageCardName = stageCardName;
    globalThis.zusJingyouMakeVirtualCard = makeVirtualCard;
    globalThis.zusJingyouCanUseCardWithTarget = canUseCardWithTarget;
    globalThis.zusJingyouIsDrunk = isDrunk;
    globalThis.zusJingyouSafeTranslation = safeTranslation;
    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("jingyou", "setStorage", setStorage, { globalName: "zusJingyouSetStorage", overwrite: true });
        Zus.bindHelper("jingyou", "getStorage", getStorage, { globalName: "zusJingyouGetStorage", overwrite: true });
        Zus.bindHelper("jingyou", "stageCardName", stageCardName, { globalName: "zusJingyouStageCardName", overwrite: true });
        Zus.bindHelper("jingyou", "makeVirtualCard", makeVirtualCard, { globalName: "zusJingyouMakeVirtualCard", overwrite: true });
        Zus.bindHelper("jingyou", "canUseCardWithTarget", canUseCardWithTarget, { globalName: "zusJingyouCanUseCardWithTarget", overwrite: true });
        Zus.bindHelper("jingyou", "isDrunk", isDrunk, { globalName: "zusJingyouIsDrunk", overwrite: true });
        Zus.bindHelper("jingyou", "safeTranslation", safeTranslation, { globalName: "zusJingyouSafeTranslation", overwrite: true });
    }

    window.zusfylriModules["jingyou"] = {
        key: "jingyou",
        character: {
            zus_jingyou: char("male", "zus_group_mo", 4, ["zus_tianshe", "zus_xuji"], "zus_jingyou", "png"),
        },
        skill: {
            zus_tianshe: {
                trigger: { player: ["phaseBegin", "phaseZhunbeiBegin", "phaseUseBegin", "phaseJieshuBegin"] },
                forced: true,
                locked: true,
                group: "zus_tianshe_jiu",
                async content(event, trigger, player) {
                    var name = globalThis.zusJingyouStageCardName ? globalThis.zusJingyouStageCardName(trigger && trigger.name) : null;
                    if (!name) return;
                    var card = globalThis.zusJingyouMakeVirtualCard ? globalThis.zusJingyouMakeVirtualCard(name) : { name: name, isCard: true };
                    var canUse = globalThis.zusJingyouCanUseCardWithTarget ? globalThis.zusJingyouCanUseCardWithTarget(player, card) : false;
                    if (!canUse) {
                        await player.loseHp();
                        return;
                    }
                    var result = await player.chooseUseTarget({ card: card, forced: true, logSkill: "zus_tianshe" }).forResult();
                    if (!result || !result.bool) await player.loseHp();
                },
            },

            zus_tianshe_jiu: {
                trigger: { player: "phaseUseEnd" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    return !!(globalThis.zusJingyouIsDrunk && globalThis.zusJingyouIsDrunk(player));
                },
                async content(event, trigger, player) {
                    player.logSkill("zus_tianshe");
                    await player.loseHp();
                },
            },

            zus_xuji: {
                trigger: { global: "dieAfter" },
                direct: true,
                filter: function (event, player) {
                    var phase = event && event.getParent ? event.getParent("phase") : null;
                    return !!(player && player.isIn && player.isIn() && phase && phase.player == player);
                },
                async content(event, trigger, player) {
                    player.logSkill("zus_xuji", trigger && trigger.player);
                    await player.recover(2);
                    if (globalThis.zusJingyouSetStorage) globalThis.zusJingyouSetStorage(player, "zus_xuji_extra", true);
                    if (player.markSkill) player.markSkill("zus_xuji_extra");
                },
                group: "zus_xuji_phase",
            },

            zus_xuji_phase: {
                trigger: { player: "phaseAfter" },
                direct: true,
                filter: function (event, player) {
                    return !!(
                        player &&
                        (!player.isIn || player.isIn()) &&
                        globalThis.zusJingyouGetStorage &&
                        globalThis.zusJingyouGetStorage(player, "zus_xuji_extra", false)
                    );
                },
                async content(event, trigger, player) {
                    var choose = await player
                        .chooseBool("是否发动【续祀】，进行一个额外回合？")
                        .set("ai", function () {
                            return true;
                        })
                        .forResult();
                    if (globalThis.zusJingyouSetStorage) globalThis.zusJingyouSetStorage(player, "zus_xuji_extra", false);
                    if (player.unmarkSkill) player.unmarkSkill("zus_xuji_extra");
                    if (choose && choose.bool) {
                        player.logSkill("zus_xuji");
                        player.insertPhase();
                    }
                },
            },

            zus_xuji_extra: {
                charlotte: true,
                mark: true,
                intro: { content: "此回合结束后，你可以进行一个额外回合。" },
            },
        },
        translate: {
            zus_jingyou: "景祐",
            zus_jingyou_ab: "景祐",
            zus_tianshe: "天赦",
            zus_tianshe_info:
                "锁定技。你在开始阶段视为使用一张【顺手牵羊】；准备阶段视为使用一张【过河拆桥】；出牌阶段开始时视为使用一张【酒】；结束阶段视为使用一张【借刀杀人】。每当你因此技能使用牌时无目标可指定，或你的出牌阶段结束时处于醉酒状态，你失去1点体力。",
            zus_tianshe_jiu: "天赦",
            zus_tianshe_jiu_info: "出牌阶段结束时，若你处于醉酒状态，你失去1点体力。",
            zus_xuji: "续祀",
            zus_xuji_info: "在你的回合内，若有角色死亡，你回复2点体力，此回合结束后，你可以进行一个额外回合。",
            zus_xuji_phase: "续祀",
            zus_xuji_phase_info: "此回合结束后，你可以进行一个额外回合。",
            zus_xuji_extra: "续祀",
            zus_xuji_extra_info: "此回合结束后，你可以进行一个额外回合。",
        },
        sort: ["zus_jingyou"],
        title: {
            zus_jingyou: "永祀帝",
        },
    };
})();
