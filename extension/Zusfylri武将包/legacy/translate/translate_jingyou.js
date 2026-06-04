game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_translate_jingyou",

        character: {},

        skill: {},

        translate: {
            zus_jingyou: "景祐",
            zus_jingyou_ab: "景祐",

            zus_tianchi: "天敕",
            zus_tianchi_info: "锁定技，开始阶段，视为你使用一张【顺手牵羊】；准备阶段，视为你使用一张【过河拆桥】；出牌阶段开始时，视为你使用一张【酒】；结束阶段，视为你使用一张【借刀杀人】。每当你因此技能使用牌时，若无目标可指定，你失去1点体力。",

            zus_xuji: "续祀",
            zus_xuji_info: "在你的回合内，若有角色死亡，你回复2点体力，此回合结束后，你可以进行一个额外回合。",

            zus_xuji_phase: "续祀",
            zus_xuji_phase_info: "此回合结束后，你可以进行一个额外回合。",

            zus_xuji_extra: "续祀",
            zus_xuji_extra_info: "此回合结束后，你可以进行一个额外回合。",
        },
    };
});
