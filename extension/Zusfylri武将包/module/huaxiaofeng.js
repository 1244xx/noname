(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof _status === "undefined") var _status = globalThis._status;

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

    function safeName(card, player) {
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

    function runtimeGet() {
        try {
            if (window.Zus && Zus.runtimeGet) {
                var getter = Zus.runtimeGet();
                if (getter) return getter;
            }
        } catch (e) {}
        return globalThis.get || get || null;
    }

    function safeSuit(card, player) {
        if (!card) return null;
        try {
            if (window.Zus && Zus.safeSuit) {
                var zusSuit = Zus.safeSuit(card, player);
                if (zusSuit && zusSuit != "none") return zusSuit;
            }
        } catch (e) {}
        try {
            var getter = runtimeGet();
            var suit = getter && getter.suit ? getter.suit(card, player) : null;
            if (suit && suit != "none") return suit;
        } catch (e2) {}
        return card && card.suit || null;
    }

    function safeSubtype(card, player) {
        if (!card) return null;
        try {
            if (window.Zus && Zus.safeSubtype) {
                var zusSubtype = Zus.safeSubtype(card, player);
                if (zusSubtype) return zusSubtype;
            }
        } catch (e) {}
        try {
            var getter = runtimeGet();
            var subtype = getter && getter.subtype ? getter.subtype(card, player) : null;
            if (subtype) return subtype;
        } catch (e2) {}
        try {
            if (card.subtype) return card.subtype;
            var name = card.name || safeName(card, player);
            var currentLib = globalThis.lib || lib;
            return currentLib && currentLib.card && currentLib.card[name] && currentLib.card[name].subtype || null;
        } catch (e3) {}
        return null;
    }

    function getWeaponCards(player) {
        if (!player) return [];
        var weapons = [];
        try {
            if (player.getCards) {
                weapons = player.getCards("e").filter(function (card) {
                    return globalThis.zusHuaxiaofengSafeSubtype(card, player) == "equip1";
                });
            }
        } catch (e) {}
        if (weapons.length || !player.getEquip) return weapons;
        try {
            var weapon = player.getEquip(1);
            if (weapon) weapons.push(weapon);
        } catch (e2) {}
        return weapons;
    }

    function hasWeapon(player) {
        return getWeaponCards(player).length > 0;
    }

    function isPhaseUseCard(event, player) {
        if (!event || !player) return false;
        try {
            var phaseUse = event.getParent ? event.getParent("phaseUse") : null;
            if (phaseUse && phaseUse.name == "phaseUse" && phaseUse.player == player) return true;
        } catch (e) {}
        try {
            return !!(player.isPhaseUsing && player.isPhaseUsing());
        } catch (e2) {}
        return false;
    }

    function hasMatchingWeaponSuit(player, card, cards) {
        var suit = globalThis.zusHuaxiaofengSafeSuit(card, player);
        if ((!suit || suit == "none") && cards && cards.length == 1) {
            suit = globalThis.zusHuaxiaofengSafeSuit(cards[0], player);
        }
        if (!suit || suit == "none") return false;
        var weapons = getWeaponCards(player);
        for (var i = 0; i < weapons.length; i++) {
            if (globalThis.zusHuaxiaofengSafeSuit(weapons[i], player) == suit) return true;
        }
        return false;
    }

    function getBlockedSuits(player) {
        if (!player || !player.storage) return [];
        var suits = player.storage.zus_chengcang_block_suits;
        if (!Array.isArray(suits)) suits = [];
        var oldSuit = player.storage.zus_chengcang_block_suit;
        if (oldSuit && suits.indexOf(oldSuit) == -1) suits = suits.concat(oldSuit);
        return suits;
    }

    function addBlockedSuit(player, suit) {
        if (!player || !suit || suit == "none") return;
        var suits = getBlockedSuits(player);
        if (suits.indexOf(suit) == -1) suits = suits.concat(suit);
        Sync.setStorage(player, "zus_chengcang_block_suits", suits);
    }

    function hasBlockedSuit(player, card) {
        var suit = globalThis.zusHuaxiaofengSafeSuit(card, player);
        return !!(suit && getBlockedSuits(player).indexOf(suit) != -1);
    }

    function clearBlockedSuits(player) {
        Sync.deleteStorage(player, "zus_chengcang_block_suits");
        Sync.deleteStorage(player, "zus_chengcang_block_suit");
    }

    function isDrunk(player) {
        if (!player) return false;
        try {
            if (player.hasSkill && player.hasSkill("jiu")) return true;
        } catch (e) {}
        return !!(player.storage && player.storage.jiu);
    }

    function canUseJiu(player) {
        if (!player) return false;
        var card = { name: "jiu", isCard: true };
        try {
            if (player.hasUseTarget) return !!player.hasUseTarget(card, true, false);
        } catch (e) {}
        try {
            var currentLib = globalThis.lib || lib;
            if (currentLib && currentLib.filter) {
                if (currentLib.filter.cardEnabled && !currentLib.filter.cardEnabled(card, player)) return false;
                if (currentLib.filter.cardUsable && !currentLib.filter.cardUsable(card, player)) return false;
                if (currentLib.filter.targetEnabled && !currentLib.filter.targetEnabled(card, player, player)) return false;
                return true;
            }
        } catch (e2) {}
        try {
            if (player.getCardUsable) return player.getCardUsable("jiu") > 0;
        } catch (e3) {}
        try {
            if (player.countUsed) return player.countUsed("jiu") <= 0;
        } catch (e4) {}
        return !isDrunk(player);
    }

    function changeChengcang(player) {
        if (!player) return;
        if (player.changeZhuanhuanji) {
            player.changeZhuanhuanji("zus_chengcang");
            return;
        }
        player.storage = player.storage || {};
        player.storage.zus_chengcang = !player.storage.zus_chengcang;
        if (player.syncStorage) player.syncStorage("zus_chengcang");
    }

    function addDirectHit(useEvent, targets) {
        if (!useEvent) return;
        if (!useEvent.directHit) useEvent.directHit = [];
        for (var i = 0; i < targets.length; i++) {
            var target = targets[i];
            if (!target) continue;
            if (useEvent.directHit.add) useEvent.directHit.add(target);
            else if (useEvent.directHit.indexOf(target) == -1) useEvent.directHit.push(target);
        }
    }

    globalThis.zusHuaxiaofengRuntimeGet = runtimeGet;
    globalThis.zusHuaxiaofengSafeName = safeName;
    globalThis.zusHuaxiaofengSafeSuit = safeSuit;
    globalThis.zusHuaxiaofengSafeSubtype = safeSubtype;
    globalThis.zusHuaxiaofengGetWeaponCards = getWeaponCards;
    globalThis.zusHuaxiaofengHasWeapon = hasWeapon;
    globalThis.zusHuaxiaofengIsPhaseUseCard = isPhaseUseCard;
    globalThis.zusHuaxiaofengHasMatchingWeaponSuit = hasMatchingWeaponSuit;
    globalThis.zusHuaxiaofengGetBlockedSuits = getBlockedSuits;
    globalThis.zusHuaxiaofengAddBlockedSuit = addBlockedSuit;
    globalThis.zusHuaxiaofengHasBlockedSuit = hasBlockedSuit;
    globalThis.zusHuaxiaofengClearBlockedSuits = clearBlockedSuits;
    globalThis.zusHuaxiaofengIsDrunk = isDrunk;
    globalThis.zusHuaxiaofengCanUseJiu = canUseJiu;
    globalThis.zusHuaxiaofengChangeChengcang = changeChengcang;
    globalThis.zusHuaxiaofengAddDirectHit = addDirectHit;

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("huaxiaofeng", "runtimeGet", runtimeGet, { globalName: "zusHuaxiaofengRuntimeGet", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "safeName", safeName, { globalName: "zusHuaxiaofengSafeName", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "safeSuit", safeSuit, { globalName: "zusHuaxiaofengSafeSuit", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "safeSubtype", safeSubtype, { globalName: "zusHuaxiaofengSafeSubtype", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "getWeaponCards", getWeaponCards, { globalName: "zusHuaxiaofengGetWeaponCards", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "hasWeapon", hasWeapon, { globalName: "zusHuaxiaofengHasWeapon", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "isPhaseUseCard", isPhaseUseCard, { globalName: "zusHuaxiaofengIsPhaseUseCard", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "hasMatchingWeaponSuit", hasMatchingWeaponSuit, { globalName: "zusHuaxiaofengHasMatchingWeaponSuit", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "getBlockedSuits", getBlockedSuits, { globalName: "zusHuaxiaofengGetBlockedSuits", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "addBlockedSuit", addBlockedSuit, { globalName: "zusHuaxiaofengAddBlockedSuit", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "hasBlockedSuit", hasBlockedSuit, { globalName: "zusHuaxiaofengHasBlockedSuit", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "clearBlockedSuits", clearBlockedSuits, { globalName: "zusHuaxiaofengClearBlockedSuits", overwrite: true });
        Zus.bindHelper("huaxiaofeng", "canUseJiu", canUseJiu, { globalName: "zusHuaxiaofengCanUseJiu", overwrite: true });
    }

    window.zusfylriModules["huaxiaofeng"] = {
        key: "huaxiaofeng",
        character: {
            zus_huaxiaofeng: char("male", "zus_group_huan", 4, ["zus_chengcang", "zus_tingshuang"], "zus_huaxiaofeng", "png"),
        },
        skill: {
            zus_chengcang: {
                zhuanhuanji: true,
                mark: true,
                marktext: "苍",
                intro: {
                    content: function (storage) {
                        return storage
                            ? "藏于月秋：出牌阶段，你可以将装备区内的武器牌收回手牌并视为使用一张【酒】。"
                            : "刻于刀锋：出牌阶段，当你使用与装备区武器牌花色相同的牌时，你可以摸一张牌，或强化此【杀】。";
                    },
                },
                enable: "phaseUse",
                filter: function (event, player) {
                    return !!(player && player.storage && player.storage.zus_chengcang && globalThis.zusHuaxiaofengHasWeapon(player));
                },
                content: async function (event, trigger, player) {
                    var weapons = globalThis.zusHuaxiaofengGetWeaponCards(player);
                    if (!weapons.length) return;
                    var weapon = weapons[0];
                    if (weapons.length > 1) {
                        var result = await player
                            .chooseButton(["乘苍：选择要收回手牌的武器牌", weapons], true)
                            .set("ai", function (button) {
                                var getter = globalThis.zusHuaxiaofengRuntimeGet && globalThis.zusHuaxiaofengRuntimeGet();
                                return getter && getter.value ? getter.value(button.link) : 0;
                            })
                            .forResult();
                        if (!result || !result.bool || !result.links || !result.links.length) return;
                        weapon = result.links[0];
                    }

                    var suit = globalThis.zusHuaxiaofengSafeSuit(weapon, player);
                    player.logSkill("zus_chengcang");
                    if (suit) {
                        if (!player.hasSkill || !player.hasSkill("zus_chengcang_block")) {
                            player.addTempSkill("zus_chengcang_block", { player: "phaseUseEnd" });
                        }
                        globalThis.zusHuaxiaofengAddBlockedSuit(player, suit);
                    }
                    await player.gain(weapon, "gain2");
                    if (globalThis.zusHuaxiaofengCanUseJiu && globalThis.zusHuaxiaofengCanUseJiu(player)) {
                        await player.useCard({ name: "jiu", isCard: true }, player);
                    }
                    globalThis.zusHuaxiaofengChangeChengcang(player);
                },
                group: "zus_chengcang_daofeng",
                ai: {
                    order: 6,
                    result: {
                        player: function (player) {
                            return player.hp < player.maxHp ? 1.5 : 0.6;
                        },
                    },
                },
            },

            zus_chengcang_daofeng: {
                trigger: { player: "useCard1" },
                direct: true,
                filter: function (event, player) {
                    if (!player || player.storage && player.storage.zus_chengcang) return false;
                    if (!globalThis.zusHuaxiaofengIsPhaseUseCard || !globalThis.zusHuaxiaofengIsPhaseUseCard(event, player)) return false;
                    return !!(globalThis.zusHuaxiaofengHasMatchingWeaponSuit && globalThis.zusHuaxiaofengHasMatchingWeaponSuit(player, event.card, event.cards));
                },
                content: async function (event, trigger, player) {
                    var name = globalThis.zusHuaxiaofengSafeName(trigger.card, player);
                    if (name == "sha") {
                        globalThis.zusHuaxiaofengDaofengAiTargets = trigger.targets || [];
                        globalThis.zusHuaxiaofengDaofengAiPlayer = player;
                        var result = await player
                            .chooseControl(["摸一张牌", "令此【杀】不可被【闪】响应且伤害+1", "cancel2"])
                            .set("prompt", "乘苍：选择一项")
                            .set("ai", function () {
                                var targets = globalThis.zusHuaxiaofengDaofengAiTargets || [];
                                var source = globalThis.zusHuaxiaofengDaofengAiPlayer;
                                var getter = globalThis.zusHuaxiaofengRuntimeGet && globalThis.zusHuaxiaofengRuntimeGet();
                                var hasEnemy = targets.some(function (target) {
                                    return getter && getter.attitude ? getter.attitude(source, target) < 0 : false;
                                });
                                return hasEnemy ? "令此【杀】不可被【闪】响应且伤害+1" : "摸一张牌";
                            })
                            .forResult();
                        globalThis.zusHuaxiaofengDaofengAiTargets = null;
                        globalThis.zusHuaxiaofengDaofengAiPlayer = null;
                        if (!result || result.control == "cancel2") return;
                        player.logSkill("zus_chengcang");
                        if (result.control == "令此【杀】不可被【闪】响应且伤害+1") {
                            trigger.baseDamage = (trigger.baseDamage || 1) + 1;
                            globalThis.zusHuaxiaofengAddDirectHit(trigger, trigger.targets || []);
                        } else {
                            await player.draw();
                        }
                    } else {
                        var result2 = await player
                            .chooseBool("是否发动【乘苍】，摸一张牌？")
                            .set("ai", function () {
                                return true;
                            })
                            .forResult();
                        if (!result2 || !result2.bool) return;
                        player.logSkill("zus_chengcang");
                        await player.draw();
                    }
                    globalThis.zusHuaxiaofengChangeChengcang(player);
                },
            },

            zus_chengcang_block: {
                charlotte: true,
                onremove: function (player) {
                    globalThis.zusHuaxiaofengClearBlockedSuits(player);
                },
                mod: {
                    cardEnabled: function (card, player) {
                        if (globalThis.zusHuaxiaofengHasBlockedSuit(player, card)) return false;
                    },
                    cardEnabled2: function (card, player) {
                        if (globalThis.zusHuaxiaofengHasBlockedSuit(player, card)) return false;
                    },
                    cardRespondable: function (card, player) {
                        if (globalThis.zusHuaxiaofengHasBlockedSuit(player, card)) return false;
                    },
                },
            },

            zus_tingshuang: {
                locked: true,
                forced: true,
                group: ["zus_tingshuang_draw", "zus_tingshuang_recover"],
            },

            zus_tingshuang_draw: {
                trigger: { player: "phaseZhunbeiBegin" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    return !globalThis.zusHuaxiaofengHasWeapon(player);
                },
                content: function () {
                    player.draw();
                },
            },

            zus_tingshuang_recover: {
                trigger: { player: "phaseUseEnd" },
                forced: true,
                locked: true,
                filter: function (event, player) {
                    return !!(globalThis.zusHuaxiaofengIsDrunk && globalThis.zusHuaxiaofengIsDrunk(player));
                },
                content: function () {
                    player.recover();
                },
            },
        },
        translate: {
            zus_huaxiaofeng: "花晓峰",
            zus_huaxiaofeng_ab: "花晓峰",
            zus_chengcang: "乘苍",
            zus_chengcang_info:
                "转换技。①刻于刀锋：出牌阶段，当你使用与装备区的武器牌花色相同的牌时，你可以摸1张牌，或令此牌（需为【杀】）不可被【闪】响应且伤害+1。②藏于月秋：出牌阶段，你可以将你装备的武器牌收回手牌，并视为使用一张【酒】；此阶段你无法使用或打出与以此法收回的牌花色相同的牌。",
            zus_chengcang_daofeng: "乘苍",
            zus_chengcang_block: "乘苍",
            zus_tingshuang: "听霜",
            zus_tingshuang_info:
                "锁定技。准备阶段，若你的装备区没有武器牌，你摸1张牌；出牌阶段结束时，若你处于醉酒状态，你恢复1点体力。",
            zus_tingshuang_draw: "听霜",
            zus_tingshuang_recover: "听霜",
        },
        title: {
            zus_huaxiaofeng: "诉与孤风",
        },
        sort: ["zus_huaxiaofeng"],
    };
})();
