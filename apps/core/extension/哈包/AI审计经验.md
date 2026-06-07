# 哈包 AI 代码审计经验文档

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

**验证方法：** 逐行确认每个 `set("ai", ...)` 和 `ai.xxx` 回调中使用的变量名与实际传入参数一致。

### 检查项 2：事件上下文

`get.event()` 或 `_status.event.getTrigger()` 在不同回调中取到的事件可能完全不同：

| 回调 | `get.event()` 是什么 |
|------|---------------------|
| `content()` 中 | 技能触发事件 |
| `cost()` 中 | 技能触发事件 |
| `set("ai", ...)` 内联 | 当前的 chooseXXX 事件 |
| `ai.chooseControl.check` | chooseControl 事件（不是技能事件！） |
| `ai.result.target` | 技能触发事件 |

**验证方法：**
- 如果在 `ai.chooseControl.check` 中用 `get.event()` 拿技能事件的属性（如 `event.greaterTargets`），一定是 `undefined`。
- 正确做法：把数据写在 cost 闭包中，用 `set("ai", ...)` 内联函数通过闭包访问。

### 检查项 3：符号语义

**高分 = 偏好，低分 = 规避。**

常见混淆：

| 操作 | 对敌方 | 对友方 | 陷阱 |
|------|--------|--------|------|
| 出杀 | 高正分 ✅ | 负分/0 ❌ | 杀队友永远是错的 |
| 拿牌 | 高正分（偷敌）✅ | 正分=偷队友 ❌ | 获取牌应优先敌方 |
| 弃牌 | 高正分（拆敌）✅ | 正分=拆队友 ❌ | |
| 给牌（chooseToGive） | 负分 ❌ | 高正分 ✅ | 给牌应优先友方 |
| 回血 | 高正分（救友）✅ | 偏队友 | |
| 濒死 | maixie=true（卖血） | maixie_hp（优先回血） | |

**`get.attitude` 的返回值：**
- 友方：正数（>0）
- 敌方：负数（<0）
- 中立：0 附近

**验证方法：** 对每个 AI 回调中涉及 `attitude` 的地方，手动代 3 个场景的值：
- 场景 A：全是敌方 → 验证分数方向
- 场景 B：全是友方 → 验证不会选队友做坏事
- 场景 C：混合 → 验证敌方分数 > 队友分数

### 检查项 4：闭包引用有效性

`set("ai", ...)` 的内联函数执行时机在 content 执行期间。如果引用了 content 闭包中的变量，需要确认这些变量在 AI 回调执行时仍然有效且未被修改。

**安全模式：**
- ✅ content 闭包变量直接引用（如 `player`, `currentPlayer`）
- ✅ `set("ai", () => { return get.attitude(player, someTarget); })` — 变量是常量引用
- ❌ 引用了 `event.xxx` 但 event 是 `createTrigger` 的事件（已有模块先例可参考）
- ❌ 在 `ai.chooseControl.check` 中用 `get.event()` 拿上层事件数据

### 检查项 5：chooseControl 的正确写法

框架有两种写法：

**写法 A（推荐）：内联 AI**
```js
player.chooseControl(["选项1", "选项2"])
    .set("ai", () => {
        // 闭包变量可用
        if (enemyTargets.length > 0) return 0; // 选"选项1"
        return 1;
    })
```

**写法 B（顶层声明，需要严密验证）：**
```js
ai: {
    chooseControl: {
        check(control, player) {
            // control: "选项1" 或 "选项2"
            // player: 技能持有者 Player 对象
            // get.event() 拿到的是 chooseControl 事件
        }
    }
}
```

B 写法的陷阱：
- 拿不到 content 闭包中的 `greaterTargets` 等数据
- 需要把数据存在 `event.greaterTargets` 上吗？但 `get.event()` 上下文不对

---

## 三、常见 AI 块缺失模式

以下技能必须有 AI 块，但容易被遗漏：

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
🔴 第〇步（强制执行）：确认执行全部四轮，不接受"前几轮没问题就跳过后续轮次"

第一轮：块级缺失扫描
1. 遍历所有技能定义，列出所有技能的 ai 块状态
2. 输出：每个技能"有/无 ai 块"，缺块的一律标记

