game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_zhaoyun",

        character: {},

        skill: {
            // 绝啸
            zus_juexiao: {
    enable: "phaseUse",

    filterCard: function (card, player) {
        return get.name(card, player) == "shan";
    },

    viewAs: function (cards, player) {
        if (cards && cards.length) {
            return {
                name: "sha",
                suit: get.suit(cards[0], player),
                number: get.number(cards[0], player),
                cards: cards,
            };
        }
        return {
            name: "sha",
        };
    },

    position: "hs",
    prompt: "将一张【闪】当【杀】使用",

    check: function (card) {
        return 6 - get.value(card);
    },

    mod: {
        cardUsable: function (card, player, num) {
            if (_status.currentPhase != player) return;
            if (get.name(card, player) != "sha") return;

            var lastSuit = player.storage.zus_juexiao_lastSuit;
            if (!lastSuit) return;

            var suit = get.suit(card, player);
            if ((!suit || suit == "none") && card.cards && card.cards.length) {
                suit = get.suit(card.cards[0], player);
            }

            if (suit == lastSuit) {
                return Infinity;
            }
        },
    },

    group: [
        "zus_juexiao_clear",
        "zus_juexiao_record",
        "zus_juexiao_nocount",
        "zus_juexiao_fixcount",
        "zus_juexiao_damage",
        "zus_juexiao_hit",
    ],

    subSkill: {
        // 回合开始时清空记录
        clear: {
            trigger: {
                player: "phaseBegin",
            },
            forced: true,
            silent: true,
            popup: false,
            content: function () {
                Sync.setStorage(player, "zus_juexiao_lastSuit", null);
                Sync.setStorage(player, "zus_juexiao_bonus", 0);
                Sync.setStorage(player, "zus_juexiao_fixcount", false);
                player.unmarkSkill("zus_juexiao_damage");
            },
        },

        // 记录本回合你使用或打出的上一张牌的花色
        record: {
            trigger: {
                player: ["useCardAfter", "respondAfter"],
            },
            forced: true,
            silent: true,
            popup: false,
            filter: function (event, player) {
                if (_status.currentPhase != player) return false;

                var suit = null;
                if (event.cards && event.cards.length) {
                    suit = get.suit(event.cards[0], player);
                } else if (event.card) {
                    suit = get.suit(event.card, player);
                }

                return suit && suit != "none";
            },
            content: function () {
                var suit = null;
                if (trigger.cards && trigger.cards.length) {
                    suit = get.suit(trigger.cards[0], player);
                } else if (trigger.card) {
                    suit = get.suit(trigger.card, player);
                }

                Sync.setStorage(player, "zus_juexiao_lastSuit", suit);
            },
        },

        // 同花色【杀】不计入出杀次数
        nocount: {
            trigger: {
                player: "useCard1",
            },
            forced: true,
            silent: true,
            popup: false,
            filter: function (event, player) {
                if (_status.currentPhase != player) return false;
                if (!event.card || get.name(event.card, player) != "sha") return false;

                var lastSuit = player.storage.zus_juexiao_lastSuit;
                if (!lastSuit) return false;

                var suit = null;
                if (event.cards && event.cards.length) {
                    suit = get.suit(event.cards[0], player);
                } else if (event.card) {
                    suit = get.suit(event.card, player);
                }

                return suit == lastSuit;
            },
            content: function () {
                trigger.addCount = false;
                Sync.setStorage(player, "zus_juexiao_fixcount", true);
            },
        },

        // 保险：若系统仍然把这张【杀】计入次数，则在结算后手动扣回
        fixcount: {
            trigger: {
                player: "useCardAfter",
            },
            forced: true,
            silent: true,
            popup: false,
            filter: function (event, player) {
                if (!player.storage.zus_juexiao_fixcount) return false;
                if (!event.card || get.name(event.card, player) != "sha") return false;
                return true;
            },
            content: function () {
                Sync.setStorage(player, "zus_juexiao_fixcount", false);

                var stat = player.getStat("card");
                if (stat.sha && stat.sha > 0) {
                    stat.sha--;
                }
            },
        },

        // 下一张【杀】伤害+1
        damage: {
            trigger: {
                player: "useCard1",
            },
            forced: true,
            popup: false,
            mark: true,
            intro: {
                content: function (storage, player) {
                    return "你本阶段的下一张【杀】伤害+" + (player.storage.zus_juexiao_bonus || 0);
                },
            },
            filter: function (event, player) {
                if (_status.currentPhase != player) return false;
                if (!event.card || get.name(event.card, player) != "sha") return false;
                return player.storage.zus_juexiao_bonus > 0;
            },
            content: function () {
                trigger.baseDamage = (trigger.baseDamage || 1) + player.storage.zus_juexiao_bonus;
                Sync.setStorage(player, "zus_juexiao_bonus", 0);
                player.unmarkSkill("zus_juexiao_damage");
            },
        },

        // 【杀】未被【闪】抵消后，令本阶段下一张【杀】伤害+1
        hit: {
            trigger: {
                player: "shaHit",
            },
            forced: true,
            popup: false,
            filter: function (event, player) {
                return _status.currentPhase == player;
            },
            content: function () {
                Sync.setStorage(player, "zus_juexiao_bonus", 1);
                player.markSkill("zus_juexiao_damage");
            },
        },
    },
},
            // 孤胆
            zus_gudan: {
                trigger: {
                    target: "useCardToTargeted",
                },
                forced: true,
                filter: function (event, player) {
                    if (!event.card || get.name(event.card) != "sha") return false;
                    return !game.hasPlayer(function (current) {
                        return current.hp < player.hp;
                    });
                },
                content: function () {
                    player.draw();
                },
            },
        },

        translate: {},
    };
});
