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

    // ============================================================
    // 柠姬专属UI：显示当前“韵”的已有花色
    // ============================================================
    function ensureNingjiYunStyle() {
        if (typeof lib == "undefined") return;
        if (typeof document == "undefined") return;
        if (lib.zusNingjiYunStyle) return;

        lib.zusNingjiYunStyle = true;

        var style = document.createElement("style");
        style.innerHTML = `
            .zus-ningji-yun-suits {
                position: absolute;
                z-index: 99;
                left: 28px;
                top: -4px;
                min-width: 62px;
                height: 18px;
                line-height: 18px;
                padding: 0 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 3px;
                border-radius: 10px;
                background: rgba(0, 0, 0, 0.72);
                color: #fff;
                font-size: 13px;
                font-family: "Times New Roman", serif;
                white-space: nowrap;
                overflow: visible;
                pointer-events: none;
                text-shadow: 0 0 2px #000;
                box-shadow: 0 0 3px rgba(255, 255, 255, 0.35);
                box-sizing: border-box;
            }

            .zus-ningji-yun-suits span {
                display: inline-block;
                min-width: 10px;
                text-align: center;
            }

            .zus-ningji-yun-suits .red {
                color: #ff9a9a;
            }

            .player .marks {
                overflow: visible !important;
            }
        `;
        document.head.insertBefore(style, document.head.firstChild || null);
    }

    function runtimeGet() {
        return globalThis.get || null;
    }

    function runtimeLib() {
        return globalThis.lib || null;
    }

    function readYunMetaFromStore(card, player, key) {
        if (!card || !player || !player.storage) return null;
        var store = player.storage.zus_xianqi_meta;
        if (!store) return null;
        var id = card.cardid || card.cardId || card.id;
        if (id && store[id] && store[id][key] != null) {
            return store[id][key];
        }
        return null;
    }

    function readYunSuit(card, player) {
        var zget = runtimeGet();
        var suit = null;
        try {
            if (zget && zget.suit) suit = zget.suit(card, player);
        } catch (e) {}
        if (!suit && card) {
            suit = card.zus_yun_suit || card.suit || (card.storage && card.storage.zus_yun_suit) || readYunMetaFromStore(card, player, "suit") || null;
        }
        return suit;
    }

    function readYunName(card, player) {
        var zget = runtimeGet();
        var name = null;
        try {
            if (zget && zget.name) name = zget.name(card, player);
        } catch (e) {}
        if (!name && card) {
            name = card.zus_yun_name || card.name || (card.storage && card.storage.zus_yun_name) || readYunMetaFromStore(card, player, "name") || null;
        }
        return name;
    }

    function readYunNumber(card, player) {
        var zget = runtimeGet();
        var number = null;
        try {
            if (zget && zget.number) number = zget.number(card, player);
        } catch (e) {}
        if ((number == null || number !== number) && card) {
            number = card.zus_yun_number || card.number || (card.storage && card.storage.zus_yun_number) || readYunMetaFromStore(card, player, "number") || null;
        }
        return number;
    }
    globalThis.zusNingjiReadYunSuit = readYunSuit;
    globalThis.zusNingjiReadYunName = readYunName;
    globalThis.zusNingjiReadYunNumber = readYunNumber;
    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("ningji", "readYunSuit", readYunSuit, "zusNingjiReadYunSuit");
        Zus.bindHelper("ningji", "readYunName", readYunName, "zusNingjiReadYunName");
        Zus.bindHelper("ningji", "readYunNumber", readYunNumber, "zusNingjiReadYunNumber");
    }

    function stampYunMeta(card, source, player) {
        if (!card) return;
        var suit = readYunSuit(source || card, player);
        var name = readYunName(source || card, player);
        var number = readYunNumber(source || card, player);
        if (suit) card.zus_yun_suit = suit;
        if (name) card.zus_yun_name = name;
        if (number != null) card.zus_yun_number = number;
        if (card.storage) {
            if (suit) card.storage.zus_yun_suit = suit;
            if (name) card.storage.zus_yun_name = name;
            if (number != null) card.storage.zus_yun_number = number;
        }
        if (player && player.storage) {
            var id = card.cardid || card.cardId || card.id;
            if (id) {
                player.storage.zus_xianqi_meta = player.storage.zus_xianqi_meta || {};
                player.storage.zus_xianqi_meta[id] = {
                    suit: suit || null,
                    name: name || null,
                    number: number != null ? number : null,
                };
            }
        }
    }

    function updateNingjiYunSuits(player) {
            ensureNingjiYunStyle();
            if (!player || !player.node) return;
            if (!ui || !ui.create || !ui.create.div) return;
            var zget = runtimeGet();
            if (!zget) return;

            var cards = player.getExpansions ? (player.getExpansions("zus_yun") || []) : [];
            var html = "";

            if (cards.length) {
                var has = {
                    heart: false,
                    diamond: false,
                    club: false,
                    spade: false,
                };

                for (var i = 0; i < cards.length; i++) {
                    var suit = readYunSuit(cards[i], player);
                    if (has.hasOwnProperty(suit)) {
                        has[suit] = true;
                    }
                }

                if (has.heart) html += '<span class="red">♥</span>';
                if (has.diamond) html += '<span class="red">♦</span>';
                if (has.club) html += '<span>♣</span>';
                if (has.spade) html += '<span>♠</span>';
            }

            var parent = player.node.marks || player.node;
            var node = player.node.zusNingjiYunSuits;

            if (!node) {
                node = ui.create.div(".zus-ningji-yun-suits", parent);
                player.node.zusNingjiYunSuits = node;
            }

            if (html) {
                node.innerHTML = html;
                node.style.display = "flex";
            } else {
                node.innerHTML = "";
                node.style.display = "none";
            }
    }
    globalThis.zusNingjiUpdateYunSuits = updateNingjiYunSuits;
    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("ningji", "updateYunSuits", updateNingjiYunSuits);
    }

    function collectXianqiCards(event, player) {
        var zget = runtimeGet();
        var cards = [];
        var pushRawCard = function (card) {
            if (!card || cards.indexOf(card) != -1) return;
            if (card.name || card.cardid || card.cardId || card.id) {
                cards.push(card);
            }
        };
        var pushCard = function (card) {
            if (!card || cards.indexOf(card) != -1) return;
            var position = null;
            try {
                position = zget && zget.position ? zget.position(card, true) : null;
            } catch (e) {}
            if (position == "o" || position == "d") {
                cards.push(card);
            }
        };

        if (event && event.cards && event.cards.filterInD) {
            cards = event.cards.filterInD("od");
        } else if (event && event.cards && event.cards.length) {
            for (var i = 0; i < event.cards.length; i++) {
                pushCard(event.cards[i]);
            }
        }

        if (!cards.length && event && event.cards && event.cards.length) {
            for (var j = 0; j < event.cards.length; j++) {
                pushRawCard(event.cards[j]);
            }
        }

        if (!cards.length && event && event.card) {
            pushCard(event.card);
        }

        if (!cards.length && event && event.card) {
            pushRawCard(event.card);
        }

        if (cards.length || !player || !player.getHistory) return cards;

        var loses = player.getHistory("lose", function (evt) {
            if (!evt) return false;
            var related = null;
            try {
                related = evt.relatedEvent || evt.getParent();
            } catch (e) {}
            return related == event && evt.hs && evt.hs.length;
        }) || [];

        for (var j = 0; j < loses.length; j++) {
            var lose = loses[j];
            var hs = lose && lose.hs ? lose.hs : [];
            for (var k = 0; k < hs.length; k++) {
                var loseCard = hs[k];
                var losePos = null;
                try {
                    losePos = zget && zget.position ? zget.position(loseCard, true) : null;
                } catch (e) {}
                if ((losePos == "o" || losePos == "d") && cards.indexOf(loseCard) == -1) {
                    cards.push(loseCard);
                }
            }
        }

        return cards;
    }
    globalThis.zusNingjiCollectXianqiCards = collectXianqiCards;

    function getXianqiCardType(card, player) {
        if (!card) return null;
        var zget = runtimeGet();
        var zlib = runtimeLib();
        var type = null;
        var cardInfo = null;
        var subtype = null;
        var delayNames = ["lebu", "bingliang", "shandian", "fulei", "huoshan", "hongshui"];
        var basicNames = ["sha", "shan", "tao", "jiu", "du"];
        var equipNames = ["bagua", "zhuge", "qinggang", "cixiong", "qinglong", "zhangba", "guanshi", "fangtian", "qilin", "hanbing", "guding", "zhuque", "renwang", "tengjia", "baiyin", "hualiu", "jueying", "dilu", "zhuahuang", "chitu", "dayuan", "zixin"];
        if (zlib && zlib.card && card.name && zlib.card[card.name]) {
            cardInfo = zlib.card[card.name];
        }
        if (equipNames.indexOf(card.name) != -1) return "equip";
        try {
            if (zget && zget.subtype) subtype = zget.subtype(card, player);
        } catch (e) {}
        if (subtype && String(subtype).indexOf("equip") == 0) {
            return "equip";
        }
        if (card.subtype && String(card.subtype).indexOf("equip") == 0) {
            return "equip";
        }
        if (cardInfo && cardInfo.subtype && String(cardInfo.subtype).indexOf("equip") == 0) {
            return "equip";
        }
        if (delayNames.indexOf(card.name) != -1 || (cardInfo && cardInfo.type == "delay")) {
            return "delay";
        }
        if (basicNames.indexOf(card.name) != -1 || (cardInfo && cardInfo.type == "basic")) {
            return "basic";
        }
        try {
            if (zget && zget.type2) {
                type = zget.type2(card, player);
            } else if (zget && zget.type) {
                type = zget.type(card, null, player);
            }
        } catch (e) {}
        if ((!type || type == "card") && cardInfo) {
            type = cardInfo.type || null;
        }
        if (!type || type == "card") {
            if (card.name) {
                type = "trick";
            }
        }
        return type;
    }

    function isXianqiCollectible(card, player) {
        var type = getXianqiCardType(card, player);
        return type == "basic" || type == "trick";
    }

    window.zusfylriModules["ningji"] = {
        key: "ningji",

        character: {
            zus_ningji: char("female", "zus_group_huan", 3, ["zus_xianqi", "zus_yuyun"], "zus_ningji", "png"),
        },

        skill: {
            // 弦启
            zus_xianqi: {
                trigger: {
                    player: ["useCardAfter", "respondAfter"],
                },
                forced: true,

                filter: function (event, player) {
                    if (!event || !event.card) {
                        return false;
                    }

                    var cards = collectXianqiCards(event, player);
                    if (!isXianqiCollectible(event.card, player)) return false;
                    if (!cards.length) return false;

                    return true;
                },

                content: function () {
                    "step 0"
                    var zget = globalThis.get;
                    var zlib = globalThis.lib;
                    var collectCards = globalThis.zusNingjiCollectXianqiCards;
                    var cards = typeof collectCards == "function" ? collectCards(trigger, player) : [];
                    if ((!cards || !cards.length) && trigger.cards && trigger.cards.length) {
                        cards = trigger.cards.slice(0);
                    }
                    var isCollectible = function (card) {
                        if (!card) return false;
                        var type = null;
                        var cardInfo = null;
                        var subtype = null;
                        var delayNames = ["lebu", "bingliang", "shandian", "fulei", "huoshan", "hongshui"];
                        var basicNames = ["sha", "shan", "tao", "jiu", "du"];
                        var equipNames = ["bagua", "zhuge", "qinggang", "cixiong", "qinglong", "zhangba", "guanshi", "fangtian", "qilin", "hanbing", "guding", "zhuque", "renwang", "tengjia", "baiyin", "hualiu", "jueying", "dilu", "zhuahuang", "chitu", "dayuan", "zixin"];
                        if (zlib && zlib.card && card.name && zlib.card[card.name]) {
                            cardInfo = zlib.card[card.name];
                        }
                        if (equipNames.indexOf(card.name) != -1) return false;
                        try {
                            if (zget && zget.subtype) subtype = zget.subtype(card, player);
                        } catch (e) {}
                        if (subtype && String(subtype).indexOf("equip") == 0) {
                            return false;
                        }
                        if (card.subtype && String(card.subtype).indexOf("equip") == 0) {
                            return false;
                        }
                        if (cardInfo && cardInfo.subtype && String(cardInfo.subtype).indexOf("equip") == 0) {
                            return false;
                        }
                        if (delayNames.indexOf(card.name) != -1 || (cardInfo && cardInfo.type == "delay")) {
                            return false;
                        }
                        if (basicNames.indexOf(card.name) != -1 || (cardInfo && cardInfo.type == "basic")) {
                            return true;
                        }
                        try {
                            if (zget && zget.type2) {
                                type = zget.type2(card, player);
                            } else if (zget && zget.type) {
                                type = zget.type(card, null, player);
                            }
                        } catch (e) {}
                        if ((!type || type == "card") && cardInfo) {
                            type = cardInfo.type || null;
                        }
                        if (!type || type == "card") {
                            if (card.name) {
                                type = "trick";
                            }
                        }
                        return type == "basic" || type == "trick";
                    };
                    var pushRawCard = function (card) {
                        if (!card || cards.indexOf(card) != -1) return;
                        if (card.name || card.cardid || card.cardId || card.id) {
                            cards.push(card);
                        }
                    };
                    var pushCard = function (card) {
                        if (!card || cards.indexOf(card) != -1) return;
                        var position = null;
                        try {
                            position = zget && zget.position ? zget.position(card, true) : null;
                        } catch (e) {}
                        if (position == "o" || position == "d") {
                            cards.push(card);
                        }
                    };
                    if (!cards.length && trigger.cards && trigger.cards.filterInD) {
                        cards = trigger.cards.filterInD("od");
                    } else if (!cards.length && trigger.cards && trigger.cards.length) {
                        for (var i = 0; i < trigger.cards.length; i++) {
                            pushCard(trigger.cards[i]);
                        }
                    }
                    if (!cards.length && trigger.cards && trigger.cards.length) {
                        for (var i = 0; i < trigger.cards.length; i++) {
                            pushRawCard(trigger.cards[i]);
                        }
                    }
                    if (!cards.length && trigger.card) {
                        pushCard(trigger.card);
                    }
                    if (!cards.length && trigger.card) {
                        pushRawCard(trigger.card);
                    }
                    if (!cards.length && player && player.getHistory) {
                        var loses = player.getHistory("lose", function (evt) {
                            if (!evt) return false;
                            var related = null;
                            try {
                                related = evt.relatedEvent || evt.getParent();
                            } catch (e) {}
                            return related == trigger && evt.hs && evt.hs.length;
                        }) || [];
                        for (var j = 0; j < loses.length; j++) {
                            var hs = loses[j] && loses[j].hs ? loses[j].hs : [];
                            for (var k = 0; k < hs.length; k++) {
                                var loseCard = hs[k];
                                var losePos = null;
                                try {
                                    losePos = zget && zget.position ? zget.position(loseCard, true) : null;
                                } catch (e) {}
                                if ((losePos == "o" || losePos == "d") && cards.indexOf(loseCard) == -1) {
                                    cards.push(loseCard);
                                }
                            }
                        }
                    }

                    if (!cards.length) {
                        event.finish();
                        return;
                    }

                    cards = cards.filter(function (card) {
                        return isCollectible(card);
                    });

                    if (!cards.length) {
                        event.finish();
                        return;
                    }

                    for (var m = 0; m < cards.length; m++) {
                        var sourceCard = trigger.cards && trigger.cards[m] ? trigger.cards[m] : cards[m];
                        var metaSuit = null;
                        var metaName = null;
                        var metaNumber = null;
                        try {
                            if (zget && zget.suit) metaSuit = zget.suit(sourceCard || cards[m], player);
                        } catch (e) {}
                        try {
                            if (zget && zget.name) metaName = zget.name(sourceCard || cards[m], player);
                        } catch (e) {}
                        try {
                            if (zget && zget.number) metaNumber = zget.number(sourceCard || cards[m], player);
                        } catch (e) {}
                        if (!metaSuit && sourceCard) metaSuit = sourceCard.suit || null;
                        if (!metaName && sourceCard) metaName = sourceCard.name || null;
                        if ((metaNumber == null || metaNumber !== metaNumber) && sourceCard) metaNumber = sourceCard.number || null;
                        if (metaSuit) cards[m].zus_yun_suit = metaSuit;
                        if (metaName) cards[m].zus_yun_name = metaName;
                        if (metaNumber != null) cards[m].zus_yun_number = metaNumber;
                        if (cards[m].storage) {
                            if (metaSuit) cards[m].storage.zus_yun_suit = metaSuit;
                            if (metaName) cards[m].storage.zus_yun_name = metaName;
                            if (metaNumber != null) cards[m].storage.zus_yun_number = metaNumber;
                        }
                        if (player && player.storage) {
                            var metaId = cards[m].cardid || cards[m].cardId || cards[m].id;
                            if (metaId) {
                                player.storage.zus_xianqi_meta = player.storage.zus_xianqi_meta || {};
                                player.storage.zus_xianqi_meta[metaId] = {
                                    suit: metaSuit || null,
                                    name: metaName || null,
                                    number: metaNumber != null ? metaNumber : null,
                                };
                            }
                        }
                    }

                    player.addToExpansion(cards, player, "giveAuto").gaintag.add("zus_yun");

                    "step 1"
                    zget = globalThis.get;
                    var getSuit = function (card) {
                        var suit = null;
                        var id = card && (card.cardid || card.cardId || card.id);
                        try {
                            if (zget && zget.suit) suit = zget.suit(card, player);
                        } catch (e) {}
                        if (!suit && card) {
                            suit = card.zus_yun_suit || card.suit || (card.storage && card.storage.zus_yun_suit) || null;
                        }
                        if (!suit && id && player && player.storage && player.storage.zus_xianqi_meta && player.storage.zus_xianqi_meta[id]) {
                            suit = player.storage.zus_xianqi_meta[id].suit || null;
                        }
                        return suit;
                    };
                    player.markSkill("zus_xianqi");
                    if (player.updateMarks) player.updateMarks();
                    if (globalThis.zusNingjiUpdateYunSuits) globalThis.zusNingjiUpdateYunSuits(player);

                    var yun = player.getExpansions ? (player.getExpansions("zus_yun") || []) : [];
                    var suits = ["heart", "diamond", "club", "spade"];
                    event.removeYun = [];

                    for (var i = 0; i < suits.length; i++) {
                        var suit = suits[i];
                        var same = [];

                        for (var j = 0; j < yun.length; j++) {
                            if (getSuit(yun[j]) == suit) {
                                same.push(yun[j]);
                            }
                        }

                        if (same.length >= 2) {
                            event.removeYun = same.slice(0, 2);
                            break;
                        }
                    }

                    if (!event.removeYun.length) {
                        event.finish();
                        return;
                    }

                    player.loseToDiscardpile(event.removeYun);

                    "step 2"
                    player.markSkill("zus_xianqi");
                    if (player.updateMarks) player.updateMarks();
                    if (globalThis.zusNingjiUpdateYunSuits) globalThis.zusNingjiUpdateYunSuits(player);

                    player.draw();
                },

                mark: true,
                marktext: "韵",

                intro: {
                    markcount: function () {
                        return "";
                    },

                    content: function (storage, player) {
                        var zget = globalThis.get;
                        var cards = player.getExpansions ? (player.getExpansions("zus_yun") || []) : [];

                        if (cards.length) {
                            var has = {
                                heart: false,
                                diamond: false,
                                club: false,
                                spade: false,
                            };

                            for (var i = 0; i < cards.length; i++) {
                                var suit = globalThis.zusNingjiReadYunSuit(cards[i], player);
                                if (has.hasOwnProperty(suit)) {
                                    has[suit] = true;
                                }
                            }

                            var suits = [];
                            if (has.heart) suits.push("红桃");
                            if (has.diamond) suits.push("方片");
                            if (has.club) suits.push("梅花");
                            if (has.spade) suits.push("黑桃");

                            return "当前共有" + cards.length + "张“韵”：<br>" +
                                "已有花色：" + suits.join("、") + "<br>" +
                                cards.map(function (card) {
                                    var name = globalThis.zusNingjiReadYunName(card, player) || "未知牌";
                                    var suit = globalThis.zusNingjiReadYunSuit(card, player) || "无花色";
                                    return name + "(" + suit + ")";
                                }).join("、");
                        }

                        return "当前没有“韵”。";
                    },
                },
            },

            // 余韵
            zus_yuyun: {
                trigger: {
                    player: "phaseJieshuBegin",
                },
                direct: true,

                filter: function (event, player) {
                    var zget = globalThis.get;
                    var getSuit = function (card) {
                        var suit = null;
                        var id = card && (card.cardid || card.cardId || card.id);
                        try {
                            if (zget && zget.suit) suit = zget.suit(card, player);
                        } catch (e) {}
                        if (!suit && card) {
                            suit = card.zus_yun_suit || card.suit || (card.storage && card.storage.zus_yun_suit) || null;
                        }
                        if (!suit && id && player && player.storage && player.storage.zus_xianqi_meta && player.storage.zus_xianqi_meta[id]) {
                            suit = player.storage.zus_xianqi_meta[id].suit || null;
                        }
                        return suit;
                    };
                    var yun = player.getExpansions ? (player.getExpansions("zus_yun") || []) : [];

                    var hasHeart = false;
                    var hasSpade = false;
                    var hasDiamond = false;
                    var hasClub = false;

                    for (var i = 0; i < yun.length; i++) {
                        var suit = getSuit(yun[i]);
                        if (suit == "heart") hasHeart = true;
                        if (suit == "spade") hasSpade = true;
                        if (suit == "diamond") hasDiamond = true;
                        if (suit == "club") hasClub = true;
                    }

                    return (hasHeart && hasSpade) || (hasDiamond && hasClub);
                },

                content: function () {
                    "step 0"
                    var zget = globalThis.get;
                    var getSuit = function (card) {
                        var suit = null;
                        var id = card && (card.cardid || card.cardId || card.id);
                        try {
                            if (zget && zget.suit) suit = zget.suit(card, player);
                        } catch (e) {}
                        if (!suit && card) {
                            suit = card.zus_yun_suit || card.suit || (card.storage && card.storage.zus_yun_suit) || null;
                        }
                        if (!suit && id && player && player.storage && player.storage.zus_xianqi_meta && player.storage.zus_xianqi_meta[id]) {
                            suit = player.storage.zus_xianqi_meta[id].suit || null;
                        }
                        return suit;
                    };
                    var getNumber = function (card) {
                        var number = null;
                        var id = card && (card.cardid || card.cardId || card.id);
                        try {
                            if (zget && zget.number) number = zget.number(card, player);
                        } catch (e) {}
                        if ((number == null || number !== number) && card) {
                            number = card.zus_yun_number || card.number || (card.storage && card.storage.zus_yun_number) || null;
                        }
                        if ((number == null || number !== number) && id && player && player.storage && player.storage.zus_xianqi_meta && player.storage.zus_xianqi_meta[id]) {
                            number = player.storage.zus_xianqi_meta[id].number;
                        }
                        return number;
                    };
                    var yun = player.getExpansions ? (player.getExpansions("zus_yun") || []) : [];

                    event.heartCard = null;
                    event.spadeCard = null;
                    event.diamondCard = null;
                    event.clubCard = null;

                    for (var i = 0; i < yun.length; i++) {
                        var suit = getSuit(yun[i]);

                        if (suit == "heart" && !event.heartCard) event.heartCard = yun[i];
                        if (suit == "spade" && !event.spadeCard) event.spadeCard = yun[i];
                        if (suit == "diamond" && !event.diamondCard) event.diamondCard = yun[i];
                        if (suit == "club" && !event.clubCard) event.clubCard = yun[i];
                    }

                    var controls = [];
                    if (event.spadeCard && event.heartCard) controls.push("黑桃红桃");
                    if (event.diamondCard && event.clubCard) controls.push("方片梅花");
                    controls.push("cancel2");
                    event.modeList = [];
                    if (event.spadeCard && event.heartCard) event.modeList.push("heart_spade");
                    if (event.diamondCard && event.clubCard) event.modeList.push("diamond_club");

                    player.chooseControl(controls)
                        .set("prompt", "是否发动【余韵】？")
                        .set("ai", function () {
                            var zstatus2 = globalThis._status;
                            var controls = zstatus2 && zstatus2.event ? zstatus2.event.controls : [];
                            if (controls.indexOf("黑桃红桃") != -1) return "黑桃红桃";
                            if (controls.indexOf("方片梅花") != -1) return "方片梅花";
                            return "cancel2";
                        });

                    "step 1"
                    var control = result && result.control;
                    var index = result && typeof result.index == "number" ? result.index : -1;
                    event.modeList = event.modeList || [];
                    if (control == "cancel2" || index < 0 || index >= event.modeList.length) {
                        event.finish();
                        return;
                    }

                    event.mode = event.modeList[index];
                    if (event.mode == "heart_spade") {
                        event.removed = [event.spadeCard, event.heartCard];
                    } else if (event.mode == "diamond_club") {
                        event.removed = [event.diamondCard, event.clubCard];
                    }
                    if (event.mode == "黑桃红桃") {
                        event.removed = [event.spadeCard, event.heartCard];
                    } else {
                        event.removed = [event.diamondCard, event.clubCard];
                    }

                    player.logSkill("zus_yuyun");
                    player.loseToDiscardpile(event.removed);

                    "step 2"
                    player.markSkill("zus_xianqi");
                    if (player.updateMarks) player.updateMarks();
                    if (globalThis.zusNingjiUpdateYunSuits) globalThis.zusNingjiUpdateYunSuits(player);

                    if (event.mode == "黑桃红桃") {
                        event.goto(3);
                    } else {
                        event.goto(8);
                    }

                    if (event.mode == "heart_spade") {
                        event.goto(3);
                    } else if (event.mode == "diamond_club") {
                        event.goto(8);
                    }

                    "step 3"
                    player.chooseTarget(
                        true,
                        "余韵：指定第一名角色，其将受到第二名角色造成的1点伤害后回复1点体力"
                    ).set("ai", function (target) {
                        var zget2 = globalThis.get;
                        var zstatus2 = globalThis._status;
                        return zget2 && zstatus2 && zstatus2.event ? zget2.damageEffect(target, null, zstatus2.event.player) : 0;
                    });

                    "step 4"
                    event.target1 = result && result.targets ? result.targets[0] : null;
                    if (!event.target1) {
                        event.finish();
                        return;
                    }

                    player.chooseTarget(
                        true,
                        "余韵：指定第二名角色，其将回复1点体力后受到第一名角色造成的1点伤害",
                        function (card, player, target) {
                            var zstatus2 = globalThis._status;
                            return !(zstatus2 && zstatus2.event) || target != zstatus2.event.target1;
                        }
                    ).set("target1", event.target1).set("ai", function (target) {
                        var zget2 = globalThis.get;
                        var zstatus2 = globalThis._status;
                        return zget2 && zstatus2 && zstatus2.event ? zget2.attitude(zstatus2.event.player, target) : 0;
                    });

                    "step 5"
                    event.target2 = result && result.targets ? result.targets[0] : null;
                    if (!event.target2) {
                        event.finish();
                        return;
                    }

                    player.line(event.target1);
                    player.line(event.target2);

                    if (event.target1 && event.target1.isIn() && event.target2 && event.target2.isIn()) {
                        event.target1.damage(event.target2);
                    }

                    "step 6"
                    if (event.target1 && event.target1.isIn()) {
                        event.target1.recover();
                    }
                    if (event.target2 && event.target2.isIn()) {
                        event.target2.recover();
                    }

                    "step 7"
                    if (event.target2 && event.target2.isIn() && event.target1 && event.target1.isIn()) {
                        event.target2.damage(event.target1);
                    }

                    event.finish();

                    "step 8"
                    player.chooseTarget(
                        true,
                        "余韵：令一名角色摸2张牌，并将梅花“韵”当【兵粮寸断】置于其判定区"
                    ).set("ai", function (target) {
                        var zget2 = globalThis.get;
                        var zstatus2 = globalThis._status;
                        return zget2 && zstatus2 && zstatus2.event ? zget2.attitude(zstatus2.event.player, target) : 0;
                    });

                    "step 9"
                    event.target3 = result && result.targets ? result.targets[0] : null;
                    if (!event.target3) {
                        event.finish();
                        return;
                    }

                    player.line(event.target3);
                    event.target3.draw(2);

                    if (event.target3 && event.target3.isIn() && event.clubCard) {
                        var bingliang = game.createCard(
                            "bingliang",
                            (globalThis.zusNingjiReadYunSuit ? globalThis.zusNingjiReadYunSuit(event.clubCard, player) : null) || "club",
                            (globalThis.zusNingjiReadYunNumber ? globalThis.zusNingjiReadYunNumber(event.clubCard, player) : null) || 1
                        );
                        event.target3.addJudge(bingliang);
                    }

                    "step 10"
                    player.chooseTarget(
                        true,
                        "余韵：令一名角色获得一个额外的出牌阶段，并将方片“韵”当【乐不思蜀】置于其判定区"
                    ).set("ai", function (target) {
                        var zget2 = globalThis.get;
                        var zstatus2 = globalThis._status;
                        return zget2 && zstatus2 && zstatus2.event ? zget2.attitude(zstatus2.event.player, target) : 0;
                    });

                    "step 11"
                    event.target4 = result && result.targets ? result.targets[0] : null;
                    if (!event.target4) {
                        event.finish();
                        return;
                    }

                    player.line(event.target4);
                    if (event.target4 && event.target4.isIn()) {
                        event.target4.phaseUse();
                    }

                    "step 12"
                    if (event.target4 && event.target4.isIn() && event.diamondCard) {
                        var lebu = game.createCard(
                            "lebu",
                            (globalThis.zusNingjiReadYunSuit ? globalThis.zusNingjiReadYunSuit(event.diamondCard, player) : null) || "diamond",
                            (globalThis.zusNingjiReadYunNumber ? globalThis.zusNingjiReadYunNumber(event.diamondCard, player) : null) || 1
                        );
                        event.target4.addJudge(lebu);
                    }
                },
            },
        },

        translate: {
            zus_ningji: "柠姬",
            zus_ningji_ab: "柠姬",

            zus_xianqi: "弦启",
            zus_xianqi_info: "锁定技，你使用或打出的基本牌与普通锦囊牌结算完毕后，移至你的武将牌上，称为“韵”；随后你移除武将牌上两张花色相同的“韵”并在移除后摸1张牌。",

            zus_yuyun: "余韵",
            zus_yuyun_info: "你的回合结束阶段，你可以移除：♥♠花色的一组“韵”，然后指定一名角色受到后者的1点伤害后回复1点体力，再指定另外一名角色回复1点体力后受到前者的1点伤害；♦♣花色的一组“韵”，然后指定一名角色摸2张牌，并将♣花色的“韵”当作【兵粮寸断】置于其判定区；再指定一名角色，立即获得一个额外的出牌阶段，并将♦花色的“韵”当作【乐不思蜀】置于其判定区。",
        },

        sort: ["zus_ningji"],

        title: {
            zus_ningji: "原型机",
        },
    };
})();
