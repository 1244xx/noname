/** @type { importCharacterConfig['card'] } */
const cards = {
	zhuangzhi_jiansuo: {
		fullskin: true,
		type: "equip",
		subtype: "equip5",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "diamond",
		yitiNumber: 1,
		chineseName: "装植减缩",
		skills: ["zhuangzhi_jiansuo_skill"],
		ai: { basic: { equipValue: 7 } },
	},

	wangluojiancha_wangqu: {
		fullskin: true,
		type: "equip",
		subtype: "equip5",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "diamond",
		yitiNumber: 2,
		chineseName: "网络监察网驱",
		skills: ["wangqu_skill1", "wangqu_skill2"],
		ai: { basic: { equipValue: 8 } },
	},

	kuangbao: {
		fullskin: true,
		type: "equip",
		subtype: "equip5",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "diamond",
		yitiNumber: 3,
		chineseName: "狂暴",
		skills: ["kuangbao_skill1", "kuangbao_skill2"],
		ai: { basic: { equipValue: 6.5 } },
	},

	sianweisi_tan: {
		fullskin: true,
		type: "equip",
		subtype: "equip5",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "diamond",
		yitiNumber: 4,
		chineseName: "斯安威斯坦",
		skills: ["sianweisi_tan_skill1", "sianweisi_tan_skill2"],
		ai: { basic: { equipValue: 6.5 } },
	},
};

export default cards;
