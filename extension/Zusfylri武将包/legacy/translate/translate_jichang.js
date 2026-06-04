game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_jichang",

        character: {},

        skill: {},

        translate: {
            zus_jichang: "姬昌",
            zus_jichang_ab: "姬昌",

            zus_yishu: "易数",
            zus_yishu_info: "锁定技，在你的回合开始时，你交换当前体力值与已损失体力值，每以此法变化两点当前体力值，你摸一张牌。",

            zus_yishu_clear: "易数",
            zus_yishu_clear_info: "回合结束后清除【易数】记录。",

            zus_liuzhuan: "流转",
            zus_liuzhuan_info: "在你的出牌阶段，每当你使用一张牌：若你未因本回合的【易数】增加体力，你令攻击范围内一名其他角色弃置一张牌；若你未因本回合的【易数】减少体力，你令攻击范围内一名其他角色摸一张牌。",
        },
    };
});
