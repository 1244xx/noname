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
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "png");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    function runtimeGame() {
        var candidates = [];
        if (globalThis.game && typeof globalThis.game == "object") candidates.push(globalThis.game);
        if (game && typeof game == "object") candidates.push(game);
        try {
            if (typeof window != "undefined" && window.game && typeof window.game == "object") candidates.push(window.game);
        } catch (e) {
        }
        if (typeof window != "undefined" && window.top && window.top.game && typeof window.top.game == "object") {
            candidates.push(window.top.game);
        }
        for (var i = 0; i < candidates.length; i++) {
            var candidate = candidates[i];
            if (candidate && Array.isArray(candidate.players) && candidate.players.length) return candidate;
        }
        for (var j = 0; j < candidates.length; j++) {
            if (candidates[j]) return candidates[j];
        }
        return null;
    }

    function getChenlaoPlayers(player) {
        var currentGame = runtimeGame();
        if (currentGame) {
            if (typeof currentGame.filterPlayer == "function") {
                try {
                    var filtered = currentGame.filterPlayer(function (current) {
                        return !!(current && (!current.isIn || current.isIn()));
                    });
                    if (Array.isArray(filtered) && filtered.length) return filtered;
                } catch (e) {
                }
            }
            if (Array.isArray(currentGame.players) && currentGame.players.length) {
                return currentGame.players.filter(function (current) {
                    return !!(current && (!current.isIn || current.isIn()));
                });
            }
        }

        var players = [];
        var seen = {};
        if (player && (!player.isIn || player.isIn())) {
            players.push(player);
            if (player.playerid) seen[player.playerid] = true;
        }
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
            if (!current.isIn || current.isIn()) players.push(current);
            current =
                typeof current.getNext == "function"
                    ? current.getNext()
                    : current.next
                      ? current.next
                      : null;
            guard++;
        }
        return players;
    }

    function countMouOnTable() {
        var currentGame = runtimeGame();
        var players = currentGame && Array.isArray(currentGame.players) ? currentGame.players : [];
        var total = 0;
        for (var i = 0; i < players.length; i++) {
            var current = players[i];
            if (!current || !current.isIn || !current.isIn()) continue;
            if (typeof current.countMark == "function") {
                total += current.countMark("zus_mou");
            }
        }
        return total;
    }

    function simayiLostHp(player) {
        if (!player || typeof player.hp != "number" || typeof player.maxHp != "number") return 0;
        return Math.max(0, player.maxHp - player.hp);
    }

    function safeAttitude(from, to) {
        if (!from || !to) return 0;
        var getter = globalThis.get || (typeof window != "undefined" && window.get) || get;
        try {
            if (getter && typeof getter.attitude == "function") return getter.attitude(from, to);
        } catch (e) {
        }
        return 0;
    }

    function chenlaoTargetAi(target, source) {
        var status = globalThis._status || (typeof window != "undefined" && window._status) || _status;
        var player = source || (status && status.event ? status.event.player : null);
        if (!player || !target || target == player) return 0;
        if (target.isIn && !target.isIn()) return 0;
        if (target.countMark && target.countMark("zus_mou") > 0) return 0;

        var attitude = globalThis.zusSimayiSafeAttitude
            ? globalThis.zusSimayiSafeAttitude(player, target)
            : safeAttitude(player, target);
        var marks = globalThis.zusSimayiCountMouOnTable
            ? globalThis.zusSimayiCountMouOnTable()
            : countMouOnTable();
        var hand = player.countCards ? player.countCards("h") : 0;

        // 友方拿“谋”通常收益最高：其受伤后由其自己选择结算项，回合开始还会触发司马懿观星。
        // 敌方拿“谋”仍有【望空】与观星收益，但低于友方；未知态度也给正收益，避免AI放弃发动。
        var score = 2;
        if (attitude > 0) score += 3 + attitude * 1.2;
        else if (attitude < 0) score += Math.min(2.5, -attitude * 0.35);
        else score += 1;
        if (marks < hand) score += 1.5;
        if (target.hp && target.hp <= 2 && attitude > 0) score += 0.8;
        return score;
    }

    function chenlaoAiCandidates(player) {
        var result = [];
        var players = getChenlaoPlayers(player);
        for (var i = 0; i < players.length; i++) {
            var target = players[i];
            if (!target || target == player) continue;
            if (target.isIn && !target.isIn()) continue;
            if (target.countMark && target.countMark("zus_mou") > 0) continue;
            result.push({
                name: target.name || null,
                playerid: target.playerid || null,
                hp: typeof target.hp == "number" ? target.hp : null,
                maxHp: typeof target.maxHp == "number" ? target.maxHp : null,
                hand: target.countCards ? target.countCards("h") : null,
                attitude: safeAttitude(player, target),
                score: chenlaoTargetAi(target, player),
            });
        }
        result.sort(function (a, b) {
            return b.score - a.score;
        });
        return result;
    }

    function shouldUseChenlao(player) {
        if (!player) return false;
        if (simayiLostHp(player) <= 0) return false;
        var candidates = chenlaoAiCandidates(player);
        return !!(candidates.length && candidates[0].score > 0);
    }

    function hasChenlaoTarget(player) {
        if (!player) return false;
        var filter = function (current) {
            return !!(
                current &&
                current != player &&
                (!current.isIn || current.isIn()) &&
                (!current.countMark || current.countMark("zus_mou") < 1)
            );
        };
        var players = getChenlaoPlayers(player);
        return players.some(filter);
    }

    function appendChenlaoDebug(debug) {
        try {
            var req =
                (typeof window != "undefined" && window.require) ||
                (typeof window != "undefined" && window.top && window.top.require) ||
                (typeof globalThis != "undefined" && globalThis.require);
            if (!req) return;
            var fs = req("fs");
            fs.appendFileSync(
                "D:/app/noname/resources/app/extension/Zusfylri武将包/docs/simayi_chenlao_debug.log",
                JSON.stringify(debug) + "\n",
                "utf8"
            );
        } catch (e) {
        }
    }

    function writeChenlaoDebug(debug) {
        if (!debug) return;
        if (!debug.timestamp) debug.timestamp = Date.now();
        globalThis.zusSimayiChenlaoDebug = debug;
        appendChenlaoDebug(debug);
        try {
            localStorage.setItem("zus_simayi_chenlao_debug", JSON.stringify(debug));
        } catch (e) {
        }
    }

    function chenlaoDebugSnapshot(stage, event, player, extra) {
        var helperLostHp = typeof globalThis.zusSimayiLostHp == "function";
        var helperHasTarget = typeof globalThis.zusSimayiHasChenlaoTarget == "function";
        var lostHp = helperLostHp ? globalThis.zusSimayiLostHp(player) : simayiLostHp(player);
        var targetChecks = [];
        var players = getChenlaoPlayers(player);
        for (var i = 0; i < players.length; i++) {
            var current = players[i];
            targetChecks.push({
                name: current && current.name,
                playerid: current && current.playerid,
                self: current == player,
                inGame: !!(current && (!current.isIn || current.isIn())),
                mou: current && current.countMark ? current.countMark("zus_mou") : null,
                pass: !!(
                    current &&
                    current != player &&
                    (!current.isIn || current.isIn()) &&
                    (!current.countMark || current.countMark("zus_mou") < 1)
                ),
            });
        }
        var payload = {
            stage: stage,
            eventName: event && event.name,
            triggerPlayer: event && event.player && event.player.name,
            player: player && player.name,
            playerid: player && player.playerid,
            hp: player && player.hp,
            maxHp: player && player.maxHp,
            lostHp: lostHp,
            identity: player && player.identity,
            isZhu: !!(player && player.isZhu),
            hasSkill: !!(player && player.hasSkill && player.hasSkill("zus_chenlao", null, null, false)),
            skills: player && player.getSkills ? player.getSkills(null, false, false).slice(0) : [],
            helperLostHp: helperLostHp,
            helperHasTarget: helperHasTarget,
            hasTarget: helperHasTarget ? globalThis.zusSimayiHasChenlaoTarget(player) : hasChenlaoTarget(player),
            gamePlayers: players.length,
            targetChecks: targetChecks,
        };
        if (extra) {
            for (var key in extra) payload[key] = extra[key];
        }
        writeChenlaoDebug(payload);
    }

    if (window.Zus && Zus.bindHelper) {
        Zus.bindHelper("simayi", "runtimeGame", runtimeGame, { globalName: "zusSimayiRuntimeGame", overwrite: true });
        Zus.bindHelper("simayi", "countMouOnTable", countMouOnTable, { globalName: "zusSimayiCountMouOnTable", overwrite: true });
        Zus.bindHelper("simayi", "lostHp", simayiLostHp, { globalName: "zusSimayiLostHp", overwrite: true });
        Zus.bindHelper("simayi", "hasChenlaoTarget", hasChenlaoTarget, { globalName: "zusSimayiHasChenlaoTarget", overwrite: true });
        Zus.bindHelper("simayi", "chenlaoTargetAi", chenlaoTargetAi, { globalName: "zusSimayiChenlaoTargetAi", overwrite: true });
        Zus.bindHelper("simayi", "chenlaoAiCandidates", chenlaoAiCandidates, { globalName: "zusSimayiChenlaoAiCandidates", overwrite: true });
        Zus.bindHelper("simayi", "shouldUseChenlao", shouldUseChenlao, { globalName: "zusSimayiShouldUseChenlao", overwrite: true });
    } else {
        globalThis.zusSimayiRuntimeGame = runtimeGame;
        globalThis.zusSimayiCountMouOnTable = countMouOnTable;
        globalThis.zusSimayiLostHp = simayiLostHp;
        globalThis.zusSimayiHasChenlaoTarget = hasChenlaoTarget;
        globalThis.zusSimayiChenlaoTargetAi = chenlaoTargetAi;
        globalThis.zusSimayiChenlaoAiCandidates = chenlaoAiCandidates;
        globalThis.zusSimayiShouldUseChenlao = shouldUseChenlao;
    }
    globalThis.zusSimayiSafeAttitude = safeAttitude;
    globalThis.zusSimayiWriteChenlaoDebug = writeChenlaoDebug;
    globalThis.zusSimayiChenlaoDebugSnapshot = chenlaoDebugSnapshot;

    async function doOfficialGuanxing(player) {
        var currentGame = runtimeGame();
        var num = Math.min(5, currentGame && typeof currentGame.countPlayer == "function" ? currentGame.countPlayer() : 5);
        const result = await player
            .chooseToGuanxing(num)
            .set("prompt", "观星：点击或拖动将牌移动到牌堆顶或牌堆底")
            .forResult();
        if (!result.bool || !result.moved[0].length) {
            player.addTempSkill("guanxing_fail");
        }
    }

    window.zusfylriModules["simayi"] = {
        key: "simayi",

        character: {
            zus_simayi: char(
                "male",
                "shen",
                "3/4",
                ["zus_chenlao", "zus_wangkong"],
                "zus_simayi",
                "png"
            ),
        },

        skill: {
            zus_mou: {
                marktext: "谋",
                intro: {
                    name: "谋",
                    content: "mark",
                },
            },

            zus_chenlao: {
                trigger: { player: "phaseZhunbeiBegin" },
                group: ["zus_chenlao_damage", "zus_chenlao_probe"],
                init: function (player) {
                    if (globalThis.zusSimayiChenlaoDebugSnapshot) {
                        globalThis.zusSimayiChenlaoDebugSnapshot("chenlao_init", null, player);
                    }
                },
                filter: function (event, player) {
                    var lostHp = globalThis.zusSimayiLostHp ? globalThis.zusSimayiLostHp(player) : 0;
                    var hasTarget = !!(globalThis.zusSimayiHasChenlaoTarget && globalThis.zusSimayiHasChenlaoTarget(player));
                    if (globalThis.zusSimayiChenlaoDebugSnapshot) {
                        globalThis.zusSimayiChenlaoDebugSnapshot("chenlao_filter", event, player, {
                            pass: lostHp > 0 && hasTarget,
                            blockReason: lostHp <= 0 ? "lostHp_zero" : hasTarget ? null : "no_target",
                        });
                    }
                    if (lostHp <= 0) return false;
                    return hasTarget;
                },
                check: function (event, player) {
                    var candidates = globalThis.zusSimayiChenlaoAiCandidates
                        ? globalThis.zusSimayiChenlaoAiCandidates(player)
                        : [];
                    var pass = !!(globalThis.zusSimayiShouldUseChenlao
                        ? globalThis.zusSimayiShouldUseChenlao(player)
                        : candidates.length && candidates[0].score > 0);
                    if (globalThis.zusSimayiChenlaoDebugSnapshot) {
                        globalThis.zusSimayiChenlaoDebugSnapshot("chenlao_check", event, player, {
                            pass: pass,
                            candidates: candidates,
                        });
                    }
                    return pass;
                },
                content: async function (event, trigger, player) {
                    var lostHp = globalThis.zusSimayiLostHp ? globalThis.zusSimayiLostHp(player) : 0;
                    if (lostHp <= 0) return;
                    if (globalThis.zusSimayiChenlaoDebugSnapshot) {
                        globalThis.zusSimayiChenlaoDebugSnapshot("chenlao_content_begin", trigger, player, {
                            lostHp: lostHp,
                            candidates: globalThis.zusSimayiChenlaoAiCandidates
                                ? globalThis.zusSimayiChenlaoAiCandidates(player)
                                : [],
                        });
                    }
                    globalThis.zusSimayiChenlaoAiSource = player;
                    const result = await player
                        .chooseTarget({
                            selectTarget: [1, lostHp],
                            forced: true,
                            prompt: "尘劳：令至多" + lostHp + "名其他角色各获得1枚“谋”标记",
                            filterTarget: function (card, player, target) {
                                return target != player && target.isIn && target.isIn() && (!target.countMark || target.countMark("zus_mou") < 1);
                            },
                            ai: function (target) {
                                return globalThis.zusSimayiChenlaoTargetAi
                                    ? globalThis.zusSimayiChenlaoTargetAi(target, globalThis.zusSimayiChenlaoAiSource)
                                    : 0;
                            },
                        })
                        .forResult();
                    globalThis.zusSimayiChenlaoAiSource = null;
                    if (globalThis.zusSimayiChenlaoDebugSnapshot) {
                        globalThis.zusSimayiChenlaoDebugSnapshot("chenlao_choose_result", trigger, player, {
                            bool: !!(result && result.bool),
                            targets: result && result.targets
                                ? result.targets.map(function (target) {
                                    return {
                                        name: target && target.name,
                                        playerid: target && target.playerid,
                                        score: globalThis.zusSimayiChenlaoTargetAi
                                            ? globalThis.zusSimayiChenlaoTargetAi(target, player)
                                            : null,
                                    };
                                })
                                : [],
                        });
                    }
                    if (!result || !result.bool || !result.targets || !result.targets.length) return;
                    player.logSkill("zus_chenlao", result.targets);
                    for (var i = 0; i < result.targets.length; i++) {
                        var target = result.targets[i];
                        if (!target || !target.isIn || !target.isIn()) continue;
                        target.addMark("zus_mou", 1);
                        target.markSkill("zus_mou");
                    }
                    if (globalThis.zusSimayiChenlaoDebugSnapshot) {
                        globalThis.zusSimayiChenlaoDebugSnapshot("chenlao_marks_added", trigger, player, {
                            targets: result.targets.map(function (target) {
                                return {
                                    name: target && target.name,
                                    playerid: target && target.playerid,
                                    mou: target && target.countMark ? target.countMark("zus_mou") : null,
                                };
                            }),
                        });
                    }
                },
            },

            zus_chenlao_damage: {
                trigger: { global: "damageEnd" },
                forced: true,
                silent: true,
                popup: false,
                filter: function (event, player) {
                    return event.player && event.player.isIn && event.player.isIn() && event.player.countMark && event.player.countMark("zus_mou") > 0;
                },
                content: async function (event, trigger, player) {
                    var target = trigger.player;
                    target.removeMark("zus_mou", 1);
                    if (target.countMark("zus_mou") <= 0) {
                        target.unmarkSkill("zus_mou");
                    }

                    if (!player.isIn || !player.isIn() || !target.isIn || !target.isIn()) return;

                    var playerHand = player.countCards("h");
                    var targetHand = target.countCards("h");
                    if (playerHand == targetHand) return;

                    var lessSide = playerHand < targetHand ? player : target;
                    var moreSide = playerHand > targetHand ? player : target;
                    var diff = Math.abs(playerHand - targetHand);
                    if (diff <= 0) return;

                    var options = ["手牌少的一方将手牌数补至与对方相同", "手牌多的一方将手牌弃至与对方相同"];
                    var result = await target
                        .chooseControl(options)
                        .set("prompt", "麈劣：选择一项")
                        .set("ai", function () {
                            var lessAttitude = globalThis.zusSimayiSafeAttitude
                                ? globalThis.zusSimayiSafeAttitude(target, lessSide)
                                : 0;
                            var moreAttitude = globalThis.zusSimayiSafeAttitude
                                ? globalThis.zusSimayiSafeAttitude(target, moreSide)
                                : 0;
                            if (lessAttitude >= moreAttitude) return options[0];
                            return options[1];
                        })
                        .forResult();

                    if (result.control == options[0]) {
                        lessSide.draw(diff);
                    } else if (result.control == options[1]) {
                        await moreSide.chooseToDiscard("h", diff, true);
                    }
                },
            },

            zus_chenlao_probe: {
                trigger: { player: "phaseZhunbeiBegin" },
                forced: true,
                silent: true,
                popup: false,
                priority: 999,
                filter: function () {
                    return true;
                },
                content: function () {
                    if (globalThis.zusSimayiChenlaoDebugSnapshot) {
                        globalThis.zusSimayiChenlaoDebugSnapshot("chenlao_probe", trigger, player);
                    }
                },
            },

            zus_wangkong: {
                locked: true,
                group: ["zus_wangkong_sha", "zus_wangkong_begin"],
            },

            zus_wangkong_sha: {
                trigger: { target: "useCardToTargeted" },
                forced: true,
                silent: true,
                popup: false,
                filter: function (event, player) {
                    if (!event || !event.card || !player || !player.countCards) return false;
                    var cardName = null;
                    try {
                        cardName = window.Zus && Zus.safeName ? Zus.safeName(event.card, player) : get.name(event.card, player);
                    } catch (e) {
                        cardName = event.card && event.card.name;
                    }
                    if (cardName != "sha") return false;
                    var countMou = globalThis.zusSimayiCountMouOnTable;
                    return player.countCards("h") <= (typeof countMou == "function" ? countMou() : 0);
                },
                content: function () {
                    var parent = trigger && trigger.getParent ? trigger.getParent() : null;
                    if (parent && parent.excluded && parent.excluded.add) {
                        parent.excluded.add(player);
                    }
                },
            },

            zus_wangkong_begin: {
                trigger: { global: "phaseBegin" },
                forced: true,
                silent: true,
                popup: false,
                filter: function (event, player) {
                    return event.player && event.player != player && event.player.isIn && event.player.isIn() && event.player.countMark && event.player.countMark("zus_mou") > 0;
                },
                content: async function (event, trigger, player) {
                    trigger.player.removeMark("zus_mou", 1);
                    if (trigger.player.countMark("zus_mou") <= 0) {
                        trigger.player.unmarkSkill("zus_mou");
                    }
                    await doOfficialGuanxing(player);
                },
                ai: {
                    guanxing: true,
                },
            },
        },

        translate: {
            zus_simayi: "司马懿",
            zus_chenlao: "尘劳",
            zus_chenlao_info: "准备阶段，若你的体力值不为满，你可以令至多X名其他角色各获得1枚“谋”标记（每名角色至多拥有1枚）。“有谋”的角色受到伤害后，其移去1枚“谋”，然后其选择一项：手牌少的一方将手牌数补至与对方相同；或手牌多的一方将手牌弃至与对方相同。（X为你已损失的体力值）",
            zus_wangkong: "望空",
            zus_wangkong_info: "锁定技：若你的手牌数不大于场上“谋”的总数，【杀】对你无效。其他角色的开始阶段，若其有“谋”，你移去其1枚“谋”，然后进行一次“观星”。",
        },

        title: {
            zus_simayi: "与世争",
        },

        sort: ["zus_simayi"],
    };
})();
