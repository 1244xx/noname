game.import("extension", function (lib, game, ui, get, ai, _status) {
    const EXT_DISPLAY_NAME = "Zusfylri武将包";
    const EXT_NAME = (_status && _status.extension) || EXT_DISPLAY_NAME;
    const CORE_FILES = ["rng", "sync", "helper"];
    const MODULE_FILES = [
        "beimingzhanjia",
        "change",
        "chiyou",
        "dingzhen",
        "gazi",
        "hongxiuquan",
        "hongyu",
        "houyi",
        "huaxiaofeng",
        "jichang",
        "jingyou",
        "kobe",
        "langyan",
        "lier",
        "mabaoguo",
        "makesi_kongfuzi",
        "mo",
        "ningji",
        "qing",
        "shanshang",
        "simayi",
        "wei",
        "wujing",
        "xiangqing",
        "yingzheng",
        "yuanhou",
        "zhaoyun",
        "zhuli",
        "zhuluan",
        "zhuangzhou",
    ];

    function loadQueue(path, files, onDone) {
        var index = 0;
        var next = function () {
            if (index >= files.length) {
                if (typeof onDone == "function") onDone();
                return;
            }
            lib.init.js(path, files[index++], next, next);
        };
        next();
    }

    return {
        name: EXT_DISPLAY_NAME,
        editable: true,
        connect: true,

        precontent: function () {
            const base = lib.assetURL + "extension/" + EXT_NAME + "/";
            window.ZUS_EXTENSION_NAME = EXT_NAME;

            window.zusfylriModules = {};

            if (lib.init.jsSync) {
                CORE_FILES.forEach(function (file) {
                    lib.init.jsSync(base + "core", file);
                });
                MODULE_FILES.forEach(function (file) {
                    lib.init.jsSync(base + "module", file);
                });
                lib.init.jsSync(base + "character", "index");
            } else {
                loadQueue(base + "core", CORE_FILES, function () {
                    loadQueue(base + "module", MODULE_FILES, function () {
                        lib.init.js(base + "character", "index");
                    });
                });
            }

            lib.translate.zusfylri_character_config = EXT_DISPLAY_NAME;
        },

        content: function () {},
        config: {},
        package: {
            intro: "Zusfylri自制武将包（module 单武将文件架构版）",
            author: "Zusfylri",
            diskURL: "",
            forumURL: "",
            version: "2.0-architecture-rewrite",
        },
        files: {
            character: [],
            card: [],
            skill: [],
            audio: [],
        },
    };
});
