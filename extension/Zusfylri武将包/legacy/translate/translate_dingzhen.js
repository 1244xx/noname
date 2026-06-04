game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_dingzhen",

        character: {},

        skill: {},

        translate: {
            zus_dingzhen: "丁真",
            zus_dingzhen_ab: "丁真",

            zus_zhishi: "知识",
            zus_zhishi_info: "出牌阶段限一次，你可以弃置1张牌，视为对一名角色使用1张普通【杀】；若此【杀】未造成伤害，你视为对同一目标使用1张无次数限制的雷【杀】；若此雷【杀】未造成伤害，你视为对同一目标使用1张无次数限制的火【杀】；若此火【杀】未造成伤害，你令其翻面；你发动此技能无视“未造成伤害”的条件。命里有时终须有。",

            zus_zhishi_monitor: "知识",
            zus_zhishi_monitor_info: "记录【知识】造成伤害情况。",

            zus_xuebao: "学爆",
            zus_xuebao_info: "锁定技，游戏开始时，你封印【知识】。回合开始时，你解锁【知识】至下一个分号。",

            zus_xuebao_init: "学爆",
            zus_xuebao_init_info: "游戏开始时，封印【知识】。",

            zus_xuebao_unlock: "学爆",
            zus_xuebao_unlock_info: "回合开始时，解锁【知识】至下一个分号。",
        },
    };
});