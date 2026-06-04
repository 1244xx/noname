game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_lier",

        character: {},

        skill: {
            // 三清：记录一张基本牌或锦囊牌，之后你的下三张牌可视作此牌使用
            // 注：这里代码写3，是为了抵消无名杀可能把触发三清的原始牌计入次数的问题
            // 实际体验上通常会表现为“后续两张牌可选择是否转化”
            zus_sanqing: {
                trigger: {
                    player: "useCardAfter",
                },
                direct: true,

                filter: function (event, player) {
                    if (_status.currentPhase != player) return false;

                    var phaseUse = event.getParent("phaseUse");
                    if (!phaseUse || phaseUse.name != "phaseUse") return false;

                    if (!event.card) return false;

                    // 本出牌阶段已经真正发动过三清，则不能再发动
                    if (player.storage.zus_sanqing_used) return false;

                    // 防止三清转化出来的牌再次触发三清记录
                    if (event.skill == "zus_sanqing_viewas") return false;

                    var type = get.type(event.card);
                    return type == "basic" || type == "trick";
                },

                content: function () {
                    "step 0"
                    var cardName = get.name(trigger.card, player);

                    player.chooseBool(
                        "是否发动【三清】，令你的下三张牌可视为【" + get.translation(cardName) + "】使用？"
                    ).set("ai", function () {
                        return true;
                    });

                    "step 1"
                    if (result.bool) {
                        player.logSkill("zus_sanqing");

                        // 只有真正选择发动后，才记录本阶段已使用三清
                        Sync.setStorage(player, "zus_sanqing_used", true);

                        Sync.setStorage(player, "zus_sanqing_card", {
                            name: get.name(trigger.card, player),
                            nature: trigger.card.nature || null,
                        });

                        // 写3是为了抵消原始牌可能被误计一次的问题
                        Sync.setStorage(player, "zus_sanqing_count", 3);

                        player.addTempSkill("zus_sanqing_viewas", { player: "phaseUseEnd" });
                        player.markSkill("zus_sanqing_viewas");
                    }
                },

                group: "zus_sanqing_clear",
            },

            // 三清转化入口：你可以将一张手牌当作记录牌使用
            zus_sanqing_viewas: {
                enable: "phaseUse",
                charlotte: true,

                // 不交给系统限制次数，完全由 storage.zus_sanqing_count 控制
                usable: Infinity,

                filter: function (event, player) {
                    if (!player.storage.zus_sanqing_card) return false;
                    if (!player.storage.zus_sanqing_count || player.storage.zus_sanqing_count <= 0) return false;
                    return player.countCards("h") > 0;
                },

                filterCard: true,
                position: "h",
                selectCard: 1,

                viewAs: function (cards, player) {
                    var info = player.storage.zus_sanqing_card || {};

                    var card = {
                        name: info.name || "sha",
                    };

                    if (info.nature) {
                        card.nature = info.nature;
                    }

                    if (cards && cards.length) {
                        card.suit = get.suit(cards[0], player);
                        card.number = get.number(cards[0], player);
                        card.cards = cards;
                    }

                    return card;
                },

                prompt: "将一张手牌当作【三清】记录的牌使用",

                check: function (card) {
                    return 6 - get.value(card);
                },

                ai: {
                    order: 8,
                    result: {
                        player: 1,
                    },
                },

                group: "zus_sanqing_viewas_count",

                mark: true,
                intro: {
                    content: function (storage, player) {
                        var info = player.storage.zus_sanqing_card || {};
                        var count = player.storage.zus_sanqing_count || 0;
                        return "你的下" + count + "张牌可视为【" + get.translation(info.name || "sha") + "】使用";
                    },
                },
            },

            // 三清计数：三清状态下，你每使用一张手牌，次数-1
            // 无论这张牌是否通过三清转化，只要是三清发动后的下一张手牌，都消耗一次机会
            zus_sanqing_viewas_count: {
                trigger: {
                    player: "useCardAfter",
                },
                forced: true,
                silent: true,
                popup: false,

                filter: function (event, player) {
                    if (!player.storage.zus_sanqing_card) return false;
                    if (!player.storage.zus_sanqing_count || player.storage.zus_sanqing_count <= 0) return false;

                    // 必须是使用了实体牌
                    if (!event.cards || !event.cards.length) return false;

                    // 防止极端情况下同一个 useCardAfter 被重复计数
                    if (event.zus_sanqing_counted) return false;

                    return true;
                },

                content: function () {
                    trigger.zus_sanqing_counted = true;

                    Sync.setStorage(player, "zus_sanqing_count", (player.storage.zus_sanqing_count || 0) - 1);

                    if (player.storage.zus_sanqing_count <= 0) {
                        Sync.setStorage(player, "zus_sanqing_count", 0);
                        Sync.setStorage(player, "zus_sanqing_card", null);

                        player.unmarkSkill("zus_sanqing_viewas");
                        player.removeSkill("zus_sanqing_viewas");
                    } else {
                        player.markSkill("zus_sanqing_viewas");
                    }
                },
            },

            // 三清清理：出牌阶段结束后重置发动记录与残留状态
            zus_sanqing_clear: {
                trigger: {
                    player: "phaseUseEnd",
                },
                forced: true,
                silent: true,
                popup: false,

                content: function () {
                    Sync.setStorage(player, "zus_sanqing_used", false);
                    Sync.setStorage(player, "zus_sanqing_count", 0);
                    Sync.setStorage(player, "zus_sanqing_card", null);

                    player.unmarkSkill("zus_sanqing_viewas");
                    player.removeSkill("zus_sanqing_viewas");
                },
            },

            // 损补
            zus_sunbu: {
                trigger: {
                    player: ["phaseDrawBegin2", "loseAfter", "loseAsyncAfter"],
                },
                forced: true,

                filter: function (event, player) {
                    if (event.name == "phaseDraw") {
                        return !event.numFixed && player.countCards("h") == 0;
                    }

                    if (player.countCards("h") > 0) return false;
                    if (!event.getl) return false;

                    var evt = event.getl(player);
                    if (!evt || !evt.hs || !evt.hs.length) return false;

                    return player.isDamaged();
                },

                content: function () {
                    if (trigger.name == "phaseDraw") {
                        trigger.num += 2;
                    } else {
                        player.recover();
                    }
                },

                mod: {
                    globalTo: function (from, to, distance) {
                        if (to.countCards("h") == 0) {
                            return distance + 1;
                        }
                    },
                },
            },
        },

        translate: {},
    };
});