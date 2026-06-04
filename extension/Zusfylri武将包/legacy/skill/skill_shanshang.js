game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_shanshang",

        character: {},

        skill: {
            // 萤焰：回合外你每失去一张你区域内的牌，你可以翻开牌堆顶五张牌，获得其中装备牌，其余置入弃牌堆
            zus_yingyan: {
                trigger: {
                    global: ["loseAfter", "loseAsyncAfter"],
                },
                frequent: true,

                filter: function (event, player) {
                    // 只在你的回合外触发
                    if (_status.currentPhase == player) return false;

                    if (!event.getl) return false;

                    var evt = event.getl(player);
                    if (!evt) return false;

                    var cards = [];

                    // 手牌、装备区、判定区离开都算“你区域内的牌”
                    if (evt.hs && evt.hs.length) cards.addArray(evt.hs);
                    if (evt.es && evt.es.length) cards.addArray(evt.es);
                    if (evt.js && evt.js.length) cards.addArray(evt.js);

                    // 某些失去牌事件会记录在 cards2
                    if (evt.cards2 && evt.cards2.length) cards.addArray(evt.cards2);

                    cards = cards.unique();

                    return cards.length > 0;
                },

                content: function () {
                    "step 0"
                    var evt = trigger.getl(player);
                    var lostCards = [];

                    if (evt.hs && evt.hs.length) lostCards.addArray(evt.hs);
                    if (evt.es && evt.es.length) lostCards.addArray(evt.es);
                    if (evt.js && evt.js.length) lostCards.addArray(evt.js);
                    if (evt.cards2 && evt.cards2.length) lostCards.addArray(evt.cards2);

                    lostCards = lostCards.unique();

                    event.times = lostCards.length;

                    "step 1"
                    if (event.times <= 0) {
                        event.finish();
                        return;
                    }

                    event.times--;

                    var cards = get.cards(5);
                    player.showCards(cards, get.translation(player) + "发动了【萤焰】");

                    var equips = [];
                    var discards = [];

                    for (var i = 0; i < cards.length; i++) {
                        if (get.type(cards[i]) == "equip") {
                            equips.push(cards[i]);
                        } else {
                            discards.push(cards[i]);
                        }
                    }

                    if (equips.length) {
                        player.gain(equips, "gain2");
                    }

                    if (discards.length) {
                        game.cardsDiscard(discards);
                    }

                    "step 2"
                    if (event.times > 0) {
                        event.goto(1);
                    }
                },
            },

            // 萤焰补丁：处理【顺手牵羊】这类“其他角色获得你区域内牌”的情况
            zus_yingyan_gain: {
                trigger: {
                    global: "gainAfter",
                },
                frequent: true,

                filter: function (event, player) {
                    // 只在你的回合外触发
                    if (_status.currentPhase == player) return false;

                    // 必须是其他角色获得牌
                    if (!event.player || event.player == player) return false;
                    if (!event.cards || !event.cards.length) return false;

                    // 尝试从父事件链里判断：这次获得牌是否来自山上彻也
                    var evt = event;
                    var i = 0;

                    while (evt && i < 10) {
                        // 顺手牵羊 / 获得别人一张牌，很多版本会挂在 gainPlayerCard 事件下
                        if (evt.name == "gainPlayerCard") {
                            if (evt.target == player) return true;
                            if (evt.source == player) return true;
                            if (evt.from == player) return true;
                            if (evt.giver == player) return true;
                        }

                        // 某些版本可能直接在 gainAfter 或父事件里记录来源
                        if (evt.source == player) return true;
                        if (evt.from == player) return true;
                        if (evt.giver == player) return true;

                        evt = evt.parent;
                        i++;
                    }

                    return false;
                },

                content: function () {
                    "step 0"
                    event.times = trigger.cards.length;

                    "step 1"
                    if (event.times <= 0) {
                        event.finish();
                        return;
                    }

                    event.times--;

                    var cards = get.cards(5);
                    player.showCards(cards, get.translation(player) + "发动了【萤焰】");

                    var equips = [];
                    var discards = [];

                    for (var i = 0; i < cards.length; i++) {
                        if (get.type(cards[i]) == "equip") {
                            equips.push(cards[i]);
                        } else {
                            discards.push(cards[i]);
                        }
                    }

                    if (equips.length) {
                        player.gain(equips, "gain2");
                    }

                    if (discards.length) {
                        game.cardsDiscard(discards);
                    }

                    "step 2"
                    if (event.times > 0) {
                        event.goto(1);
                    }
                },
            },

            // 萤焰执行体：保留作公共技能/调试用
            zus_yingyan_do: {
                charlotte: true,

                content: function () {
                    var cards = get.cards(5);
                    player.showCards(cards, get.translation(player) + "发动了【萤焰】");

                    var equips = [];
                    var discards = [];

                    for (var i = 0; i < cards.length; i++) {
                        if (get.type(cards[i]) == "equip") {
                            equips.push(cards[i]);
                        } else {
                            discards.push(cards[i]);
                        }
                    }

                    if (equips.length) {
                        player.gain(equips, "gain2");
                    }

                    if (discards.length) {
                        game.cardsDiscard(discards);
                    }
                },
            },

            // 绝赴：手牌全为装备牌时，弃置自己区域所有牌，对距离为1的一名角色造成等量伤害
            zus_juefu: {
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    var hs = player.getCards("h");

                    // 必须至少有一张手牌，避免空手牌被视为“手牌均为装备牌”
                    if (!hs.length) return false;

                    for (var i = 0; i < hs.length; i++) {
                        if (get.type(hs[i]) != "equip") return false;
                    }

                    return player.countCards("hej") > 0;
                },

                filterTarget: function (card, player, target) {
                    return target != player && get.distance(player, target) == 1;
                },

                selectTarget: 1,

                content: function () {
                    var cards = player.getCards("hej");
                    var num = cards.length;

                    player.discard(cards);

                    if (num > 0) {
                        target.damage(num, player);
                    }
                },

                ai: {
                    order: 8,
                    result: {
                        target: function (player, target) {
                            var num = player.countCards("hej");
                            return -num;
                        },
                    },
                },
            },
        },

        translate: {},
    };
});