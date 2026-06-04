game.import("character", function (lib, game, ui, get, ai, _status) {
    return {
        name: "zus_skill_mabaoguo",

        character: {},

        skill: {
            zus_hunyuan: {
                trigger: {
                    global: "phaseBegin",
                },
                frequent: true,

                filter: function (event, player) {
                    if (event.player == player) return false;
                    return !player.countCards("h", "shan");
                },

                content: function () {
                    player.draw(2);
                },
            },
        },

        translate: {},
    };
});