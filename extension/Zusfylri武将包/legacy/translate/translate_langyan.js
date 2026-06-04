game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_langyan",

        character: {},

        skill: {},

        translate: {
            zus_langyan: "狼烟",
            zus_langyan_ab: "狼烟",

            zus_shuangmo: "霜漠",
            zus_shuangmo_info: "锁定技，你的判定区视为存在一张【兵粮寸断】。当其生效后，你挑选弃牌堆中任意一张【杀】加入手牌，本回合内，此【杀】无视距离且不可被【闪】响应。",

            zus_guyan: "孤烟",
            zus_guyan_info: "出牌阶段，你使用【杀】指定目标后，直到你的下个回合开始阶段：其使用的【杀】不可被【闪】响应；其回合开始阶段，你增加1点护甲；其回合结束阶段，你选择一项：增加1点体力上限、恢复1点体力、摸两张牌。其选择唯一其他角色为牌或技能的目标时，若你是合法目标，则目标转移至你；否则此牌对原目标无效。",

            zus_guyan_mark: "孤烟目标",
            zus_guyan_mark_info: "当前处于【孤烟】影响的角色。",
        },
    };
});