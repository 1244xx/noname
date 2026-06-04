game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_zhuluan",

        character: {},

        skill: {
            // 皇仪：体力值不满时，红色手牌当无懈可击使用或打出
            zus_huangyi: {
                enable: ["chooseToUse", "chooseToRespond"],

                filter: function (event, player) {
                    return player.hp < player.maxHp && player.countCards("h", function (card) {
                        return get.color(card) == "red";
                    }) > 0;
                },

                filterCard: function (card) {
                    return get.color(card) == "red";
                },

                position: "h",

                viewAs: {
                    name: "wuxie",
                },

                viewAsFilter: function (player) {
                    return player.hp < player.maxHp && player.countCards("h", function (card) {
                        return get.color(card) == "red";
                    }) > 0;
                },

                prompt: "将一张红色手牌当【无懈可击】使用或打出",

                check: function (card) {
                    return 8 - get.value(card);
                },

                ai: {
                    respondSha: false,
                    respondShan: false,
                    skillTagFilter: function (player) {
                        return player.hp < player.maxHp && player.countCards("h", function (card) {
                            return get.color(card) == "red";
                        }) > 0;
                    },
                },
            },

            // 凤诏：出牌阶段开始时指定一名其他角色，本阶段可交换双方全部手牌
            zus_fengzhao: {
                trigger: {
                    player: "phaseUseBegin",
                },
                direct: true,

                filter: function (event, player) {
                    return game.hasPlayer(function (current) {
                        return current != player;
                    });
                },

                content: function () {
                    "step 0"
                    player.chooseTarget("是否发动【凤诏】，指定一名其他角色？", function (card, player, target) {
                        return target != player;
                    }).set("ai", function (target) {
                        var player = _status.event.player;
                        var att = get.attitude(player, target);

                        // 队友优先；若敌人手牌很多，也可考虑指定
                        if (att > 0) return att + target.countCards("h") / 2;
                        return -att + target.countCards("h") / 3;
                    });

                    "step 1"
                    if (result.bool && result.targets && result.targets.length) {
                        var target = result.targets[0];

                        player.logSkill("zus_fengzhao", target);

                        Sync.setStorage(player, "zus_fengzhao_target", target);
                        Sync.setStorage(player, "zus_fengzhao_disabled", false);

                        player.addTempSkill("zus_fengzhao_swap", { player: "phaseUseEnd" });
                        player.markSkill("zus_fengzhao_swap");
                    }
                },
            },

            // 凤诏交换：本阶段内可发动
            zus_fengzhao_swap: {
                enable: "phaseUse",
                charlotte: true,

                filter: function (event, player) {
                    if (player.storage.zus_fengzhao_disabled) return false;

                    var target = player.storage.zus_fengzhao_target;
                    if (!target || !target.isIn()) return false;

                    return player.countCards("h") > 0 && target.countCards("h") > 0;
                },

                content: function () {
                    "step 0"
                    event.target = player.storage.zus_fengzhao_target;

                    if (!event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    var cards1 = player.getCards("h");
                    var cards2 = event.target.getCards("h");

                    if (!cards1.length || !cards2.length) {
                        event.finish();
                        return;
                    }

                    // 交换双方全部手牌
                    player.swapHandcards(event.target);

                    "step 1"
                    event.drawList = [];

                    // 谁的手牌数等于自己的当前体力值，谁摸一张
                    if (player.countCards("h") == player.hp) {
                        event.drawList.push(player);
                    }

                    if (event.target.countCards("h") == event.target.hp) {
                        event.drawList.push(event.target);
                    }

                    if (event.drawList.length) {
                        event.drawList.sortBySeat();
                    } else {
                        // 否则：朱鸾失去1点体力，本阶段此技能不可再发动，然后跳过本回合弃牌阶段
                        player.loseHp();

                        Sync.setStorage(player, "zus_fengzhao_disabled", true);
                        player.unmarkSkill("zus_fengzhao_swap");
                        player.removeSkill("zus_fengzhao_swap");

                        player.skip("phaseDiscard");

                        game.log(player, "因【凤诏】跳过了本回合的弃牌阶段");

                        event.finish();
                    }

                    "step 2"
                    if (event.drawList && event.drawList.length) {
                        var target = event.drawList.shift();
                        target.draw();
                        event.redo();
                    }
                },

                ai: {
                    order: 7,
                    result: {
                        player: function (player) {
                            var target = player.storage.zus_fengzhao_target;
                            if (!target || !target.isIn()) return 0;

                            var att = get.attitude(player, target);

                            if (att > 0) return 1;

                            // 敌人手牌明显多时也可考虑换牌
                            if (target.countCards("h") > player.countCards("h") + 1) return 0.8;

                            return 0.3;
                        },
                    },
                },

                mark: true,
                intro: {
                    content: function (storage, player) {
                        var target = player.storage.zus_fengzhao_target;

                        if (player.storage.zus_fengzhao_disabled) {
                            return "本阶段【凤诏】不可再发动。";
                        }

                        if (target && target.isIn()) {
                            return "本阶段可与" + get.translation(target) + "交换全部手牌。";
                        }

                        return "未指定角色。";
                    },
                },
            },
        },

        translate: {
            zus_huangyi: "皇仪",
            zus_huangyi_info: "若你的体力值不为满，你可以将一张红色手牌当【无懈可击】使用或打出。",

            zus_fengzhao: "凤诏",
            zus_fengzhao_info: "出牌阶段开始时，你可指定一名其他角色。本阶段内，若你与其均有手牌，你可交换双方全部手牌。随后，若你或其手牌数等于各自当前体力值，则满足条件的角色各摸1张牌；否则你失去1点体力，本阶段此技能不可再发动，然后跳过本回合的弃牌阶段。",

            zus_fengzhao_swap: "凤诏",
            zus_fengzhao_swap_info: "本阶段内，你可以与【凤诏】指定的角色交换全部手牌。",
        },
    };
});