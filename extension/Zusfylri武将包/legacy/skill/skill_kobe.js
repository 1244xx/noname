game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_kobe",

        character: {},

        skill: {
            // 肘击：出牌阶段使用点数为24因数的牌结算后，肘击距离1角色，限制其下个摸牌阶段，然后结束本回合
            zus_zhouji: {
                trigger: {
                    player: "useCardAfter",
                },
                forced: true,
                filter: function (event, player) {
                    if (_status.currentPhase != player) return false;
                    if (!event.card) return false;
                    var phaseUse = event.getParent("phaseUse");
                    if (!phaseUse || phaseUse.name != "phaseUse") return false;

                    var number = get.number(event.card);
                    if (!number) return false;
                    if ([1, 2, 3, 4, 6, 8, 12].indexOf(number) == -1) return false;

                    return game.hasPlayer(function (current) {
                        return current != player && get.distance(player, current) == 1;
                    });
                },
                content: function () {
    "step 0"
    player.chooseTarget(
        true,
        "肘击：选择一名距离为1的角色，对其造成1点伤害",
        function (card, player, target) {
            return target != player && get.distance(player, target) == 1;
        }
    ).set("ai", function (target) {
        return get.damageEffect(target, player, player);
    });

    "step 1"
    if (result.bool && result.targets && result.targets.length) {
        var target = result.targets[0];
        player.line(target, "fire");
        target.damage(1, player);
        target.addTempSkill("zus_zhouji_lessdraw", { player: "phaseDrawAfter" });
    }

    "step 2"
    // 跳过弃牌阶段
    player.skip("phaseDiscard");

    // 结束当前出牌阶段
    var phaseUse = trigger.getParent("phaseUse");
    if (phaseUse && phaseUse.name == "phaseUse") {
        phaseUse.finish();
    }
                },
            },

            // 下一个摸牌阶段少摸1张牌
            zus_zhouji_lessdraw: {
                trigger: {
                    player: "phaseDrawBegin2",
                },
                forced: true,
                charlotte: true,
                filter: function (event, player) {
                    return !event.numFixed && event.num > 0;
                },
                content: function () {
                    trigger.num--;
                },
                mark: true,
                intro: {
                    content: "下一个摸牌阶段少摸一张牌",
                },
            },
        },

        translate: {},
    };
});
