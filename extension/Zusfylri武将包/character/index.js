game.import("character", function (lib, game, ui, get, ai, _status) {
    window.zusfylriModules = window.zusfylriModules || {};

    var modules = window.zusfylriModules;
    var keys = Object.keys(modules);
    var character = {};
    var skill = {};
    var translate = {
        zusfylri: "Zusfylri武将包",
        zus_group_zusfylri: "Zusfylri武将包",
    };
    var characterTitle = {};
    var mainList = [];

    for (var i = 0; i < keys.length; i++) {
        var mod = modules[keys[i]];
        if (!mod) continue;
        if (mod.character) Object.assign(character, mod.character);
        if (mod.skill) Object.assign(skill, mod.skill);
        if (mod.translate) Object.assign(translate, mod.translate);
        if (mod.title) Object.assign(characterTitle, mod.title);
        if (Array.isArray(mod.sort)) {
            for (var j = 0; j < mod.sort.length; j++) {
                mainList.push(mod.sort[j]);
            }
        }
    }

    return {
        name: "zusfylri",
        connect: true,
        character: character,
        skill: skill,
        translate: translate,
        characterTitle: characterTitle,
        characterSort: {
            zusfylri: {
                zus_group_zusfylri: mainList,
            },
        },
    };
});
