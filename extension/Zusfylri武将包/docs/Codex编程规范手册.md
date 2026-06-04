# Codex编程规范手册

适用范围：`Zusfylri武将包` 及后续基于无名杀原版引擎开发的武将、技能、翻译、调试脚本。

参考材料：

- `D:\app\noname\resources\app\extension\苍宇的无名杀必修一.pdf`（优先阅读）
- `D:\app\noname\resources\app\extension\苍宇的无名杀代码必修一.docx`（备用）
- `D:\app\noname\resources\app\extension\苍宇的无名杀必修二.pdf`
- `D:\app\noname\resources\app\extension\模板.md`
- 本项目现有 `docs/` 调试记录与模块结构

本手册不是教程复述，而是我以后写代码时必须遵守的项目规范。

---

## 一、总原则

1. 稳定优先于炫技。
2. 原生事件链优先于手搓流程。
3. 联机同步优先于单机效果。
4. 朴素可读优先于过度抽象。
5. 先写最小可跑版本，再补 AI、UI、日志、特效。

当前项目最重要的架构取舍：

`外层保持 module 化组织，内层技能尽量按无名杀原生旧架构的朴素写法。`

新架构负责组织能力、安全层、文档和测试辅助；技能本体不要为了优雅而引入多层桥接。

---

## 二、绝对红线

以下设计默认不接，除非用户明确要求并接受高风险：

- 无限制免疫所有技能、所有牌、所有效果。
- 无脑中止任意事件结算。
- 无脑插入回合、阶段、事件。
- 不指定具体 ID 的“获得/失去任意技能时”“获得/失去任意标记时”触发。
- 试图通用重置所有技能状态。
- 瞬发按钮、计时器轮询、即时制玩法。
- 直接改底层 DOM 或本体核心流程来实现规则效果。
- 开着美化扩展抄代码后直接混入项目。

这些不是“绝对不能实现”，而是极容易把事件链、标记、子技能、联机同步和 UI 状态一起炸穿。

---

## 三、目录与模块规范

当前包保持以下主线：

- `extension.js`：只做扩展入口、资源加载、角色包注册前置。
- `core/`：只放通用工具、安全层、同步层，不写具体武将业务。
- `module/*.js`：一名武将或一组强相关武将一个模块。
- `character/index.js`：统一汇总 `character / skill / translate / title / sort`。
- `docs/`：记录规范、调试经验、回归清单。
- `legacy/`：仅作旧结构兼容，不能继续堆新功能。

模块基本形态：

```js
window.zusfylriModules["example"] = {
    key: "example",
    character: {},
    skill: {},
    translate: {},
    title: {},
    sort: {},
};
```

新增武将必须接入：

- 角色数据
- 技能对象
- 翻译和技能描述
- 称号或分包排序
- 图片路径
- 必要的测试/调试记录

---

## 四、命名规范

统一前缀：

- 武将 ID：`zus_xxx`
- 技能 ID：`zus_xxx`
- 子技能：`zus_main_sub`
- storage 键：优先复用技能 ID；额外键使用 `zus_xxx_count / zus_xxx_list / zus_xxx_used`
- 全局安全 helper：`globalThis.zusXxx`

文件命名：

- 模块文件使用英文小写或下划线，例如 `yingzheng.js`、`makesi_kongfuzi.js`。
- 不新增中文 JS 文件名。
- 图片命名与武将 ID 对齐，例如 `zus_yingzheng.png`。

---

## 五、角色数据规范

角色数据必须先确认：

- 性别
- 势力
- 体力、体力上限、护甲
- 技能列表
- 图片路径
- 分包排序
- 特殊标签

数组式角色数据继续兼容；若需要护甲、复杂上限、特殊字段，优先考虑对象式角色数据，但必须确认当前聚合层兼容。

图片路径统一走本包路径，不手写散乱路径：

```js
"ext:Zusfylri武将包/image/character/zus_example.png"
```

大图资源新增前应压缩，避免扩展加载和选将界面卡顿。

---

## 六、技能编写规范

普通触发技推荐顺序：

```js
trigger: {},
filter: function (event, player) {},
content: function () {},
ai: {},
```

硬规则：

- `filter` 只做判断，不做副作用。
- `filter` 不摸牌、不失牌、不改 storage、不随机、不做 UI。
- `content` 才做真正结算。
- 复杂数据读取尽量放进 `content` 当下 step，不提前在模块外层缓存。
- 技能描述里有“可以”，不要乱写 `forced: true`。
- 高频静默技能可以用 `popup: false`，但必须保留必要日志或提示。

触发视角必须先想清楚：

- `player`：拥有技能者为事件主体。
- `source`：拥有技能者为来源。
- `target`：拥有技能者为目标。
- `global`：监听全局事件。

