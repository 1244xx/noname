game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_makesi_kongfuzi",

        character: {},

        skill: {},

        translate: {
            zus_makesi_kongfuzi: "马克思&孔夫子",
            zus_makesi_kongfuzi_ab: "马孔",

            zus_zhouli: "周礼",
            zus_zhouli_info: "出牌阶段限一次，你令所有手牌数小于你的角色对你使用一张无距离限制的【杀】，否则交给你X张牌，不足则全交（X为你与其手牌数差值）。",

            zus_fengbao: "风暴",
            zus_fengbao_info: "锁定技，在你的出牌阶段结束时，你令场上手牌最多的一名角色受到2点伤害并弃置所有手牌，视为其使用【五谷丰登】与【桃园结义】各一张。",
        },
    };
});
