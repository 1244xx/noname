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
        return "ext:" + EXT_NAME +
            "/image/character/" +
            id + "." + (ext || "png");
    }

    function char(
        gender,
        group,
        hp,
        skills,
        id,
        ext,
        tags
    ) {

        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));

        return [
            gender,
            group,
            hp,
            skills,
            extra
        ];
    }

    function getPlayers() {
        return window.Zus && Zus.players ? Zus.players() : [];
    }

    window.zusfylriModules["wujing"] = {

        key: "wujing",

        character: {

            zus_wujing: char(
                "male",
                "zus_group_shi",
                4,
                [
                    "zus_yinlei",
                    "zus_piaoyi",
                    "zus_leijie"
                ],
                "zus_wujing",
                "png"
            ),
        },

        skill: {

            zus_lang: {

                marktext: "狼",

                intro: {
                    name: "狼",
                    content: "mark",
                },
            },

            // =========================================
            // 引雷
            // =========================================

            zus_yinlei: {

                trigger: {
                    player: "damageBegin4",
                },

                forced: true,
                locked: true,

                filter: function (event, player) {

                    if (!event) return false;

                    // 防止非属性伤害
                    return !event.nature;
                },

                content: function () {

                    trigger.cancel();

                    player.addMark(
                        "zus_lang",
                        1
                    );
                    player.markSkill(
                        "zus_lang"
                    );

                    game.log(
                        player,
                        "获得了1个“狼”标记"
                    );
                },

                // 修复：显示标记数量
                intro: {
                    content: "mark",
                },

                marktext: "狼",
            },

            // =========================================
            // 漂移
            // =========================================

            zus_piaoyi: {

                trigger: {
                    player: "useCardToPlayered",
                },

                direct: true,

                filter: function (
                    event,
                    player
                ) {

                    if (
                        !event ||
                        !event.card
                    ) return false;

                    var name = null;

                    try {
                        name = get.name(
                            event.card,
                            player
                        );
                    }
                    catch (e) {
                        return false;
                    }

                    if (name != "sha") {
                        return false;
                    }

                    var target = event.target;

                    if (
                        !target ||
                        !target.isIn ||
                        !target.isIn()
                    ) {
                        return false;
                    }

                    var players = getPlayers();

                    for (
                        var i = 0;
                        i < players.length;
                        i++
                    ) {

                        var current =
                            players[i];

                        if (
                            !current ||
                            current == target
                        ) {
                            continue;
                        }

                        if (
                            !current.isIn ||
                            !current.isIn()
                        ) {
                            continue;
                        }

                        try {

                            if (
                                target.inRange &&
                                target.inRange(current)
                            ) {
                                return true;
                            }
                        }
                        catch (e) {}
                    }

                    return false;
                },

                content: function () {

                    "step 0"

                    var target =
                        trigger.target;

                    player.chooseTarget(
                        "漂移：转移此【杀】的目标",
                        function (
                            card,
                            player,
                            current
                        ) {

                            if (
                                !current ||
                                current == target
                            ) {
                                return false;
                            }

                            if (
                                !current.isIn ||
                                !current.isIn()
                            ) {
                                return false;
                            }

                            try {

                                return (
                                    target.inRange &&
                                    target.inRange(current)
                                );
                            }
                            catch (e) {}

                            return false;
                        }
                    )
                        .set(
                            "ai",
                            function (target2) {

                                return -get.attitude(
                                    _status.event.player,
                                    target2
                                );
                            }
                        );

                    "step 1"

                    if (
                        result.bool &&
                        result.targets &&
                        result.targets.length
                    ) {

                        var newTarget =
                            result.targets[0];

                        player.logSkill(
                            "zus_piaoyi",
                            newTarget
                        );

                        trigger.targets.remove(
                            trigger.target
                        );

                        trigger.targets.push(
                            newTarget
                        );

                        trigger.target =
                            newTarget;

                        if (window.Zus && Zus.setStorage) {
                            Zus.setStorage(player, "zus_piaoyi_target", newTarget);
                        }
                    }
                },

                group: [
                    "zus_piaoyi_transfer"
                ],
            },

            // =========================================
            // 漂移·转狼
            // =========================================

            zus_piaoyi_transfer: {

                trigger: {
                    player: "shaMiss",
                },

                direct: true,

                filter: function (
                    event,
                    player
                ) {
                    if (
                        !player.countMark ||
                        player.countMark(
                            "zus_lang"
                        ) <= 0
                    ) {
                        return false;
                    }

                    var target = null;

                    if (event.target && event.target != player) {
                        target = event.target;
                    } else if (event.targets && event.targets.length) {
                        for (var i = 0; i < event.targets.length; i++) {
                            if (event.targets[i] && event.targets[i] != player) {
                                target = event.targets[i];
                                break;
                            }
                        }
                    } else if (event.player && event.player != player) {
                        target = event.player;
                    } else if (event.getParent) {
                        var parent = event.getParent();
                        if (parent) {
                            if (parent.target && parent.target != player) {
                                target = parent.target;
                            } else if (parent.targets && parent.targets.length) {
                                for (var j = 0; j < parent.targets.length; j++) {
                                    if (parent.targets[j] && parent.targets[j] != player) {
                                        target = parent.targets[j];
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    return !!(
                        target &&
                        target.isIn &&
                        target.isIn() &&
                        target != player
                    );
                },

                content: function () {

                    "step 0"

                    if (trigger.target && trigger.target != player) {
                        event.target = trigger.target;
                    } else if (trigger.targets && trigger.targets.length) {
                        for (var i = 0; i < trigger.targets.length; i++) {
                            if (trigger.targets[i] && trigger.targets[i] != player) {
                                event.target = trigger.targets[i];
                                break;
                            }
                        }
                    } else if (trigger.player && trigger.player != player) {
                        event.target = trigger.player;
                    } else if (trigger.getParent) {
                        var parent = trigger.getParent();
                        if (parent) {
                            if (parent.target && parent.target != player) {
                                event.target = parent.target;
                            } else if (parent.targets && parent.targets.length) {
                                for (var j = 0; j < parent.targets.length; j++) {
                                    if (parent.targets[j] && parent.targets[j] != player) {
                                        event.target = parent.targets[j];
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (
                        !event.target ||
                        !event.target.isIn ||
                        !event.target.isIn()
                    ) {
                        event.finish();
                        return;
                    }

                    player.chooseBool(
                        "是否发动【漂移】，将1个“狼”标记转移给" +
                            get.translation(event.target) +
                            "？"
                    ).set("ai", function () {
                        var player = _status.event.player;
                        var target = _status.event.targetx;
                        return get.attitude(player, target) < 0;
                    }).set("targetx", event.target);

                    "step 1"

                    if (
                        !result.bool ||
                        !event.target ||
                        !event.target.isIn ||
                        !event.target.isIn()
                    ) {
                        event.finish();
                        return;
                    }

                    player.logSkill(
                        "zus_piaoyi",
                        event.target
                    );

                    player.removeMark(
                        "zus_lang",
                        1
                    );
                    if (
                        player.countMark &&
                        player.countMark("zus_lang") > 0
                    ) {
                        player.markSkill("zus_lang");
                    } else if (
                        player.unmarkSkill
                    ) {
                        player.unmarkSkill("zus_lang");
                    }

                    event.target.addMark(
                        "zus_lang",
                        1
                    );
                    event.target.markSkill(
                        "zus_lang"
                    );

                    game.log(
                        player,
                        "将1个“狼”转移给了",
                        event.target
                    );
                },
            },

            // =========================================
            // 雷劫
            // =========================================

            zus_leijie: {

                trigger: {
                    global: "phaseJudgeBegin",
                },

                forced: true,

                filter: function (
                    event,
                    player
                ) {

                    var target =
                        event.player;

                    if (!target) {
                        return false;
                    }

                    if (
                        !target.countMark
                    ) {
                        return false;
                    }

                    return (
                        target.countMark(
                            "zus_lang"
                        ) > 0
                    );
                },

                content: function () {

                    "step 0"

                    event.target =
                        trigger.player;

                    event.num =
                        event.target.countMark(
                            "zus_lang"
                        );

                    "step 1"

                    if (event.num <= 0) {
                        event.finish();
                        return;
                    }

                    event.num--;

                    event.target.judge(function (card) {

                        var suit =
                            get.suit(card);

                        if (
                            suit == "spade" &&
                            get.number(card) >= 2 &&
                            get.number(card) <= 9
                        ) {
                            return -6;
                        }

                        return 0;
                    });

                    "step 2"

                    if (
                        result.bool == false
                    ) {

                        event.target.damage(
                            3,
                            "thunder"
                        );
                    }

                    if (
                        result.card &&
                        event.target.gain
                    ) {

                        event.target.gain(
                            result.card,
                            "gain2"
                        );
                    }

                    event.goto(1);
                },
            },
        },

        translate: {

            zus_wujing: "吴京",
            zus_wujing_ab: "吴京",

            zus_yinlei: "引雷",
            zus_yinlei_info:
                "锁定技：防止你受到的非属性伤害，改为获得1个“狼”标记。",

            zus_piaoyi: "漂移",
            zus_piaoyi_info:
                "每当你使用【杀】指定一名角色，你可以转移【杀】的目标至此角色攻击距离内的另一名角色（可以为你）；若此【杀】被【闪】抵消，你可以将自己的1个“狼”标记转移给杀的目标。",

            zus_leijie: "雷劫",
            zus_leijie_info:
                "拥有“狼”标记的角色，在判定阶段开始时，结算X次【闪电】并获得判定牌。（X为此角色的“狼”标记数量）",
        },

        sort: [
            "zus_wujing"
        ],

        title: {
            zus_wujing: "战狼",
        },
    };

})();
