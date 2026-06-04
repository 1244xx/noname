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

    window.zusfylriModules["change"] = {
        key: "change",

        character: {
            zus_change: char(
                "female",
                "shen",
                3,
                ["zus_yuezhao", "zus_chanjing"],
                "zus_change",
                "png"
            ),
        },

        skill: {
            // 月照
            zus_yuezhao: {
                trigger: {
                    player: "phaseBegin",
                },
                direct: true,

                content: function () {
                    "step 0"

                    player.chooseTarget(
                        true,
                        "是否发动【月照】？指定一名角色，令其打出1张【闪】并对你造成1点伤害，否则其减少1点体力上限",
                        function (card, player, target) {
                            return target && target.isIn && target.isIn();
                        }
                    ).set("ai", function (target) {
                        return -get.attitude(_status.event.player, target);
                    });

                    "step 1"

                    if (!result.bool || !result.targets || !result.targets.length) {
                        event.finish();
                        return;
                    }

                    event.target = result.targets[0];
                    player.logSkill("zus_yuezhao", event.target);

                    event.target.chooseToRespond(
                        "月照：请打出一张【闪】，并对" +
                            get.translation(player) +
                            "造成1点伤害；否则你减少1点体力上限",
                        { name: "shan" }
                    ).set("ai", function (card) {
                        return 7 - get.value(card);
                    });

                    "step 2"

                    if (!event.target || !event.target.isIn || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    if (result.bool) {
                        player.damage(1, event.target);
                    } else {
                        event.target.loseMaxHp();
                    }
                },
            },

            // 蟾镜：受到伤害时，来源获得镜
            zus_chanjing: {
                trigger: {
                    player: "damageEnd",
                },
                forced: true,
                group: "zus_chanjing_effect",

                filter: function (event, player) {
                    return event.source && event.source.isIn && event.source.isIn();
                },

                content: function () {
                    trigger.source.addMark("zus_jing", 1);
                    trigger.source.markSkill("zus_jing");
                },
            },

            // 有镜角色受到伤害后
            zus_chanjing_effect: {
                trigger: {
                    global: "damageEnd",
                },
                direct: true,

                filter: function (event, player) {
                    if (!event.player || !event.player.isIn || !event.player.isIn()) return false;
                    if (!event.player.countMark) return false;
                    return event.player.countMark("zus_jing") > 0;
                },

                content: function () {
                    "step 0"

                    event.target = trigger.player;

                    player.chooseBool(
                        "是否发动【蟾镜】，移除" +
                            get.translation(event.target) +
                            "的1枚“镜”？"
                    ).set("ai", function () {
                        return true;
                    });

                    "step 1"

                    if (!result.bool) {
                        event.finish();
                        return;
                    }

                    event.target.removeMark("zus_jing", 1);
                    if (event.target.countMark && event.target.countMark("zus_jing") > 0) {
                        event.target.markSkill("zus_jing");
                    } else if (event.target.unmarkSkill) {
                        event.target.unmarkSkill("zus_jing");
                    }

                    player.logSkill("zus_chanjing", event.target);

                    player.chooseControl(
                        "回复1点体力",
                        "对其发动月照"
                    ).set("prompt", "蟾镜：请选择一项").set("ai", function () {
                        var player = _status.event.player;
                        if (player.isDamaged && player.isDamaged()) return "回复1点体力";
                        return "对其发动月照";
                    });

                    "step 2"

                    if (result.control == "回复1点体力") {
                        player.recover();
                        event.finish();
                        return;
                    }

                    if (!event.target || !event.target.isIn || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    event.target.chooseToRespond(
                        "蟾镜·月照：请打出一张【闪】，并对" +
                            get.translation(player) +
                            "造成1点伤害；否则你减少1点体力上限",
                        { name: "shan" }
                    ).set("ai", function (card) {
                        return 7 - get.value(card);
                    });

                    "step 3"

                    if (!event.target || !event.target.isIn || !event.target.isIn()) {
                        event.finish();
                        return;
                    }

                    if (result.bool) {
                        player.damage(1, event.target);
                    } else {
                        event.target.loseMaxHp();
                    }
                },
            },

            // 镜标记
            zus_jing: {
                mark: true,
                marktext: "镜",
                intro: {
                    content: "mark",
                },
            },
        },

        translate: {
            zus_change: "嫦娥",
            zus_change_ab: "嫦娥",

            zus_yuezhao: "月照",
            zus_yuezhao_info:
                "回合开始阶段限一次，你可以指定场上一名角色，令其打出1张【闪】并对你造成1点伤害，否则其减少1点体力上限。",

            zus_chanjing: "蟾镜",
            zus_chanjing_info:
                "每当你受到伤害，你令伤害来源获得1枚“镜”；每当有“镜”的角色受到伤害，你可以移除其1枚“镜”，然后你选择：1.你回复1点体力；2.你立即对其发动一次【月照】。",

            zus_chanjing_effect: "蟾镜",
            zus_jing: "镜",
            zus_jing_info: "“镜”标记。",
        },

        sort: ["zus_change"],

        title: {
            zus_change: "广寒月皇",
        },
    };
})();
