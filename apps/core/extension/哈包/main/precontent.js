import { lib, game, get } from "./utils.js";
import character from "../character/ha/character.js";
import skill from "../character/ha/skill.js";
import translate from "../character/ha/translate.js";
import shenCharacter from "../character/shen/character.js";
import shenSkill from "../character/shen/skill.js";
import shenTranslate from "../character/shen/translate.js";
import waCharacter from "../character/wa/character.js";
import waSkill from "../character/wa/skill.js";
import waTranslate from "../character/wa/translate.js";
import wuCharacter from "../character/wu/character.js";
import wuSkill from "../character/wu/skill.js";
import wuTranslate from "../character/wu/translate.js";
import yitiWeaponCards from "../card/weapon/cards.js";
import yitiWeaponSkills from "../card/weapon/skill.js";
import yitiWeaponTranslates from "../card/weapon/translate.js";
import yitiArmorCards from "../card/armor/cards.js";
import yitiArmorSkills from "../card/armor/skill.js";
import yitiArmorTranslates from "../card/armor/translate.js";
import yitiHorseCards from "../card/horse/cards.js";
import yitiHorseSkills from "../card/horse/skill.js";
import yitiHorseTranslates from "../card/horse/translate.js";
import yitiTreasureCards from "../card/treasure/cards.js";
import yitiTreasureSkills from "../card/treasure/skill.js";
import yitiTreasureTranslates from "../card/treasure/translate.js";
import yitiSkills from "../card/yiti_skill.js";
import yitiTranslates from "../card/yiti_translate.js";

const characterSort = {
	haha_shen: Object.keys(shenCharacter),
	haha_ha: Object.keys(character),
	haha_wa: Object.keys(waCharacter),
	haha_wu: Object.keys(wuCharacter),
};

export async function precontent(config, pack) {
	try {
		console.log("开始加载哈包扩展...");

		// ==================== 注册底层数据 ====================
		if (!lib.translate) lib.translate = {};
		if (!lib.skill) lib.skill = {};
		if (!lib.card.list) lib.card.list = [];

		Object.assign(lib.translate, translate);
		Object.assign(lib.translate, shenTranslate);
		Object.assign(lib.translate, waTranslate);
		Object.assign(lib.translate, wuTranslate);
		Object.assign(lib.translate, yitiTranslates);
		Object.assign(lib.translate, yitiWeaponTranslates);
		Object.assign(lib.translate, yitiArmorTranslates);
		Object.assign(lib.translate, yitiHorseTranslates);
		Object.assign(lib.translate, yitiTreasureTranslates);

		Object.assign(lib.skill, skill);
		Object.assign(lib.skill, shenSkill);
		Object.assign(lib.skill, waSkill);
		Object.assign(lib.skill, wuSkill);
		Object.assign(lib.skill, yitiSkills);
		Object.assign(lib.skill, yitiWeaponSkills);
		Object.assign(lib.skill, yitiArmorSkills);
		Object.assign(lib.skill, yitiHorseSkills);
		Object.assign(lib.skill, yitiTreasureSkills);

		// ==================== 武将：一个包，内部分组 ====================
		const allCharacters = Object.assign({}, character, shenCharacter, waCharacter, wuCharacter);
		const PACK_NAME = "哈包";

		lib.characterPack[PACK_NAME] = allCharacters;
		lib.translate[PACK_NAME + "_character_config"] = "哈包";

		// 内部分组（如"神话再临"分"风林火山"）
		if (!lib.characterSort[PACK_NAME]) {
			lib.characterSort[PACK_NAME] = {};
		}
		Object.assign(lib.characterSort[PACK_NAME], characterSort);

		lib.translate.haha_ha = "哈";
		lib.translate.haha_shen = "神";
		lib.translate.haha_wa = "哇";
		lib.translate.haha_wu = "呜";

		// 首次安装默认启用武将包并注册武将
		if (!lib.config.characters) lib.config.characters = [];
		if (!lib.config.all) lib.config.all = {};
		if (!lib.config.all.characters) lib.config.all.characters = [];
		if (!lib.config.all.characters.includes(PACK_NAME)) {
			lib.config.all.characters.push(PACK_NAME);
		}
		if (!lib.config.characters.includes(PACK_NAME)) {
			lib.config.characters.push(PACK_NAME);
			game.saveConfig("characters", lib.config.characters);
		}
		Object.assign(lib.character, allCharacters);

		// ==================== 卡牌：一个包，每张牌可单独禁用 ====================
		const yitiCards = Object.assign({}, yitiWeaponCards, yitiArmorCards, yitiHorseCards, yitiTreasureCards);
		for (let name in yitiCards) {
			const subtype = yitiCards[name].subtype;
			let subdir;
			if (subtype === "equip1") subdir = "weapon";
			else if (subtype === "equip2") subdir = "armor";
			else if (subtype === "equip3_4") subdir = "horse";
			else if (subtype === "equip5") subdir = "treasure";
			yitiCards[name].image = "extension/哈包/image/card/" + subdir + "/" + name + ".png";
		}
		Object.assign(lib.card, yitiCards);

		lib.cardPack[PACK_NAME] = Object.keys(yitiCards);
		lib.translate[PACK_NAME + "_card_config"] = "义体";

		// 构建牌堆列表
		const pileEntries = [];
		for (let name in yitiCards) {
			pileEntries.push([yitiCards[name].cardcolor, yitiCards[name].yitiNumber, name]);
		}
		lib.cardPile[PACK_NAME] = pileEntries;

		// 首次安装默认启用卡牌包
		if (!lib.config.cards) lib.config.cards = [];
		if (!lib.config.all) lib.config.all = {};
		if (!lib.config.all.cards) lib.config.all.cards = [];
		if (!lib.config.all.cards.includes(PACK_NAME)) {
			lib.config.all.cards.push(PACK_NAME);
		}
		if (!lib.config.cards.includes(PACK_NAME)) {
			lib.config.cards.push(PACK_NAME);
			game.saveConfig("cards", lib.config.cards);
		}

		// 根据 bannedpile 过滤，且仅在包启用时加入牌堆
		if (!lib.config.bannedpile) lib.config.bannedpile = {};
		if (!lib.config.bannedpile[PACK_NAME]) lib.config.bannedpile[PACK_NAME] = [];
		if (lib.config.cards.includes(PACK_NAME)) {
			for (let i = 0; i < pileEntries.length; i++) {
				if (!lib.config.bannedpile[PACK_NAME].includes(i)) {
					lib.card.list.push(pileEntries[i]);
				}
			}
			console.log("义体牌已洗入牌堆:", pileEntries.length - lib.config.bannedpile[PACK_NAME].length, "张");
		}

		// ==================== canEquipYiti ====================
		lib.element.Player.prototype.canEquipYiti = function(card) {
			if (!card || !get.info(card).yiti) return false;
			var subtype = get.subtype(card);
			var list = this.storage._yiti_mark || [];
			var existing = list.find(function(i) { return i.subtype === subtype; });
			if (existing) return this.countCards("he") >= 1;
			return this.hasEnabledSlot(subtype) && this.countCards("he") >= 2;
		};

		// 确保扩展在列表中
		if (lib.config?.all?.extensions && !lib.config.all.extensions.includes("哈包")) {
			lib.config.all.extensions.push("哈包");
		}

		console.log("哈包扩展加载完成");
	} catch (err) {
		console.error("Failed to import extension 『哈包』: ", err);
		alert(`『哈包』扩展加载失败: ${err.message}`);
	}
}
