game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_zhuluan",

        character: {},

        skill: {},

        translate: {
            zus_zhuluan: "朱鸾",
            zus_zhuluan_ab: "朱鸾",

            zus_huangyi: "皇仪",
            zus_huangyi_info: "若你的体力值不为满，你可以将一张红色手牌当【无懈可击】使用或打出。",

            zus_fengzhao: "凤诏",
            zus_fengzhao_info: "出牌阶段开始时，你可以指定一名其他角色。本阶段内，若你与其均有手牌，你可以交换双方全部手牌。随后，若你或其手牌数等于当前体力值则摸一张牌；否则你失去1点体力，本阶段此技能不可再发动，跳过本回合的弃牌阶段。",

            zus_fengzhao_swap: "凤诏",
            zus_fengzhao_swap_info: "你可以与【凤诏】指定的角色交换双方全部手牌。",
        },
    };
});
