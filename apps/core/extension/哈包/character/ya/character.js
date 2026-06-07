/** @type { importCharacterConfig['character'] } */
const character = {
	moshusiji: {
		sex: "none",
		group: "ya",
		hp: 3,
		skills: ["huaqie", "qiaoshou", "huanbian"],
	},
};
for (let i in character) {
	character[i].img = "extension/哈包/image/character/ya/" + i + ".png";
}
export default character;
