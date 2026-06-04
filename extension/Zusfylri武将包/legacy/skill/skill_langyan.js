game.import("character", function (lib, game, ui, get, ai, _status) {
    // ============================================================
    // 通用：增加护甲
    // ============================================================
    if (!game.zusGainHujia) {
        game.zusGainHujia = function (player, num) {
            if (!player || !player.isIn()) return;
            num = num || 1;

            if (player.changeHujia) {
                player.changeHujia(num);
            } else {
                if (typeof player.hujia != "number") player.hujia = 0;
                player.hujia += num;
                if (player.update) player.update();
                game.log(player, "获得了", num, "点护甲");
            }
        };
    }

    // ============================================================
    // 霜漠：判断一张牌是不是本回合获得的霜漠杀
    // ============================================================
    if (!game.zusIsShuangmoSha) {
        game.zusIsShuangmoSha = function (player, card) {
            if (!player || !card) return false;
            var list = player.storage.zus_shuangmo_sha;
            return list && list.indexOf(card) != -1;
        };
    }

    // ============================================================
    // 霜漠：给本回合获得的杀加“霜”手牌标记
    // ============================================================
    if (!game.zusAddShuangmoTag) {
        game.zusAddShuangmoTag = function (player, card) {
            if (!player || !card) return;

            if (player.addGaintag) {
                player.addGaintag([card], "zus_shuangmo_tag");
            }

            if (!card.gaintag) {
                card.gaintag = [];
            }

            if (card.gaintag.add) {
                card.gaintag.add("zus_shuangmo_tag");
            } else if (card.gaintag.indexOf("zus_shuangmo_tag") == -1) {
                card.gaintag.push("zus_shuangmo_tag");
            }
        };
    }

    // ============================================================
    // 霜漠：清除“霜”手牌标记
    // ============================================================
    if (!game.zusRemoveShuangmoTag) {
        game.zusRemoveShuangmoTag = function (player) {
            if (!player) return;

            if (player.removeGaintag) {
                player.removeGaintag("zus_shuangmo_tag");
            }

            var list = player.storage.zus_shuangmo_sha || [];

            for (var i = 0; i < list.length; i++) {
                var card = list[i];
                if (!card || !card.gaintag) continue;

                if (card.gaintag.remove) {
                    card.gaintag.remove("zus_shuangmo_tag");
                } else {
                    var index = card.gaintag.indexOf("zus_shuangmo_tag");
                    if (index != -1) {
                        card.gaintag.splice(index, 1);
                    }
                }
            }
        };
    }

    // ============================================================
    // 孤烟：判断一名角色是否处于狼烟影响
    // ============================================================
    if (!game.zusIsGuyanTarget) {
        game.zusIsGuyanTarget = function (player, target) {
            if (!player || !target) return false;
            var list = player.storage.zus_guyan_targets;
            return list && list.indexOf(target) != -1;
        };
    }

    return {
        name: "zus_skill_langyan",

        character: {},

        skill: {
            // 霜漠：锁定技，你的判定区视为存在一张【兵粮寸断】。
            // 当其生效后，你挑选弃牌堆中任意一张【杀】加入手牌，本回合内，此【杀】无视距离且不可被【闪】响应。
            zus_shuangmo: {
                trigger: {
                    player: "phaseJudgeBegin",
                },
                forced: true,
                locked: true,
                group: ["zus_shuangmo_mod", "zus_shuangmo_directHit", "zus_shuangmo_clear"],

                content: function () {
                    "step 0"
                    player.judge(function (card) {
                        // 模拟【兵粮寸断】：梅花不生效，其余生效。
                        return get.suit(card) == "club" ? 1 : -1;
                    }).set("judge2", function (result) {
                        return result.bool;
                    }).set("callback", function () {
                        if (event.judgeResult && event.judgeResult.bool) {
                            game.log(player, "的虚拟【兵粮寸断】未生效");
                        } else {
                            game.log(player, "的虚拟【兵粮寸断】生效");
                        }
                    });

                    "step 1"
                    // 判定结果为梅花时，兵粮寸断不生效。
                    if (result.bool) {
                        event.finish();
                        return;
                    }

                    // 生效：跳过摸牌阶段。
                    player.skip("phaseDraw");

                    var list = [];
                    if (ui.discardPile && ui.discardPile.childNodes) {
                        for (var i = 0; i < ui.discardPile.childNodes.length; i++) {
                            var card = ui.discardPile.childNodes[i];
                            if (get.name(card) == "sha") {
                                list.push(card);
                            }
                        }
                    }

                    if (!list.length) {
                        event.finish();
                        return;
                    }

                    player.chooseButton(
                        true,
                        ["霜漠：选择弃牌堆中一张【杀】加入手牌", list]
                    ).set("ai", function (button) {
                        return get.value(button.link);
                    });

                    "step 2"
                    if (!result.bool || !result.links || !result.links.length) {
                        event.finish();
                        return;
                    }

                    var card = result.links[0];

                    if (!player.storage.zus_shuangmo_sha) {
                        Sync.setStorage(player, "zus_shuangmo_sha", []);
                    }

                    Sync.pushValue(player, "zus_shuangmo_sha", card);
                    player.addTempSkill("zus_shuangmo_effect", { player: "phaseEnd" });

                    player.gain(card, "gain2");

                    // 给这张杀加“霜”标记，方便在手牌中识别。
                    game.zusAddShuangmoTag(player, card);

                    game.log(player, "因【霜漠】获得了", card);
                },

                ai: {
                    effect: {
                        target: function (card, player, target) {
                            if (get.name(card) == "bingliang") return 0;
                        },
                    },
                },
            },

            // 霜漠效果承载
            zus_shuangmo_effect: {
                charlotte: true,
                popup: false,
            },

            // 霜漠杀无视距离
            zus_shuangmo_mod: {
                mod: {
                    targetInRange: function (card, player, target) {
                        if (get.name(card) == "sha") {
                            var cards = card.cards || [];

                            if (game.zusIsShuangmoSha(player, card)) return true;

                            if (cards && cards.length) {
                                for (var i = 0; i < cards.length; i++) {
                                    if (game.zusIsShuangmoSha(player, cards[i])) {
                                        return true;
                                    }
                                }
                            }
                        }
                    },
                },
            },

            // 霜漠杀不可被闪响应
            zus_shuangmo_directHit: {
                trigger: {
                    player: "useCardToTargeted",
                },
                forced: true,
                charlotte: true,
                popup: false,

                filter: function (event, player) {
                    if (!event.card || get.name(event.card) != "sha") return false;
                    if (!event.cards || !event.cards.length) return false;

                    for (var i = 0; i < event.cards.length; i++) {
                        if (game.zusIsShuangmoSha(player, event.cards[i])) {
                            return true;
                        }
                    }

                    return false;
                },

                content: function () {
                    var evt = trigger.getParent();
                    if (!evt.directHit) evt.directHit = [];
                    evt.directHit.add(trigger.target);
                    game.log(trigger.target, "不能使用【闪】响应此【杀】");
                },
            },

            // 回合结束清除霜漠杀记录与“霜”标记
            zus_shuangmo_clear: {
                trigger: {
                    player: "phaseEnd",
                },
                forced: true,
                silent: true,
                popup: false,
                charlotte: true,

                content: function () {
                    game.zusRemoveShuangmoTag(player);
                    Sync.setStorage(player, "zus_shuangmo_sha", []);
                },
            },

            // 孤烟：
            // 出牌阶段，你使用【杀】的目标直到你的下个回合开始阶段：
            // 1. 其选择唯一其他角色作为指定牌的目标时，若狼烟合法，则目标转移至狼烟，否则此牌对原目标无效；
            // 2. 其使用的【杀】不可被【闪】响应；
            // 在其回合开始阶段，你增加一点护甲；在其回合结束阶段，你选择一项。
            zus_guyan: {
                trigger: {
                    player: "useCardToTargeted",
                },
                forced: true,

                filter: function (event, player) {
                    if (!event.card || get.name(event.card) != "sha") return false;
                    if (!event.target || event.target == player) return false;
                    return _status.currentPhase == player;
                },

                content: function () {
                    if (!player.storage.zus_guyan_targets) {
                        Sync.setStorage(player, "zus_guyan_targets", []);
                    }

                    if (player.storage.zus_guyan_targets.indexOf(trigger.target) == -1) {
                        Sync.pushUnique(player, "zus_guyan_targets", trigger.target);
                    }

                    player.markSkill("zus_guyan_mark");

                    var evt = trigger.getParent();
                    if (!evt.directHit) evt.directHit = [];
                    evt.directHit.add(trigger.target);

                    player.line(trigger.target, "fire");
                    game.log(trigger.target, "成为了", player, "的【孤烟】目标");
                    game.log(trigger.target, "不能使用【闪】响应此【杀】");
                },

                group: [
                    "zus_guyan_begin",
                    "zus_guyan_end",
                    "zus_guyan_redirect",
                    "zus_guyan_sha_directHit",
                    "zus_guyan_clear",
                    "zus_guyan_mark",
                ],
            },

            // 孤烟标记
            zus_guyan_mark: {
                mark: true,
                intro: {
                    content: function (storage, player) {
                        var list = player.storage.zus_guyan_targets || [];
                        if (!list.length) return "当前没有【孤烟】目标。";
                        return "当前【孤烟】目标：" + get.translation(list);
                    },
                },
            },

            // 狼烟下个回合开始阶段清除孤烟目标
            zus_guyan_clear: {
                trigger: {
                    player: "phaseBegin",
                },
                forced: true,
                silent: true,
                popup: false,

                filter: function (event, player) {
                    return player.storage.zus_guyan_targets && player.storage.zus_guyan_targets.length;
                },

                content: function () {
                    Sync.setStorage(player, "zus_guyan_targets", []);
                    player.unmarkSkill("zus_guyan_mark");
                },
            },

            // 孤烟目标回合开始：狼烟增加1点护甲
            zus_guyan_begin: {
                trigger: {
                    global: "phaseBegin",
                },
                forced: true,
                popup: false,

                filter: function (event, player) {
                    return game.zusIsGuyanTarget(player, event.player);
                },

                content: function () {
                    game.zusGainHujia(player, 1);
                },
            },

            // 孤烟目标回合结束：狼烟选择一项
            zus_guyan_end: {
                trigger: {
                    global: "phaseEnd",
                },
                forced: true,
                popup: false,

                filter: function (event, player) {
                    return game.zusIsGuyanTarget(player, event.player);
                },

                content: function () {
                    "step 0"
                    player.chooseControl("增加1点体力上限", "恢复1点体力", "摸两张牌")
                        .set("prompt", "孤烟：选择一项")
                        .set("ai", function () {
                            var player = _status.event.player;
                            if (player.isDamaged && player.isDamaged()) return "恢复1点体力";
                            return "摸两张牌";
                        });

                    "step 1"
                    if (result.control == "增加1点体力上限") {
                        player.gainMaxHp();
                    } else if (result.control == "恢复1点体力") {
                        player.recover();
                    } else {
                        player.draw(2);
                    }
                },
            },

            // 孤烟目标使用【杀】时不可被【闪】响应
            zus_guyan_sha_directHit: {
                trigger: {
                    global: "useCardToTargeted",
                },
                forced: true,
                charlotte: true,
                popup: false,

                filter: function (event, player) {
                    if (!game.zusIsGuyanTarget(player, event.player)) return false;
                    if (!event.card || get.name(event.card) != "sha") return false;
                    return true;
                },

                content: function () {
                    var evt = trigger.getParent();
                    if (!evt.directHit) evt.directHit = [];
                    evt.directHit.add(trigger.target);
                    game.log(trigger.target, "不能使用【闪】响应此【杀】");
                },
            },

            // 孤烟目标选择唯一其他角色作为指定牌的目标时：
            // 若狼烟是合法目标，目标转移至狼烟；否则此牌对原目标无效。
            // 只检测：杀、决斗、火攻、过河拆桥、顺手牵羊、乐不思蜀、兵粮寸断。
            // 不检测铁索连环，因为铁索连环不是稳定的单一目标结构。
            zus_guyan_redirect: {
                trigger: {
                    global: "useCardToBefore",
                },
                forced: true,
                charlotte: true,
                popup: false,
                priority: 20,

                filter: function (event, player) {
                    if (!event.player || !game.zusIsGuyanTarget(player, event.player)) return false;
                    if (!event.card) return false;
                    if (!event.target) return false;
                    if (!event.targets || event.targets.length != 1) return false;

                    // 必须是“选择唯一其他角色”为目标：
                    // 不能是使用者自己，不能已经是狼烟。
                    if (event.target == event.player) return false;
                    if (event.target == player) return false;

                    var name = get.name(event.card);

                    var allowed = [
                        "sha",
                        "juedou",
                        "huogong",
                        "guohe",
                        "shunshou",
                        "lebu",
                        "bingliang",
                    ];

                    if (allowed.indexOf(name) == -1) return false;

                    return true;
                },

                content: function () {
                    var old = trigger.target;

                    // 如果狼烟是合法目标，则转移目标至狼烟。
                    if (lib.filter.targetEnabled(trigger.card, trigger.player, player)) {
                        trigger.targets.remove(old);
                        trigger.targets.add(player);
                        trigger.target = player;

                        game.log(old, "作为目标被", player, "替代");
                    } else {
                        // 如果狼烟不是合法目标，则取消此目标事件。
                        // 不要把 trigger.target 改成 null，否则部分牌后续结算会炸。
                        trigger.cancel();

                        game.log(trigger.card, "对", old, "无效");
                    }
                },
            },
        },

        translate: {
            zus_shuangmo: "霜漠",
            zus_shuangmo_info: "锁定技，你的判定区视为存在一张【兵粮寸断】。当其生效后，你挑选弃牌堆中任意一张【杀】加入手牌，本回合内，此【杀】无视距离且不可被【闪】响应。",

            zus_shuangmo_tag: "霜",

            zus_guyan: "孤烟",
            zus_guyan_info: "出牌阶段，你使用【杀】指定目标后，直到你的下个回合开始阶段：其使用的【杀】不可被【闪】响应；其回合开始阶段，你增加1点护甲；其回合结束阶段，你选择一项：增加1点体力上限、恢复1点体力、摸两张牌。其选择唯一其他角色为指定牌的目标时，若你是合法目标，则目标转移至你；否则此牌对原目标无效。",

            zus_guyan_mark: "孤烟目标",
            zus_guyan_mark_info: "当前处于【孤烟】影响的角色。",
        },
    };
});