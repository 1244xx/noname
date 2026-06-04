game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_shanshang",

        character: {},

        skill: {},

        translate: {
            zus_shanshang: "山上彻也",
            zus_shanshang_ab: "山上",

            zus_yingyan: "萤焰",
            zus_yingyan_info: "在你的回合外，你每失去1张你区域内的牌，你可以翻开牌堆顶5张牌，将其中的装备牌收入手牌，然后将剩余牌置入弃牌堆。",

            zus_yingyan_gain: "萤焰",
            zus_yingyan_gain_info: "当其他角色于你的回合外获得你区域内的牌后，你可以发动【萤焰】。",

            zus_yingyan_do: "萤焰",
            zus_yingyan_do_info: "翻开牌堆顶5张牌，获得其中的装备牌，其余置入弃牌堆。",

            zus_juefu: "绝赴",
            zus_juefu_info: "在你的出牌阶段，当你的手牌中只含有装备牌，你可以弃置你区域中的所有牌，指定1名距离为1的角色造成等同于你弃置牌数的伤害。",
        },
    };
});