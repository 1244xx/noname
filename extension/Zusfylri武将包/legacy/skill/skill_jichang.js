game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_jichang",

        character: {},

        skill: {
            // 易数：回合开始时，交换当前体力值与已损失体力值
            zus_yishu: {
                trigger: {
                    player: "phaseBegin",
                },
                forced: true,
                content: function () {
                    "step 0"
                    var oldHp = player.hp;
                    var oldLost = player.maxHp - player.hp;
                    var newHp = oldLost;

                    // 记录本回合易数造成的方向，供【流转】判断
                    Sync.setStorage(player, "zus_yishu_increased", newHp > oldHp);
                    Sync.setStorage(player, "zus_yishu_decreased", newHp < oldHp);

                    // 按“当前体力值”的变化幅度摸牌：
                    // 例如 4/6 与 2点已损失交换后变为2/6，当前体力变化2点，摸1张牌。
                    event.drawNum = Math.floor(Math.abs(newHp - oldHp) / 2);

                    player.hp = newHp;
                    player.update();

                    if (player.hp <= 0) {
                        player.dying();
                    }

                    "step 1"
                    if (event.drawNum > 0) {
                        player.draw(event.drawNum);
                    }
                },
                group: "zus_yishu_clear",
            },

            // 易数清理：回合结束后清除本回合方向记录
            zus_yishu_clear: {
                trigger: {
                    player: "phaseEnd",
                },
                forced: true,
                silent: true,
                popup: false,
                content: function () {
                    Sync.setStorage(player, "zus_yishu_increased", false);
                    Sync.setStorage(player, "zus_yishu_decreased", false);
                },
            },

            // 流转：根据本回合易数是否增加/减少体力，使用牌后触发对应效果
zus_liuzhuan: {
    trigger: {
        player: "useCardAfter",
    },
    forced: true,

    filter: function (event, player) {
        if (_status.currentPhase != player) return false;

        var canDiscard = !player.storage.zus_yishu_increased && game.hasPlayer(function (current) {
            return current != player && player.inRange(current) && current.countCards("he") > 0;
        });

        var canDraw = !player.storage.zus_yishu_decreased && game.hasPlayer(function (current) {
            return current != player && player.inRange(current);
        });

        return canDiscard || canDraw;
    },

    content: function () {
        "step 0"
        if (!player.storage.zus_yishu_increased) {
            player.chooseTarget(
                "流转：令攻击范围内一名其他角色弃置一张牌",
                function (card, player, target) {
                    return target != player && player.inRange(target) && target.countCards("he") > 0;
                }
            ).set("ai", function (target) {
                return -get.attitude(_status.event.player, target);
            });
        } else {
            event.goto(2);
        }

        "step 1"
        if (result.bool && result.targets && result.targets.length) {
            var target = result.targets[0];
            player.line(target);
            target.chooseToDiscard("he", true);
        }

        "step 2"
        if (!player.storage.zus_yishu_decreased) {
            player.chooseTarget(
                "流转：令攻击范围内一名其他角色摸一张牌",
                function (card, player, target) {
                    return target != player && player.inRange(target);
                }
            ).set("ai", function (target) {
                return get.attitude(_status.event.player, target);
            });
        } else {
            event.finish();
        }

        "step 3"
        if (result.bool && result.targets && result.targets.length) {
            var target = result.targets[0];
            player.line(target);
            target.draw();
        }
    },
},
        },

        translate: {},
    };
});
