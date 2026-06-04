(function() {
if (typeof lib === "undefined") var lib = globalThis.lib;
if (typeof game === "undefined") var game = globalThis.game;
if (typeof ui === "undefined") var ui = globalThis.ui;
if (typeof get === "undefined") var get = globalThis.get;
if (typeof ai === "undefined") var ai = globalThis.ai;
if (typeof _status === "undefined") var _status = globalThis._status;
(function () {
    window.zusfylriModules = window.zusfylriModules || {};
    const EXT_NAME = "Zusfylri武将包";
if (typeof lib === "undefined") var lib = globalThis.lib;
if (typeof game === "undefined") var game = globalThis.game;
if (typeof ui === "undefined") var ui = globalThis.ui;
if (typeof get === "undefined") var get = globalThis.get;
if (typeof ai === "undefined") var ai = globalThis.ai;
if (typeof _status === "undefined") var _status = globalThis._status;


    if (typeof lib === "undefined") var lib = globalThis.lib;
    if (typeof game === "undefined") var game = globalThis.game;
    if (typeof ui === "undefined") var ui = globalThis.ui;
    if (typeof get === "undefined") var get = globalThis.get;
    if (typeof ai === "undefined") var ai = globalThis.ai;
    if (typeof _status === "undefined") var _status = globalThis._status;

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    window.zusfylriModules["mabaoguo"] = {
        key: "mabaoguo",
        character: {
            zus_mabaoguo: char("male", "zus_group_shi", 3, ["zus_hunyuan"], "zus_mabaoguo", "png")
        },
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
        translate: {
            zus_mabaoguo: "马保国",
            zus_mabaoguo_ab: "马保国",

            zus_hunyuan: "混元",
            zus_hunyuan_info: "其他角色的回合开始时，若你的手牌中没有【闪】，你可以摸两张牌。",
        },
        sort: ["zus_mabaoguo"],
        title: {
            zus_mabaoguo: "终极武神"
        }
    };
})();

})();
