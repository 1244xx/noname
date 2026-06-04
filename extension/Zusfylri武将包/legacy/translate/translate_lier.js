game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_lier",

        character: {},

        skill: {},

        translate: {
            zus_lier: "李耳",
            zus_lier_ab: "李耳",

            zus_sanqing: "三清",
            zus_sanqing_info: "出牌阶段限一次，你使用一张基本牌或锦囊牌结算后，可以记录此牌牌名。若如此做，你的下两张牌均可视作此牌使用。",

            zus_sanqing_viewas: "三清",
            zus_sanqing_viewas_info: "你可以将一张手牌当作“三清”记录的牌使用。",

            zus_sanqing_viewas_count: "三清",
            zus_sanqing_viewas_count_info: "每通过“三清”使用一张牌，剩余次数-1。",

            zus_sunbu: "损补",
            zus_sunbu_info: "锁定技，若你没有手牌，摸牌阶段的摸牌数+2且其他角色计算与你的距离+1；当你失去最后的手牌时，你回复1点体力。",
        },
    };
});
