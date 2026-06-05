/** @type { importCharacterConfig['character'] } */
const character = {
	weiji: {
		sex: "male",
		group: "wuwu",
		hp: 3,
		skills: ["weiya"],
	},
	baji: {
		sex: "male",
		group: "wuwu",
		hp: 4,
		skills: ["fucong", "xiaohui", "zhishi"],
	},
	hashangfei: {
		sex: "male",
		group: "wuwu",
		hp: 4,
		skills: ["fufeng", "lunzhen", "gefang"],
		isZhugong: true,
	},
	habenhaimo: {
		sex: "male",
		group: "wuwu",
		hp: 4,
		skills: ["zhizi", "liebian", "manha"],
	},
	hazhentian: {
		sex: "female",
		group: "wuwu",
		hp: 5,
		skills: ["gehua", "chaoxian"],
	},
};
for (let i in character) {
	character[i].img = "extension/哈包/image/character/wu/" + i + ".png";
}
export default character;
