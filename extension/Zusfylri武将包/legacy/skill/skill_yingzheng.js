game.import("character", function (lib, game, ui, get, ai, _status) {
    // ============================================================
    // 嬴政【夷灭】距离检测函数
    // ============================================================
    if (!game.zusYingzhengShaTargetEnabled) {
        game.zusYingzhengShaTargetEnabled = function (card, player, target) {
            if (!player || !target || target == player) return false;

            if (!lib.filter.targetEnabled(card, player, target)) {
                return false;
            }

            if (lib.filter.targetInRange && !lib.filter.targetInRange(card, player, target)) {
                return false;
            }

            return true;
        };
    }

    // ============================================================
    // 工具：判断一张牌是否为【销镝】禁用牌
    // ============================================================
    if (!game.zusYingzhengIsBannedEquip) {
        game.zusYingzhengIsBannedEquip = function (card, banned) {
            if (!card || !banned || !banned.length) return false;

            var name = get.name(card);
            var subtype = get.subtype(card);

            for (var i = 0; i < banned.length; i++) {
                if (banned[i].name == name && banned[i].subtype == subtype) {
                    return true;
                }
            }

            return false;
        };
    }

    // ============================================================
    // 工具：从牌堆中随机取一张非禁用牌作为替换
    // ============================================================
    if (!game.zusYingzhengGetReplaceCard) {
        game.zusYingzhengGetReplaceCard = function (banned) {
            if (!ui.cardPile || !ui.cardPile.childNodes || !ui.cardPile.childNodes.length) {
                return null;
            }

            var list = [];

            for (var i = 0; i < ui.cardPile.childNodes.length; i++) {
                var card = ui.cardPile.childNodes[i];
                if (!card) continue;

                if (game.zusYingzhengIsBannedEquip(card, banned)) continue;

                list.push(card);
            }

            if (!list.length) return null;

            return typeof RNG !== "undefined" ? RNG.randomGet(list) : (game.zusSafeRandomGet ? game.zusSafeRandomGet(list) : (list.randomGet ? list.randomGet() : list[game.random(list.length)]));
        };
    }

    return {
        name: "zus_skill_yingzheng",

        character: {},

        skill: {
            // 销镝：锁定技，游戏开始时，你选择一张武器牌和一张防具牌；
            // 将牌堆中同名牌移出游戏；若这些牌已在角色手牌或扩展区内，则将其移出游戏并随机替换。
            zus_xiaodi: {
                trigger: {
                    global: ["gameStart", "phaseBefore"],
                    player: "enterGame",
                },
                forced: true,
                locked: true,
                unique: true,
                priority: 99999,

                filter: function (event, player) {
                    if (player.storage.zus_xiaodi_done) return false;

                    var hasWeapon = false;
                    var hasArmor = false;

                    if (ui.cardPile && ui.cardPile.childNodes) {
                        for (var i = 0; i < ui.cardPile.childNodes.length; i++) {
                            var card = ui.cardPile.childNodes[i];
                            if (!card) continue;
                            if (get.type(card) != "equip") continue;

                            var subtype = get.subtype(card);
                            if (subtype == "equip1") hasWeapon = true;
                            if (subtype == "equip2") hasArmor = true;
                        }
                    }

                    var players = game.players ? game.players.slice(0) : [];
                    if (game.dead && game.dead.length) players = players.concat(game.dead);

                    for (var j = 0; j < players.length; j++) {
                        var current = players[j];
                        if (!current) continue;

                        var cards = current.getCards ? current.getCards("h") : [];
                        if (current.getExpansions) {
                            cards = cards.concat(current.getExpansions());
                        }

                        for (var k = 0; k < cards.length; k++) {
                            var c = cards[k];
                            if (!c) continue;
                            if (get.type(c) != "equip") continue;

                            var sub = get.subtype(c);
                            if (sub == "equip1") hasWeapon = true;
                            if (sub == "equip2") hasArmor = true;
                        }
                    }

                    return hasWeapon || hasArmor;
                },

                content: function () {
                    "step 0"
                    if (typeof Sync !== "undefined") Sync.setStorage(player, "zus_xiaodi_done", true);
                    else if (game.zusSetStorage) game.zusSetStorage(player, "zus_xiaodi_done", true);
                    else Sync.setStorage(player, "zus_xiaodi_done", true);

                    event.weaponPool = [];
                    event.armorPool = [];

                    // 统计牌堆中的武器/防具
                    if (ui.cardPile && ui.cardPile.childNodes) {
                        for (var i = 0; i < ui.cardPile.childNodes.length; i++) {
                            var card = ui.cardPile.childNodes[i];
                            if (!card) continue;
                            if (get.type(card) != "equip") continue;

                            var subtype = get.subtype(card);
                            if (subtype == "equip1") {
                                event.weaponPool.push(card);
                            } else if (subtype == "equip2") {
                                event.armorPool.push(card);
                            }
                        }
                    }

                    // 统计所有角色手牌与扩展区中的武器/防具
                    var players = game.players ? game.players.slice(0) : [];
                    if (game.dead && game.dead.length) players = players.concat(game.dead);

                    for (var j = 0; j < players.length; j++) {
                        var current = players[j];
                        if (!current) continue;

                        var handCards = current.getCards ? current.getCards("h") : [];

                        for (var h = 0; h < handCards.length; h++) {
                            var hc = handCards[h];
                            if (!hc) continue;
                            if (get.type(hc) != "equip") continue;

                            var hsub = get.subtype(hc);
                            if (hsub == "equip1") {
                                event.weaponPool.push(hc);
                            } else if (hsub == "equip2") {
                                event.armorPool.push(hc);
                            }
                        }

                        if (current.getExpansions) {
                            var expansionCards = current.getExpansions();

                            for (var e = 0; e < expansionCards.length; e++) {
                                var ec = expansionCards[e];
                                if (!ec) continue;
                                if (get.type(ec) != "equip") continue;

                                var esub = get.subtype(ec);
                                if (esub == "equip1") {
                                    event.weaponPool.push(ec);
                                } else if (esub == "equip2") {
                                    event.armorPool.push(ec);
                                }
                            }
                        }
                    }

                    // 去重：同名同副类别只保留一张样始牌，避免按钮里一堆重复牌
                    var weaponMap = {};
                    var armorMap = {};
                    event.weaponButtons = [];
                    event.armorButtons = [];

                    for (var a = 0; a < event.weaponPool.length; a++) {
                        var w = event.weaponPool[a];
                        var wkey = get.name(w) + "_" + get.subtype(w);
                        if (!weaponMap[wkey]) {
                            weaponMap[wkey] = true;
                            event.weaponButtons.push(w);
                        }
                    }

                    for (var b = 0; b < event.armorPool.length; b++) {
                        var ar = event.armorPool[b];
                        var akey = get.name(ar) + "_" + get.subtype(ar);
                        if (!armorMap[akey]) {
                            armorMap[akey] = true;
                            event.armorButtons.push(ar);
                        }
                    }

                    event.banned = [];

                    if (event.weaponButtons.length) {
                        player.chooseButton(
                            true,
                            ["销镝：选择一种武器牌移出游戏", event.weaponButtons]
                        ).set("ai", function (button) {
                            return get.value(button.link);
                        });
                    } else {
                        event.goto(2);
                    }

                    "step 1"
                    if (result.bool && result.links && result.links.length) {
                        var weapon = result.links[0];
                        event.banned.push({
                            name: get.name(weapon),
                            subtype: get.subtype(weapon),
                            sample: weapon,
                        });
                    }

                    "step 2"
                    if (event.armorButtons.length) {
                        player.chooseButton(
                            true,
                            ["销镝：选择一种防具牌移出游戏", event.armorButtons]
                        ).set("ai", function (button) {
                            return get.value(button.link);
                        });
                    } else {
                        event.goto(4);
                    }

                    "step 3"
                    if (result.bool && result.links && result.links.length) {
                        var armor = result.links[0];
                        event.banned.push({
                            name: get.name(armor),
                            subtype: get.subtype(armor),
                            sample: armor,
                        });
                    }

                    "step 4"
                    if (!event.banned.length) {
                        event.finish();
                        return;
                    }

                    event.removed = [];
                    event.handReplace = [];
                    event.expansionReplace = [];

                    // 一、检查牌堆中的禁用牌
                    if (ui.cardPile && ui.cardPile.childNodes) {
                        var pile = [];
                        for (var i = 0; i < ui.cardPile.childNodes.length; i++) {
                            pile.push(ui.cardPile.childNodes[i]);
                        }

                        for (var j = 0; j < pile.length; j++) {
                            var card = pile[j];
                            if (game.zusYingzhengIsBannedEquip(card, event.banned)) {
                                event.removed.push(card);
                            }
                        }
                    }

                    // 二、检查所有玩家手牌与扩展区
                    var players2 = game.players ? game.players.slice(0) : [];
                    if (game.dead && game.dead.length) players2 = players2.concat(game.dead);

                    for (var p = 0; p < players2.length; p++) {
                        var current2 = players2[p];
                        if (!current2) continue;

                        var handCards2 = current2.getCards ? current2.getCards("h") : [];
                        for (var hh = 0; hh < handCards2.length; hh++) {
                            var hcard = handCards2[hh];
                            if (game.zusYingzhengIsBannedEquip(hcard, event.banned)) {
                                event.handReplace.push({
                                    player: current2,
                                    card: hcard,
                                });
                            }
                        }

                        if (current2.getExpansions) {
                            var expansionCards2 = current2.getExpansions();

                            for (var ee = 0; ee < expansionCards2.length; ee++) {
                                var ecard = expansionCards2[ee];
                                if (game.zusYingzhengIsBannedEquip(ecard, event.banned)) {
                                    var tags = [];
                                    if (ecard.gaintag && ecard.gaintag.slice) {
                                        tags = ecard.gaintag.slice(0);
                                    }

                                    event.expansionReplace.push({
                                        player: current2,
                                        card: ecard,
                                        tags: tags,
                                    });
                                }
                            }
                        }
                    }

                    "step 5"
                    // 先把牌堆里的禁用牌移出游戏
                    if (event.removed.length) {
                        for (var r = 0; r < event.removed.length; r++) {
                            var rc = event.removed[r];
                            if (rc.fix) rc.fix();

                            if (ui.special) {
                                ui.special.appendChild(rc);
                            } else if (rc.remove) {
                                rc.remove();
                            } else if (rc.parentNode) {
                                rc.parentNode.removeChild(rc);
                            }
                        }
                    }

                    // 处理玩家手牌中的禁用牌：移出后补一张随机非禁用牌
                    for (var x = 0; x < event.handReplace.length; x++) {
                        var task = event.handReplace[x];
                        var owner = task.player;
                        var oldCard = task.card;
                        var newCard = game.zusYingzhengGetReplaceCard(event.banned);

                        if (owner && oldCard) {
                            if (owner.lose) {
                                owner.lose(oldCard, ui.special);
                            } else if (ui.special) {
                                ui.special.appendChild(oldCard);
                            } else if (oldCard.remove) {
                                oldCard.remove();
                            }

                            event.removed.push(oldCard);
                        }

                        if (owner && newCard) {
                            owner.gain(newCard, "gain2");
                        }
                    }

                    // 处理扩展区/标记区中的禁用牌：移出后补一张随机非禁用牌，并尽量保留原 gaintag
                    for (var y = 0; y < event.expansionReplace.length; y++) {
                        var task2 = event.expansionReplace[y];
                        var owner2 = task2.player;
                        var oldCard2 = task2.card;
                        var newCard2 = game.zusYingzhengGetReplaceCard(event.banned);

                        if (oldCard2) {
                            if (oldCard2.fix) oldCard2.fix();

                            if (ui.special) {
                                ui.special.appendChild(oldCard2);
                            } else if (oldCard2.remove) {
                                oldCard2.remove();
                            } else if (oldCard2.parentNode) {
                                oldCard2.parentNode.removeChild(oldCard2);
                            }

                            event.removed.push(oldCard2);
                        }

                        if (owner2 && newCard2 && owner2.addToExpansion) {
                            var next = owner2.addToExpansion(newCard2, owner2, "giveAuto");

                            if (next && next.gaintag && task2.tags && task2.tags.length) {
                                if (next.gaintag.addArray) {
                                    next.gaintag.addArray(task2.tags);
                                } else {
                                    for (var t = 0; t < task2.tags.length; t++) {
                                        next.gaintag.add(task2.tags[t]);
                                    }
                                }
                            }
                        }
                    }

                    "step 6"
                    var names = [];

                    for (var n = 0; n < event.banned.length; n++) {
                        if (event.banned[n].sample) {
                            names.push(get.translation(event.banned[n].sample));
                        } else {
                            names.push(get.translation(event.banned[n].name));
                        }
                    }

                    player.popup("销镝");
                    game.log(player, "发动了", "【销镝】");
                    game.log("【销镝】禁用牌为：", names.join("、"));

                    if (event.removed.length) {
                        game.log("【销镝】移出的牌为：", event.removed);
                    }
                },
            },

            // 夷灭：出牌阶段限一次，你可以展示手牌中所有【杀】，视为使用1张【杀】；
// 若目标角色的手牌数不小于X，则其不能使用【闪】响应；
// 若目标角色的手牌数不大于X，则此【杀】伤害为X。
// X为你以此法展示的【杀】数。
zus_yimie: {
    enable: "phaseUse",
    usable: 1,

    filter: function (event, player) {
        var shas = player.getCards("h", function (card) {
            return get.name(card, player) == "sha";
        });

        if (!shas.length) return false;

        var card = {
            name: "sha",
            isCard: true,
        };

        return game.hasPlayer(function (current) {
            return game.zusYingzhengShaTargetEnabled(card, player, current);
        });
    },

    content: function () {
        "step 0"
        event.shas = player.getCards("h", function (card) {
            return get.name(card, player) == "sha";
        });

        event.num = event.shas.length;

        if (!event.num) {
            event.finish();
            return;
        }

        player.showCards(event.shas, get.translation(player) + "发动【夷灭】展示的【杀】");

        "step 1"
        player.chooseTarget(
            true,
            "夷灭：视为使用一张有距离限制的【杀】",
            function (card, player, target) {
                var usecard = {
                    name: "sha",
                    isCard: true,
                };

                return game.zusYingzhengShaTargetEnabled(usecard, player, target);
            }
        ).set("ai", function (target) {
            var player = _status.event.player;
            var x = _status.event.num || 1;
            var eff = get.effect(target, { name: "sha" }, player, player);

            if (target.countCards("h") <= x) {
                eff *= Math.max(1, x);
            }

            return eff;
        }).set("num", event.num);

        "step 2"
        if (!result.bool || !result.targets || !result.targets.length) {
            event.finish();
            return;
        }

        event.target = result.targets[0];

        var card = {
            name: "sha",
            isCard: true,
        };

        if (player.canUse && !player.canUse(card, event.target, false)) {
            event.finish();
            return;
        }

        // 关键修复：
        // 不再把X存在虚拟牌storage里，而是存在玩家身上。
        // 这样 useCardToTargeted / damageBegin1 都能稳定读取。
        Sync.setStorage(player, "zus_yimie_effect", {
            x: event.num,
            target: event.target,
        });

        player.addTempSkill("zus_yimie_effect");

        player.useCard(card, event.target);
    },

    ai: {
        order: 7,
        result: {
            player: function (player) {
                var shas = player.getCards("h", function (card) {
                    return get.name(card, player) == "sha";
                });

                if (!shas.length) return 0;

                var card = {
                    name: "sha",
                    isCard: true,
                };

                return game.hasPlayer(function (current) {
                    return game.zusYingzhengShaTargetEnabled(card, player, current) &&
                        get.effect(current, { name: "sha" }, player, player) > 0;
                }) ? 1 : 0;
            },
        },
    },

    subSkill: {
        effect: {
            charlotte: true,
            forced: true,
            popup: false,

            group: [
                "zus_yimie_effect_directHit",
                "zus_yimie_effect_damage",
                "zus_yimie_effect_clear",
            ],

            sub: true,
        },

        effect_directHit: {
            trigger: {
                global: "useCardToTargeted",
            },
            forced: true,
            charlotte: true,
            popup: false,

            filter: function (event, player) {
                if (!player.storage.zus_yimie_effect) return false;
                if (!event.card || event.card.name != "sha") return false;
                if (event.player != player) return false;

                var info = player.storage.zus_yimie_effect;
                if (!info.target || event.target != info.target) return false;

                var x = info.x || 0;
                return event.target.countCards("h") >= x;
            },

            content: function () {
                var info = player.storage.zus_yimie_effect;
                var target = trigger.target;
                var x = info.x || 0;

                var evt = trigger.getParent();

                if (!evt.directHit) {
                    evt.directHit = [];
                }

                evt.directHit.add(target);

                game.log(target, "手牌数不小于", x, "，不能使用【闪】响应此【杀】");
            },
        },

        effect_damage: {
            trigger: {
                source: "damageBegin1",
            },
            forced: true,
            charlotte: true,
            popup: false,

            filter: function (event, player) {
                if (!player.storage.zus_yimie_effect) return false;
                if (!event.card || event.card.name != "sha") return false;
                if (!event.player || !event.player.isIn()) return false;

                var info = player.storage.zus_yimie_effect;
                if (!info.target || event.player != info.target) return false;

                var x = info.x || 0;
                return event.player.countCards("h") <= x;
            },

            content: function () {
                var info = player.storage.zus_yimie_effect;
                var x = info.x || 0;

                trigger.num = x;

                game.log(trigger.player, "手牌数不大于", x, "，此【杀】伤害改为", x);
            },
        },

        effect_clear: {
            trigger: {
                player: "useCardAfter",
            },
            forced: true,
            charlotte: true,
            popup: false,

            filter: function (event, player) {
                if (!player.storage.zus_yimie_effect) return false;
                if (!event.card || event.card.name != "sha") return false;
                return true;
            },

            content: function () {
                Sync.deleteStorage(player, "zus_yimie_effect");
                player.removeSkill("zus_yimie_effect");
            },
        },
    },
},

            // 皇道：主公技，出牌阶段限1次，你可以将一张红色手牌当【五谷丰登】使用。
            zus_huangdao: {
                zhuSkill: true,
                enable: "phaseUse",
                usable: 1,

                filter: function (event, player) {
                    if (!player.hasZhuSkill || !player.hasZhuSkill("zus_huangdao")) return false;

                    return player.countCards("h", function (card) {
                        return get.color(card, player) == "red";
                    }) > 0;
                },

                filterCard: function (card, player) {
                    return get.color(card, player) == "red";
                },

                position: "h",
                selectCard: 1,

                viewAs: {
                    name: "wugu",
                },

                prompt: "将一张红色手牌当【五谷丰登】使用",

                check: function (card) {
                    return 6 - get.value(card);
                },

                ai: {
                    order: 3,
                    result: {
                        player: 1,
                    },
                },
            },
        },

        translate: {
            zus_xiaodi: "销镝",
            zus_xiaodi_info: "锁定技，游戏开始时，你选择一张武器牌和一张防具牌，将牌堆中同名牌移出游戏；若这些牌已在角色手牌或扩展区内，则将其移出游戏并随机替换为牌堆中的其他牌。",

            zus_yimie: "夷灭",
            zus_yimie_info: "出牌阶段限一次，你可以展示手牌中所有【杀】，视为使用一张【杀】；若目标角色的手牌数不小于X，则其不能使用【闪】响应；若目标角色的手牌数不大于X，则此【杀】伤害为X（X为你以此法展示的【杀】数）。",

            zus_huangdao: "皇道",
            zus_huangdao_info: "主公技，出牌阶段限一次，你可以将一张红色手牌当【五谷丰登】使用。",
        },
    };
});