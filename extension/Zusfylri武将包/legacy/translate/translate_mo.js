game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_mo",

        character: {},

        skill: {},

        translate: {
            zus_mo: "茉",
            zus_mo_ab: "茉",

            zus_jiuxiang: "九相",
            zus_jiuxiang_info: "锁定技，游戏开始时，你获得9个“相”。每当你使用的【杀】或单体非延时类锦囊牌无效或被抵消，你移除1个“相”并摸1张牌。",

            zus_xingyan: "星演",
            zus_xingyan_info: "出牌阶段限一次，你可以移除1个“相”，视为使用一张基本牌或除【万箭齐发】与【南蛮入侵】外的非延时类锦囊牌。",

            zus_huanxu: "还虚",
            zus_huanxu_info: "锁定技，在你的回合结束阶段，若你没有“相”，你将自己的武将牌随机替换为武将牌堆中的一张武将牌。",

            zus_xiang: "相",
            zus_xiang_info: "“相”标记。每当你使用的【杀】或单体非延时类锦囊牌无效或被抵消，你移除1个“相”并摸1张牌。",
        },
    };
});
