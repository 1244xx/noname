/** @type { importCharacterConfig['character'] } */
const character = {
	moshusiji: {
		sex: "none",
		group: "ya",
		hp: 3,
		skills: ["huaqie", "qiaoshou", "huanbian"],
	},
	laosiji: {
		sex: "none",
		group: "ya",
		hp: 4,
		skills: ["kaiche", "chuzu", "juelu"],
	},
	jiweihui: {
		sex: "none",
		group: "ya",
		hp: 5,
		skills: ["gangji", "minsu"],
		isZhugong: true,
	},
	huanshusiji: {
		sex: "none",
		group: "ya",
		hp: 3,
		skills: ["haixiao", "lianwu"],
	},
};
for (let i in character) {
	character[i].img = "extension/哈包/image/character/ya/" + i + ".png";
}
export default character;
