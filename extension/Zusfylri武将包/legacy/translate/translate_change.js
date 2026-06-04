game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_change",
        character: {},
        skill: {},
        translate: {
            zus_change: "嫦娥",
            zus_change_ab: "嫦娥",

            zus_yuezhao: "月照",
            zus_yuezhao_info: "回合开始阶段限一次，你可以指定场上一名角色，令其打出1张【闪】并对你造成1点伤害，否则其减少1点体力上限。",

            zus_chanjing: "蟾镜",
            zus_chanjing_info: "每当你受到伤害，你令伤害来源获得1枚“镜”；每当有“镜”的角色受到伤害，你可以移除其1枚“镜”，然后你选择一项：1. 你回复1点体力；2. 你立即对其发动一次【月照】。",

            zus_jing: "镜",
            zus_jing_info: "“镜”标记。拥有者受到伤害时，嫦娥可以移除其1枚“镜”，然后回复1点体力或对其发动一次【月照】。",
        },
    };
});
