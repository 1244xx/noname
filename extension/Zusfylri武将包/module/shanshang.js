(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = "Zusfylri武将包";

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function zusIsOutPhase(event, player) {
        var current = window.Zus && Zus.currentPhase ? Zus.currentPhase(event) : null;
        if (!current) return false;
        return current != player;
    }

    function safeDistance(player, target) {
        try {
            var getter = globalThis.get || get;
            if (getter && typeof getter.distance == "function") return getter.distance(player, target);
        } catch (e) {}
        return Infinity;
    }
    globalThis.zusShanshangSafeDistance = safeDistance;

    function safeCardType(card) {
        if (!card) return null;
        var equipNames = {
            bagua: true,
            renwang: true,
            tengjia: true,
            baiyin: true,
            zhuge: true,
            cixiong: true,
            qinggang: true,
            qinglong: true,
            zhangba: true,
            guanshi: true,
            fangtian: true,
            qilin: true,
            hanbing: true,
            guding: true,
            yinyueqiang: true,
            zhuque: true,
            hualiu: true,
            jueying: true,
            dilu: true,
            zhuahuang: true,
            chitu: true,
            dayuan: true,
            taipingyaoshu: true,
            huxinjing: true,
            muniu: true,
        };
        try {
            var direct = get && typeof get.type == "function" ? get.type(card) : null;
            if (direct) return direct;
        } catch (e) {}
        try {
            var alt = get && typeof get.type2 == "function" ? get.type2(card) : null;
            if (alt) return alt;
        } catch (e2) {}
        try {
            if (card.type) return card.type;
        } catch (e3) {}
        try {
            var runtimeLib = globalThis.lib || lib;
            var name = card.name || (get && typeof get.name == "function" ? get.name(card) : null);
            if (runtimeLib && runtimeLib.card && name && runtimeLib.card[name] && runtimeLib.card[name].type) {
                return runtimeLib.card[name].type;
            }
            if (name && equipNames[name]) {
                return "equip";
            }
        } catch (e4) {}
        return null;
    }

    function shanshangCardInfo(card) {
        if (!card) return null;
        var info = {
            name: null,
            type: null,
            subtype: null,
            suit: null,
            color: null,
            number: null,
        };
        try {
            info.name = card.name || (get && typeof get.name == "function" ? get.name(card) : null) || null;
        } catch (e0) {}
        try {
            info.type = safeCardType(card);
        } catch (e1) {}
        try {
            info.subtype = get && typeof get.subtype == "function" ? get.subtype(card) : (card.subtype || null);
        } catch (e2) {}
        try {
            info.suit = get && typeof get.suit == "function" ? get.suit(card) : (card.suit || null);
        } catch (e3) {}
        try {
            info.color = get && typeof get.color == "function" ? get.color(card) : (card.color || null);
        } catch (e4) {}
        try {
            info.number = get && typeof get.number == "function" ? get.number(card) : (card.number || null);
        } catch (e5) {}
        return info;
    }

    function dumpJuefuDebug(stage, payload) {
        try {
            var entry = {
                time: new Date().toISOString(),
                stage: stage,
                payload: payload || {},
            };
            globalThis.zus_juefu_debug = globalThis.zus_juefu_debug || [];
            globalThis.zus_juefu_debug.push(entry);
            if (globalThis.zus_juefu_debug.length > 30) {
                globalThis.zus_juefu_debug = globalThis.zus_juefu_debug.slice(-30);
            }
            if (globalThis.localStorage) {
                globalThis.localStorage.setItem("zus_juefu_debug", JSON.stringify(globalThis.zus_juefu_debug));
            }
        } catch (e) {}
    }

    window.zusfylriModules["shanshang"] = {
        key: "shanshang",

        character: {
            zus_shanshang: char(
                "male",
                "zus_group_shi",
                4,
                ["zus_yingyan", "zus_yingyan_gain", "zus_juefu"],
                "zus_shanshang",
                "png"
            ),
        },

        skill: {

            // 萤焰
            zus_yingyan: {
                trigger: {
                    global: ["loseAfter", "loseAsyncAfter"],
                },

                frequent: true,

                filter: function (event, player) {

                    // 仅回合外
                    if (!zusIsOutPhase(event, player)) return false;

                    if (!event || !event.getl) return false;

                    var evt = event.getl(player);

                    if (!evt) return false;

                    var cards = [];

                    if (evt.hs && evt.hs.length) {
                        cards.addArray(evt.hs);
                    }

                    if (evt.es && evt.es.length) {
                        cards.addArray(evt.es);
                    }

                    if (evt.js && evt.js.length) {
                        cards.addArray(evt.js);
                    }

                    if (evt.cards2 && evt.cards2.length) {
                        cards.addArray(evt.cards2);
                    }

                    cards = cards.unique();

                    return cards.length > 0;
                },

                content: function () {
                    "step 0"

                    var evt = trigger.getl
                        ? trigger.getl(player)
                        : null;

                    if (!evt) {
                        event.finish();
                        return;
                    }

                    var lostCards = [];

                    if (evt.hs && evt.hs.length) {
                        lostCards.addArray(evt.hs);
                    }

                    if (evt.es && evt.es.length) {
                        lostCards.addArray(evt.es);
                    }

                    if (evt.js && evt.js.length) {
                        lostCards.addArray(evt.js);
                    }

                    if (evt.cards2 && evt.cards2.length) {
                        lostCards.addArray(evt.cards2);
                    }

                    lostCards = lostCards.unique();

                    event.times = lostCards.length;

                    "step 1"

                    if (event.times <= 0) {
                        event.finish();
                        return;
                    }

                    event.times--;

                    var cards = get.cards(5);

                    player.showCards(
                        cards,
                        get.translation(player) + "发动了【萤焰】"
                    );

                    var equips = [];
                    var discards = [];

                    for (var i = 0; i < cards.length; i++) {

                        var card = cards[i];

                        if (!card) continue;

                        var type = null;

                        try {
                            type = get.type(card);
                        } catch (e) {
                            try {
                                type = get.type2(card);
                            } catch (e2) {}
                        }

                        if (type == "equip") {
                            equips.push(card);
                        }
                        else {
                            discards.push(card);
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

            // 萤焰补丁
            zus_yingyan_gain: {
                trigger: {
                    global: "gainAfter",
                },

                frequent: true,

                filter: function (event, player) {

                    // 回合外
                    if (!zusIsOutPhase(event, player)) return false;

                    if (
                        !event ||
                        !event.player ||
                        event.player == player
                    ) return false;

                    if (!event.cards || !event.cards.length) return false;

                    var evt = event;
                    var i = 0;

                    while (evt && i < 10) {

                        if (evt.name == "gainPlayerCard") {

                            if (evt.target == player) return true;
                            if (evt.source == player) return true;
                            if (evt.from == player) return true;
                            if (evt.giver == player) return true;
                        }

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

                    event.times = trigger.cards
                        ? trigger.cards.length
                        : 0;

                    "step 1"

                    if (event.times <= 0) {
                        event.finish();
                        return;
                    }

                    event.times--;

                    var cards = get.cards(5);

                    player.showCards(
                        cards,
                        get.translation(player) + "发动了【萤焰】"
                    );

                    var equips = [];
                    var discards = [];

                    for (var i = 0; i < cards.length; i++) {

                        var card = cards[i];

                        if (!card) continue;

                        var type = null;

                        try {
                            type = get.type(card);
                        } catch (e) {
                            try {
                                type = get.type2(card);
                            } catch (e2) {}
                        }

                        if (type == "equip") {
                            equips.push(card);
                        }
                        else {
                            discards.push(card);
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

            // 萤焰执行体
            zus_yingyan_do: {
                charlotte: true,

                content: function () {

                    var cards = get.cards(5);

                    player.showCards(
                        cards,
                        get.translation(player) + "发动了【萤焰】"
                    );

                    var equips = [];
                    var discards = [];

                    for (var i = 0; i < cards.length; i++) {

                        var card = cards[i];

                        if (!card) continue;

                        var type = null;

                        try {
                            type = get.type(card);
                        } catch (e) {
                            try {
                                type = get.type2(card);
                            } catch (e2) {}
                        }

                        if (type == "equip") {
                            equips.push(card);
                        }
                        else {
                            discards.push(card);
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

            // 绝赴
            zus_juefu: {
                enable: "phaseUse",

                usable: 1,

                filter: function (event, player) {

                    var hs = player.getCards("h");

                    if (!hs || !hs.length) {
                        dumpJuefuDebug("filter_no_hand", {
                            hej: player && typeof player.countCards == "function" ? player.countCards("hej") : null,
                        });
                        return false;
                    }

                    var snapshot = {
                        hand: hs.map(function (card) {
                            return shanshangCardInfo(card);
                        }),
                        hej: player.countCards("hej"),
                        targets: [],
                    };
                    try {
                        var runtimeGame = globalThis.game || game;
                        if (runtimeGame && Array.isArray(runtimeGame.players)) {
                            snapshot.targets = runtimeGame.players.filter(function (current) {
                                return current && current != player && (!current.isIn || current.isIn());
                            }).map(function (current) {
                                return {
                                    name: (get && typeof get.translation == "function" ? get.translation(current) : null) || current.name || current.playerid || null,
                                    playerid: current.playerid || null,
                                    distance: globalThis.zusShanshangSafeDistance(player, current),
                                    isIn: current.isIn ? current.isIn() : true,
                                };
                            });
                        }
                    } catch (e0) {}

                    for (var i = 0; i < hs.length; i++) {

                        var card = hs[i];

                        if (!card) return false;
                        var type = safeCardType(card);

                        if (type != "equip") {
                            snapshot.failIndex = i;
                            snapshot.failCard = shanshangCardInfo(card);
                            snapshot.result = false;
                            dumpJuefuDebug("filter_non_equip", snapshot);
                            return false;
                        }
                    }
                    snapshot.result = player.countCards("hej") > 0;
                    dumpJuefuDebug("filter_pass", snapshot);
                    return snapshot.result;
                },

                filterTarget: function (card, player, target) {
                    return (
                        target != player &&
                        globalThis.zusShanshangSafeDistance(player, target) == 1
                    );
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

        translate: {
            zus_shanshang: "山上彻也",
            zus_shanshang_ab: "山上",

            zus_yingyan: "萤焰",
            zus_yingyan_info:
                "在你的回合外，你每失去1张你区域内的牌，你可以翻开牌堆顶5张牌，将其中的装备牌收入手牌，然后将剩余牌置入弃牌堆。",

            zus_yingyan_gain: "萤焰",
            zus_yingyan_gain_info:
                "当其他角色于你的回合外获得你区域内的牌后，你可以发动【萤焰】。",

            zus_yingyan_do: "萤焰",
            zus_yingyan_do_info:
                "翻开牌堆顶5张牌，获得其中的装备牌，其余置入弃牌堆。",

            zus_juefu: "绝赴",
            zus_juefu_info:
                "在你的出牌阶段，当你的手牌中只含有装备牌，你可以弃置你区域中的所有牌，指定1名距离为1的角色造成等同于你弃置牌数的伤害。",
        },

        sort: ["zus_shanshang"],

        title: {
            zus_shanshang: "最后的英灵",
        },
    };
})();
