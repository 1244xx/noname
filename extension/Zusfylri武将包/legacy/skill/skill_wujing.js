game.import("character", function (lib, game, ui, get, ai, _status) {
    // ============================================================
    // 吴京：判断“闪电”是否命中
    // ============================================================
    if (!game.zusWujingLightningHit) {
        game.zusWujingLightningHit = function (card) {
            return get.suit(card) == "spade" && get.number(card) >= 2 && get.number(card) <= 9;
        };
    }

    // ============================================================
    // 吴京：获取【杀】被【闪】抵消时的目标
    // 不同版本 shaMiss 事件字段可能略有差异，因此做多层兜底。
    // ============================================================
    if (!game.zusWujingGetShaMissTarget) {
        game.zusWujingGetShaMissTarget = function (event, player) {
            if (!event) return null;

            if (event.target && event.target != player) return event.target;

            if (event.targets && event.targets.length) {
                for (var i = 0; i < event.targets.length; i++) {
                    if (event.targets[i] && event.targets[i] != player) return event.targets[i];
                }
            }

            if (event.player && event.player != player) return event.player;

            var parent = event.getParent ? event.getParent() : null;
            if (parent) {
                if (parent.target && parent.target != player) return parent.target;

                if (parent.targets && parent.targets.length) {
                    for (var j = 0; j < parent.targets.length; j++) {
                        if (parent.targets[j] && parent.targets[j] != player) return parent.targets[j];
                    }
                }
            }

            return null;
        };
    }

    return {
        name: "zus_skill_wujing",

        character: {},

        skill: {
            // “狠”标记本体
            zus_hen: {
                marktext: "狠",
                intro: {
                    name: "狠",
                    content: "mark",
                },
            },

            // 引雷：锁定技，防止你受到的非属性伤害，改为获得1个“狠”标记。
            zus_yinlei: {
                trigger: {
                    player: "damageBegin4",
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    return event.num > 0 && !event.nature;
                },

                content: function () {
                    trigger.cancel();
                    player.addMark("zus_hen", 1, false);
                    player.markSkill("zus_hen");
                    game.log(player, "防止了非属性伤害，获得了1个", "#g【狠】", "标记");
                },
            },

            // 漂移：每当你用【杀】指定一名角色，你可以转移杀的目标至此角色攻击范围内的另一名角色。
            // 若此杀被【闪】抵消，你可以将自己的1个“狠”转移给杀的目标。
            zus_piaoyi: {
                trigger: {
                    player: "useCardToBefore",
                },
                direct: true,

                filter: function (event, player) {
                    if (!event.card || get.name(event.card) != "sha") return false;
                    if (!event.target || !event.target.isIn()) return false;

                    var old = event.target;

                    return game.hasPlayer(function (current) {
                        if (current == old) return false;
                        if (!current.isIn()) return false;
                        if (event.targets && event.targets.indexOf(current) != -1) return false;

                        // 新目标必须在原目标攻击范围内
                        if (get.distance(old, current, "attack") > 1) return false;

                        // 保留基本合法性检查，但不额外检查使用者到新目标的距离
                        // 因为【漂移】本身就是把目标漂到原目标攻击范围内。
                        if (!lib.filter.targetEnabled(event.card, player, current)) return false;

                        return true;
                    });
                },

                content: function () {
                    "step 0"
                    event.oldTarget = trigger.target;

                    player.chooseTarget(
                        "是否发动【漂移】，将此【杀】的目标从" + get.translation(event.oldTarget) + "转移？",
                        function (card, player, target) {
                            var old = _status.event.oldTarget;
                            var trigger = _status.event.getTrigger();

                            if (target == old) return false;
                            if (!target.isIn()) return false;
                            if (trigger.targets && trigger.targets.indexOf(target) != -1) return false;

                            if (get.distance(old, target, "attack") > 1) return false;
                            if (!lib.filter.targetEnabled(trigger.card, player, target)) return false;

                            return true;
                        }
                    ).set("oldTarget", event.oldTarget)
                        .set("ai", function (target) {
                            var player = _status.event.player;
                            var trigger = _status.event.getTrigger();
                            var old = _status.event.oldTarget;

                            var oldEff = get.effect(old, trigger.card, player, player);
                            var newEff = get.effect(target, trigger.card, player, player);

                            return newEff - oldEff;
                        });

                    "step 1"
                    if (!result.bool || !result.targets || !result.targets.length) {
                        event.finish();
                        return;
                    }

                    event.newTarget = result.targets[0];

                    player.logSkill("zus_piaoyi", event.newTarget);
                    player.line(event.oldTarget);
                    player.line(event.newTarget, "green");

                    if (trigger.targets) {
                        trigger.targets.remove(event.oldTarget);
                        trigger.targets.add(event.newTarget);
                    }

                    trigger.target = event.newTarget;

                    game.log(player, "将此【杀】的目标由", event.oldTarget, "转移给了", event.newTarget);
                },

                group: ["zus_piaoyi_shaMiss"],
            },

            // 漂移：若此杀被【闪】抵消，你可以将自己的1个“狠”转移给杀的目标。
            zus_piaoyi_shaMiss: {
                trigger: {
                    player: "shaMiss",
                },
                direct: true,
                charlotte: true,

                filter: function (event, player) {
                    if (!event.card || get.name(event.card) != "sha") return false;
                    if (player.countMark("zus_hen") <= 0) return false;

                    var target = game.zusWujingGetShaMissTarget(event, player);
                    return target && target.isIn() && target != player;
                },

                content: function () {
                    "step 0"
                    event.target = game.zusWujingGetShaMissTarget(trigger, player);

                    player.chooseBool("是否发动【漂移】，将你的1个“狠”标记转移给" + get.translation(event.target) + "？")
                        .set("ai", function () {
                            var player = _status.event.player;
                            var target = _status.event.targetx;
                            return get.attitude(player, target) < 0;
                        })
                        .set("targetx", event.target);

                    "step 1"
                    if (!result.bool || !event.target || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    player.logSkill("zus_piaoyi", event.target);

                    player.removeMark("zus_hen", 1, false);
                    if (player.countMark("zus_hen") > 0) {
                        player.markSkill("zus_hen");
                    } else {
                        player.unmarkSkill("zus_hen");
                    }

                    event.target.addMark("zus_hen", 1, false);
                    event.target.markSkill("zus_hen");

                    game.log(player, "将1个", "#g【狠】", "标记转移给了", event.target);
                },
            },

            // 雷劫：拥有“狠”标记的角色，在判定阶段开始时，结算X次【闪电】，并获得判定牌。
            zus_leijie: {
                trigger: {
                    global: "phaseJudgeBegin",
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    return event.player && event.player.isIn() && event.player.countMark("zus_hen") > 0;
                },

                content: function () {
                    "step 0"
                    event.target = trigger.player;
                    event.num = event.target.countMark("zus_hen");
                    event.index = 0;

                    game.log(event.target, "拥有", event.num, "个", "#g【狠】", "标记，开始结算【雷劫】");

                    "step 1"
                    if (!event.target || !event.target.isIn() || event.index >= event.num) {
                        event.finish();
                        return;
                    }

                    event.target.judge(function (card) {
                        if (game.zusWujingLightningHit(card)) return -6;
                        return 1;
                    }).set("judge2", function (result) {
                        return result.bool;
                    });

                    "step 2"
                    event.index++;

                    if (result && result.card && event.target && event.target.isIn()) {
                        event.target.gain(result.card, "gain2");
                    }

                    // 模拟【闪电】：黑桃2~9命中，受到3点雷电伤害。
                    if (result && result.card && game.zusWujingLightningHit(result.card)) {
                        event.target.damage(3, "thunder", "nosource");
                    }

                    event.goto(1);
                },
            },
        },

        translate: {
            zus_yinlei: "引雷",
            zus_yinlei_info: "锁定技，防止你受到的非属性伤害，改为获得1个“狠”标记。",

            zus_piaoyi: "漂移",
            zus_piaoyi_info: "每当你使用【杀】指定一名角色为目标后，你可以将此【杀】的此目标转移至该角色攻击范围内的另一名角色（可以为你）。若此【杀】被【闪】抵消，你可以将你的1个“狠”标记转移给此【杀】的目标。",

            zus_leijie: "雷劫",
            zus_leijie_info: "拥有“狠”标记的角色，在判定阶段开始时，结算X次【闪电】，并获得判定牌（X为其“狠”标记数）。",

            zus_hen: "狠",
            zus_hen_info: "“狠”标记。判定阶段开始时，拥有者会结算等量次【闪电】并获得判定牌。",
        },
    };
});
