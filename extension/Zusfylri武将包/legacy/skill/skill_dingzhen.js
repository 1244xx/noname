game.import("character", function (lib, game, ui, get, ai, _status) {
    // ============================================================
    // 丁真【知识】普通杀目标检测：不无视距离
    // ============================================================
    if (!game.zusZhishiShaTargetEnabled) {
        game.zusZhishiShaTargetEnabled = function (card, player, target) {
            if (!player || !target || target == player) return false;

            if (!lib.filter.targetEnabled(card, player, target)) {
                return false;
            }

            // 关键修复：显式检查距离，避免虚拟【杀】绕过距离限制。
            if (lib.filter.targetInRange && !lib.filter.targetInRange(card, player, target)) {
                return false;
            }

            return true;
        };
    }

    return {
        name: "zus_skill_dingzhen",

        character: {},

        skill: {
            // 知识：随【学爆】逐步解锁
            // 1：普通杀；
            // 2：若普通杀未造成体力伤害，追加雷杀；
            // 3：若雷杀未造成体力伤害，追加火杀；
            // 4：若火杀未造成体力伤害，令目标翻面；
            // 5：无视“未造成体力伤害”的条件。
            zus_zhishi: {
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    if ((player.storage.zus_zhishi_level || 0) <= 0) return false;
                    if (player.countCards("he") <= 0) return false;

                    // 【知识】的第一张普通【杀】不无视次数限制。
                    // 若此时已经不能正常使用【杀】，则不能发动【知识】。
                    if (typeof player.getCardUsable == "function") {
                        if (player.getCardUsable({ name: "sha" }) <= 0) return false;
                    } else {
                        var stat = player.getStat("card");
                        if (stat.sha && stat.sha >= 1) return false;
                    }

                    var sha = {
                        name: "sha",
                        isCard: true,
                    };

                    return game.hasPlayer(function (current) {
                        return game.zusZhishiShaTargetEnabled(sha, player, current);
                    });
                },

                filterCard: true,
                position: "he",
                selectCard: 1,

                check: function (card) {
                    return 6 - get.value(card);
                },

                content: function () {
                    "step 0"
                    event.level = player.storage.zus_zhishi_level || 0;

                    player.chooseTarget(
                        true,
                        "知识：选择一名角色，视为对其使用一张普通【杀】",
                        function (card, player, target) {
                            var sha = {
                                name: "sha",
                                isCard: true,
                            };

                            return game.zusZhishiShaTargetEnabled(sha, player, target);
                        }
                    ).set("ai", function (target) {
                        return get.effect(target, { name: "sha" }, player, player);
                    });

                    "step 1"
                    if (result.bool && result.targets && result.targets.length) {
                        event.target = result.targets[0];

                        player.addTempSkill("zus_zhishi_monitor", { player: "phaseUseEnd" });

                        Sync.setStorage(player, "zus_zhishi_check_nature", "normal");
                        Sync.setStorage(player, "zus_zhishi_damage", false);
                        Sync.setStorage(player, "zus_zhishi_check_target", event.target);
                        Sync.setStorage(player, "zus_zhishi_before_hp", event.target.hp);

                        player.line(event.target);

                        // 第一张普通【杀】现在目标选择阶段已严格检查距离。
                        player.useCard({ name: "sha", isCard: true }, event.target, false);

                        // 【知识】的第一张普通【杀】应计入本回合出杀次数。
                        // 后续雷杀、火杀是技能追加的无次数限制杀，不在这里计数。
                        var stat = player.getStat("card");
                        if (!stat.sha) stat.sha = 0;
                        stat.sha++;
                    } else {
                        event.finish();
                    }

                    "step 2"
                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    if (event.level >= 2 && (event.level >= 5 || !player.storage.zus_zhishi_damage)) {
                        Sync.setStorage(player, "zus_zhishi_check_nature", "thunder");
                        Sync.setStorage(player, "zus_zhishi_damage", false);
                        Sync.setStorage(player, "zus_zhishi_check_target", event.target);
                        Sync.setStorage(player, "zus_zhishi_before_hp", event.target.hp);

                        player.line(event.target, "thunder");
                        player.useCard({ name: "sha", nature: "thunder", isCard: true }, event.target, false);
                    } else {
                        event.finish();
                    }

                    "step 3"
                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    if (event.level >= 3 && (event.level >= 5 || !player.storage.zus_zhishi_damage)) {
                        Sync.setStorage(player, "zus_zhishi_check_nature", "fire");
                        Sync.setStorage(player, "zus_zhishi_damage", false);
                        Sync.setStorage(player, "zus_zhishi_check_target", event.target);
                        Sync.setStorage(player, "zus_zhishi_before_hp", event.target.hp);

                        player.line(event.target, "fire");
                        player.useCard({ name: "sha", nature: "fire", isCard: true }, event.target, false);
                    } else {
                        event.finish();
                    }

                    "step 4"
                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    if (event.level >= 4 && (event.level >= 5 || !player.storage.zus_zhishi_damage)) {
                        event.target.turnOver();
                    }

                    "step 5"
                    Sync.setStorage(player, "zus_zhishi_check_nature", null);
                    Sync.setStorage(player, "zus_zhishi_damage", false);
                    Sync.setStorage(player, "zus_zhishi_check_target", null);
                    Sync.setStorage(player, "zus_zhishi_before_hp", null);
                },

                ai: {
                    order: 6,
                    result: {
                        player: 1,
                    },
                },
            },

            // 监视【知识】使用的杀是否造成体力伤害
            // 注意：打在护甲上不算造成伤害，因为目标体力没有减少。
            zus_zhishi_monitor: {
                trigger: {
                    global: "damageEnd",
                },
                forced: true,
                silent: true,
                popup: false,
                charlotte: true,

                filter: function (event, player) {
                    if (event.source != player) return false;
                    if (!event.card || get.name(event.card) != "sha") return false;

                    if (!player.storage.zus_zhishi_check_target) return false;
                    if (event.player != player.storage.zus_zhishi_check_target) return false;

                    var nature = player.storage.zus_zhishi_check_nature;

                    if (nature == "normal") {
                        if (event.card.nature) return false;
                    } else {
                        if (event.card.nature != nature) return false;
                    }

                    // 关键修复：
                    // 只有目标体力真的减少，才视为【知识】的杀造成了伤害。
                    // 若伤害被护甲吸收，damageEnd 可能仍然触发，但 hp 不变，因此不算。
                    var beforeHp = player.storage.zus_zhishi_before_hp;
                    if (typeof beforeHp != "number") return false;

                    return event.player.hp < beforeHp;
                },

                content: function () {
                    Sync.setStorage(player, "zus_zhishi_damage", true);
                },
            },

            // 学爆：显示与总控
            zus_xuebao: {
                forced: true,
                mark: true,
                group: ["zus_xuebao_init", "zus_xuebao_unlock"],

                intro: {
                    content: function (storage, player) {
                        var level = player.storage.zus_zhishi_level || 0;

                        if (level <= 0) {
                            return "【知识】仍被封印。";
                        }

                        // 五层时只显示最终句
                        if (level >= 5) {
                            return "命里有时终须有。";
                        }

                        var text = "【知识】已解锁至第" + level + "个分号。<br>";

                        if (level >= 1) {
                            text += "1. 可弃置1张牌，视为对一名角色使用普通【杀】。<br>";
                        }

                        if (level >= 2) {
                            text += "2. 若此【杀】未造成体力伤害，追加雷【杀】。<br>";
                        }

                        if (level >= 3) {
                            text += "3. 若雷【杀】未造成体力伤害，追加火【杀】。<br>";
                        }

                        if (level >= 4) {
                            text += "4. 若火【杀】未造成体力伤害，令目标翻面。";
                        }

                        return text;
                    },
                },
            },

            // 游戏开始时，封印【知识】
            zus_xuebao_init: {
                trigger: {
                    global: "gameStart",
                },
                forced: true,
                silent: true,
                popup: false,

                content: function () {
                    Sync.setStorage(player, "zus_zhishi_level", 0);
                    player.markSkill("zus_xuebao");
                },
            },

            // 每个自己的回合开始时，解锁至下一个分号
            zus_xuebao_unlock: {
                trigger: {
                    player: "phaseBegin",
                },
                forced: true,

                filter: function (event, player) {
                    return (player.storage.zus_zhishi_level || 0) < 5;
                },

                content: function () {
                    Sync.setStorage(player, "zus_zhishi_level", Math.min(5, (player.storage.zus_zhishi_level || 0) + 1));
                    player.markSkill("zus_xuebao");
                },
            },
        },

        translate: {},
    };
});