事件后缀优先按语义选择：

- `Before`：事件前
- `Begin`：开始时
- `End`：结束后
- `After`：完全结算后

不要因为“差不多能触发”就乱用时机。

---

## 七、异步与 step 规范

新技能优先使用异步写法：

```js
async content(event, trigger, player) {
    await player.draw(1);
}
```

需要 `await` 的情况：

- 会触发事件链的操作，例如摸牌、弃牌、造成伤害、获得牌、使用牌。
- 等待玩家选择或确认的 `choose` 系列。
- `asyncDelay`、`asyncDelayx` 或其他 Promise。

不需要 `await` 的情况：

- 普通数学、字符串、数组、对象操作。
- 统计数据，例如 `countCards`、`countMark`、读取父事件名。
- 纯 storage、标记、UI 字段读写。若 UI 动画有时序要求，单独处理。

旧 step 写法仍可用，但必须遵守：

- 跨 step 共享数据写 `event.xxx`。
- 不依赖 `step 0` 的局部变量在 `step 1` 仍然存在。
- 每个 step 只做当前阶段必要的事情。

---

## 八、choose 与 cost 规范

选择类函数必须明确三件事：

- 选什么：牌、角色、按钮、数字、控制项。
- 能不能取消：是否传 `true` 或处理 `result.bool`。
- 结果放哪里：`event.cards / event.targets / event.cost_data` 或局部 `result`。

常用结果写法：

```js
const result = await player.chooseTarget("请选择一名角色").forResult();
if (!result.bool) return;
await result.targets[0].draw(1);
```

需要自定义提示时优先用 `.set("prompt", "...")`、`.set("prompt2", "...")`。

`dialog` 规范：

- 能让 choose 内部创建 dialog，就不要手动创建。
- 手动创建的 dialog 必须考虑关闭。
- 并非所有 choose 都支持数组式 dialog，使用前先查同类官方写法或已验证案例。

`cost` 使用规则：

- 有“先选择，选不到不算发动次数”的技能，优先使用 `cost`。
- `cost` 只做前置选择和代价确认。
- `content` 只读 `event.cards / event.targets / event.cost_data` 并执行效果。
- 使用 `cost` 的技能不要同时乱加 `direct: true` 或 `forced: true`，这可能跳过 cost。

---

## 九、storage、标记与子技能规范

storage 用于记录一局内状态，不等于 UI 标记。

推荐：

- 数组型记录用 `player.getStorage(skill)`、`player.markAuto(skill, value)`。
- 赋值后如需联机同步，使用项目 `Sync` 工具或 `player.syncStorage(key)`。
- 临时效果的 storage 放到带 `onremove: true` 的子技能上，方便自动清理。

标记规范：

- 需要显示给玩家看的状态必须写 `mark / marktext / intro`。
- 数量变化后要确认 UI 同步。
- 归零时应 `clearMark`、`unmarkSkill` 或移除对应显示。

子技能规范：

- 子技能 ID 使用 `主技能_子技能`。
- `group` 数组只挂真实需要同时拥有的子技能。
- 展示给玩家看的衍生技能写 `derivation`。
- 子技能不要偷偷承担主技能之外的大量隐藏规则。

---

## 十、卡牌与转化规范

固定转化牌优先贴近本体成熟写法。

动态转化牌优先考虑：

- `chooseButton`
- `backup`
- `viewAs`
- `chooseToUse`
- `chooseToRespond`

注意：

- `viewAs` 里不要默认 `cards[0]` 一定存在。
- 不要默认牌对象的 `name / suit / number / color / type / subtype` 都完整。
- 转化牌必须检查当前事件需求，不能在需要桃时转出无关牌。
- `player.useCard({ name: "sha" }, target)` 是手动拼使用牌链，不等同于标准 `viewAs`，必须额外检查合法目标、次数、距离和后续触发。

涉及牌移动：

- 优先使用 `gain`、`lose`、`discard`、`loseAsync` 等官方行为函数。
- 不直接把卡牌 DOM 塞进某个区域。
- `chooseToMove` 只负责分类和选择，后续牌堆、手牌、处理区移动必须单独结算。

---

## 十一、联机安全规范

联机模式下默认所有非同步状态都是风险点。

禁止：

- `Math.random()`
- `Date.now()`、`new Date()` 参与规则逻辑
- `setTimeout()`、`setInterval()` 参与规则逻辑
- `if (player == game.me)` 决定规则效果
- 直接 DOM 改游戏状态
- 主机创建了新对象但不广播、不同步

推荐：

- 随机统一走 `game.random()` 或项目 `RNG`。
- storage 变更后明确同步。
- 房主和客机都需要加载并启用同一个扩展。
- 新技能先单机测，再联机测。

