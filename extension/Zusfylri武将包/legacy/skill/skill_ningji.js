game.import("character", function (lib, game, ui, get, ai, _status) {
    // ============================================================
    // 柠姬专属UI：显示当前“韵”的已有花色
    // ============================================================
    if (!lib.zusNingjiYunStyle) {
        lib.zusNingjiYunStyle = true;

        var style = document.createElement("style");
        style.innerHTML = `
            .zus-ningji-yun-suits {
                position: absolute;
                z-index: 99;
                left: 28px;
                top: -4px;

                min-width: 62px;
                height: 18px;
                line-height: 18px;
                padding: 0 6px;

                display: flex;
                align-items: center;
                justify-content: center;
                gap: 3px;

                border-radius: 10px;
                background: rgba(0, 0, 0, 0.72);
                color: #fff;
                font-size: 13px;
                font-family: "Times New Roman", serif;
                white-space: nowrap;
                overflow: visible;
                pointer-events: none;
                text-shadow: 0 0 2px #000;
                box-shadow: 0 0 3px rgba(255, 255, 255, 0.35);
                box-sizing: border-box;
            }

            .zus-ningji-yun-suits span {
                display: inline-block;
                min-width: 10px;
                text-align: center;
            }

            .zus-ningji-yun-suits .red {
                color: #ff9a9a;
            }

            .player .marks {
                overflow: visible !important;
            }
        `;
        document.head.appendChild(style);
    }

    game.zusUpdateNingjiYunSuits = function (player) {
        if (!player || !player.node) return;

        var cards = player.getExpansions("zus_yun");
        var html = "";

        if (cards && cards.length) {
            var has = {
                heart: false,
                diamond: false,
                club: false,
                spade: false,
            };

            for (var i = 0; i < cards.length; i++) {
                var suit = get.suit(cards[i]);
                if (has.hasOwnProperty(suit)) {
                    has[suit] = true;
                }
            }

            if (has.heart) html += '<span class="red">♥</span>';
            if (has.diamond) html += '<span class="red">♦</span>';
            if (has.club) html += '<span>♣</span>';
            if (has.spade) html += '<span>♠</span>';
        }

        var parent = player.node.marks || player.node;
        var node = player.node.zusNingjiYunSuits;

        if (!node) {
            node = ui.create.div(".zus-ningji-yun-suits", parent);
            player.node.zusNingjiYunSuits = node;
        }

        if (html) {
            node.innerHTML = html;
            node.style.display = "flex";
        } else {
            node.innerHTML = "";
            node.style.display = "none";
        }
    };

    return {
        name: "zus_skill_ningji",

        character: {},

        skill: {
            // 弦启：使用或打出基本牌/普通锦囊牌后，将实体牌置为“韵”；
            // 随后若存在两张同花色“韵”，自动移除一对并摸1张牌。
            zus_xianqi: {
                trigger: {
                    player: ["useCardAfter", "respondAfter"],
                },
                forced: true,

                filter: function (event, player) {
                    if (!event.card) return false;

                    var type = get.type(event.card);
                    if (type != "basic" && type != "trick") return false;

                    if (!event.cards || !event.cards.length) return false;

                    return true;
                },

                content: function () {
                    "step 0"
                    var cards = trigger.cards.slice(0);

                    if (!cards.length) {
                        event.finish();
                        return;
                    }

                    // 这里只移动牌，不在同一步刷新UI，避免 getExpansions 读到旧状态。
                    player.addToExpansion(cards, player, "giveAuto").gaintag.add("zus_yun");

                    "step 1"
                    // 到下一步再刷新，此时外显花色会读取到新加入的“韵”。
                    player.markSkill("zus_xianqi");
                    if (player.updateMarks) player.updateMarks();
                    game.zusUpdateNingjiYunSuits(player);

                    var yun = player.getExpansions("zus_yun");

                    // 固定顺序自动移除一对同花色“韵”。
                    // 只移除一对，不连锁清空。
                    var suits = ["heart", "diamond", "club", "spade"];
                    event.removeYun = [];

                    for (var i = 0; i < suits.length; i++) {
                        var suit = suits[i];
                        var same = [];

                        for (var j = 0; j < yun.length; j++) {
                            if (get.suit(yun[j]) == suit) {
                                same.push(yun[j]);
                            }
                        }

                        if (same.length >= 2) {
                            event.removeYun = same.slice(0, 2);
                            break;
                        }
                    }

                    if (!event.removeYun.length) {
                        event.finish();
                        return;
                    }

                    // 同理，这里只移除，不在同一步刷新UI。
                    player.loseToDiscardpile(event.removeYun);

                    "step 2"
                    // 移除完成后再刷新。
                    player.markSkill("zus_xianqi");
                    if (player.updateMarks) player.updateMarks();
                    game.zusUpdateNingjiYunSuits(player);

                    player.draw();
                },

                mark: true,
                marktext: "韵",

                intro: {
                    // 不在原版小圆圈里显示花色，避免空间不够。
                    markcount: function () {
                        return "";
                    },

                    content: function (storage, player) {
                        var cards = player.getExpansions("zus_yun");

                        if (cards.length) {
                            var has = {
                                heart: false,
                                diamond: false,
                                club: false,
                                spade: false,
                            };

                            for (var i = 0; i < cards.length; i++) {
                                var suit = get.suit(cards[i]);
                                if (has.hasOwnProperty(suit)) {
                                    has[suit] = true;
                                }
                            }

                            var suits = [];
                            if (has.heart) suits.push("红桃");
                            if (has.diamond) suits.push("方片");
                            if (has.club) suits.push("梅花");
                            if (has.spade) suits.push("黑桃");

                            return "当前共有" + cards.length + "张“韵”：<br>" +
                                "已有花色：" + suits.join("、") + "<br>" +
                                get.translation(cards);
                        }

                        return "当前没有“韵”。";
                    },
                },
            },

            // 余韵：结束阶段，选择移除黑桃红桃或方片梅花的一组“韵”。
            zus_yuyun: {
                trigger: {
                    player: "phaseJieshuBegin",
                },
                direct: true,

                filter: function (event, player) {
                    var yun = player.getExpansions("zus_yun");

                    var hasHeart = false;
                    var hasSpade = false;
                    var hasDiamond = false;
                    var hasClub = false;

                    for (var i = 0; i < yun.length; i++) {
                        var suit = get.suit(yun[i]);

                        if (suit == "heart") hasHeart = true;
                        if (suit == "spade") hasSpade = true;
                        if (suit == "diamond") hasDiamond = true;
                        if (suit == "club") hasClub = true;
                    }

                    return (hasHeart && hasSpade) || (hasDiamond && hasClub);
                },

                content: function () {
                    "step 0"
                    var yun = player.getExpansions("zus_yun");

                    event.heartCard = null;
                    event.spadeCard = null;
                    event.diamondCard = null;
                    event.clubCard = null;

                    for (var i = 0; i < yun.length; i++) {
                        var suit = get.suit(yun[i]);

                        if (suit == "heart" && !event.heartCard) {
                            event.heartCard = yun[i];
                        }

                        if (suit == "spade" && !event.spadeCard) {
                            event.spadeCard = yun[i];
                        }

                        if (suit == "diamond" && !event.diamondCard) {
                            event.diamondCard = yun[i];
                        }

                        if (suit == "club" && !event.clubCard) {
                            event.clubCard = yun[i];
                        }
                    }

                    var controls = [];

                    if (event.spadeCard && event.heartCard) {
                        controls.push("黑桃红桃");
                    }

                    if (event.diamondCard && event.clubCard) {
                        controls.push("方片梅花");
                    }

                    controls.push("cancel2");

                    player.chooseControl(controls)
                        .set("prompt", "是否发动【余韵】？")
                        .set("ai", function () {
                            var controls = _status.event.controls;

                            if (controls.indexOf("黑桃红桃") != -1) {
                                return "黑桃红桃";
                            }

                            if (controls.indexOf("方片梅花") != -1) {
                                return "方片梅花";
                            }

                            return "cancel2";
                        });

                    "step 1"
                    if (result.control == "cancel2") {
                        event.finish();
                        return;
                    }

                    event.mode = result.control;

                    if (event.mode == "黑桃红桃") {
                        event.removed = [event.spadeCard, event.heartCard];
                    } else {
                        event.removed = [event.diamondCard, event.clubCard];
                    }

                    player.logSkill("zus_yuyun");

                    // 这里只移除“韵”，下一步再刷新UI。
                    player.loseToDiscardpile(event.removed);

                    "step 2"
                    player.markSkill("zus_xianqi");
                    if (player.updateMarks) player.updateMarks();
                    game.zusUpdateNingjiYunSuits(player);

                    if (event.mode == "黑桃红桃") {
                        event.goto(3);
                    } else {
                        event.goto(8);
                    }

                    // 黑桃红桃分支：
                    // 先指定两名角色，再让二者互为伤害来源进行结算。
                    // 第一名角色：受到第二名角色造成的1点伤害后回复1点体力。
                    // 第二名角色：回复1点体力后受到第一名角色造成的1点伤害。
                    "step 3"
                    player.chooseTarget(
                        true,
                        "余韵：指定第一名角色，其将受到第二名角色造成的1点伤害后回复1点体力"
                    ).set("ai", function (target) {
                        return get.damageEffect(target, null, _status.event.player);
                    });

                    "step 4"
                    event.target1 = result.targets[0];

                    player.chooseTarget(
                        true,
                        "余韵：指定第二名角色，其将回复1点体力后受到第一名角色造成的1点伤害",
                        function (card, player, target) {
                            return target != _status.event.target1;
                        }
                    ).set("target1", event.target1).set("ai", function (target) {
                        return get.attitude(_status.event.player, target);
                    });

                    "step 5"
                    event.target2 = result.targets[0];

                    player.line(event.target1);
                    player.line(event.target2);

                    if (event.target1 && event.target1.isIn() && event.target2 && event.target2.isIn()) {
                        event.target1.damage(event.target2);
                    }

                    "step 6"
                    if (event.target1 && event.target1.isIn()) {
                        event.target1.recover();
                    }

                    if (event.target2 && event.target2.isIn()) {
                        event.target2.recover();
                    }

                    "step 7"
                    if (event.target2 && event.target2.isIn() && event.target1 && event.target1.isIn()) {
                        event.target2.damage(event.target1);
                    }

                    event.finish();

                    // 方片梅花分支：
                    // 指定一名角色摸2张牌，并将梅花“韵”当【兵粮寸断】置入其判定区；
                    // 再指定一名角色立即获得一个额外出牌阶段，并将方片“韵”当【乐不思蜀】置入其判定区。
                    "step 8"
                    player.chooseTarget(
                        true,
                        "余韵：令一名角色摸2张牌，并将梅花“韵”当【兵粮寸断】置于其判定区"
                    ).set("ai", function (target) {
                        return get.attitude(_status.event.player, target);
                    });

                    "step 9"
                    event.target3 = result.targets[0];

                    player.line(event.target3);
                    event.target3.draw(2);

                    if (event.target3 && event.target3.isIn() && event.clubCard) {
                        var bingliang = game.createCard(
                            "bingliang",
                            get.suit(event.clubCard) || "club",
                            get.number(event.clubCard) || 1
                        );

                        event.target3.addJudge(bingliang);
                    }

                    "step 10"
                    player.chooseTarget(
                        true,
                        "余韵：令一名角色获得一个额外的出牌阶段，并将方片“韵”当【乐不思蜀】置于其判定区"
                    ).set("ai", function (target) {
                        return get.attitude(_status.event.player, target);
                    });

                    "step 11"
                    event.target4 = result.targets[0];

                    player.line(event.target4);

                    if (event.target4 && event.target4.isIn()) {
                        event.target4.phaseUse();
                    }

                    "step 12"
                    if (event.target4 && event.target4.isIn() && event.diamondCard) {
                        var lebu = game.createCard(
                            "lebu",
                            get.suit(event.diamondCard) || "diamond",
                            get.number(event.diamondCard) || 1
                        );

                        event.target4.addJudge(lebu);
                    }
                },
            },
        },

        translate: {},
    };
});