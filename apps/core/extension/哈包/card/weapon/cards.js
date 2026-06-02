/** @type { importCharacterConfig['card'] } */
const cards = {
	danfenzi_xian: {
		fullskin: true,
		type: "equip",
		subtype: "equip1",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "spade",
		yitiNumber: 1,
		chineseName: "单分子线",
		distance: { attackFrom: -1 },
		skills: ["danfenzi_xian_skill"],
		ai: { basic: { equipValue: 5.5 } },
	},

	shedan_fashe_xitong: {
		fullskin: true,
		type: "equip",
		subtype: "equip1",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "spade",
		yitiNumber: 2,
		chineseName: "射弹发射系统",
		distance: { attackFrom: -1 },
		skills: ["shedan_fashe_xitong_skill"],
		ai: { basic: { equipValue: 6 } },
	},

	daxingxing_shoubei: {
		fullskin: true,
		type: "equip",
		subtype: "equip1",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "spade",
		yitiNumber: 3,
		chineseName: "大猩猩手臂",
		distance: { attackFrom: 0 },
		skills: ["daxingxing_shoubei_skill"],
		ai: { basic: { equipValue: 5.5 } },
	},

	tanglang_dao: {
		fullskin: true,
		type: "equip",
		subtype: "equip1",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "spade",
		yitiNumber: 4,
		chineseName: "螳螂刀",
		distance: { attackFrom: 0 },
		skills: ["tanglang_dao_skill"],
		ai: { basic: { equipValue: 5.5 } },
	},
};

export default cards;
