game.import("character", function (lib, game, ui, get, ai, _status) {
    // ============================================================
    // 红予：寻找“血莲教主”
    // 只有红予本体，或拥有【圣葬】的角色，才视为真正教主。
    // 被【莲蛊】传播出去的普通角色不能被当成教主。
    // ============================================================
    if (!game.zusHongyuGetMaster) {
        game.zusHongyuGetMaster = function (preferred) {
            if (preferred && preferred.isIn && preferred.isIn()) {
                if (
                    preferred.name == "zus_hongyu" ||
                    preferred.name1 == "zus_hongyu" ||
                    preferred.name2 == "zus_hongyu" ||
                    (preferred.hasSkill && preferred.hasSkill("zus_shengzang"))
                ) {
                    return preferred;
                }
            }

            var master = game.findPlayer(function (current) {
                return current &&
                    current.isIn &&
                    current.isIn() &&
                    (
                        current.name == "zus_hongyu" ||
                        current.name1 == "zus_hongyu" ||
                        current.name2 == "zus_hongyu"
                    );
            });

            if (master) return master;

            return game.findPlayer(function (current) {
                return current &&
                    current.isIn &&
                    current.isIn() &&
                    current.hasSkill &&
                    current.hasSkill("zus_shengzang");
            });
        };
    }

    // ============================================================
    // 红予：令角色获得【纳奉】与【莲蛊】，并记录真正教主来源
    // ============================================================
    if (!game.zusHongyuInfect) {
        game.zusHongyuInfect = function (target, master) {
            if (!target || !target.isIn || !target.isIn()) return;

            master = game.zusHongyuGetMaster(master);
            if (!master || !master.isIn()) return;

            Sync.setStorage(target, "zus_nafeng_source", master);

            if (!target.hasSkill("zus_nafeng")) {
                target.addSkill("zus_nafeng");
            }

            if (!target.hasSkill("zus_liangu")) {
                target.addSkill("zus_liangu");
            }

            target.markSkill("zus_nafeng");

            game.log(target, "获得了技能", "#g【纳奉】", "与", "#g【莲蛊】");
            game.log(target, "的", "#g【纳奉】", "对象为", master);
        };
    }

    // ============================================================
    // 红予：判断是否为可由【圣葬】永久获得的一般技
    // ============================================================
    if (!game.zusHongyuIsNormalSkill) {
        game.zusHongyuIsNormalSkill = function (skill) {
            if (!skill || !lib.skill[skill]) return false;

            // 排除红予传播体系技能，避免套娃
            if (skill == "zus_nafeng" || skill == "zus_liangu") return false;

            var info = lib.skill[skill];

            if (info.charlotte) return false;
            if (info.sub) return false;
            if (info.equipSkill) return false;
            if (info.ruleSkill) return false;
            if (info.zhuSkill) return false;
            if (info.limited) return false;
            if (info.juexingji) return false;
            if (info.dutySkill) return false;
            if (info.unique) return false;

            if (skill.indexOf("_") == 0) return false;

            return true;
        };
    }

    return {
        name: "zus_skill_hongyu",

        character: {},

        skill: {
            // 莲蛊：出牌阶段限一次，你可以将1张【杀】交给一名其他角色，
            // 令其获得技能【纳奉】与【莲蛊】。
            zus_liangu: {
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    var master = game.zusHongyuGetMaster(player.storage.zus_nafeng_source || player);

                    return master &&
                        master.isIn() &&
                        player.countCards("h", "sha") > 0 &&
                        game.hasPlayer(function (current) {
                            return current != player && current.isIn();
                        });
                },

                filterCard: function (card) {
                    return get.name(card) == "sha";
                },

                position: "h",
                selectCard: 1,

                filterTarget: function (card, player, target) {
                    return target != player && target.isIn();
                },

                check: function (card) {
                    return 5 - get.value(card);
                },

                content: function () {
                    "step 0"
                    if (cards && cards.length && target && target.isIn()) {
                        player.give(cards, target);
                    }

                    "step 1"
                    var master = game.zusHongyuGetMaster(player.storage.zus_nafeng_source || player);

                    if (target && target.isIn() && master && master.isIn()) {
                        game.zusHongyuInfect(target, master);
                    }
                },

                ai: {
                    order: 7,
                    result: {
                        target: function (player, target) {
                            var att = get.attitude(player, target);

                            if (att > 0) return 1;

                            // 给敌人也可能制造“纳奉”负担，但收益较低
                            return target.countCards("he") > 0 ? -0.2 : 0;
                        },
                    },
                },
            },

            // 圣葬：当场上其他角色阵亡，若其拥有【纳奉】：
            // 你恢复1点体力并永久获得其1个一般技。
            zus_shengzang: {
                trigger: {
                    global: "dieAfter",
                },
                forced: true,
                locked: true,
                mark: true,

                intro: {
                    content: function (storage, player) {
                        var skills = player.storage.zus_shengzang_skills || [];
                        if (!skills.length) return "尚未获得技能。";

                        return "已获得技能：" + skills.map(function (skill) {
                            return "【" + get.translation(skill) + "】";
                        }).join("、");
                    },
                },

                filter: function (event, player) {
                    if (!event.player || event.player == player) return false;

                    if (event.player.hasSkill && event.player.hasSkill("zus_nafeng")) return true;
                    if (event.player.storage && event.player.storage.zus_nafeng_source == player) return true;

                    return false;
                },

                content: function () {
                    "step 0"
                    event.dead = trigger.player;

                    player.recover();

                    event.skills = [];

                    var skills = [];
                    if (event.dead.getSkills) {
                        skills = event.dead.getSkills(null, false, false);
                    }

                    var names = [];
                    if (event.dead.name) names.push(event.dead.name);
                    if (event.dead.name1) names.push(event.dead.name1);
                    if (event.dead.name2) names.push(event.dead.name2);

                    for (var i = 0; i < names.length; i++) {
                        var name = names[i];

                        if (lib.character[name] && lib.character[name][3]) {
                            skills = skills.concat(lib.character[name][3]);
                        }
                    }

                    skills = skills.unique ? skills.unique() : Array.from(new Set(skills));

                    for (var j = 0; j < skills.length; j++) {
                        var skill = skills[j];

                        if (!game.zusHongyuIsNormalSkill(skill)) continue;
                        if (player.hasSkill(skill)) continue;

                        if (player.storage.zus_shengzang_skills && player.storage.zus_shengzang_skills.indexOf(skill) != -1) {
                            continue;
                        }

                        event.skills.push(skill);
                    }

                    if (!event.skills.length) {
                        event.finish();
                        return;
                    }

                    "step 1"
                    if (event.skills.length == 1) {
                        event.skill = event.skills[0];
                        event.goto(3);
                        return;
                    }

                    var list = [];

                    for (var i = 0; i < event.skills.length; i++) {
                        list.push([
                            event.skills[i],
                            get.translation(event.skills[i]),
                            get.skillInfoTranslation(event.skills[i])
                        ]);
                    }

                    player.chooseButton(
                        true,
                        ["圣葬：永久获得其一个一般技", [list, "textbutton"]]
                    ).set("ai", function () {
                        return 1;
                    });

                    "step 2"
                    if (result.bool && result.links && result.links.length) {
                        event.skill = result.links[0][0];
                    } else {
                        event.finish();
                    }

                    "step 3"
                    if (event.skill && lib.skill[event.skill]) {
                        if (!player.storage.zus_shengzang_skills) {
                            Sync.setStorage(player, "zus_shengzang_skills", []);
                        }

                        if (player.storage.zus_shengzang_skills.indexOf(event.skill) == -1) {
                            Sync.pushUnique(player, "zus_shengzang_skills", event.skill);
                        }

                        // 关键修复：
                        // 优先使用 addAdditionalSkill，让获得的技能作为【圣葬】提供的永久额外技能挂在身上。
                        // 这样比单纯 player.addSkill(event.skill) 更稳，按钮技、触发技都更容易正常注册。
                        if (player.addAdditionalSkill) {
                            player.addAdditionalSkill("zus_shengzang", player.storage.zus_shengzang_skills, true);
                        } else {
                            // 旧版本兜底
                            for (var i = 0; i < player.storage.zus_shengzang_skills.length; i++) {
                                var skill = player.storage.zus_shengzang_skills[i];
                                if (!player.hasSkill(skill)) {
                                    player.addSkill(skill);
                                }
                            }
                        }

                        player.markSkill("zus_shengzang");

                        if (player.update) {
                            player.update();
                        }

                        game.log(player, "因", "#g【圣葬】", "永久获得了技能", "#g【" + get.translation(event.skill) + "】");
                    }
                },
            },

            // 异罪：限定技，当一名角色使用【桃】指定目标后，
            // 你可以令其获得技能【纳奉】，并令此【桃】的体力回复改为体力流失。
            zus_yizui: {
                trigger: {
                    global: "useCardToTargeted",
                },
                direct: true,
                limited: true,
                skillAnimation: true,
                animationColor: "fire",

                filter: function (event, player) {
                    if (player.storage.zus_yizui_used) return false;
                    if (!event.card || get.name(event.card) != "tao") return false;
                    if (!event.player || !event.player.isIn()) return false;
                    if (!event.target || !event.target.isIn()) return false;

                    return player.isIn();
                },

                content: function () {
                    "step 0"
                    event.user = trigger.player;
                    event.target = trigger.target;

                    player.chooseBool(
                        "是否发动限定技【异罪】，令" +
                        get.translation(event.user) +
                        "获得【纳奉】，并令此【桃】对" +
                        get.translation(event.target) +
                        "的回复改为体力流失？"
                    ).set("ai", function () {
                        var player = _status.event.player;
                        var target = _status.event.targetx;

                        return get.attitude(player, target) < 0;
                    }).set("targetx", event.target);

                    "step 1"
                    if (!result.bool) {
                        event.finish();
                        return;
                    }

                    Sync.setStorage(player, "zus_yizui_used", true);
                    player.awakenSkill("zus_yizui");
                    player.logSkill("zus_yizui", event.user);

                    game.zusHongyuInfect(event.user, player);

                    if (!event.target.storage.zus_yizui_convert) {
                        Sync.setStorage(event.target, "zus_yizui_convert", []);
                    }

                    Sync.pushValue(event.target, "zus_yizui_convert", trigger.card);
                    event.target.addTempSkill("zus_yizui_convert", { global: "useCardAfter" });

                    game.log(trigger.card, "的回复将改为", "#y体力流失");
                },
            },

            // 异罪承载：将本次【桃】的回复改为体力流失
            zus_yizui_convert: {
                trigger: {
                    player: "recoverBegin",
                },
                forced: true,
                charlotte: true,
                popup: false,

                filter: function (event, player) {
                    if (!player.storage.zus_yizui_convert || !player.storage.zus_yizui_convert.length) return false;

                    var parent = event.getParent ? event.getParent() : null;

                    while (parent) {
                        if (
                            parent.card &&
                            get.name(parent.card) == "tao" &&
                            player.storage.zus_yizui_convert.indexOf(parent.card) != -1
                        ) {
                            return true;
                        }

                        parent = parent.getParent ? parent.getParent() : null;
                    }

                    return false;
                },

                content: function () {
                    "step 0"
                    event.num = trigger.num || 1;
                    trigger.cancel();

                    var parent = trigger.getParent ? trigger.getParent() : null;
                    var card = null;

                    while (parent) {
                        if (parent.card && get.name(parent.card) == "tao") {
                            card = parent.card;
                            break;
                        }

                        parent = parent.getParent ? parent.getParent() : null;
                    }

                    if (card && player.storage.zus_yizui_convert) {
                        Sync.removeValue(player, "zus_yizui_convert", card);
                    }

                    "step 1"
                    player.loseHp(event.num);
                    game.log(player, "因", "#g【异罪】", "将回复改为流失了", event.num, "点体力");
                },
            },

            // 纳奉：锁定技，出牌阶段开始时，你交给血莲教主1张牌，然后摸1张牌。
            zus_nafeng: {
                trigger: {
                    player: "phaseUseBegin",
                },
                forced: true,
                locked: true,
                mark: true,

                intro: {
                    name: "纳奉",
                    content: function (storage, player) {
                        var master = game.zusHongyuGetMaster(player.storage.zus_nafeng_source);

                        if (master && master.isIn()) {
                            return "血莲教主：" + get.translation(master);
                        }

                        return "血莲教主已不在场。";
                    },
                },

                filter: function (event, player) {
                    var master = game.zusHongyuGetMaster(player.storage.zus_nafeng_source);

                    return master && master.isIn() && master != player;
                },

                content: function () {
                    "step 0"
                    event.master = game.zusHongyuGetMaster(player.storage.zus_nafeng_source);

                    if (!event.master || !event.master.isIn() || event.master == player) {
                        event.finish();
                        return;
                    }

                    if (player.countCards("he") > 0) {
                        player.chooseCard(
                            "he",
                            true,
                            "纳奉：交给" + get.translation(event.master) + "一张牌"
                        ).set("ai", function (card) {
                            return 6 - get.value(card);
                        });
                    } else {
                        event.goto(2);
                    }

                    "step 1"
                    if (result.bool && result.cards && result.cards.length && event.master && event.master.isIn()) {
                        player.give(result.cards, event.master);
                    }

                    "step 2"
                    player.draw();
                },
            },
        },

        translate: {
            zus_liangu: "莲蛊",
            zus_liangu_info: "出牌阶段限一次，你可以将1张【杀】交给一名其他角色，令其获得技能“纳奉”与“莲蛊”。",

            zus_shengzang: "圣葬",
            zus_shengzang_info: "当场上其他角色阵亡，若其拥有技能“纳奉”：你恢复1点体力并永久获得其1个一般技。",

            zus_yizui: "异罪",
            zus_yizui_info: "限定技，当一名角色使用【桃】，你可以令其获得技能“纳奉”并令此【桃】的体力回复改为体力流失。",

            zus_nafeng: "纳奉",
            zus_nafeng_info: "锁定技，出牌阶段开始时，你交给血莲教主1张牌，然后摸1张牌。",
        },
    };
});