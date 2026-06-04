(function () {
    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = window.ZUS_EXTENSION_NAME || "Zusfylri\u6b66\u5c06\u5305";

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function runtimeLib() {
        if (
            typeof window != "undefined" &&
            window.top &&
            window.top.lib &&
            typeof window.top.lib == "object"
        ) {
            return window.top.lib;
        }
        if (globalThis.lib && typeof globalThis.lib == "object") return globalThis.lib;
        if (lib && typeof lib == "object") return lib;
        return null;
    }

    function runtimeGame() {
        if (
            typeof window != "undefined" &&
            window.top &&
            window.top.game &&
            typeof window.top.game == "object"
        ) {
            return window.top.game;
        }
        if (globalThis.game && typeof globalThis.game == "object") return globalThis.game;
        if (game && typeof game == "object") return game;
        return null;
    }

    function runtimeGet() {
        if (
            typeof window != "undefined" &&
            window.top &&
            window.top.get &&
            typeof window.top.get == "object"
        ) {
            return window.top.get;
        }
        if (globalThis.get && typeof globalThis.get == "object") return globalThis.get;
        if (get && typeof get == "object") return get;
        return null;
    }

    function setupShiGroup() {
        var currentLib = runtimeLib();
        if (!currentLib) return;
        if (currentLib.group) {
            if (typeof currentLib.group.add == "function") currentLib.group.add("zus_group_shi");
            else if (Array.isArray(currentLib.group) && currentLib.group.indexOf("zus_group_shi") == -1) currentLib.group.push("zus_group_shi");
        }
        currentLib.translate = currentLib.translate || {};
        currentLib.translate.zus_group_shi = "世";
        currentLib.translate.zus_group_shi2 = "世";
        currentLib.groupnature = currentLib.groupnature || {};
        currentLib.groupnature.zus_group_shi = "soil";
    }

    setupShiGroup();

    function safeCardValue(card, player) {
        if (!card) return 0;
        try {
            var getter = runtimeGet();
            if (getter && typeof getter.value == "function") return getter.value(card, player);
        } catch (e) {
        }
        return 0;
    }

    function getZhishiPlayers(player) {
        var currentGame = runtimeGame();
        if (currentGame) {
            if (typeof currentGame.filterPlayer == "function") {
                try {
                    var filtered = currentGame.filterPlayer(function (current) {
                        return !!(current && current.isIn && current.isIn());
                    });
                    if (Array.isArray(filtered) && filtered.length) return filtered;
                } catch (e) {
                }
            }
            if (Array.isArray(currentGame.players) && currentGame.players.length) {
                return currentGame.players.filter(function (current) {
                    return !!(current && current.isIn && current.isIn());
                });
            }
        }

        var players = [];
        var seen = {};
        var current =
            player && typeof player.getNext == "function"
                ? player.getNext()
                : player && player.next
                  ? player.next
                  : null;
        var guard = 0;
        while (current && current != player && guard < 32) {
            if (current.playerid && seen[current.playerid]) break;
            if (current.playerid) seen[current.playerid] = true;
            if (current.isIn && current.isIn()) players.push(current);
            current =
                typeof current.getNext == "function"
                    ? current.getNext()
                    : current.next
                      ? current.next
                      : null;
            guard++;
        }
        if (player && player.isIn && player.isIn()) {
            players.unshift(player);
        }
        return players;
    }

    function appendZhishiDebug(debug) {
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof window != "undefined" && window.top && window.top.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (!req) return;
            var fs = req("fs");
            fs.appendFileSync(
                "D:/app/noname/resources/app/Home/dingzhen_zhishi_debug.log",
                JSON.stringify(debug) + "\n",
                "utf8"
            );
        } catch (e) {
        }
    }

    function writeZhishiDebug(debug) {
        if (!debug) return;
        if (!debug.timestamp) debug.timestamp = Date.now();
        globalThis.zusDingzhenZhishiDebug = debug;
        appendZhishiDebug(debug);
        try {
            localStorage.setItem("zus_dingzhen_zhishi_debug", JSON.stringify(debug));
        } catch (e) {
        }
    }

    globalThis.zusDingzhenWriteZhishiDebug = writeZhishiDebug;
    globalThis.zusDingzhenSafeValue = safeCardValue;

    // ============================================================
    // 銆愮煡璇嗐€戞櫘閫氭潃鐩爣妫€娴?    // ============================================================
    function zusZhishiShaTargetCheck(card, player, target) {
        if (!player || !target) return { pass: false, reason: "missing_player_or_target" };
        if (target == player) return { pass: false, reason: "self" };
        if (!target.isIn || !target.isIn()) return { pass: false, reason: "target_not_in" };

        try {
            if (typeof player.canUse == "function" && !player.canUse(card, target)) {
                return { pass: false, reason: "canUse_false" };
            }
        } catch (e) {
            return { pass: false, reason: "canUse_error:" + e.message };
        }

        var currentLib = runtimeLib();
        if (!currentLib || !currentLib.filter) return { pass: true, reason: "canUse_only" };

        try {
            if (!currentLib.filter.targetEnabled(card, player, target)) {
                return { pass: false, reason: "target_disabled" };
            }
        } catch (e) {
            return { pass: false, reason: "targetEnabled_error:" + e.message };
        }

        try {
            if (
                currentLib.filter.targetInRange &&
                !currentLib.filter.targetInRange(card, player, target)
            ) {
                return { pass: false, reason: "out_of_range" };
            }
        } catch (e) {
            return { pass: false, reason: "targetInRange_error:" + e.message };
        }

        return { pass: true, reason: "ok" };
    }

    function zusZhishiShaTargetEnabled(card, player, target) {
        return zusZhishiShaTargetCheck(card, player, target).pass;
    }

    globalThis.zusZhishiShaTargetCheck = zusZhishiShaTargetCheck;
    globalThis.zusZhishiShaTargetEnabled = zusZhishiShaTargetEnabled;
    writeZhishiDebug({
        stage: "zhishi_module_loaded",
        extName: EXT_NAME,
    });

    window.zusfylriModules["dingzhen"] = {
        key: "dingzhen",

        character: {
            zus_dingzhen: char(
                "male",
                "zus_group_shi",
                4,
                ["zus_zhishi", "zus_xuebao"],
                "zus_dingzhen",
                "png"
            ),
        },

        skill: {

            // ============================================================
            // 鐭ヨ瘑
            // ============================================================
            zus_zhishi: {
                enable: "phaseUse",

                usable: 1,

                filter: function (event, player) {
                    var level = (player.storage && player.storage.zus_zhishi_level) || 0;
                    var handCount = player.countCards("he");
                    var shaUsable = null;
                    if (typeof player.getCardUsable == "function") {
                        try {
                            shaUsable = player.getCardUsable({ name: "sha" });
                        } catch (e) {
                            shaUsable = "error:" + e.message;
                        }
                    }

                    if (level <= 0) {
                        globalThis.zusDingzhenWriteZhishiDebug({
                            stage: "zhishi_filter_blocked",
                            player: player && player.name,
                            reason: "level_locked",
                            level: level,
                            handCount: handCount,
                            shaUsable: shaUsable,
                        });
                        return false;
                    }

                    if (handCount <= 0) {
                        globalThis.zusDingzhenWriteZhishiDebug({
                            stage: "zhishi_filter_blocked",
                            player: player && player.name,
                            reason: "no_cards",
                            level: level,
                            handCount: handCount,
                            shaUsable: shaUsable,
                        });
                        return false;
                    }

                    // 绗竴寮犳櫘閫氭潃浠嶅彈娆℃暟闄愬埗
                    if (typeof player.getCardUsable == "function") {

                        if (
                            player.getCardUsable({ name: "sha" }) <= 0
                        ) {
                            globalThis.zusDingzhenWriteZhishiDebug({
                                stage: "zhishi_filter_blocked",
                                player: player && player.name,
                                reason: "sha_usable_zero",
                                level: level,
                                handCount: handCount,
                                shaUsable: shaUsable,
                            });
                            return false;
                        }
                    }
                    else {

                        var stat = player.getStat("card");

                        if (stat.sha && stat.sha >= 1) {
                            globalThis.zusDingzhenWriteZhishiDebug({
                                stage: "zhishi_filter_blocked",
                                player: player && player.name,
                                reason: "sha_stat_used",
                                level: level,
                                handCount: handCount,
                                shaUsable: shaUsable,
                                statSha: stat.sha,
                            });
                            return false;
                        }
                    }

                    var sha = {
                        name: "sha",
                        isCard: true,
                    };

                    var currentGame = runtimeGame();
                    var players = getZhishiPlayers(player);
                    if (!currentGame && !players.length) {
                        globalThis.zusDingzhenWriteZhishiDebug({
                            stage: "zhishi_filter_blocked",
                            player: player && player.name,
                            reason: "missing_game",
                            level: level,
                            handCount: handCount,
                            shaUsable: shaUsable,
                        });
                        return false;
                    }
                    var targetChecks = players.map(function (current) {
                        var check = globalThis.zusZhishiShaTargetCheck(sha, player, current);
                        return {
                            target: current && current.name,
                            playerid: current && current.playerid,
                            pass: check.pass,
                            reason: check.reason,
                        };
                    });

                    if (currentGame && typeof currentGame.hasPlayer == "function") {
                        var pass = currentGame.hasPlayer(function (current) {
                            return globalThis.zusZhishiShaTargetEnabled(
                                sha,
                                player,
                                current
                            );
                        });
                        globalThis.zusDingzhenWriteZhishiDebug({
                            stage: "zhishi_filter_result",
                            player: player && player.name,
                            level: level,
                            handCount: handCount,
                            shaUsable: shaUsable,
                            hasPlayerApi: true,
                            pass: pass,
                            targetChecks: targetChecks,
                        });
                        return pass;
                    }

                    var passFallback = players.some(function (current) {
                        return globalThis.zusZhishiShaTargetEnabled(
                            sha,
                            player,
                            current
                        );
                    });
                    globalThis.zusDingzhenWriteZhishiDebug({
                        stage: "zhishi_filter_result",
                        player: player && player.name,
                        level: level,
                        handCount: handCount,
                        shaUsable: shaUsable,
                        hasPlayerApi: false,
                        pass: passFallback,
                        targetChecks: targetChecks,
                    });
                    return passFallback;
                },

                filterCard: true,

                position: "he",

                selectCard: 1,

                check: function (card) {
                    var status = globalThis._status || (typeof _status != "undefined" ? _status : null);
                    var value = globalThis.zusDingzhenSafeValue
                        ? globalThis.zusDingzhenSafeValue(card, status && status.event && status.event.player)
                        : 0;
                    return 6 - value;
                },

                content: function () {
                    "step 0"

                    event.level =
                        player.storage.zus_zhishi_level || 0;
                    globalThis.zusDingzhenWriteZhishiDebug({
                        stage: "zhishi_step0_begin",
                        player: player && player.name,
                        level: event.level,
                    });

                    player.chooseTarget(
                        true,
                        "知识：选择一名角色，视为对其使用一张普通【杀】",
                        function (card, player, target) {

                            var sha = {
                                name: "sha",
                                isCard: true,
                            };

                            return globalThis.zusZhishiShaTargetEnabled(
                                sha,
                                player,
                                target
                            );
                        }
                    ).set("ai", function (target) {

                        return get.effect(
                            target,
                            { name: "sha" },
                            player,
                            player
                        );
                    });

                    "step 1"

                    if (
                        result.bool &&
                        result.targets &&
                        result.targets.length
                    ) {

                        event.target = result.targets[0];

                        player.addTempSkill(
                            "zus_zhishi_monitor",
                            { player: "phaseUseEnd" }
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_check_nature",
                            "normal"
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_damage",
                            false
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_check_target",
                            event.target
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_before_hp",
                            event.target.hp
                        );

                        player.line(event.target);

                        // 鏅€氭潃
                        player.useCard(
                            {
                                name: "sha",
                                isCard: true,
                            },
                            event.target,
                            false
                        );

                        // 鎵嬪姩璁℃暟
                        var stat = player.getStat("card");

                        if (!stat.sha) stat.sha = 0;

                        stat.sha++;
                    }
                    else {

                        event.finish();
                    }

                    "step 2"

                    if (
                        !event.target ||
                        !event.target.isIn()
                    ) {
                        event.finish();
                        return;
                    }

                    if (
                        event.level >= 2 &&
                        (
                            event.level >= 5 ||
                            !player.storage.zus_zhishi_damage
                        )
                    ) {

                        Sync.setStorage(
                            player,
                            "zus_zhishi_check_nature",
                            "thunder"
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_damage",
                            false
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_check_target",
                            event.target
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_before_hp",
                            event.target.hp
                        );

                        player.line(event.target, "thunder");

                        player.useCard(
                            {
                                name: "sha",
                                nature: "thunder",
                                isCard: true,
                            },
                            event.target,
                            false
                        );
                    }
                    else {

                        event.finish();
                    }

                    "step 3"

                    if (
                        !event.target ||
                        !event.target.isIn()
                    ) {
                        event.finish();
                        return;
                    }

                    if (
                        event.level >= 3 &&
                        (
                            event.level >= 5 ||
                            !player.storage.zus_zhishi_damage
                        )
                    ) {

                        Sync.setStorage(
                            player,
                            "zus_zhishi_check_nature",
                            "fire"
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_damage",
                            false
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_check_target",
                            event.target
                        );

                        Sync.setStorage(
                            player,
                            "zus_zhishi_before_hp",
                            event.target.hp
                        );

                        player.line(event.target, "fire");

                        player.useCard(
                            {
                                name: "sha",
                                nature: "fire",
                                isCard: true,
                            },
                            event.target,
                            false
                        );
                    }
                    else {

                        event.finish();
                    }

                    "step 4"

                    if (
                        !event.target ||
                        !event.target.isIn()
                    ) {
                        event.finish();
                        return;
                    }

                    if (
                        event.level >= 4 &&
                        (
                            event.level >= 5 ||
                            !player.storage.zus_zhishi_damage
                        )
                    ) {

                        event.target.turnOver();
                    }

                    "step 5"

                    Sync.setStorage(
                        player,
                        "zus_zhishi_check_nature",
                        null
                    );

                    Sync.setStorage(
                        player,
                        "zus_zhishi_damage",
                        false
                    );

                    Sync.setStorage(
                        player,
                        "zus_zhishi_check_target",
                        null
                    );

                    Sync.setStorage(
                        player,
                        "zus_zhishi_before_hp",
                        null
                    );
                },

                ai: {
                    order: 6,

                    result: {
                        player: 1,
                    },
                },
            },

            // ============================================================
            // 鐩戣浼ゅ
            // ============================================================
            zus_zhishi_monitor: {
                trigger: {
                    global: "damageEnd",
                },

                forced: true,
                silent: true,
                popup: false,
                charlotte: true,

                filter: function (event, player) {

                    if (event.source != player) return false;

                    if (
                        !event.card ||
                        Zus.safeName(event.card, player) != "sha"
                    ) return false;

                    if (
                        !player.storage.zus_zhishi_check_target
                    ) return false;

                    if (
                        event.player !=
                        player.storage.zus_zhishi_check_target
                    ) return false;

                    var nature =
                        player.storage.zus_zhishi_check_nature;

                    if (nature == "normal") {

                        if (event.card.nature) {
                            return false;
                        }
                    }
                    else {

                        if (event.card.nature != nature) {
                            return false;
                        }
                    }

                    var beforeHp =
                        player.storage.zus_zhishi_before_hp;

                    if (typeof beforeHp != "number") {
                        return false;
                    }

                    return event.player.hp < beforeHp;
                },

                content: function () {

                    Sync.setStorage(
                        player,
                        "zus_zhishi_damage",
                        true
                    );
                },
            },

            // ============================================================
            // 瀛︾垎
            // ============================================================
            zus_xuebao: {
                forced: true,

                mark: true,

                group: [
                    "zus_xuebao_init",
                    "zus_xuebao_unlock",
                ],

                intro: {
                    content: function (storage, player) {
                        var level =
                            player.storage.zus_zhishi_level || 0;

                        if (level <= 0) {
                            return "【知识】仍被封印。";
                        }

                        if (level >= 5) {
                            return "命里有时终须有。";
                        }

                        var text =
                            "【知识】已解锁至第" +
                            level +
                            "个分号。<br>";

                        if (level >= 1) {
                            text += "1. 可弃置1张牌，视为对一名角色使用普通【杀】。<br>";
                        }

                        if (level >= 2) {
                            text += "2. 若此【杀】未造成体力伤害，追加雷【杀】。<br>";
                        }

                        if (level >= 3) {
                            text += "3. 若雷【杀】未造成体力伤害，追加火【杀】。<br>";
                        }

                        if (level >= 4) {
                            text += "4. 若火【杀】未造成体力伤害，令目标翻面。";
                        }

                        return text;
                    },
                },
            },

            // 娓告垙寮€濮嬫椂灏佸嵃
            zus_xuebao_init: {
                trigger: {
                    global: "gameStart",
                },

                forced: true,
                silent: true,
                popup: false,

                content: function () {
                    globalThis.zusDingzhenWriteZhishiDebug({
                        stage: "xuebao_init",
                        player: player && player.name,
                        beforeLevel: (player.storage && player.storage.zus_zhishi_level) || null,
                    });

                    Sync.setStorage(
                        player,
                        "zus_zhishi_level",
                        0
                    );

                    player.markSkill("zus_xuebao");
                    globalThis.zusDingzhenWriteZhishiDebug({
                        stage: "xuebao_init_done",
                        player: player && player.name,
                        afterLevel: player.storage && player.storage.zus_zhishi_level,
                    });
                },
            },

            // 每回合解锁
            zus_xuebao_unlock: {
                trigger: {
                    player: "phaseBegin",
                },

                forced: true,

                filter: function (event, player) {

                    return (
                        (player.storage.zus_zhishi_level || 0) < 5
                    );
                },

                content: function () {
                    var beforeLevel = (player.storage && player.storage.zus_zhishi_level) || 0;

                    Sync.setStorage(
                        player,
                        "zus_zhishi_level",
                        Math.min(
                            5,
                            (
                                player.storage.zus_zhishi_level || 0
                            ) + 1
                        )
                    );

                    player.markSkill("zus_xuebao");
                    globalThis.zusDingzhenWriteZhishiDebug({
                        stage: "xuebao_unlock",
                        player: player && player.name,
                        beforeLevel: beforeLevel,
                        afterLevel: player.storage && player.storage.zus_zhishi_level,
                    });
                },
            },
        },

        translate: {
            zus_group_shi: "世",
            zus_group_shi2: "世",
            zus_dingzhen: "丁真",
            zus_dingzhen_ab: "丁真",

            zus_zhishi: "知识",
            zus_zhishi_info:
                "出牌阶段限一次，你可以弃置1张牌，视为对一名角色使用1张普通【杀】；若此【杀】未造成体力伤害，你视为对同一目标使用1张无次数限制的雷【杀】；若此雷【杀】未造成体力伤害，你视为对同一目标使用1张无次数限制的火【杀】；若此火【杀】未造成体力伤害，你令其翻面；当你发动此技能至第五段时，无视“未造成体力伤害”的条件。命里有时终须有。",

            zus_zhishi_monitor: "知识",
            zus_zhishi_monitor_info:
                "记录【知识】造成伤害情况。",

            zus_xuebao: "学爆",
            zus_xuebao_info:
                "锁定技，游戏开始时，你封印【知识】。回合开始时，你解锁【知识】至下一个分号。",

            zus_xuebao_init: "学爆",
            zus_xuebao_init_info:
                "游戏开始时，封印【知识】。",

            zus_xuebao_unlock: "学爆",
            zus_xuebao_unlock_info:
                "回合开始时，解锁【知识】至下一个分号。",
        },

        sort: ["zus_dingzhen"],

        title: {
            zus_dingzhen: "闃呰",
        },
    };
})();

