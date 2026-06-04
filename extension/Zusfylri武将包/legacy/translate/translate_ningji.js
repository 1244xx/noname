game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_ningji",

        character: {},

        skill: {},

        translate: {
            zus_ningji: "柠姬",
            zus_ningji_ab: "柠姬",

            zus_xianqi: "弦启",
            zus_xianqi_info: "锁定技，你使用或打出的基本牌与普通锦囊牌结算完毕后，移至你的武将牌上，称为“韵”；随后你移除武将牌上两张花色相同的“韵”并在移除后摸1张牌。",

            zus_yuyun: "余韵",
            zus_yuyun_info: "你的回合结束阶段，你可以移除：♥♠花色的一组“韵”，然后指定一名角色受到后者的1点伤害后回复1点体力，再指定另外一名角色回复1点体力后受到前者的1点伤害；♦♣花色的一组“韵”，然后指定一名角色摸2张牌，并将♣花色的“韵”当作【兵粮寸断】置于其判定区；再指定一名角色，立即获得一个额外的出牌阶段，并将♦花色的“韵”当作【乐不思蜀】置于其判定区。",
        },
    };
});
