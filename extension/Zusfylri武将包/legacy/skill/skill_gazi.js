game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_gazi",

        character: {},

        skill: {
            zus_jiushen: {
                trigger: {
                    global: "gameDrawAfter",
                },
                forced: true,
                popup: false,
                content: function () {
                    _status.zus_jiushen_changing = true;

                    var players = game.players.slice(0);

                    for (var i = 0; i < players.length; i++) {
                        var target = players[i];

                        // 静默移走初始手牌：
                        // 不使用 target.discard(hs)，避免触发“失去牌后”“弃置后”等技能
                        var hs = target.getCards("h");
                        if (hs.length) {
                            for (var j = 0; j < hs.length; j++) {
                                hs[j].fix();
                                ui.discardPile.appendChild(hs[j]);
                            }
                            target.update();
                        }

                        // 获得三张黑桃9【酒】
                        var cards = [];
                        for (var k = 0; k < 3; k++) {
                            cards.push(game.createCard("jiu", "spade", 9));
                        }

                        target.gain(cards, "gain2");
                    }

                    game.updateRoundNumber();

                    _status.zus_jiushen_changing = false;
                },
            },

            zus_kuangyan: {
                trigger: {
                    global: ["loseAfter", "cardsDiscardAfter", "loseAsyncAfter"],
                },
                forced: true,
                filter: function (event, player) {
                    // 酒神重写初始手牌期间，不触发狂宴
                    if (_status.zus_jiushen_changing) return false;

                    if (!event.getd) return false;

                    return event.getd().some(function (card) {
                        return get.name(card) == "jiu";
                    });
                },
                content: function () {
                    var num = trigger.getd().filter(function (card) {
                        return get.name(card) == "jiu";
                    }).length;

                    if (num > 0) {
                        player.draw(num);
                    }
                },
            },
        },

        translate: {},
    };
});