# 哈包 AI 代码审计经验文档

> 本文档聚焦 AI 代码审计的方法论、问题模式和实战数据。
> 编程与框架机制相关经验见 [`编程经验.md`](./编程经验.md)。

---

## 零、强制性多轮审计流程（最重要）

### 核心教训
单轮审计必然会遗漏问题。因为不同类别的问题需要用不同的视角才能发现——检查"AI 块是否存在"的视角，看不见"chooseBool 缺 AI"的问题；检查"attitude 方向"的视角，看不见"halfneg 标签缺失"的问题。

**禁止行为：在第一轮找到几个问题后就收手报告"已全部修复"。**

### 强制四轮审计（必须逐轮执行，不可跳过）

| 轮次 | 视角 | 搜索模式 |
|------|------|----------|
| 第一轮：块级缺失 | AI 块是否存在 | 搜索每个技能定义，确认有 `ai:` 块 |
| 第二轮：内联 AI 完整性 | 每个 `set("ai", ...)` 是否存在 | 搜索所有 `chooseBool(` / `chooseTarget(` / `chooseToDiscard(` / `chooseToGive(` / `chooseToUse({` / `chooseControl(` / `chooseCard(` / `chooseButton(` / `choosePlayerCard(`，确认紧跟 `.set("ai", ...)` 或 `.forResult()` 前有 `.set("ai", ...)` |
| 第三轮：语义正确性 | attitude 方向、上下文、参数类型 | 逐个 AI 回调走查三个场景（全敌方/全友方/混合），追踪 `get.event()` 上下文 |
| 第四轮：标签完整性 | `maixie`/`halfneg`/`neg`/`damageBonus`/`respondSha`/`respondShan`/`rejudge`/`combo`/`threaten` 等元标签 | 按技能效果分类（卖血→maixie, AOE→halfneg, 增伤→damageBonus, 改判→rejudge 等）逐个对照 |

### 每轮验收标准
每轮必须产出问题清单。即使该轮"看起来没有问题"，也必须输出一个明确的结论："第 X 轮：审查了 N 个技能/回调，0 个问题"。不允许只输出"全部通过"而不给出数字。

---

## 一、审计方法论

### 核心理念
AI 代码审计不能只看"AI 块是否存在"，必须逐条验证**参数类型、事件上下文、选择符号语义、闭包引用有效性**。

---

## 二、审计检查清单（5 条必查项）

### 检查项 1：回调参数类型

框架的不同 AI 回调传入的参数类型完全不同，必须确认签名：

| 回调位置 | 签名 | 陷阱 |
|----------|------|------|
| `chooseControl.set("ai", ...)` | `(control: string) => index` | control 是选项字符串，不是 Player |
| `ai.chooseControl.check` | `(control: string, player: Player)` | player 是 Player 对象，但 control 仍是字符串 |
| `ai.result.target` | `(player: Player, target: Player)` | 两个都是 Player |
| `ai.result.player` | `(player: Player)` | 参数是技能持有者，不是目标 |
| `chooseTarget.set("ai", ...)` | `(target: Player) => number` | 传入的是目标 Player |
| `chooseCard.set("ai", ...)` | `(card: Card) => number` | 传入的是卡牌对象 |
| `ai.effect.player` | `(card: Card, player: Player, target: Player)` | 三个参数 |
| `chooseToGive.set("ai", ...)` | `(card: Card) => number` | 目标方可选牌交出 |
| `chooseToDiscard.set("ai", ...)` | `(card: Card) => number` | 自己的弃牌选项 |
| `ai.threaten` | `(player: Player, target: Player)` | player 是评估者，target 是技能持有者 |
| `chooseToDisable.set("ai", ...)` | `(event, player, list)` | **第三个参数 `list` 才是可选列表**（详见编程经验 5.2） |

### 检查项 2：事件上下文

`get.event()` 或 `_status.event.getTrigger()` 在不同回调中取到的事件可能完全不同：

| 回调 | `get.event()` 是什么 |
|------|---------------------|
| `content()` 中 | 技能触发事件 |
| `cost()` 中 | 技能触发事件 |
| `set("ai", ...)` 内联 | 当前的 chooseXXX 事件 |
| `ai.chooseControl.check` | chooseControl 事件（不是技能事件！） |
| `ai.result.target` | 技能触发事件 |

**如果在 `ai.chooseControl.check` 中用 `get.event()` 拿技能事件的属性，一定是 `undefined`。** 正确做法：把数据写在 cost 闭包中，用 `set("ai", ...)` 内联函数通过闭包访问。

### 检查项 3：符号语义

