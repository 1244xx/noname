(function() {
if (typeof lib === "undefined") var lib = globalThis.lib;
if (typeof game === "undefined") var game = globalThis.game;
if (typeof ui === "undefined") var ui = globalThis.ui;
if (typeof get === "undefined") var get = globalThis.get;
if (typeof ai === "undefined") var ai = globalThis.ai;
if (typeof _status === "undefined") var _status = globalThis._status;
(function () {
    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = "Zusfylri武将包";
if (typeof lib === "undefined") var lib = globalThis.lib;
if (typeof game === "undefined") var game = globalThis.game;
if (typeof ui === "undefined") var ui = globalThis.ui;
if (typeof get === "undefined") var get = globalThis.get;
if (typeof ai === "undefined") var ai = globalThis.ai;
if (typeof _status === "undefined") var _status = globalThis._status;


    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    window.zusfylriModules["houyi"] = {
        key: "houyi",
        character: {
            zus_houyi: char("male", "shen", 4, ["zus_jiuyao", "zus_fenshi"], "zus_houyi", "png")
        },
        skill: {
            // 九曜：置杀为“曜”，结束阶段按数量依次结算
            zus_jiuyao: {
                trigger: {
                    player: "phaseUseBegin",
                },
                direct: true,
                mark: true,
                filter: function (event, player) {
                    return player.countCards("h", "sha") > 0 && player.getExpansions("zus_yao").length < 9;
                },
                content: function () {
                    "step 0"
                    var max = 9 - player.getExpansions("zus_yao").length;
                    player.chooseCard("h", [1, max], "是否发动【九曜】，将任意张【杀】置于武将牌上称为“曜”？", {
                        name: "sha",
                    }).set("ai", function (card) {
                        return 5 - get.value(card);
                    });

                    "step 1"
                    if (result.bool && result.cards && result.cards.length) {
                        player.logSkill("zus_jiuyao");
                        player.addToExpansion(result.cards, player, "giveAuto").gaintag.add("zus_yao");
                        player.draw(result.cards.length);

                        // 手动显示标记，确保能看到“曜”的数量
                        player.markSkill("zus_jiuyao");
                    }
                },
                group: "zus_jiuyao_end",
                intro: {
                    markcount: function (storage, player) {
                        return player.getExpansions("zus_yao").length;
                    },
                    content: function (storage, player) {
                        var cards = player.getExpansions("zus_yao");
                        if (cards.length) {
                            return "当前共有" + cards.length + "张“曜”：<br>" + get.translation(cards);
                        }
                        return "当前没有“曜”。";
                    },
                },
                marktext: "曜",
            },

            // 九曜结束阶段结算
            zus_jiuyao_end: {
                trigger: {
                    player: "phaseJieshuBegin",
                },
                forced: true,
                filter: function (event, player) {
                    return player.getExpansions("zus_yao").length >= 2;
                },
                content: function () {
                    "step 0"
                    event.num = player.getExpansions("zus_yao").length;

                    if (event.num >= 2) {
                        player.draw();
                    }

                    "step 1"
                    if (event.num >= 4 && player.isDamaged()) {
                        player.recover();
                    }

                    "step 2"
                    if (event.num >= 6) {
                        event.targets = [player];

                        game.countPlayer(function (current) {
                            if (
                                current != player &&
                                player.inRange(current) &&
                                get.distance(player, current) == 1
                            ) {
                                event.targets.push(current);
                            }
                        });

                        event.targets.sortBySeat();
                    } else {
                        event.finish();
                    }

                    "step 3"
                    if (event.targets && event.targets.length) {
                        var target = event.targets.shift();
                        player.line(target, "fire");
                        target.damage("fire");
                        event.redo();
                    }
                },
            },

            // 焚世：准备阶段，若“曜”为9，清空判定区并获得本回合一次火杀
            zus_fenshi: {
                trigger: {
                    player: "phaseZhunbeiBegin",
                },
                forced: true,
                filter: function (event, player) {
                    return player.getExpansions("zus_yao").length == 9;
                },
                content: function () {
                    "step 0"
                    var judges = player.getCards("j");
                    if (judges.length) {
                        player.discard(judges);
                    }

                    "step 1"
                    player.addTempSkill("zus_fenshi_sha", { player: "phaseUseEnd" });
                },
            },

            // 焚世火杀：移去任意枚“曜”，视为使用不可响应、无距离限制的火杀
            zus_fenshi_sha: {
                enable: "phaseUse",
                usable: 1,
                charlotte: true,
                filter: function (event, player) {
                    return player.getExpansions("zus_yao").length > 0;
                },
                content: function () {
                    "step 0"
                    var yao = player.getExpansions("zus_yao");
                    player.chooseButton(["焚世：移去任意枚“曜”", yao], [1, yao.length], true).set("ai", function (button) {
                        return 1;
                    });

                    "step 1"
                    if (result.bool && result.links && result.links.length) {
                        event.removed = result.links.slice(0);
                        player.loseToDiscardpile(event.removed);
                        player.markSkill("zus_jiuyao");
                    } else {
                        event.finish();
                    }

                    "step 2"
                    var num = event.removed.length;
                    player.chooseTarget([1, num], "焚世：选择至多" + num + "名角色，视为使用一张不可被响应的火【杀】", function (card, player, target) {
                        return target != player;
                    }).set("ai", function (target) {
                        return get.effect(target, { name: "sha", nature: "fire" }, player, player);
                    });

                    "step 3"
                    if (result.bool && result.targets && result.targets.length) {
                        var card = {
                            name: "sha",
                            nature: "fire",
                            isCard: true,
                        };

                        var targets = result.targets.slice(0);
                        player.line(targets, "fire");

                        var next = player.useCard(card, targets, false);

                        // 令此【杀】对所有目标不可被响应
                        if (next) {
                            next.directHit = targets.slice(0);
                        }
                    }
                },
                ai: {
                    order: 8,
                    result: { player: 1 },
                },
            },
        },
        translate: {
            zus_houyi: "后羿",
            zus_houyi_ab: "后羿",

            zus_jiuyao: "九曜",
            zus_jiuyao_info: "出牌阶段开始时，你可以将任意张【杀】置于你的武将牌上，称为“曜”（至多九张），然后摸等量的牌。结束阶段，若“曜”数不小于2/4/6，你依次执行以下效果：摸一张牌；回复1点体力；对自己和攻击范围内的所有角色各造成1点火焰伤害。",

            zus_jiuyao_end: "九曜",
            zus_jiuyao_end_info: "结束阶段，若“曜”数不小于2/4/6，你依次执行对应效果。",

            zus_fenshi: "焚世",
            zus_fenshi_info: "准备阶段，若“曜”的数量等于9，你清空你的判定区。此回合出牌阶段限一次，你可以移去任意枚“曜”，视为使用一张无距离限制且不可被响应的火【杀】，并可指定至多等量目标。",

            zus_fenshi_sha: "焚世",
            zus_fenshi_sha_info: "你可以移去任意枚“曜”，视为使用一张无距离限制且不可被响应的火【杀】，并可指定至多等量目标。",
        },
        sort: ["zus_houyi"],
        title: {
            zus_houyi: "九曜阳帝"
        }
    };
})();

})();