联机测试至少看：

- 技能是否触发一致。
- 选择窗口是否两端表现正常。
- storage、标记、手牌、弃牌、处理区是否同步。
- 客机是否出现按钮不弹、目标不可选、牌对象字段丢失。

---

## 十二、运行时安全层规范

当前项目已经多次遇到运行时对象和牌字段失真，所以默认规则是：

- 运行时对象当下现取。
- 牌对象字段不盲信。
- helper 进入回调时要谨慎。

优先使用或补充这类安全函数：

- `runtimeLib()`
- `runtimeGame()`
- `runtimeGet()`
- `runtimeStatus()`
- `safeName(card, player)`
- `safeColor(card, player)`
- `safeType(card, player)`
- `safeSubtype(card, player)`

高危回调：

- 多 step `content`
- `chooseTarget.ai`
- `chooseButton.ai`
- `filterCard`
- `viewAs`
- `onChooseToUse`
- `mod.aiUseful / mod.aiValue`
- `intro.content`
- `hiddenCard / hiddenWuxie`

规则：

- 小逻辑优先内联。
- 必须复用的 helper 使用 `Zus.bindHelper(namespace, name, fn, globalName)` 注册稳定入口。
- 高危回调中只调用 `globalThis.zusXxx(...)` 或 `Zus.callHelper(...)`，不直接调用模块局部 helper。
- 跨 step 数据写 `event.xxx`。
- 不把关键 helper 半悬在模块局部作用域。

标准写法：

```js
function localJudge(card, player) {
    return globalThis.zusSafeColor(card, player) == "red";
}

Zus.bindHelper("example", "judgeRed", localJudge, "zusExampleJudgeRed");
```

高危回调中使用：

```js
filterCard: function (card, player) {
    return globalThis.zusExampleJudgeRed(card, player);
}
```

辅助检查：

```powershell
python helper_scope_scan.py
```

---

## 十三、AI 规范

AI 不是可有可无的装饰；技能逻辑修通后必须检查 AI。

最低要求：

- 主动技有基本 `ai.order / ai.result`。
- 选择牌时不要统一无脑打分。
- 选择目标时区分敌我、收益、风险。
- `chooseBool` 不直接 `return true`。
- 限定技、觉醒技、高代价技能要保守。

测试时不仅看“会不会发动”，还要看：

- 是否乱开。
- 是否对自己乱开。
- 是否错过明显收益。
- 是否因为候选顺序永远选择错误按钮。

---

## 十四、调试规范

遇到 bug 按这个顺序排查：

1. 模块是否加载。
2. 技能是否挂到角色身上。
3. trigger 是否真的来到。
4. `filter` 是否进入以及为何返回 false。
5. `content` 是否进入对应 step。
6. 当前 step 读到的数据源是否真实。
7. 牌对象字段是否失真。
8. storage、标记、UI 是否同步。
9. AI 是否误判。
10. 最后再查结算和文案。

调试日志原则：

- 临时日志要有明确前缀。
- 日志只服务定位，不长期污染技能。
- 修复完成后删除噪声日志，保留有价值的 docs 记录。
- 中文文件读写必须确认编码，避免把正常中文永久写坏。

---

## 十五、开发流程

新增武将：

1. 写角色数据和图片。
2. 确认技能分类。
3. 找本体或旧包最接近模板。
4. 写最小可跑版本。
5. 补翻译、标记、日志、AI。
6. 单机实测。
7. 联机实测。
8. 更新文档或变更记录。

修改旧技能：

1. 先读现有逻辑和历史调试记录。
2. 一次只改一个问题。
3. 不为了美观大重构稳定代码。
4. 先保留旧行为，再修明确 bug。
5. 修完做单机、必要时联机回归。

提交前检查：

- 没有 `Math.random()`。
- 没有规则逻辑依赖 `game.me`。
- 没有 filter 副作用。
- 没有跨 step 局部变量依赖。
- 没有高危回调引用局部 helper。
- storage 改动有同步或清理。
- 标记 UI 能显示、更新、归零。
- choose 取消分支已处理。
- cost 技能没有被 `direct / forced` 绕开。
- AI 不会明显乱开。
- 中文未乱码。

---

## 十六、我的写代码口令

写每个技能前先问：

1. 这个效果属于哪个标准事件链？
2. 有没有本体成熟技能可以参考？
3. `filter` 是否只做判断？
4. 这一步是否需要 `await`？
5. 联机下随机、storage、标记、UI 会不会不同步？
6. 这个 helper 进入回调后还安全吗？
7. 如果按钮不弹，我如何快速证明是 trigger、filter、候选、AI 还是 UI 的问题？

如果这七问答不清，先不要追求花活。无名杀扩展代码可以接地气，不要接地府。