**高分 = 偏好，低分 = 规避。**

| 操作 | 对敌方 | 对友方 | 陷阱 |
|------|--------|--------|------|
| 出杀 | 高正分 | 负分/0 | 杀队友永远是错的 |
| 拿牌 | 高正分（偷敌）| 正分=偷队友 | 获取牌应优先敌方 |
| 弃牌 | 高正分（拆敌）| 正分=拆队友 | |
| 给牌（chooseToGive）| 负分 | 高正分 | 给牌应优先友方 |
| 回血 | 高正分（救友）| 偏队友 | |
| 濒死 | maixie=true（卖血）| maixie_hp（优先回血） | |

**`get.attitude` 的返回值：** 友方 >0，敌方 <0，中立 ≈0。

**验证方法：** 对每个涉及 `attitude` 的回调，手动代 3 个场景：
- 场景 A：全是敌方 → 验证分数方向
- 场景 B：全是友方 → 验证不会选队友做坏事
- 场景 C：混合 → 验证敌方分数 > 队友分数

### 检查项 4：闭包引用有效性

`set("ai", ...)` 的内联函数执行时机在 content 执行期间。引用 content 闭包变量时需确认执行时仍有效：

- 安全：content 闭包常量引用（如 `player`）、`get.attitude(player, target)`
- 危险：引用 `event.xxx`（event 是 createTrigger 的事件）、`ai.chooseControl.check` 中用 `get.event()` 拿上层数据

### 检查项 5：chooseControl 的正确写法

**推荐写法 A（内联 AI）：**
```js
player.chooseControl(["选项1", "选项2"])
    .set("ai", () => {
        if (enemyTargets.length > 0) return 0;
        return 1;
    })
```

**写法 B（顶层声明）的陷阱：**
```js
ai: {
    chooseControl: {
        check(control, player) {
            // get.event() 拿到的是 chooseControl 事件，不是技能事件
            // 拿不到 content 闭包中的数据
        }
    }
}
```

---

## 三、常见 AI 块缺失模式

| 技能类型 | 必需的 AI 标注 |
|----------|---------------|
| 卖血技能 | `maixie: true` |
| AOE/锁定自伤 | `halfneg: true` |
| 濒死保命 | `maixie: true`，濒死时 order 拉高 |
| 改判技能 | `rejudge: true, tag: { rejudge: 1 }` |
| 响应杀 | `respondSha: true` + `skillTagFilter` |
| 响应闪 | `respondShan: true` + `skillTagFilter` |
| 增伤 | `damageBonus: true` + `skillTagFilter` |
| 无视距离 | `targetInRange` mod |
| 翻面防御 | `ai: { order, result: { player(player) } }` |

---

## 四、审计流程

```
🔴 强制执行全部四轮，不接受"前几轮没问题就跳过后续轮次"

第一轮：块级缺失扫描
1. 遍历所有技能定义，列出每个技能的 ai 块状态
2. 缺块的一律标记

第二轮：内联 AI 完整性
3. grep 所有 chooseXXX( 调用
4. 逐个确认紧跟 .set("ai", ...) 或 .forResult()
5. 每个漏 AI 的调用标出

第三轮：语义正确性
6. grep 所有包含 get.attitude 的 ai 回调
7. 对每个回调走查三个场景（全敌/全友/混合）
8. grep 所有 ai.chooseControl.check
9. 逐个确认 get.event() 上下文
10. 每个方向/上下文错误的回调标出

第四轮：标签完整性
11. 按技能效果分类，检查对应标签
12. 每个缺标签的技能标出
13. 汇总四轮产出 → 最终报告
```

---

## 五、已发现的问题模式

### 模式 A：chooseControl 上下文错误
`ai.chooseControl.check` 中用 `get.event()` 访问 content 数据 → 永远拿到 undefined。

### 模式 B：选择符号反向
拿牌/拆牌类技能，`ai: target => get.attitude(player, target)` → 队友正分，会优先选队友。

### 模式 C：缺 AI 块导致 AI 盲目发动
有代价的主动技能（如狂暴 skill2）缺 AI 块 → AI 在 hp=1 时也可能发动导致自杀。

### 模式 D：事件名错误
`event.name === 'phase'` → 应该是 `'phaseBegin'` 或 `'phaseStart'`。

### 模式 E：`frequent: true` 缺 `check()`
频繁触发类技能如果没有 `check()` 函数，AI 无法判断是否值得触发。应为 `frequent: true` 的技能添加 `check(event, player)` 函数。

