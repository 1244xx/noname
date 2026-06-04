game.import("character", function (lib, game, ui, get, ai, _status) {
    // ============================================================
    // 茉：把【星演】按钮链接还原为真正要使用的虚拟牌
    // 支持普通杀、火杀、雷杀：火杀/雷杀在无名杀中本质都是 name: "sha" + nature。
    // ============================================================
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

    // ============================================================
    // 茉：判断【星演】声明的牌名是否属于允许范围
    // ============================================================
    game.zusMoIsXingyanCardName = function (name) {
        if (!name || !lib.card[name]) return false;

        var type = get.type({ name: name });
        if (type == "basic") return true;

        if (type == "trick") {
            if (get.subtype({ name: name }) == "delay") return false;
            if (name == "wanjian" || name == "nanman") return false;
            return true;
        }

        return false;
    };

    // ============================================================
    // 茉：判断【星演】声明的牌此时是否真的可以使用
    // 用于灰掉不能使用、没有合法目标、或次数不足的牌。
    // 注意：火杀/雷杀统一按【杀】检查使用次数。
    // ============================================================
    game.zusMoCanUseXingyanCard = function (player, link, nature) {
        if (!player) return false;

        var card = game.zusMoGetXingyanCardByLink(link, nature);
        if (!card || !card.name || !lib.card[card.name]) return false;

        var name = card.name;

        // 基础可用性检查
        if (lib.filter.cardEnabled && !lib.filter.cardEnabled(card, player)) {
            return false;
        }

        // 使用次数检查，主要用于修复【杀】无视次数的问题
        if (lib.filter.cardUsable && !lib.filter.cardUsable(card, player)) {
            return false;
        }

        // 【杀】、火【杀】、雷【杀】都共用【杀】的次数限制
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

        // 优先使用无名杀自带可使用目标检测
        if (typeof player.hasUseTarget == "function") {
            return player.hasUseTarget(card);
        }

        // 兜底：至少要有一个合法目标
        return game.hasPlayer(function (current) {
            return lib.filter.targetEnabled(card, player, current);
        });
    };

    // ============================================================
    // 茉：获得【星演】牌名白名单
    // 只允许军八常规牌：基本牌 + 非延时锦囊
    // 排除【万箭齐发】、【南蛮入侵】
    // 新增：普通杀、火杀、雷杀三个按钮。
    // ============================================================
    game.zusMoGetXingyanNames = function (player) {
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
            var name = link[2];
            if (!lib.card[name]) continue;
            if (!game.zusMoIsXingyanCardName(name)) continue;
            list.push(link);
        }

        return list;
    };

    // ============================================================
    // 茉：获得当前真正可以使用的【星演】牌名
    // 用于判断技能本身是否可发动。
    // ============================================================
    game.zusMoGetUsableXingyanNames = function (player) {
        var source = game.zusMoGetXingyanNames(player);
        var list = [];

        for (var i = 0; i < source.length; i++) {
            if (game.zusMoCanUseXingyanCard(player, source[i])) {
                list.push(source[i]);
            }
        }

        return list;
    };

    return {
        name: "zus_skill_mo",

        character: {},

        skill: {
            // 九相：
            // 锁定技，游戏开始时，你获得9个“相”。
            // 每当你受到伤害时，或你使用的牌无效、被抵消，或其造成的伤害被防止时，
            // 你移除1个“相”并摸1张牌。
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

            // 游戏开始获得9个“相”
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
                    Sync.setStorage(player, "zus_jiuxiang_inited", true);
                    player.addMark("zus_jiuxiang", 9, false);
                    player.markSkill("zus_jiuxiang");
                },
            },

            // 九相：你受到伤害后，移除1个“相”并摸1张牌
            zus_jiuxiang_damage: {
                trigger: {
                    player: "damageEnd",
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    return player.countMark("zus_jiuxiang") > 0;
                },

                content: function () {
                    player.removeMark("zus_jiuxiang", 1, false);

                    if (player.countMark("zus_jiuxiang") > 0) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    player.draw();

                    game.log(player, "因受到伤害，移除了1个", "#g【相】", "并摸了1张牌");
                },
            },

            // 九相：你使用的牌无效或被抵消时，移除1个“相”并摸1张牌。
            // 覆盖：杀被闪抵消、部分版本中的牌对目标无效/取消等。
            zus_jiuxiang_cancelled: {
                trigger: {
                    player: "shaMiss",
                    global: ["useCardToExcluded", "useCardToCancelled"],
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    if (player.countMark("zus_jiuxiang") <= 0) return false;
                    if (!event.card) return false;

                    // shaMiss 是你使用的【杀】被【闪】抵消
                    if (event.name == "shaMiss") {
                        return true;
                    }

                    // 牌被无效/取消时，确认这张牌的使用者是茉
                    if (event.player != player) return false;

                    return true;
                },

                content: function () {
                    player.removeMark("zus_jiuxiang", 1, false);

                    if (player.countMark("zus_jiuxiang") > 0) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    player.draw();

                    game.log(player, "因", trigger.card, "无效或被抵消，移除了1个", "#g【相】", "并摸了1张牌");
                },
            },

            // 九相：你使用的锦囊牌被【无懈可击】抵消时，移除1个“相”并摸1张牌。
            // 兜底修复：部分无名杀版本中，锦囊被无懈抵消不会稳定触发 useCardToCancelled。
            zus_jiuxiang_wuxie_cancelled: {
                trigger: {
                    global: "wuxieAfter",
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    if (player.countMark("zus_jiuxiang") <= 0) return false;

                    if (!player.storage.zus_jiuxiang_wuxie_history) {
                        Sync.setStorage(player, "zus_jiuxiang_wuxie_history", []);
                    }

                    var evt = null;

                    // 往父事件链上找：谁的哪张锦囊被无懈了
                    if (typeof event.getParent == "function") {
                        for (var i = 0; i <= 10; i++) {
                            var parent = event.getParent(i);
                            if (!parent) continue;
                            if (!parent.card) continue;
                            if (parent.player != player) continue;

                            // 排除无懈本身，只抓你原本使用的锦囊牌
                            if (parent.card.name == "wuxie") continue;
                            if (get.type(parent.card) != "trick") continue;

                            evt = parent;
                            break;
                        }
                    }

                    if (!evt || !evt.card) return false;

                    // 粗略去重，避免同一条无懈链里重复扣多个“相”
                    var key = [
                        evt.name || "",
                        evt.card.name || "",
                        evt.target ? evt.target.playerid : "",
                        evt.targets ? evt.targets.map(function (current) {
                            return current.playerid;
                        }).join("_") : "",
                    ].join("|");

                    if (player.storage.zus_jiuxiang_wuxie_history.indexOf(key) != -1) return false;

                    event.zus_jiuxiang_wuxie_key = key;
                    event.zus_jiuxiang_wuxie_card = evt.card;

                    return true;
                },

                content: function () {
                    if (!player.storage.zus_jiuxiang_wuxie_history) {
                        Sync.setStorage(player, "zus_jiuxiang_wuxie_history", []);
                    }

                    if (trigger.zus_jiuxiang_wuxie_key) {
                        Sync.pushValue(player, "zus_jiuxiang_wuxie_history", trigger.zus_jiuxiang_wuxie_key);

                        // 防止数组无限长
                        if (player.storage.zus_jiuxiang_wuxie_history.length > 30) {
                            player.storage.zus_jiuxiang_wuxie_history.shift();
                                if (typeof player.syncStorage === "function") player.syncStorage("zus_jiuxiang_wuxie_history");
                        }
                    }

                    player.removeMark("zus_jiuxiang", 1, false);

                    if (player.countMark("zus_jiuxiang") > 0) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    player.draw();

                    game.log(
                        player,
                        "因",
                        trigger.zus_jiuxiang_wuxie_card || "锦囊牌",
                        "被",
                        "#y【无懈可击】",
                        "抵消，移除了1个",
                        "#g【相】",
                        "并摸了1张牌"
                    );
                },
            },

            // 九相：你使用的牌造成的伤害被防止时，移除1个“相”并摸1张牌。
            // 用来覆盖南蛮/杀等牌已经生效，但伤害被藤甲、引雷、护甲等机制防止的情况。
            zus_jiuxiang_damage_cancelled: {
                trigger: {
                    global: ["damageCancelled", "damageZero"],
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    if (player.countMark("zus_jiuxiang") <= 0) return false;
                    if (!event.card) return false;
                    if (event.source != player) return false;
                    return true;
                },

                content: function () {
                    player.removeMark("zus_jiuxiang", 1, false);

                    if (player.countMark("zus_jiuxiang") > 0) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    player.draw();

                    game.log(player, "因", trigger.card, "造成的伤害被防止，移除了1个", "#g【相】", "并摸了1张牌");
                },
            },

            // 星演：出牌阶段限一次，你可以移除1个“相”，视为使用一张牌。
            zus_xingyan: {
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    if (player.countMark("zus_jiuxiang") <= 0) return false;
                    return game.zusMoGetUsableXingyanNames(player).length > 0;
                },

                content: function () {
                    "step 0"
                    event.names = game.zusMoGetXingyanNames(player);

                    player.chooseButton(
                        true,
                        ["星演：移除1个“相”，视为使用一张牌", [event.names, "vcard"]]
                    ).set("filterButton", function (button) {
                        var player = _status.event.player;
                        return game.zusMoCanUseXingyanCard(player, button.link);
                    }).set("ai", function (button) {
                        var player = _status.event.player;
                        var card = game.zusMoGetXingyanCardByLink(button.link);
                        if (!card) return -100;

                        var name = card.name;

                        if (!game.zusMoCanUseXingyanCard(player, button.link)) return -100;

                        if (name == "tao" && player.isDamaged && player.isDamaged()) return 10;

                        if (name == "sha") {
                            var value = game.hasPlayer(function (current) {
                                return current != player &&
                                    lib.filter.targetEnabled(card, player, current) &&
                                    get.effect(current, card, player, player) > 0;
                            }) ? 8 : 1;

                            if (card.nature == "fire") value += 0.3;
                            if (card.nature == "thunder") value += 0.2;
                            return value;
                        }

                        if (name == "wuxie") return 2;
                        if (name == "wugu" || name == "taoyuan") return 5;
                        if (name == "wuzhong") return 7;
                        if (name == "guohe" || name == "shunshou" || name == "huogong" || name == "juedou") return 6;
                        if (name == "jiedao") return 4;
                        if (name == "tiesuo") return 3;

                        return 3;
                    });

                    "step 1"
                    if (!result.bool || !result.links || !result.links.length) {
                        event.finish();
                        return;
                    }

                    event.cardLink = result.links[0];
                    event.card = game.zusMoGetXingyanCardByLink(event.cardLink);

                    // 二次校验，防止某些版本 filterButton 只灰显但仍可能异常选中
                    if (!event.card || !game.zusMoCanUseXingyanCard(player, event.cardLink)) {
                        event.finish();
                        return;
                    }

                    player.removeMark("zus_jiuxiang", 1, false);
                    if (player.countMark("zus_jiuxiang") > 0) {
                        player.markSkill("zus_jiuxiang");
                    } else {
                        player.unmarkSkill("zus_jiuxiang");
                    }

                    "step 2"
                    var card = event.card;

                    // 这里不能传 addCount=false，否则星演出的【杀】不会计入出杀次数。
                    // 普通杀/火杀/雷杀都应正常消耗【杀】的使用次数。
                    player.chooseUseTarget(card, true);
                },

                ai: {
                    order: 8,
                    result: {
                        player: function (player) {
                            return player.countMark("zus_jiuxiang") > 0 ? 1 : 0;
                        },
                    },
                },
            },

            // 还虚：锁定技，在你的回合结束阶段，若你没有“相”，随机替换武将牌。
            // 修复：替换武将牌后，保留替换前的当前体力上限与体力值。
            zus_huanxu: {
                trigger: {
                    player: "phaseEnd",
                },
                forced: true,
                locked: true,

                filter: function (event, player) {
                    return player.countMark("zus_jiuxiang") <= 0;
                },

                content: function () {
                    "step 0"
                    event.list = [];

                    for (var name in lib.character) {
                        if (!lib.character[name]) continue;
                        if (name == player.name || name == player.name1 || name == player.name2) continue;

                        if (lib.character[name][4]) {
                            var tags = lib.character[name][4];
                            if (tags.indexOf("boss") != -1) continue;
                            if (tags.indexOf("hiddenboss") != -1) continue;
                            if (tags.indexOf("minskin") != -1) continue;
                            if (tags.indexOf("unseen") != -1) continue;
                        }

                        event.list.push(name);
                    }

                    if (!event.list.length) {
                        event.finish();
                        return;
                    }

                    event.newName = typeof RNG !== "undefined" ? RNG.randomGet(event.list) : (game.zusSafeRandomGet ? game.zusSafeRandomGet(event.list) : (event.list.randomGet ? event.list.randomGet() : event.list[game.random(event.list.length)]));

                    // 关键修复：记录还虚前的当前体力上限与体力值
                    event.oldMaxHp = player.maxHp;
                    event.oldHp = player.hp;

                    // 兜底，防止旧版本奇怪状态导致写回 0 或负数
                    if (typeof event.oldMaxHp != "number" || event.oldMaxHp < 1) event.oldMaxHp = 1;
                    if (typeof event.oldHp != "number" || event.oldHp < 1) event.oldHp = 1;
                    if (event.oldHp > event.oldMaxHp) event.oldHp = event.oldMaxHp;

                    "step 1"
                    player.popup("还虚");
                    game.log(player, "发动了", "【还虚】", "，将武将牌替换为", "#g" + get.translation(event.newName));

                    if (player.reinit) {
                        player.reinit(player.name, event.newName);
                    } else if (player.init) {
                        player.init(event.newName);
                    }

                    // 关键修复：reinit/init 之后强行写回原来的当前体力上限与体力值
                    player.maxHp = event.oldMaxHp;
                    player.hp = event.oldHp;

                    if (player.update) {
                        player.update();
                    }

                    game.log(player, "保留了还虚前的体力值与体力上限：", player.hp + "/" + player.maxHp);
                },
            },
        },

        translate: {
            zus_jiuxiang: "九相",
            zus_jiuxiang_info: "锁定技，游戏开始时，你获得9个“相”。每当你受到伤害时，或你使用的牌无效、被抵消，或其造成的伤害被防止时，你移除1个“相”并摸1张牌。",

            zus_xingyan: "星演",
            zus_xingyan_info: "出牌阶段限一次，你可以移除1个“相”，视为使用一张基本牌，或除【万箭齐发】与【南蛮入侵】外的非延时类锦囊牌。你以此法使用【杀】时，可以选择普通【杀】、火【杀】或雷【杀】，且正常计入出杀次数。",

            zus_huanxu: "还虚",
            zus_huanxu_info: "锁定技，在你的回合结束阶段，若你没有“相”，你将自己的武将牌随机替换为武将牌堆中的一张武将牌，并保留当前体力值与体力上限。",

            zus_xiang: "相",
            zus_xiang_info: "“相”标记。每当你受到伤害时，或你使用的牌无效、被抵消，或其造成的伤害被防止时，你移除1个“相”并摸1张牌。",
        },
    };
});