第二轮：内联 AI 完整性
3. grep 所有 chooseXXX( 调用
4. 逐个确认紧跟 .set("ai", ...) 或 .forResult()
5. 输出：每个漏 AI 的 chooseXXX 调用

第三轮：语义正确性
6. grep 所有包含 get.attitude 的 ai 回调
7. 对每个回调走查三个场景（全敌/全友/混合）
8. grep 所有 ai.chooseControl.check
9. 逐个确认 get.event() 上下文
10. 输出：每个方向错误/上下文错误的回调

第四轮：标签完整性
11. 按技能效果分类，检查对应标签
12. 输出：每个缺标签的技能
13. 汇总四轮产出 → 最终报告
```

---

## 五、已发现的问题模式

### 模式 A：chooseControl 上下文错误
`ai.chooseControl.check` 中用 `get.event()` 访问 content 数据 → 永远拿到 undefined

### 模式 B：选择符号反向
拿牌/拆牌类技能，`ai: target => get.attitude(player, target)` → 队友正分，会优先选队友

### 模式 C：缺 AI 块导致 AI 盲目发动
有代价的主动技能（如狂暴 skill2）缺 AI 块 → AI 在 hp=1 时也可能发动导致自杀

### 模式 D：事件名错误
`event.name === 'phase'` → 应该是 `'phaseBegin'` 或 `'phaseStart'`

### 模式 E：`frequent: true` 缺 `check()`
频繁触发类技能如果没有 `check()` 函数，AI 无法判断是否值得在当前时机触发。
- 修复：为 `frequent: true` 的技能添加 `check(event, player)` 函数

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
`chooseControl()` 有 choiceList 但无 `set("ai", ...)`，选项选择完全依赖默认。
- 修复：始终为 `chooseControl` 添加 `set("ai", ...)`

### 模式 J：`give` 类操作的 AI 盲区
`chooseToGive` 是敌方向友方交牌的操作，需要正确设置 AI。
- 修复：为各处 `chooseToGive` 添加正确的 AI 回调

### 模式 K：`result.target` 分正值可能误导 AI 选队友
凡是从目标处获益的技能，`result.target` 应对队友为负或 0。

### 模式 L：cost 的 chooseControl 结果未传 cost_data
`cost` 中的 `chooseControl` 结果通过 `cost_data` 传递给 `content`，但常见写错：
```js
// ❌ cost 返回 event.result = chooseControl结果
// content 中 event.result.control → undefined!
async cost(event, trigger, player) {
    event.result = await player.chooseControl(...).forResult();
    return event.result.control !== "cancel2";
},
async content(event, trigger, player) {
    event.result.control;  // ❌ cost 的 event 不是 content 的 event！
}
```
- 审计方法：grep 所有 `async cost` + `chooseControl`，逐项确认是否用了 `cost_data` 传值
- 修复：`event.result = { bool: result.control !== "cancel2", cost_data: { control: result.control } }`
- content 读取：`event.cost_data.control`

### 模式 M：`chooseToDisable` AI 签名错误导致无限循环
`chooseToDisable(true).set("ai", event => { ... })` 中回调签名为 `(event, player, list)`，第三个参数 `list` 才是可选装备栏数组。错误地使用 `event._controls` 会得到 `undefined`，导致 AI 返回 `undefined` → 选不出结果 → 技能无限重试。

- 修复：`.set("ai", function (event, player, list) { return list.randomGet(); })`

### 模式 N：有代价技能的 `ai.result` 静态正值 = 无限循环
```js
ai: { result: { player: 2 } }  // ❌ 静态值
```
AI 每次扫描都看到正值，只要 `filter` 通过就会反复发动直到资源耗尽。对有弃牌/废装备栏等代价的技能必须改为动态函数：
```js
ai: { result: { player(player) { return player.countCards("h") > 2 ? 1 : 0; } } }
```

### 模式 O：`lib.skill.global.has()` 不存在
全局技能管理的 `lib.skill.global` 是类数组对象，API 是 `.add()` / `.remove()` / `.includes()`。没有 `.has()` 方法，会导致 `TypeError`。

- 修复：`lib.skill.global.has("x")` → `lib.skill.global.includes("x")`



---

## 六、实战数据：五轮审计 49 个问题分类

以下为对哈包 8 个 `skill.js`（118 个技能）完整五轮审计的产出统计，可作为同类审计的"预期产出示意"：

| 类别 | 数量 | 具体案例 |
|------|------|----------|
| chooseXXX 缺 `set("ai")` | 14 | qunqi/ludao_qinwu 志愿者、youxi、feiyu、qingdun、jibao、zhishi、chifan、皮豆 loser 肃纪 ×2、服从 give、威压 defense/offense 目标 give |
| attitude 符号反向 | 6 | 魔佛偷牌 `+attitude`→选队友、皮豆博弈目标正分→选队友、网驱 result.target 队友 0、小惠 result 队友正分 |
| `result` 常量应改为动态函数 | 6 | fucong_active、xiaohui、zhishi、pidou、wangqu_skill2、fucong give |
| 标签缺失 | 8 | 废寝/镀铬/推特/消逝/禅眠 缺 `halfneg`、撒功缺 `neg`、斯安威斯坦1 缺 `respondShan`、斯安威斯坦2 缺 ai |
| 无差别敌友 | 3 | wenda 选项2 偷队友、大猩猩手臂封队友、单分子线拆中立 |
| 跨角色交互无 AI | 4 | qunqi 志愿者 chooseBool/chooseControl、liudao_qinwu 志愿者 chooseBool/chooseToDiscard |
| 随机/盲目决策 | 3 | 攻防切换(30%随机)、睡觉 chooseBool 无 AI、踝部加固纯交替切换 |
| filter 缺 `get.attitude` 检查 | 2 | zhelong(蛰龙)、tihu(提壶)被动触发 |
| 事件名/上下文错误 | 2 | wenda `event.name==='phase'`、wenda chooseControl 用 `get.event()` |
| frequent 缺 `check()` | 1 | youji |

### 跨文件分布

| 文件 | 问题数 | 重点 |
|------|--------|------|
| character/ha/skill.js | 15 | 最多——技能数多且交互复杂 |
| character/shen/skill.js | 12 | 划拳 + 刀盾体系 |
| character/wu/skill.js | 10 | 服从/威压/义体管理 |
| character/wa/skill.js | 6 | 标签缺失 + 高风险技能 |
| card/treasure/skill.js | 3 | 狂暴 + 斯安威斯坦 + 网驱 |
| card/armor/skill.js | 1 | 标签补齐 |
| card/weapon/skill.js | 2 | attitude 修复 |
| card/horse/skill.js | 0 | 踝部加固 ai 已修复（前轮） |
