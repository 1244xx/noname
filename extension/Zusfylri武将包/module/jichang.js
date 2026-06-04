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

    window.zusfylriModules["jichang"] = {
        key: "jichang",

        character: {
            zus_jichang: char(
                "male",
                "shen",
                "3/6",
                ["zus_yishu", "zus_liuzhuan"],
                "zus_jichang",
                "png"
            ),
        },

        skill: {
            // 易数
            zus_yishu: {
                trigger: {
                    player: "phaseBegin",
                },
                forced: true,
                locked: true,

                async content(event, trigger, player) {
                    var oldHp = player.hp;
                    var lost = player.maxHp - player.hp;
                    var newHp = lost;

                    if (newHp < 0) newHp = 0;
                    if (newHp > player.maxHp) newHp = player.maxHp;
                    var change = newHp - oldHp;

                    if (window.Zus && Zus.setStorage) {
                        Zus.setStorage(player, "zus_yishu_change", change);
                    } else {
                        player.storage = player.storage || {};
                        player.storage.zus_yishu_change = change;
                        if (player.syncStorage) player.syncStorage("zus_yishu_change");
                    }

                    if (change) {
                        await player.changeHp(change, false);
                    } else if (player.update) {
                        player.update();
                    }

                    if (player.hp <= 0 && (!player.isIn || player.isIn())) {
                        await player.dying(event);
                    }

                    var drawNum = Math.floor(Math.abs(change) / 2);
                    if (drawNum > 0 && (!player.isIn || player.isIn())) {
                        await player.draw(drawNum);
                    }
                },
            },

            // 流转
            zus_liuzhuan: {
                trigger: {
                    player: "useCardAfter",
                },
                forced: true,

                filter: function (event, player) {
                    var phaseUse = event.getParent ? event.getParent("phaseUse") : null;

                    if (phaseUse && phaseUse.player == player) return true;

                    if (window.Zus && Zus.inOwnPhase && Zus.inOwnPhase(event, player)) return true;

                    return false;
                },

                content: function () {
                    "step 0"

                    event.change = window.Zus && Zus.storage ? Zus.storage(player, "zus_yishu_change", 0) : 0;

                    // 未因本回合【易数】增加体力：令攻击范围内一名其他角色弃置1张牌
                    if (event.change <= 0) {
                        player.chooseTarget(
                            "流转：令攻击范围内一名其他角色弃置1张牌",
                            function (card, player, target) {
                                if (!target || target == player) return false;
                                if (!target.isIn || !target.isIn()) return false;
                                if (!target.countCards || target.countCards("he") <= 0) return false;

                                try {
                                    if (player.inRange && player.inRange(target)) return true;
                                } catch (e) {}

                                try {
                                    return get.distance(player, target) <= 1;
                                } catch (e2) {}

                                return false;
                            }
                        ).set("ai", function (target) {
                            return -get.attitude(_status.event.player, target);
                        });
                    } else {
                        event.goto(2);
                    }

                    "step 1"

                    if (result.bool && result.targets && result.targets.length) {
                        var target = result.targets[0];
                        player.line(target);
                        target.chooseToDiscard("he", true, 1);
                    }

                    "step 2"

                    // 未因本回合【易数】减少体力：令攻击范围内一名其他角色摸1张牌
                    if (event.change >= 0) {
                        player.chooseTarget(
                            "流转：令攻击范围内一名其他角色摸1张牌",
                            function (card, player, target) {
                                if (!target || target == player) return false;
                                if (!target.isIn || !target.isIn()) return false;

                                try {
                                    if (player.inRange && player.inRange(target)) return true;
                                } catch (e) {}

                                try {
                                    return get.distance(player, target) <= 1;
                                } catch (e2) {}

                                return false;
                            }
                        ).set("ai", function (target) {
                            return get.attitude(_status.event.player, target);
                        });
                    } else {
                        event.finish();
                    }

                    "step 3"

                    if (result.bool && result.targets && result.targets.length) {
                        var target2 = result.targets[0];
                        player.line(target2);
                        target2.draw();
                    }
                },
            },
        },

        translate: {
            zus_jichang: "姬昌",
            zus_jichang_ab: "姬昌",

            zus_yishu: "易数",
            zus_yishu_info:
                "锁定技，在你的回合开始阶段，你交换当前体力值与已损失体力值，每以此法变化两点体力值，你摸1张牌。",

            zus_liuzhuan: "流转",
            zus_liuzhuan_info:
                "在你的出牌阶段，每当你使用1张牌：若你未因本回合的【易数】增加体力，你令攻击范围内1名其他角色弃置1张牌；若你未因本回合的【易数】减少体力，你令攻击范围内1名其他角色摸1张牌。",
        },

        sort: ["zus_jichang"],

        title: {
            zus_jichang: "生死易数",
        },
    };
})();