### 模式 F：其他玩家的决策无 AI（跨角色交互）
多人互动中非技能持有者的 `chooseBool`/`chooseToDiscard`/`chooseToGive` 往往缺失 AI。
- 常见场景：志愿者遗牌（群起）、勤务让其他角色选牌
- 修复：为每个跨角色选择添加 `set("ai", ...)`，判断该角色与技能持有者的关系

### 模式 G：`result` 分值是常量但应对不同目标值不同
`result: { player: 1 }` 忽略与目标关系。例如 `fucong_active` 对所有目标返回 1。
- 修复：将常量替换为函数，根据 `get.attitude` 动态计算

### 模式 H：高风险/永久代价技能缺 `halfneg` 标签
25% 死亡概率（废寝）、永久废除装备栏（镀铬）、锦囊变闪（空灵）等缺 `halfneg`。
- 修复：添加 `ai: { halfneg: true }`

### 模式 I：无差别的 `chooseControl` 无 AI
`chooseControl()` 有 choiceList 但无 `set("ai", ...)`，完全依赖默认选择。

### 模式 J：`give` 类操作的 AI 盲区
`chooseToGive` 需要正确区分敌方向友方交牌的场景。

### 模式 K：`result.target` 分正值可能误导 AI 选队友
凡是从目标处获益的技能，`result.target` 应对队友为负或 0。

### 模式 L：cost 的 chooseControl 结果未传 cost_data

`cost` 和 `content` 运行在不同事件中，各有独立 `result`。content 中读 `event.result.control` → `undefined`。

修复：`event.result = { bool: result.control !== "cancel2", cost_data: { control: result.control } }`，content 读 `event.cost_data.control`。

