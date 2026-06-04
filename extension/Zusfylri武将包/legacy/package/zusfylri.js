game.import("character", function (lib, game, ui, get, ai, _status) {
    const EXT_NAME = "Zusfylri武将包";

    function image(id, ext) {
        return "ext:" + EXT_NAME + "/image/character/" + id + "." + (ext || "jpg");
    }

    function char(gender, group, hp, skills, id, ext, tags) {
        var extra = tags ? tags.slice(0) : [];
        extra.push(image(id, ext));
        return [gender, group, hp, skills, extra];
    }

    return {
        name: "zus_package_zusfylri",

        character: {
            // 已有自制武将
            zus_mabaoguo: char("male", "qun", 3, ["zus_hunyuan"], "zus_mabaoguo", "png"),
            zus_gazi: char("male", "qun", 4, ["zus_jiushen", "zus_kuangyan"], "zus_gazi", "png"),
            zus_shanshang: char("male", "qun", 4, ["zus_yingyan", "zus_yingyan_gain", "zus_juefu"], "zus_shanshang", "png"),
            zus_kobe: char("male", "qun", 4, ["zus_zhouji"], "zus_kobe", "png"),
            zus_zhaoyun: char("male", "shen", 4, ["zus_juexiao", "zus_gudan"], "zus_zhaoyun", "png"),
            zus_lier: char("male", "shen", 3, ["zus_sanqing", "zus_sunbu"], "zus_lier", "png"),
            zus_houyi: char("male", "shen", 4, ["zus_jiuyao", "zus_fenshi"], "zus_houyi", "png"),
            zus_jichang: char("male", "shen", "3/6", ["zus_yishu", "zus_liuzhuan"], "zus_jichang", "png"),
            zus_zhuluan: char("female", "shen", 3, ["zus_huangyi", "zus_fengzhao"], "zus_zhuluan", "png"),
            zus_dingzhen: char("male", "shen", 4, ["zus_zhishi", "zus_xuebao"], "zus_dingzhen", "png"),
            zus_jingyou: char("male", "qun", 4, ["zus_tianchi", "zus_xuji"], "zus_jingyou", "png"),
            zus_ningji: char("female", "qun", 3, ["zus_xianqi", "zus_yuyun"], "zus_ningji", "png"),
            zus_yingzheng: char("male", "shen", 4, ["zus_xiaodi", "zus_yimie", "zus_huangdao"], "zus_yingzheng", "png", ["zhu"]),
            zus_makesi_kongfuzi: char("male", "qun", 4, ["zus_zhouli", "zus_fengbao"], "zus_makesi_kongfuzi", "png"),
            zus_langyan: char("male", "shen", "2/2/1", ["zus_shuangmo", "zus_guyan"], "zus_langyan", "png"),
            zus_hongxiuquan: char("male", "shen", 4, ["zus_zhuolue", "zus_juntian"], "zus_hongxiuquan", "png"),
            zus_wujing: char("male", "shen", 4, ["zus_yinlei", "zus_piaoyi", "zus_leijie"], "zus_wujing", "png"),
            zus_mo:char("female", "shen", 3, ["zus_jiuxiang", "zus_xingyan", "zus_huanxu"], "zus_mo", "png"),
            zus_change:char("female","shen",3,["zus_yuezhao","zus_chanjing"],"zus_change","png"),
            zus_hongyu: char("female", "shen", 3, ["zus_liangu", "zus_shengzang", "zus_yizui"], "zus_hongyu", "png"),
        },

        characterSort: {
            zus_package_zusfylri: {
                zus_group_zusfylri: [
                    "zus_mabaoguo",
                    "zus_gazi",
                    "zus_shanshang",
                    "zus_kobe",
                    "zus_zhaoyun",
                    "zus_lier",
                    "zus_houyi",
                    "zus_jichang",
                    "zus_zhuluan",
                    "zus_dingzhen",
                    "zus_jingyou",
                    "zus_ningji",
                    "zus_yingzheng",
                    "zus_makesi_kongfuzi",
                    "zus_langyan",
                    "zus_hongxiuquan",
                    "zus_wujing",
                    "zus_mo",
                    "zus_change",
                    "zus_hongyu",
                ],
            },
        },

        characterTitle: {
            zus_dingzhen: "阅语",
            zus_gazi: "嘎子",
            zus_hongxiuquan: "天王",
            zus_houyi: "九曜阳帝",
            zus_jichang: "生死易数",
            zus_jingyou: "永祀帝",
            zus_kobe: "黄金拳王",
            zus_langyan: "北帝",
            zus_lier: "道德天尊",
            zus_mabaoguo: "终极武神",
            zus_makesi_kongfuzi: "马克思&孔夫子",
            zus_ningji: "原型机",
            zus_shanshang: "最后的英灵",
            zus_yingzheng: "始皇帝",
            zus_zhaoyun: "苍天龙魂",
            zus_zhuluan: "西皇",
            zus_wujing:"战狠",
            zus_mo:"春瓦绿",
            zus_change:"广寒月皇",
            zus_hongyu: "血莲教主",
        },

        skill: {},

        translate: {
            zus_package_zusfylri: "Zusfylri 武将",
            zus_group_zusfylri: "Zusfylri 武将",
        },
    };
});
