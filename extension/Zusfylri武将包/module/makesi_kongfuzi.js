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

    window.zusfylriModules["makesi_kongfuzi"] = {
        key: "makesi_kongfuzi",

        character: {
            zus_makesi_kongfuzi: char(
                "male",
                "zus_group_shi",
                4,
                ["zus_zhouli", "zus_fengbao"],
                "zus_makesi_kongfuzi",
                "png"
            ),
        },

        skill: {

            // =====================================================
            // 周礼
            // =====================================================

            zus_zhouli: {
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    return player.countCards("h") > 0;
                },

                content: function () {

                    "step 0"

                    event.targets = [];

                    var myCount = player.countCards("h");

                    var players = game.filterPlayer
                        ? game.filterPlayer()
                        : (window.Zus && Zus.players ? Zus.players() : []);

                    for (var i = 0; i < players.length; i++) {

                        var current = players[i];

                        if (
                            current &&
                            current != player &&
                            current.isIn &&
                            current.isIn() &&
                            current.countCards("h") < myCount
                        ) {
                            event.targets.push(current);
                        }
                    }

                    if (!event.targets.length) {
                        player.popup("无人响应");
                        event.finish();
                        return;
                    }

                    event.index = 0;

                    "step 1"

                    if (event.index >= event.targets.length) {
                        event.finish();
                        return;
                    }

                    event.current = event.targets[event.index];
                    event.index++;

                    if (
                        !event.current ||
                        !event.current.isIn ||
                        !event.current.isIn()
                    ) {
                        event.goto(1);
                        return;
                    }

                    event.diff =
                        player.countCards("h") -
                        event.current.countCards("h");

                    if (event.diff <= 0) {
                        event.goto(1);
                        return;
                    }

                    if (window.Zus && Zus.setStorage) {
                        Zus.setStorage(event.current, "zus_zhouli_target", player);
                    }

                    event.current.addTempSkill(
                        "zus_zhouli_range",
                        "useCardAfter"
                    );

                    event.current.chooseToUse(
                        "周礼：对" +
                            get.translation(player) +
                            "使用一张无视距离的【杀】，否则交给其" +
                            event.diff +
                            "张牌",
                        { name: "sha" },
                        player
                    )
                        .set("targetRequired", true)
                        .set("complexSelect", true)
                        .set(
                            "filterTarget",
                            function (card, playerx, target) {

                                return (
                                    target ==
                                    playerx.storage.zus_zhouli_target
                                );
                            }
                        )
                        .set("ai1", function (card) {
                            return 7 - get.value(card);
                        });

                    "step 2"

                    if (event.current) {

                        event.current.removeSkill(
                            "zus_zhouli_range"
                        );

                        if (window.Zus && Zus.deleteStorage) {
                            Zus.deleteStorage(event.current, "zus_zhouli_target");
                        }
                    }

                    if (result.bool) {
                        event.goto(1);
                        return;
                    }

                    if (
                        !event.current ||
                        !event.current.isIn ||
                        !event.current.isIn()
                    ) {
                        event.goto(1);
                        return;
                    }

                    var count = Math.min(
                        event.diff,
                        event.current.countCards("he")
                    );

                    if (count <= 0) {
                        event.goto(1);
                        return;
                    }

                    event.current.chooseCard(
                        "he",
                        true,
                        count,
                        "周礼：交给" +
                            get.translation(player) +
                            count +
                            "张牌"
                    )
                        .set("ai", function (card) {
                            return 6 - get.value(card);
                        });

                    "step 3"

                    if (
                        result.bool &&
                        result.cards &&
                        result.cards.length
                    ) {
                        event.current.give(
                            result.cards,
                            player
                        );
                    }

                    event.goto(1);
                },

                ai: {
                    order: 8,
                    result: {
                        player: 1,
                    },
                },
            },

            // =====================================================
            // 周礼距离
            // =====================================================

            zus_zhouli_range: {
                charlotte: true,

                mod: {
                    targetInRange: function (
                        card,
                        player,
                        target
                    ) {

                        if (!card) return;

                        var name = null;

                        try {
                            name = get.name(card, player);
                        }
                        catch (e) {}

                        if (
                            name == "sha" &&
                            target ==
                                player.storage
                                    .zus_zhouli_target
                        ) {
                            return true;
                        }
                    },
                },
            },

            // =====================================================
            // 风暴
            // =====================================================

            zus_fengbao: {

                // 修复：双监听导致重复触发
                group: "zus_fengbao_clear",

                trigger: {
                    player: [
                        "phaseUseEnd",
                        "phaseUseAfter"
                    ],
                },

                forced: true,
                locked: true,

                // 修复：本回合只允许触发一次
                filter: function (event, player) {
                    return !(window.Zus && Zus.storage ? Zus.storage(player, "zus_fengbao_used", false) : false);
                },

                content: function () {

                    "step 0"

                    // 修复：记录已触发
                    if (window.Zus && Zus.setStorage) {
                        Zus.setStorage(player, "zus_fengbao_used", true);
                    }

                    var players = game.filterPlayer
                        ? game.filterPlayer()
                        : (window.Zus && Zus.players ? Zus.players() : []);

                    var max = -1;

                    event.candidates = [];

                    for (var i = 0; i < players.length; i++) {

                        var current = players[i];

                        if (
                            !current ||
                            !current.isIn ||
                            !current.isIn()
                        ) {
                            continue;
                        }

                        var num =
                            current.countCards("h");

                        if (num > max) {

                            max = num;
                            event.candidates = [current];
                        }
                        else if (num == max) {

                            event.candidates.push(
                                current
                            );
                        }
                    }

                    if (
                        !event.candidates.length ||
                        max <= 0
                    ) {

                        event.finish();
                        return;
                    }

                    if (event.candidates.length == 1) {

                        event.target =
                            event.candidates[0];

                        event.goto(2);
                        return;
                    }

                    player.chooseTarget(
                        true,
                        "风暴：选择一名手牌最多的角色",
                        function (
                            card,
                            player,
                            target
                        ) {

                            return (
                                _status.event.candidates.indexOf(
                                    target
                                ) != -1
                            );
                        }
                    )
                        .set(
                            "candidates",
                            event.candidates
                        )
                        .set("ai", function (target) {

                            return -get.attitude(
                                _status.event.player,
                                target
                            );
                        });

                    "step 1"

                    if (
                        result.bool &&
                        result.targets &&
                        result.targets.length
                    ) {

                        event.target =
                            result.targets[0];
                    }
                    else {

                        event.target =
                            event.candidates[0];
                    }

                    "step 2"

                    if (
                        !event.target ||
                        !event.target.isIn ||
                        !event.target.isIn()
                    ) {

                        event.finish();
                        return;
                    }

                    player.line(event.target, "fire");

                    event.target.damage(2, player);

                    "step 3"

                    if (
                        !event.target ||
                        !event.target.isIn ||
                        !event.target.isIn()
                    ) {

                        event.finish();
                        return;
                    }

                    var hs =
                        event.target.getCards("h");

                    if (hs && hs.length) {

                        event.target.discard(hs);
                    }

                    "step 4"

                    if (
                        !event.target ||
                        !event.target.isIn ||
                        !event.target.isIn()
                    ) {

                        event.finish();
                        return;
                    }

                    var wugu = {
                        name: "wugu",
                        isCard: true,
                    };

                    if (
                        event.target.hasUseTarget &&
                        event.target.hasUseTarget(wugu)
                    ) {

                        event.target.chooseUseTarget(
                            wugu,
                            true
                        );
                    }

                    "step 5"

                    if (
                        !event.target ||
                        !event.target.isIn ||
                        !event.target.isIn()
                    ) {

                        event.finish();
                        return;
                    }

                    var taoyuan = {
                        name: "taoyuan",
                        isCard: true,
                    };

                    if (
                        event.target.hasUseTarget &&
                        event.target.hasUseTarget(
                            taoyuan
                        )
                    ) {

                        event.target.chooseUseTarget(
                            taoyuan,
                            true
                        );
                    }
                },
            },

            // =====================================================
            // 风暴清理
            // =====================================================

            zus_fengbao_clear: {
                trigger: {
                    player: "phaseBegin",
                },

                forced: true,
                silent: true,
                popup: false,

                content: function () {

                    if (window.Zus && Zus.setStorage) {
                        Zus.setStorage(player, "zus_fengbao_used", false);
                    }
                },
            },
        },

        translate: {
            zus_makesi_kongfuzi: "马克思&孔夫子",
            zus_makesi_kongfuzi_ab:
                "马克思&孔夫子",

            zus_zhouli: "周礼",

            zus_zhouli_info:
                "出牌阶段限一次，你令所有手牌数小于你的角色对你使用1张无视距离的【杀】，否则交给你X张牌（不足则全交）。X为你与其手牌数差值。",

            zus_zhouli_range: "周礼",

            zus_zhouli_range_info:
                "使用【杀】指定周礼来源时无视距离。",

            zus_fengbao: "风暴",

            zus_fengbao_info:
                "锁定技，在你的出牌阶段结束时，你令场上手牌最多的一名角色受到2点伤害并弃置所有手牌，视为其使用【五谷丰登】与【桃园结义】各一张。",
        },

        sort: ["zus_makesi_kongfuzi"],

        title: {
            zus_makesi_kongfuzi:
                "无",
        },
    };
})();
