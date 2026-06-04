(function () {

if (typeof lib === "undefined") var lib = globalThis.lib;
if (typeof game === "undefined") var game = globalThis.game;
if (typeof ui === "undefined") var ui = globalThis.ui;
if (typeof get === "undefined") var get = globalThis.get;
if (typeof ai === "undefined") var ai = globalThis.ai;
if (typeof _status === "undefined") var _status = globalThis._status;

(function () {

    window.zusfylriModules = window.zusfylriModules || {};

    const EXT_NAME = "Zusfylri武将包";

    function image(id, ext) {
        return (
            "ext:" +
            EXT_NAME +
            "/image/character/" +
            id +
            "." +
            (ext || "jpg")
        );
    }

    function char(gender, group, hp, skills, id, ext, tags) {

        var extra = tags ? tags.slice(0) : [];

        extra.push(image(id, ext));

        return [gender, group, hp, skills, extra];
    }

    function runtimeLib() {
        return globalThis.lib || lib;
    }

    function runtimeGet() {
        return globalThis.get || get;
    }

    function runtimeGame() {
        return globalThis.game || game;
    }

    // ============================================================
    // 星演：link -> 虚拟牌
    // ============================================================
    var moGetXingyanCardByLink = (window.Zus && Zus.bindHelper
        ? Zus.bindHelper("mo", "getXingyanCardByLink", function (link, nature) {

        var name;

        if (Array.isArray(link)) {

            name = link[2];
            nature = link[3];

        } else if (typeof link == "object" && link) {

            name = link.name;
            nature = link.nature;

        } else {

            name = link;
        }

        if (!name) return null;

        var card = {
            name: name,
            isCard: true,
        };

        if (nature) {
            card.nature = nature;
        }

        return card;
        })
        : function (link, nature) { return null; });

    // ============================================================
    // 星演：合法牌名判断
    // ============================================================
    var moIsXingyanCardName = (window.Zus && Zus.bindHelper
        ? Zus.bindHelper("mo", "isXingyanCardName", function (name) {
        var zlib = runtimeLib();
        var zget = runtimeGet();

        // 修复 lib.card 空对象报错
        if (!name || !zlib.card || !zlib.card[name]) {
            return false;
        }

        var type = null;

        try {
            type = zget.type({ name: name });
        } catch (e) {
            return false;
        }

        if (type == "basic") {
            return true;
        }

        if (type == "trick") {

            try {

                if (zget.subtype({ name: name }) == "delay") {
                    return false;
                }

            } catch (e) {}

            if (
                name == "wanjian" ||
                name == "nanman"
            ) {
                return false;
            }

            return true;
        }

        return false;
        })
        : function () { return false; });

    // ============================================================
    // 星演：是否能使用
    // ============================================================
    var moCanUseXingyanCard = (window.Zus && Zus.bindHelper
        ? Zus.bindHelper("mo", "canUseXingyanCard", function (player, link, nature) {
        var zlib = runtimeLib();
        var zgame = runtimeGame();

        if (!player) return false;

        var card =
            moGetXingyanCardByLink(link, nature);

        if (
            !card ||
            !card.name ||
            !zlib.card ||
            !zlib.card[card.name]
        ) {
            return false;
        }

        var name = card.name;

        // 基础启用检测
        try {

            if (
                zlib.filter.cardEnabled &&
                !zlib.filter.cardEnabled(card, player)
            ) {
                return false;
            }

        } catch (e) {
            return false;
        }

        // 次数检测
        try {

            if (
                zlib.filter.cardUsable &&
                !zlib.filter.cardUsable(card, player)
            ) {
                return false;
            }

        } catch (e) {}

        // 杀次数统一
        if (name == "sha") {

            if (typeof player.getCardUsable == "function") {

                var usable1 =
                    player.getCardUsable(card);

                var usable2 =
                    player.getCardUsable("sha");

                if (
                    typeof usable1 == "number" &&
                    usable1 <= 0
                ) {
                    return false;
                }

                if (
                    typeof usable2 == "number" &&
                    usable2 <= 0
                ) {
                    return false;
                }

            } else {

                var stat = player.getStat("card");

                if (
                    stat &&
                    stat.sha &&
                    stat.sha >= 1
                ) {
                    return false;
                }
            }
        }

        // 官方目标检测
        if (typeof player.hasUseTarget == "function") {

            try {

                return player.hasUseTarget(card);

            } catch (e) {
                return false;
            }
        }

        // 兜底
        return zgame.hasPlayer(function (current) {

            if (!current) return false;

            try {

                return zlib.filter.targetEnabled(
                    card,
                    player,
                    current
                );

            } catch (e) {
                return false;
            }
        });
        })
        : function () { return false; });

    // ============================================================
    // 星演：白名单
    // ============================================================
    var moGetXingyanNames = (window.Zus && Zus.bindHelper
        ? Zus.bindHelper("mo", "getXingyanNames", function (player) {
        var zlib = runtimeLib();

        var source = [

            ["基本", "", "sha"],
            ["基本", "", "sha", "fire"],
            ["基本", "", "sha", "thunder"],

            ["基本", "", "shan"],
            ["基本", "", "tao"],
            ["基本", "", "jiu"],

            ["锦囊", "", "juedou"],
            ["锦囊", "", "guohe"],
            ["锦囊", "", "shunshou"],
            ["锦囊", "", "wuzhong"],
            ["锦囊", "", "taoyuan"],
            ["锦囊", "", "wugu"],
            ["锦囊", "", "jiedao"],
            ["锦囊", "", "huogong"],
            ["锦囊", "", "tiesuo"],
            ["锦囊", "", "wuxie"],
        ];

        var list = [];

        for (var i = 0; i < source.length; i++) {

            var link = source[i];

            if (!link) continue;

            var name = link[2];

            // 修复 lib.card 报错
            if (
                !name ||
                !zlib.card ||
                !zlib.card[name]
            ) {
                continue;
            }

            if (
                !moIsXingyanCardName(name)
            ) {
                continue;
            }

            list.push(link);
        }

        return list;
        })
        : function () { return []; });

    // ============================================================
    // 星演：可使用列表
    // ============================================================
    var moGetUsableXingyanNames = (window.Zus && Zus.bindHelper
        ? Zus.bindHelper("mo", "getUsableXingyanNames", function (player) {

        var source =
            moGetXingyanNames(player);

        var list = [];

        for (var i = 0; i < source.length; i++) {

            try {

                if (
                    moCanUseXingyanCard(
                        player,
                        source[i]
                    )
                ) {
                    list.push(source[i]);
                }

            } catch (e) {}
        }

        return list;
        })
        : function () { return []; });

    globalThis.zusMoGetXingyanCardByLink = moGetXingyanCardByLink;
    globalThis.zusMoCanUseXingyanCard = moCanUseXingyanCard;
    globalThis.zusMoGetUsableXingyanNames = moGetUsableXingyanNames;
    globalThis.zusMoGetXingyanNames = moGetXingyanNames;

    function moGetXingyanCardByLinkRuntime(link, nature) {
        var name;

        if (Array.isArray(link)) {
            name = link[2];
            nature = link[3];
        } else if (typeof link == "object" && link) {
            name = link.name;
            nature = link.nature;
        } else {
            name = link;
        }

        if (!name) return null;

        var card = {
            name: name,
            isCard: true,
        };

        if (nature) {
            card.nature = nature;
        }

        return card;
    }

    function moIsXingyanCardNameRuntime(name) {
        var zlib = runtimeLib();
        var zget = runtimeGet();

        if (!name || !zlib || !zlib.card || !zlib.card[name] || !zget) {
            return false;
        }

        var type = null;
        try {
            type = zget.type({ name: name });
        } catch (e) {
            return false;
        }

        if (type == "basic") {
            return true;
        }

        if (type == "trick") {
            try {
                if (zget.subtype({ name: name }) == "delay") {
                    return false;
                }
            } catch (e) {}

            if (name == "wanjian" || name == "nanman") {
                return false;
            }

            return true;
        }

        return false;
    }

    function moGetXingyanNamesRuntime(player) {
        var zlib = runtimeLib();
        var source = [
            ["基本", "", "sha"],
            ["基本", "", "sha", "fire"],
            ["基本", "", "sha", "thunder"],
            ["基本", "", "tao"],
            ["基本", "", "jiu"],
            ["锦囊", "", "juedou"],
            ["锦囊", "", "guohe"],
            ["锦囊", "", "shunshou"],
            ["锦囊", "", "wuzhong"],
            ["锦囊", "", "taoyuan"],
            ["锦囊", "", "wugu"],
            ["锦囊", "", "jiedao"],
            ["锦囊", "", "huogong"],
            ["锦囊", "", "tiesuo"],
        ];

        var list = [];
        for (var i = 0; i < source.length; i++) {
            var link = source[i];
            var name = link[2];
            if (!zlib || !zlib.card || !zlib.card[name]) continue;
            if (!moIsXingyanCardNameRuntime(name)) continue;
            list.push(link);
        }

        return list;
    }

    function moCanUseXingyanCardRuntime(player, link, nature) {
        var zlib = runtimeLib();
        var zgame = runtimeGame();
        var getCard = globalThis.zusMoGetXingyanCardByLink || moGetXingyanCardByLinkRuntime;

        if (!player || !zlib || !zlib.card) return false;

        var card = getCard ? getCard(link, nature) : null;
        if (!card || !card.name || !zlib.card[card.name]) return false;

        var name = card.name;

        try {
            if (zlib.filter && zlib.filter.cardEnabled && !zlib.filter.cardEnabled(card, player)) {
                return false;
            }
        } catch (e) {
            return false;
        }

        try {
            if (zlib.filter && zlib.filter.cardUsable && !zlib.filter.cardUsable(card, player)) {
                return false;
            }
        } catch (e) {}

        if (name == "sha") {
            if (typeof player.getCardUsable == "function") {
                var usable1 = player.getCardUsable(card);
                var usable2 = player.getCardUsable("sha");
                if (typeof usable1 == "number" && usable1 <= 0) return false;
                if (typeof usable2 == "number" && usable2 <= 0) return false;
            } else {
                var stat = player.getStat("card");
                if (stat && stat.sha && stat.sha >= 1) return false;
            }
        }

        try {
            if (typeof player.hasUseTarget == "function" && player.hasUseTarget(card)) {
                return true;
            }
        } catch (e) {}

        try {
            if (typeof player.canUse == "function" && player.canUse(card, player, false)) {
                return true;
            }
        } catch (e) {}

        if (name == "wuzhong" || name == "jiu") {
            return true;
        }

        if (name == "tao") {
            return !!(player && player.hp < player.maxHp);
        }

        if (!zgame || typeof zgame.hasPlayer != "function") {
            return false;
        }

        return zgame.hasPlayer(function (current) {
            try {
                return !!(current && zlib.filter && zlib.filter.targetEnabled && zlib.filter.targetEnabled(card, player, current));
            } catch (e) {
                return false;
            }
        });
    }

    function moGetUsableXingyanNamesRuntime(player) {
        var getNames = globalThis.zusMoGetXingyanNames || moGetXingyanNamesRuntime;
        var source = getNames ? getNames(player) : [];
        var list = [];
        for (var i = 0; i < source.length; i++) {
            try {
                if (moCanUseXingyanCardRuntime(player, source[i])) {
                    list.push(source[i]);
                }
            } catch (e) {}
        }
        return list;
    }

    function moIsXingyanCardNameStable(name) {
        return [
            "sha",
            "tao",
            "jiu",
            "juedou",
            "guohe",
            "shunshou",
            "wuzhong",
            "taoyuan",
            "wugu",
            "jiedao",
            "huogong",
            "tiesuo",
        ].indexOf(name) != -1;
    }

    function moGetXingyanNamesStable(player) {
        return [
            ["基本", "", "sha"],
            ["基本", "", "sha", "fire"],
            ["基本", "", "sha", "thunder"],
            ["基本", "", "tao"],
            ["基本", "", "jiu"],
            ["锦囊", "", "juedou"],
            ["锦囊", "", "guohe"],
            ["锦囊", "", "shunshou"],
            ["锦囊", "", "wuzhong"],
            ["锦囊", "", "taoyuan"],
            ["锦囊", "", "wugu"],
            ["锦囊", "", "jiedao"],
            ["锦囊", "", "huogong"],
            ["锦囊", "", "tiesuo"],
        ];
    }

    function moCanUseXingyanCardStable(player, link, nature) {
        var zgame = runtimeGame();
        var card = moGetXingyanCardByLinkRuntime(link, nature);
        if (!player || !card || !card.name || !moIsXingyanCardNameStable(card.name)) return false;

        if (card.name == "sha") {
            if (typeof player.getCardUsable == "function") {
                var usable1 = player.getCardUsable(card);
                var usable2 = player.getCardUsable("sha");
                if (typeof usable1 == "number" && usable1 <= 0) return false;
                if (typeof usable2 == "number" && usable2 <= 0) return false;
            } else {
                var stat = player.getStat("card");
                if (stat && stat.sha && stat.sha >= 1) return false;
            }
        }

        try {
            if (typeof player.hasUseTarget == "function" && player.hasUseTarget(card)) {
                return true;
            }
        } catch (e) {}

        try {
            if (typeof player.canUse == "function" && player.canUse(card, player, false)) {
                return true;
            }
        } catch (e) {}

        if (card.name == "wuzhong" || card.name == "jiu") {
            return true;
        }

        if (card.name == "tao") {
            return !!(player && player.hp < player.maxHp);
        }

        if (!zgame || typeof zgame.hasPlayer != "function") return false;

        return zgame.hasPlayer(function (current) {
            try {
                return !!(current && typeof player.canUse == "function" && player.canUse(card, current, false));
            } catch (e) {
                return false;
            }
        });
    }

    function moGetUsableXingyanNamesStable(player) {
        var source = moGetXingyanNamesStable(player);
        var list = [];
        for (var i = 0; i < source.length; i++) {
            try {
                if (moCanUseXingyanCardStable(player, source[i])) {
                    list.push(source[i]);
                }
            } catch (e) {}
        }
        return list;
    }

    globalThis.zusMoGetXingyanCardByLink = moGetXingyanCardByLinkRuntime;
    globalThis.zusMoIsXingyanCardName = moIsXingyanCardNameStable;
    globalThis.zusMoGetXingyanNames = moGetXingyanNamesStable;
    globalThis.zusMoCanUseXingyanCard = moCanUseXingyanCardStable;
    globalThis.zusMoGetUsableXingyanNames = moGetUsableXingyanNamesStable;

    function moGetXingyanTargetEffect(player, card) {
        var zgame = runtimeGame();
        var zget = runtimeGet();
        if (!player || !card || !zgame || !zget || typeof zget.effect != "function") return null;

        var targets = [];
        try {
            if (typeof zgame.filterPlayer == "function") {
                targets = zgame.filterPlayer(function (current) {
                    return current && current != player && (!current.isIn || current.isIn());
                }) || [];
            } else if (zgame.players) {
                targets = zgame.players.slice(0);
            }
        } catch (e) {}

        var best = null;
        for (var i = 0; i < targets.length; i++) {
            var target = targets[i];
            if (!target || target == player) continue;

            var canUse = true;
            try {
                if (typeof player.canUse == "function") {
                    canUse = !!player.canUse(card, target, false);
                }
            } catch (e2) {
                canUse = false;
            }
            if (!canUse) continue;

            try {
                var effect = zget.effect(target, card, player, player);
                if (typeof effect == "number" && (best === null || effect > best)) {
                    best = effect;
                }
            } catch (e3) {}
        }
        return best;
    }

    function moGetXingyanAiScore(player, link) {
        var getCard = globalThis.zusMoGetXingyanCardByLink || moGetXingyanCardByLinkRuntime;
        var card = getCard ? getCard(link) : null;
        var zget = runtimeGet();
        if (!player || !card || !card.name) return -100;

        var name = card.name;
        var score = 0;
        var useValue = 0;
        var order = 0;
        try {
            if (zget && typeof zget.useValue == "function") {
                useValue = zget.useValue(card, player) || 0;
            }
        } catch (e) {}
        try {
            if (zget && typeof zget.order == "function") {
                order = zget.order(card, player) || 0;
            }
        } catch (e2) {}

        score = Math.max(0, useValue) + Math.max(0, order) * 0.15;

        var targetEffect = moGetXingyanTargetEffect(player, card);
        if (targetEffect !== null) {
            score += Math.max(-3, Math.min(5, targetEffect)) * 1.5;
        }

        if (name == "wuzhong") score = Math.max(score, 8.5);
        if (name == "tao") score = player.hp < player.maxHp ? Math.max(score, 10 + player.maxHp - player.hp) : -100;
        if (name == "jiu") score = Math.max(score, 2.5);
        if (name == "guohe") score += targetEffect !== null ? 0.5 : -5;
        if (name == "shunshou") score += targetEffect !== null ? 1 : -5;
        if (name == "juedou" || name == "huogong") score += targetEffect !== null ? 0.5 : -5;
        if (name == "sha") {
            score += targetEffect !== null ? 0.5 : -5;
            if (card.nature) score += 0.35;
        }

        if (typeof player.countCards == "function") {
            var sameInHand = 0;
            try {
                sameInHand = player.countCards("hs", function (current) {
                    var currentName = zget && typeof zget.name == "function"
                        ? zget.name(current, player)
                        : (current && current.name) || null;
                    if (currentName != name) return false;
                    if (name != "sha") return true;
                    return (current && current.nature || null) == (card.nature || null);
                });
            } catch (e3) {}

            if (sameInHand > 0) {
                score -= name == "sha" ? 3 : 1.5;
            }
        }

        return score;
    }

    globalThis.zusMoGetXingyanAiScore = moGetXingyanAiScore;

    if (game) {
        game.zusMoGetXingyanCardByLink = function (link, nature) {
            var name;

            if (Array.isArray(link)) {
                name = link[2];
                nature = link[3];
            } else if (typeof link == "object" && link) {
                name = link.name;
                nature = link.nature;
            } else {
                name = link;
            }

            if (!name) return null;

            var card = {
                name: name,
                isCard: true,
            };

            if (nature) card.nature = nature;
            return card;
        };

        game.zusMoIsXingyanCardName = function (name) {
            if (!name || !lib.card || !lib.card[name]) return false;

            var type = null;
            try {
                type = get.type({ name: name });
            } catch (e) {
                return false;
            }

            if (type == "basic") return true;

            if (type == "trick") {
                try {
                    if (get.subtype({ name: name }) == "delay") return false;
                } catch (e) {}
                if (name == "wanjian" || name == "nanman") return false;
                return true;
            }

            return false;
        };

        game.zusMoCanUseXingyanCard = function (player, link, nature) {
            if (!player) return false;

            var card = game.zusMoGetXingyanCardByLink(link, nature);
            if (!card || !card.name || !lib.card || !lib.card[card.name]) return false;

            var name = card.name;

            try {
                if (lib.filter.cardEnabled && !lib.filter.cardEnabled(card, player)) {
                    return false;
                }
            } catch (e) {
                return false;
            }

            try {
                if (lib.filter.cardUsable && !lib.filter.cardUsable(card, player)) {
                    return false;
                }
            } catch (e) {}

            if (name == "sha") {
                if (typeof player.getCardUsable == "function") {
                    var usable1 = player.getCardUsable(card);
                    var usable2 = player.getCardUsable("sha");

                    if (typeof usable1 == "number" && usable1 <= 0) return false;
                    if (typeof usable2 == "number" && usable2 <= 0) return false;
                } else {
                    var stat = player.getStat("card");
                    if (stat && stat.sha && stat.sha >= 1) return false;
                }
            }

            if (typeof player.hasUseTarget == "function") {
                try {
                    return player.hasUseTarget(card);
                } catch (e) {
                    return false;
                }
            }

            return game.hasPlayer(function (current) {
                try {
                    return current && lib.filter.targetEnabled(card, player, current);
                } catch (e) {
                    return false;
                }
            });
        };

        game.zusMoGetXingyanNames = function (player) {
            var source = [
                ["鍩烘湰", "", "sha"],
                ["鍩烘湰", "", "sha", "fire"],
                ["鍩烘湰", "", "sha", "thunder"],
            ["鍩烘湰", "", "tao"],
            ["鍩烘湰", "", "jiu"],
                ["閿﹀泭", "", "juedou"],
                ["閿﹀泭", "", "guohe"],
                ["閿﹀泭", "", "shunshou"],
                ["閿﹀泭", "", "wuzhong"],
                ["閿﹀泭", "", "taoyuan"],
                ["閿﹀泭", "", "wugu"],
                ["閿﹀泭", "", "jiedao"],
                ["閿﹀泭", "", "huogong"],
            ["閿﹀泭", "", "tiesuo"],
            ];

            var list = [];
            for (var i = 0; i < source.length; i++) {
                var link = source[i];
                var name = link[2];
                if (name == "shan" || name == "wuxie") continue;
                if (!lib.card || !lib.card[name]) continue;
                if (!game.zusMoIsXingyanCardName(name)) continue;
                list.push(link);
            }
            return list;
        };

        game.zusMoGetUsableXingyanNames = function (player) {
            var source = game.zusMoGetXingyanNames(player);
            var list = [];
            for (var i = 0; i < source.length; i++) {
                try {
                    if (game.zusMoCanUseXingyanCard(player, source[i])) {
                        list.push(source[i]);
                    }
                } catch (e) {}
            }
            return list;
        };

        game.zusMoCanUseXingyanCard = moCanUseXingyanCardRuntime;
        game.zusMoGetUsableXingyanNames = moGetUsableXingyanNamesRuntime;
        globalThis.zusMoGetXingyanCardByLink = game.zusMoGetXingyanCardByLink;
        globalThis.zusMoGetXingyanNames = game.zusMoGetXingyanNames;
        globalThis.zusMoCanUseXingyanCard = game.zusMoCanUseXingyanCard;
        globalThis.zusMoGetUsableXingyanNames = game.zusMoGetUsableXingyanNames;
    }

    globalThis.zusMoGetXingyanCardByLink = moGetXingyanCardByLinkRuntime;
    globalThis.zusMoIsXingyanCardName = moIsXingyanCardNameStable;
    globalThis.zusMoGetXingyanNames = moGetXingyanNamesStable;
    globalThis.zusMoCanUseXingyanCard = moCanUseXingyanCardStable;
    globalThis.zusMoGetUsableXingyanNames = moGetUsableXingyanNamesStable;

    window.zusfylriModules["mo"] = {

        key: "mo",

        character: {

            zus_mo: char(
                "female",
                "zus_group_huan",
                3,
                [
                    "zus_jiuxiang",
                    "zus_xingyan",
                    "zus_huanxu"
                ],
                "zus_mo",
                "png"
            ),
        },

        skill: {

            // ============================================================
            // 九相
            // ============================================================
            zus_jiuxiang: {

                forced: true,
                locked: true,

                marktext: "相",

                intro: {
                    name: "相",
                    content: "mark",
                },

                group: [
                    "zus_jiuxiang_init",
                    "zus_jiuxiang_damage",
                    "zus_jiuxiang_cancelled",
                    "zus_jiuxiang_wuxie_cancelled",
                    "zus_jiuxiang_damage_cancelled",
                ],
            },

            zus_jiuxiang_init: {

                trigger: {
                    global: "gameStart",
                    player: "enterGame",
                },

                forced: true,
                silent: true,
                popup: false,

                filter: function (event, player) {
                    return !player.storage.zus_jiuxiang_inited;
                },

                content: function () {

                    Sync.setStorage(
                        player,
                        "zus_jiuxiang_inited",
                        true
                    );

                    player.addMark(
                        "zus_jiuxiang",
                        9,
                        false
                    );

                    player.markSkill("zus_jiuxiang");
                },
            },

            zus_jiuxiang_damage: {

                trigger: {
                    player: "damageEnd",
                },

                forced: true,
                locked: true,

                filter: function (event, player) {
                    return (
                        player.countMark(
                            "zus_jiuxiang"
                        ) > 0
                    );
                },

                content: function () {

                    player.removeMark(
                        "zus_jiuxiang",
                        1,
                        false
                    );

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) > 0
                    ) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    player.draw();
                },
            },

            zus_jiuxiang_cancelled: {

                trigger: {
                    player: "shaMiss",
                    global: [
                        "useCardToExcluded",
                        "useCardToCancelled"
                    ],
                },

                forced: true,
                locked: true,

                filter: function (event, player) {

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) <= 0
                    ) {
                        return false;
                    }

                    if (!event.card) return false;

                    if (event.name == "shaMiss") {
                        return true;
                    }

                    if (event.player != player) {
                        return false;
                    }

                    return true;
                },

                content: function () {

                    player.removeMark(
                        "zus_jiuxiang",
                        1,
                        false
                    );

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) > 0
                    ) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    player.draw();
                },
            },

            zus_jiuxiang_wuxie_cancelled: {

                trigger: {
                    global: "wuxieAfter",
                },

                forced: true,
                locked: true,

                filter: function (event, player) {

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) <= 0
                    ) {
                        return false;
                    }

                    if (
                        !player.storage
                            .zus_jiuxiang_wuxie_history
                    ) {

                        Sync.setStorage(
                            player,
                            "zus_jiuxiang_wuxie_history",
                            []
                        );
                    }

                    var evt = null;

                    if (
                        typeof event.getParent ==
                        "function"
                    ) {

                        for (
                            var i = 0;
                            i <= 10;
                            i++
                        ) {

                            var parent =
                                event.getParent(i);

                            if (!parent) continue;
                            if (!parent.card) continue;
                            if (parent.player != player) continue;

                            if (
                                parent.card.name ==
                                "wuxie"
                            ) {
                                continue;
                            }

                            try {

                                if (
                                    (window.Zus && Zus.safeType ? Zus.safeType(parent.card, player) : get.type(parent.card)) !=
                                    "trick"
                                ) {
                                    continue;
                                }

                            } catch (e) {
                                continue;
                            }

                            evt = parent;
                            break;
                        }
                    }

                    if (!evt || !evt.card) {
                        return false;
                    }

                    var key = [
                        evt.name || "",
                        evt.card.name || ""
                    ].join("|");

                    if (
                        player.storage
                            .zus_jiuxiang_wuxie_history
                            .indexOf(key) != -1
                    ) {
                        return false;
                    }

                    event.zus_jiuxiang_wuxie_key =
                        key;

                    return true;
                },

                content: function () {

                    player.removeMark(
                        "zus_jiuxiang",
                        1,
                        false
                    );

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) > 0
                    ) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    player.draw();
                },
            },

            zus_jiuxiang_damage_cancelled: {

                trigger: {
                    global: [
                        "damageCancelled",
                        "damageZero"
                    ],
                },

                forced: true,
                locked: true,

                filter: function (event, player) {

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) <= 0
                    ) {
                        return false;
                    }

                    if (!event.card) return false;

                    if (event.source != player) {
                        return false;
                    }

                    return true;
                },

                content: function () {

                    player.removeMark(
                        "zus_jiuxiang",
                        1,
                        false
                    );

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) > 0
                    ) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    player.draw();
                },
            },

            // ============================================================
            // 星演
            // ============================================================
            zus_xingyan: {

                enable: "phaseUse",

                usable: 1,

                filter: function (event, player) {

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) <= 0
                    ) {
                        return false;
                    }

                    try {
                        var getNames = globalThis.zusMoGetUsableXingyanNames || (game && game.zusMoGetUsableXingyanNames);
                        return !!getNames && getNames(player).length > 0;
                    } catch (e) {
                        return false;
                    }
                },

                content: function () {

                    "step 0"

                    var getNames = globalThis.zusMoGetUsableXingyanNames || (game && game.zusMoGetUsableXingyanNames);
                    event.names = getNames ? getNames(player) : [];

                    if (!event.names.length) {
                        event.finish();
                        return;
                    }

                    player.chooseButton(
                        true,
                        [
                            "星演：移除1个“相”，视为使用一张牌",
                            [event.names, "vcard"]
                        ]
                    ).set(
                        "ai",
                        function (button) {
                            var player = _status.event.player;
                            var getScore = globalThis.zusMoGetXingyanAiScore;
                            return getScore ? getScore(player, button.link) : -100;
                        }
                    );

                    "step 1"

                    if (
                        !result.bool ||
                        !result.links ||
                        !result.links.length
                    ) {

                        event.finish();
                        return;
                    }

                    event.cardLink =
                        result.links[0];

                    var getCard = globalThis.zusMoGetXingyanCardByLink || (game && game.zusMoGetXingyanCardByLink);
                    event.card = getCard ? getCard(event.cardLink) : null;
                    var canUse = globalThis.zusMoCanUseXingyanCard || (game && game.zusMoCanUseXingyanCard);

                    if (
                        !event.card ||
                        (canUse && !canUse(player, event.cardLink))
                    ) {

                        event.finish();
                        return;
                    }

                    player.removeMark(
                        "zus_jiuxiang",
                        1,
                        false
                    );

                    if (
                        player.countMark(
                            "zus_jiuxiang"
                        ) > 0
                    ) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    "step 2"

                    player.chooseUseTarget(
                        event.card,
                        true
                    );
                },

                ai: {
                    order: 8,
                    result: {
                        player: 1,
                    },
                },
            },

            // ============================================================
            // 还虚
            // ============================================================
            zus_huanxu: {

                trigger: {
                    player: "phaseEnd",
                },

                forced: true,
                locked: true,

                filter: function (event, player) {

                    return (
                        player.countMark(
                            "zus_jiuxiang"
                        ) <= 0
                    );
                },

                content: function () {

                    "step 0"

                    event.list = [];

                    for (var name in lib.character) {

                        if (!lib.character[name]) {
                            continue;
                        }

                        if (
                            name == player.name ||
                            name == player.name1 ||
                            name == player.name2
                        ) {
                            continue;
                        }

                        event.list.push(name);
                    }

                    if (!event.list.length) {

                        event.finish();
                        return;
                    }

                    event.newName =
                        event.list.randomGet
                        ? event.list.randomGet()
                        : event.list[0];

                    event.oldMaxHp =
                        player.maxHp;

                    event.oldHp =
                        player.hp;

                    "step 1"

                    if (player.reinit) {

                        player.reinit(
                            player.name,
                            event.newName
                        );

                    } else if (player.init) {

                        player.init(
                            event.newName
                        );
                    }

                    player.maxHp =
                        event.oldMaxHp;

                    player.hp =
                        event.oldHp;

                    if (player.update) {
                        player.update();
                    }
                },
            },
        },

        translate: {

            zus_mo: "茉",
            zus_mo_ab: "茉",

            zus_jiuxiang: "九相",

            zus_jiuxiang_info:
                "锁定技，游戏开始时，你获得9个“相”。每当你受到伤害时，或你使用的牌无效、被抵消，或其造成的伤害被防止时，你移除1个“相”并摸1张牌。",

            zus_xingyan: "星演",

            zus_xingyan_info:
                "出牌阶段限一次，你可以移除1个“相”，视为使用一张基本牌或除【万箭齐发】与【南蛮入侵】外的非延时锦囊牌。",

            zus_huanxu: "还虚",

            zus_huanxu_info:
                "锁定技，回合结束阶段，若你没有“相”，你随机替换武将牌。",

            zus_xiang: "相",
        },

        sort: ["zus_mo"],

        title: {
            zus_mo: "春瓦绿",
        },
    };

})();

})();
