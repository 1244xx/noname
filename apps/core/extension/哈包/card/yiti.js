/** @type { importCharacterConfig['card'] } */
const cards = {
	wangluojiancha_wangqu: {
		fullskin: true,
		type: "equip",
		subtype: "equip5",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "diamond",
		yitiNumber: 2,
		skills: ["wangqu_skill1", "wangqu_skill2"],
		ai: {
			equipValue: 8,
			basic: {
				equipValue: 8,
			},
		},
	},

	qilusi_yiyan: {
		fullskin: true,
		type: "equip",
		subtype: "equip3_4",
		yiti: true,
		recastable: true,
		enable: false,
		cardcolor: "club",
		yitiNumber: 2,
		distance: { globalFrom: 0 },
		skills: ["qilusi_skill1"],
		ai: {
			equipValue: 7,
			basic: {
				equipValue: 7,
			},
		},
	},
};

for (let i in cards) {
	cards[i].image = "extension/哈包/image/card/" + i + ".png";
}

export default cards;
