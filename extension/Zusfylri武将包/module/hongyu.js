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

    function runtimeLib() {
        if (lib && typeof lib == "object") return lib;
        if (globalThis.lib && typeof globalThis.lib == "object") return globalThis.lib;
        return null;
    }

    function isNormalShengzangSkill(skill) {
        var currentLib = runtimeLib();
        if (!skill || !currentLib || !currentLib.skill || !currentLib.skill[skill]) return false;
        if (skill == "zus_nafeng" || skill == "zus_liangu") return false;
        if (skill.indexOf("_") == 0) return false;

        var info = currentLib.skill[skill];
        if (!info) return false;
        if (info.charlotte || info.sub || info.equipSkill || info.ruleSkill) return false;
        if (info.zhuSkill || info.limited || info.juexingji || info.dutySkill || info.unique) return false;
        return true;
    }

    function safeAttitude(from, to) {
        var currentGet = (globalThis.get && typeof globalThis.get == "object") ? globalThis.get : get;
        if (currentGet && typeof currentGet.attitude == "function") {
            try {
                return currentGet.attitude(from, to);
            } catch (e) {}
        }
        return 0;
    }

    globalThis.zusHongyuRuntimeLib = runtimeLib;
    globalThis.zusHongyuIsNormalShengzangSkill = isNormalShengzangSkill;
    globalThis.zusHongyuSafeAttitude = safeAttitude;

    var getHongyuOwner = (window.Zus && Zus.bindHelper
        ? Zus.bindHelper("hongyu", "getOwner", function (player) {
        var list = window.Zus && Zus.players ? Zus.players() : [];
        for (var i = 0; i < list.length; i++) {
            if (
                list[i] &&
                list[i].isIn &&
                list[i].isIn() &&
                list[i].name == "zus_hongyu"
            ) {
                return list[i];
            }
        }
        return window.Zus && Zus.storage ? Zus.storage(player, "zus_hongyu_owner", null) : null;
        })
        : function (player) {
            return window.Zus && Zus.storage ? Zus.storage(player, "zus_hongyu_owner", null) : null;
        });

    window.zusfylriModules["hongyu"] = {
        key: "hongyu",

        character: {
            zus_hongyu: char(
                "female",
                "zus_group_mo",
                3,
                ["zus_liangu", "zus_shengzang", "zus_yizui"],
                "zus_hongyu",
                "png"
            ),
        },

        skill: {
            // 莲蛊：出牌阶段限一次，交出1张杀，令目标获得【纳奉】
            zus_liangu: {
                enable: "phaseUse",
                usable: 1,
                derivation: "zus_nafeng",

                filter: function (event, player) {
                    return player.countCards("he", { name: "sha" }) > 0;
                },

                filterCard: function (card, player) {
                    return (window.Zus && Zus.safeName ? Zus.safeName(card, player) : get.name(card, player)) == "sha";
                },

                position: "he",
                selectCard: 1,
                discard: false,
                lose: false,
                delay: false,

                filterTarget: function (card, player, target) {
                    return target != player && target.isIn && target.isIn();
                },

                content: function () {
                    player.give(cards, target);
                    if (target && target.isIn && target.isIn()) {
                        if (player) {
                            Sync.setStorage(target, "zus_hongyu_owner", player);
                        }
                        target.addSkill("zus_nafeng");
                        target.markSkill("zus_nafeng");
                    }
                    target.addSkill("zus_liangu_given");
                    game.log(target, "获得了技能【纳奉】与【莲蛊】");
                },

                ai: {
                    order: 7,
                    result: {
                        target: function (player, target) {
                            return target.countCards("he") ? -0.5 : 0;
                        },
                    },
                },
            },

            // 被赐予的莲蛊，仅作标记
            zus_liangu_given: {
                mark: true,
                intro: {
                    content: "已被血莲教主种下【莲蛊】。",
                },
            },

            // 圣葬：拥有纳奉的其他角色阵亡后，红予回血并获得一个一般技能
            zus_shengzang: {
                trigger: {
                    global: "dieAfter",
                },

                forced: true,

                filter: function (event, player) {
                    if (!event.player || event.player == player) return false;
                    return event.player.hasSkill && event.player.hasSkill("zus_nafeng");
                },

                content: function () {
                    "step 0"

                    if (player.isDamaged && player.isDamaged()) {
                        player.recover();
                    }

                    var list = [];
                    var skills = trigger.player.getSkills
                        ? trigger.player.getSkills(null, false, false)
                        : [];

                    var names = [];
                    if (trigger.player.name) names.push(trigger.player.name);
                    if (trigger.player.name1) names.push(trigger.player.name1);
                    if (trigger.player.name2) names.push(trigger.player.name2);

                    var currentLib = globalThis.zusHongyuRuntimeLib();
                    for (var n = 0; n < names.length; n++) {
                        var name = names[n];
                        if (currentLib && currentLib.character && currentLib.character[name] && currentLib.character[name][3]) {
                            skills = skills.concat(currentLib.character[name][3]);
                        }
                    }

                    if (skills.unique) {
                        skills = skills.unique();
                    } else {
                        skills = Array.from(new Set(skills));
                    }

                    for (var i = 0; i < skills.length; i++) {
                        var skill = skills[i];
                        if (!skill) continue;
                        if (!globalThis.zusHongyuIsNormalShengzangSkill(skill)) continue;
                        if (player.hasSkill && player.hasSkill(skill)) continue;

                        list.push(skill);
                    }

                    if (!list.length) {
                        event.finish();
                        return;
                    }

                    event.skill = list.randomGet ? list.randomGet() : list[0];

                    "step 1"

                    if (event.skill) {
                        player.addSkill(event.skill);
                        game.log(player, "因【圣葬】获得了技能", "【" + get.translation(event.skill) + "】");
                    }
                },
            },

            // 异罪：限定技，当角色使用桃时，令其获得纳奉，并将回复改为流失体力
            zus_yizui: {
                limited: true,
                skillAnimation: true,
                animationColor: "thunder",
                derivation: "zus_nafeng",

                trigger: {
                    global: "useCard",
                },

                direct: true,

                filter: function (event, player) {
                    if (!event.card || Zus.safeName(event.card, player) != "tao") return false;
                    if (!event.player || !event.player.isIn || !event.player.isIn()) return false;
                    return !player.storage.zus_yizui_used;
                },

                content: function () {
                    "step 0"

                    var att = globalThis.zusHongyuSafeAttitude(player, trigger.player);
                    var goon = false;
                    if (trigger.player && trigger.player != player) {
                        if (att < -1) {
                            goon = true;
                        } else if (att < 0 && trigger.player.hp <= 1) {
                            goon = true;
                        } else if (
                            att <= 0 &&
                            trigger.player.hasSkill &&
                            trigger.player.hasSkill("zus_nafeng")
                        ) {
                            goon = true;
                        }
                    }

                    player.chooseBool(
                        "是否发动限定技【异罪】，令" +
                            get.translation(trigger.player) +
                            "获得【纳奉】，并令此【桃】的体力回复改为体力流失？"
                    ).set("goon", goon).set("ai", function () {
                        return _status.event.goon;
                    });

                    "step 1"

                    if (result.bool) {
                        player.awakenSkill("zus_yizui");
                        Sync.setStorage(player, "zus_yizui_used", true);

                        if (trigger.player && trigger.player.isIn && trigger.player.isIn()) {
                            Sync.setStorage(trigger.player, "zus_hongyu_owner", player);
                            trigger.player.addSkill("zus_nafeng");
                            trigger.player.markSkill("zus_nafeng");
                        }

                        Sync.setStorage(trigger.player, "zus_yizui_tao_loss", true);
                        trigger.player.addTempSkill("zus_yizui_tao_loss", { global: "useCardAfter" });

                        player.logSkill("zus_yizui", trigger.player);
                    }
                },
            },

            // 异罪回复替换
            zus_yizui_tao_loss: {
                trigger: {
                    player: "recoverBegin",
                },

                forced: true,
                popup: false,
                charlotte: true,

                filter: function (event, player) {
                    return !!player.storage.zus_yizui_tao_loss;
                },

                content: function () {
                    trigger.cancel();
                    Sync.setStorage(player, "zus_yizui_tao_loss", false);
                    player.loseHp(trigger.num || 1);
                },
            },

            // 纳奉：出牌阶段开始时，交给血莲教主1张牌，然后摸1张牌
            zus_nafeng: {
                trigger: {
                    player: "phaseUseBegin",
                },

                forced: true,
                mark: true,

                filter: function (event, player) {
                    if (!player.countCards("he")) return false;
                    var owner = window.Zus && Zus.callHelper ? Zus.callHelper("hongyu", "getOwner", player) : null;
                    return owner && owner != player && owner.isIn && owner.isIn();
                },

                content: function () {
                    "step 0"

                    event.owner = window.Zus && Zus.callHelper ? Zus.callHelper("hongyu", "getOwner", player) : null;

                    if (!event.owner || !event.owner.isIn || !event.owner.isIn()) {
                        event.finish();
                        return;
                    }

                    player.chooseCard(
                        "he",
                        true,
                        "纳奉：交给" + get.translation(event.owner) + "1张牌"
                    ).set("ai", function (card) {
                        return 6 - get.value(card);
                    });

                    "step 1"

                    if (result.bool && result.cards && result.cards.length) {
                        player.give(result.cards, event.owner);
                    }

                    player.draw();
                },

                intro: {
                    content: "锁定技，出牌阶段开始时，你交给血莲教主1张牌，然后摸1张牌。",
                },
            },
        },

        translate: {
            zus_hongyu: "红予",
            zus_hongyu_ab: "红予",

            zus_liangu: "莲蛊",
            zus_liangu_info:
                "出牌阶段限一次，你可以将1张【杀】交给一名其他角色，令其获得技能【纳奉】与【莲蛊】。",

            zus_liangu_given: "莲蛊",
            zus_liangu_given_info: "已被血莲教主种下【莲蛊】。",

            zus_shengzang: "圣葬",
            zus_shengzang_info:
                "当场上其他角色阵亡，若其拥有技能【纳奉】，你恢复1点体力并永久获得其1个一般技。",

            zus_yizui: "异罪",
            zus_yizui_info:
                "限定技，当一名角色使用【桃】，你可以令其获得技能【纳奉】，并令此【桃】的体力回复改为体力流失。",

            zus_yizui_tao_loss: "异罪",
            zus_yizui_tao_loss_info: "此【桃】的回复改为体力流失。",

            zus_nafeng: "纳奉",
            zus_nafeng_info:
                "锁定技，出牌阶段开始时，你交给血莲教主1张牌，然后摸1张牌。",
        },

        sort: ["zus_hongyu"],

        title: {
            zus_hongyu: "血莲教主",
        },
    };
})();
