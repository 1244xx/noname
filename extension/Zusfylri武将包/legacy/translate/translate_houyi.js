game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_houyi",

        character: {},

        skill: {},

        translate: {
            zus_houyi: "后羿",
            zus_houyi_ab: "后羿",

            zus_jiuyao: "九曜",
            zus_jiuyao_info: "出牌阶段开始时，你可以将任意张【杀】置于你的武将牌上，称为“曜”（至多九张），然后摸等量的牌。结束阶段，若“曜”数不小于2/4/6，你依次执行以下效果：摸一张牌；回复1点体力；对自己和攻击范围内的所有角色各造成1点火焰伤害。",

            zus_jiuyao_end: "九曜",
            zus_jiuyao_end_info: "结束阶段，若“曜”数不小于2/4/6，你依次执行对应效果。",

            zus_fenshi: "焚世",
            zus_fenshi_info: "准备阶段，若“曜”的数量等于9，你清空你的判定区。此回合出牌阶段限一次，你可以移去任意枚“曜”，视为使用一张无距离限制且不可被响应的火【杀】，并可指定至多等量目标。",

            zus_fenshi_sha: "焚世",
            zus_fenshi_sha_info: "你可以移去任意枚“曜”，视为使用一张无距离限制且不可被响应的火【杀】，并可指定至多等量目标。",
        },
    };
});
