game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_wujing",

        character: {},

        skill: {},

        translate: {
            zus_wujing: "吴京",
            zus_wujing_ab: "吴京",

            zus_yinlei: "引雷",
            zus_yinlei_info: "锁定技，防止你受到的非属性伤害，改为获得1个“狠”标记。",

            zus_piaoyi: "漂移",
            zus_piaoyi_info: "每当你使用【杀】指定一名角色为目标后，你可以将此【杀】的此目标转移至该角色攻击范围内的另一名角色（可以为你）。若此【杀】被【闪】抵消，你可以将你的1个“狠”标记转移给此【杀】的目标。",

            zus_leijie: "雷劫",
            zus_leijie_info: "拥有“狠”标记的角色，在判定阶段开始时，结算X次【闪电】，并获得判定牌（X为其“狠”标记数）。",

            zus_hen: "狠",
            zus_hen_info: "“狠”标记。判定阶段开始时，拥有者会结算等量次【闪电】并获得判定牌。",
        },
    };
});
