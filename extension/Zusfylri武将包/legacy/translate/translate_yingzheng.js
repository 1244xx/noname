game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_yingzheng",

        character: {},

        skill: {},

        translate: {
            zus_yingzheng: "嬴政",
            zus_yingzheng_ab: "嬴政",

            zus_xiaodi: "销镝",
            zus_xiaodi_info: "锁定技，游戏开始前，你将牌堆中一张武器牌和一张防具牌移出游戏。",

            zus_yimie: "夷灭",
            zus_yimie_info: "出牌阶段限一次，你可以展示手牌中所有【杀】，视为使用一张【杀】；若目标角色的手牌数不小于X，则其不能使用【闪】响应；若目标角色的手牌数不大于X，则此【杀】伤害为X（X为你以此法展示的【杀】数）。",

            zus_huangdao: "皇道",
            zus_huangdao_info: "主公技，出牌阶段限一次，你可以将一张红色手牌当【五谷丰登】使用。",
        },
    };
});