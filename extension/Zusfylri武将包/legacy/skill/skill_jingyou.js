game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_jingyou",

        character: {},

        skill: {
            // 天敕：四个阶段分别视为使用指定牌，若无目标可指定，失去1点体力
            zus_tianchi: {
                trigger: {
                    player: ["phaseBegin", "phaseZhunbeiBegin", "phaseUseBegin", "phaseJieshuBegin"],
                },
                forced: true,

                content: function () {
                    "step 0"
                    var name = null;

                    if (trigger.name == "phase") {
                        name = "shunshou";
                    } else if (trigger.name == "phaseZhunbei") {
                        name = "guohe";
                    } else if (trigger.name == "phaseUse") {
                        name = "jiu";
                    } else if (trigger.name == "phaseJieshu") {
                        name = "jiedao";
                    }

                    event.cardName = name;

                    if (!name) {
                        event.finish();
                        return;
                    }

                    event.card = {
                        name: name,
                        isCard: true,
                    };

                    // 酒：对自己使用；若不能使用，则失去1点体力
                    if (name == "jiu") {
                        if (player.canUse(event.card, player)) {
                            player.useCard(event.card, player);
                        } else {
                            player.loseHp();
                        }
                        event.finish();
                        return;
                    }

                    // 正常检查合法目标：不要加 false，否则顺手牵羊会无视距离
                    if (!game.hasPlayer(function (current) {
                        return player.canUse(event.card, current);
                    })) {
                        player.loseHp();
                        event.finish();
                        return;
                    }

                    player.chooseTarget(
                        true,
                        "天敕：视为使用一张【" + get.translation(name) + "】",
                        function (card, player, target) {
                            return player.canUse(_status.event.cardx, target);
                        }
                    ).set("cardx", event.card).set("ai", function (target) {
                        var player = _status.event.player;
                        var card = _status.event.cardx;
                        return get.effect(target, card, player, player);
                    });

                    "step 1"
                    if (result.bool && result.targets && result.targets.length) {
                        player.useCard(event.card, result.targets);
                    } else {
                        player.loseHp();
                    }
                },
            },

            // 续祀：你的回合内有角色死亡时回复2点体力，并在回合结束后可以额外回合
            zus_xuji: {
                trigger: {
                    global: "dieAfter",
                },
                forced: false,

                filter: function (event, player) {
                    return _status.currentPhase == player;
                },

                content: function () {
                    player.recover(2);
                    Sync.setStorage(player, "zus_xuji_extra", true);
                    player.markSkill("zus_xuji_extra");
                },

                group: "zus_xuji_phase",
            },

            // 续祀额外回合
            zus_xuji_phase: {
                trigger: {
                    player: "phaseAfter",
                },
                direct: true,

                filter: function (event, player) {
                    return player.storage.zus_xuji_extra == true && player.isIn();
                },

                content: function () {
                    "step 0"
                    player.chooseBool("是否发动【续祀】，进行一个额外回合？").set("ai", function () {
                        return true;
                    });

                    "step 1"
                    Sync.setStorage(player, "zus_xuji_extra", false);
                    player.unmarkSkill("zus_xuji_extra");

                    if (result.bool) {
                        player.logSkill("zus_xuji");
                        player.insertPhase();
                    }
                },
            },

            // 续祀标记
            zus_xuji_extra: {
                charlotte: true,
                mark: true,

                intro: {
                    content: "此回合结束后，你可以进行一个额外回合。",
                },
            },
        },

        translate: {},
    };
});