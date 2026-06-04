game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_zhaoyun",

        character: {},

        skill: {},

        translate: {
            zus_zhaoyun: "赵云",
            zus_zhaoyun_ab: "赵云",

            zus_juexiao: "绝啸",
            zus_juexiao_info: "出牌阶段，你可以将【闪】当【杀】使用。当你使用的【杀】与本回合你使用或打出的上一张牌花色相同，此【杀】无视次数限制且不计入出【杀】次数。若你使用的【杀】未被【闪】抵消，此阶段内你的下一张【杀】伤害+1。",

            zus_gudan: "孤胆",
            zus_gudan_info: "锁定技，当你成为【杀】的目标时，若你的体力值为全场最低（或之一），你摸一张牌。",
        },
    };
});
