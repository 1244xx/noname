# Zusfylri武将包系统性修复报告

本版针对 1.11.2 中高频出现的 `security.js:188`、`StepCompiler.js`、`arrangeTrigger`、`chooseToUse` 阶段报错做系统性修复。

## 1. 新增 core/helper.js

新增全局安全层：

- `Zus.safeName(card, player)`：安全获取牌名，避免空 card / 虚拟牌导致 `reading 'name'`。
- `Zus.safeType(card, player)`：安全获取类型，避免 `reading 'type'`。
- `Zus.safeSubtype(card, player)`：安全获取子类型。
- `Zus.players()` / `game.zusSafePlayers()`：安全获取场上角色。
- `Zus.currentPhase(event)`：优先从事件父链读取当前回合角色，再用 `_status.currentPhase` 兜底。
- `Zus.safeCanUse(player, card, target)`：安全判断虚拟牌是否能指定目标。

同时对 `get.name/get.type/get.type2/get.subtype` 做了安全包装，防止 1.11.2 在预检测阶段传入空虚拟牌时直接炸。

## 2. extension.js 加载顺序

加入：

```js
lib.init.js(base + "core", "helper");
```

加载顺序为：`rng -> sync -> helper -> module -> character/index`。

## 3. 联机随机修复

重写 `core/rng.js`，移除 `Math.random()` 兜底。没有 `game.random` 时返回稳定兜底，避免联机不同步风险。

## 4. 批量修复高危写法

重点处理：

- `get.name(card)` 裸调用
- `get.type(card)` 裸调用
- `lib.card[name]` 空对象访问
- `game.players` 空对象访问
- `_status.currentPhase` 不稳定访问
- `player.canUse(card,target)` 在虚拟牌为空时触发沙盒报错

## 5. 重点模块修复

### langyan.js

修复 `zus_shuangmo_mod.mod.targetInRange` 中裸 `get.name(card)` 导致的 `reading 'name'`。

### jingyou.js

保留原【天敕】设计，只将安全目标判断挂到 `game.zusJingyouCanUse`，避免 StepCompiler 丢失局部函数作用域。

### shanshang.js

修复【萤焰】自己的回合内误触发：改用事件父链 `phase` 判断当前回合角色。

### gazi.js

增强【狂宴】对【酒】进入弃牌堆的监听，兼容 `getd()`、`event.cards`、`event.cards2` 与 `useCardAfter`。

### lier.js / kobe.js / ningji.js / dingzhen.js / zhaoyun.js 等

替换高危 `get.type/get.name/_status.currentPhase/game.players` 使用点。

## 6. 验证

已对包内所有 JS 文件执行 `node --check` 语法检查，通过。

## 7. 注意

本版目标是先解决“进局、出牌、预检测阶段频繁崩溃”的系统性问题，不做技能强度平衡调整。