> 详见 [`编程经验.md` § 3.1](./编程经验.md#31-eventresult-隔离用-cost_data-传值)

### 模式 M：`chooseToDisable` AI 签名错误导致无限循环

`chooseToDisable(true).set("ai", event => { ... })` 回调签名 `(event, player, list)`，第三个参数 `list` 才是可选列表。`event._controls` 为 `undefined`。

> 详见 [`编程经验.md` § 5.2](./编程经验.md#52-choosetodisable-ai-回调签名)

### 模式 N：有代价技能的 `ai.result` 静态正值 = 无限循环

`ai: { result: { player: 2 } }` → AI 每次扫描都看到正值，反复发动直到资源耗尽。

> 详见 [`编程经验.md` § 5.1](./编程经验.md#51-airesult-静态正值--无限循环)

### 模式 O：`lib.skill.global.has()` 不存在

API 是 `.add()` / `.remove()` / `.includes()`，没有 `.has()` 方法。

> 详见 [`编程经验.md` § 8.1](./编程经验.md#81-libskillglobal-的-api)

### 模式 P：`ai.filter` 仅检查 `hasEffect` 不看 `directHit`

`useCard` 被动态修改 `directHit` 后，事件仍可通过 `hasEffect` 检查但后续 `directHit` 已清空。触发类技能应在关键步骤后再检查事件有效性：
```js
filter(event, player) {
    if (!event.hasEffect) return false;
    if (event.baseDamage !== undefined && event.baseDamage <= 0) return false;
    return true;
}
```

### 模式 Q：`changeHp` 多点伤害只触发一次

一次性掉多血时 `trigger.num` 反映实际伤害点数：
```js
const count = Math.min(Math.abs(trigger.num), player.storage.skills.length);
for (let i = 0; i < count; i++) player.storage.skills.pop();
```

### 模式 R：触发的 `result.target` 为纯数字无 attitude 考虑
```js
ai: {
    result: {
        target(player, target) {
            if (get.attitude(player, target) > 0) return 0;   // 不偷队友
            return 1;                                           // 对敌偷牌
        },
    },
}
```

### 模式 S：回合内触发的技能 filter 缺 `_status.currentPhase` 检查

`trigger: { player: "useCardAfter" }` 在回合外响应牌时也触发。设计意图仅自己回合内有效时，filter 第一条必须是 `_status.currentPhase === player`。

> 详见 [`编程经验.md` § 2.4](./编程经验.md#24-回合内触发的技能需防回合外误触发)

### 模式 T：对称否决场景中 AI 选择方向

双人对称决策（如长跑翻牌对决），每方 AI 从自己视角判断结果是否对自己有利。两边逻辑镜像对称，各自判断"对方是否翻到杀"。

### 模式 U：父技能/子技能 AI 配置的层级归属

技能层级交换后（激活提升为父、被动降为子），AI 配置必须跟逻辑迁移。`order` 跟激活逻辑走。

> 详见 [`编程经验.md` § 7.4](./编程经验.md#74-父技能与子技能的层级交换)

### 模式 V：AI 回调中调用不存在的 Player 方法

`player.needsToRecover()` → `TypeError: is not a function`。正确 API 是 `player.isDamaged()`。

> 详见 [`编程经验.md` § 5.3](./编程经验.md#53-调用不存在的-player-api)

---

## 六、实战数据：五轮审计 49 个问题分类

对哈包 8 个 `skill.js`（118 个技能）完整五轮审计的产出统计：

### 按类别分布

| 类别 | 数量 | 具体案例 |
|------|------|----------|
| chooseXXX 缺 `set("ai")` | 14 | qunqi/ludao_qinwu 志愿者、youxi、feiyu、qingdun、jibao、zhishi、chifan、皮豆 loser 肃纪 x2、服从 give、威压 defense/offense 目标 give |
| attitude 符号反向 | 6 | 魔佛偷牌 `+attitude`→选队友、皮豆博弈目标正分→选队友、网驱 result.target 队友 0、小惠 result 队友正分 |
| `result` 常量应改为动态函数 | 6 | fucong_active、xiaohui、zhishi、pidou、wangqu_skill2、fucong give |
| 标签缺失 | 8 | 废寝/镀铬/推特/消逝/禅眠 缺 `halfneg`、撒功缺 `neg`、斯安威斯坦1 缺 `respondShan`、斯安威斯坦2 缺 ai |
| 无差别敌友 | 3 | wenda 选项2 偷队友、大猩猩手臂封队友、单分子线拆中立 |
| 跨角色交互无 AI | 4 | qunqi 志愿者 chooseBool/chooseControl、liudao_qinwu 志愿者 chooseBool/chooseToDiscard |
| 随机/盲目决策 | 3 | 攻防切换(30%随机)、睡觉 chooseBool 无 AI、踝部加固纯交替切换 |
| filter 缺 `get.attitude` 检查 | 2 | zhelong(蛰龙)、tihu(提壶)被动触发 |
| 事件名/上下文错误 | 2 | wenda `event.name==='phase'`、wenda chooseControl 用 `get.event()` |
| frequent 缺 `check()` | 1 | youji |

### 按文件分布

| 文件 | 问题数 | 重点 |
|------|--------|------|
| character/ha/skill.js | 15 | 技能数多且交互复杂 |
| character/shen/skill.js | 12 | 划拳 + 刀盾体系 |
| character/wu/skill.js | 10 | 服从/威压/义体管理 |
| character/wa/skill.js | 6 | 标签缺失 + 高风险技能 |
| card/treasure/skill.js | 3 | 狂暴 + 斯安威斯坦 + 网驱 |
| card/armor/skill.js | 1 | 标签补齐 |
| card/weapon/skill.js | 2 | attitude 修复 |
| card/horse/skill.js | 0 | 踝部加固 ai 已修复（前轮） |

### 五轮产出对比

| 审计行为 | 发现数 | 说明 |
|----------|--------|------|
| 第一轮（只看 ai 块是否存在）| 3-5 | 只覆盖块级缺失 |
| 追加指标 20 → 第二轮（扫描 chooseXXX）| +18 | chooseXXX 缺 set(ai) |
| 追加指标 20 → 第三轮（attitude + 上下文）| +22 | 方向错误 + 标签缺失 |
| 强制执行第四轮（标签完整性）| +1 | zhelong filter 漏洞 |

### 不同视角的覆盖差异

| 视角 | 能发现 | 发现不了 |
|------|--------|----------|
| "AI 块是否存在" | 缺 `ai: {}` 的技能 | chooseBool 缺 `set("ai")` |
| "chooseXXX 有无 set(ai)" | 内联 AI 缺失 | attitude 方向不对 |
| "attitude 方向+上下文" | 选队友偷牌、`get.event()` 上下文错 | halfneg 标签缺失 |
| "标签完整性" | 缺 maixie/halfneg/neg | （以上全部已覆盖）|

---

## 附录：审计速查卡

```
第一轮：grep "^\w+:" → 列出所有技能 → 确认每个有 ai: 块
第二轮：grep "chooseBool\|chooseTarget\|chooseToDiscard\|chooseToGive\|chooseToUse\|chooseControl\|chooseCard\|chooseButton\|choosePlayerCard" → 确认紧跟 .set("ai")
第三轮：grep "get.attitude" → 逐回调走查三个场景 / grep "ai.chooseControl.check" → 确认 get.event() 上下文
第四轮：按技能效果分类 → 对照标签表 → 逐项补齐
```
