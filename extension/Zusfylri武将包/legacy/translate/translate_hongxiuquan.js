game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_hongxiuquan",

        character: {},

        skill: {},

        translate: {
            zus_hongxiuquan: "洪秀全",
            zus_hongxiuquan_ab: "洪秀全",

            zus_zhuolue: "灼掠",
            zus_zhuolue_info: "其他角色的出牌阶段开始时限一次，你可以失去1点体力，令其交给你一半数量的手牌（向下取整），并将其武将牌横置。",

            zus_juntian: "均田",
            zus_juntian_info: "锁定技，你的手牌上限始终等于体力上限。当你的手牌数不小于手牌上限时，你须按任意顺序分给每名其他角色各1张手牌并弃置剩余手牌（或直到将手牌分完），然后选择一项：1. 对攻击范围内的一名角色造成1点火焰伤害；2. 减少1点体力上限并将体力回复至上限。",
        },
    };
});
