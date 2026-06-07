---
name: "haha-dev"
description: "哈包扩展开发规范。在编写或修改 apps/core/extension/哈包/ 下的任何代码时，必须先读取编程经验和AI审计经验文档再动手。"
---

# 哈包扩展开发规范

## 强制步骤

**编写任何 `apps/core/extension/哈包/` 下的代码前，必须先执行：**

1. 读取 [`apps/core/extension/哈包/编程经验.md`](../../apps/core/extension/哈包/编程经验.md) — 框架机制陷阱、API 正确用法
2. 读取 [`apps/core/extension/哈包/AI审计经验.md`](../../apps/core/extension/哈包/AI审计经验.md) — AI 块完整性、标签语义

如果改动涉及 AI 行为，必须执行四轮审计（块级缺失 → 内联 AI 完整性 → 语义正确性 → 标签完整性）。

## 速查清单

编写技能时逐项确认：

- [ ] viewAs 是函数形式 `viewAs(cards, player)`，非静态对象
- [ ] `filterCard: false` 写成了 `filterCard() { return false; }`（不能是布尔值）
- [ ] `canUse` / `inRange` 不在 `filter` 中调用（放 `cost` 中）
- [ ] 触发时机判断用 `event.triggername` 或 filter 第三参数 `name`，不用 `trigger.name`
- [ ] cost 传数据到 content 用 `event.result = { bool, cost_data: {...} }`
- [ ] `.forResult()` 返回值做了判空（`if (result && ...)`）
- [ ] `ai.result` 有消耗的技能用动态函数，非静态正值
- [ ] 回合内 `useCardAfter` 触发在 filter 首行检查 `_status.currentPhase === player`
- [ ] `lib.skill.global` 用 `.includes()` 不用 `.has()`
- [ ] 所有 `chooseXXX` 紧跟 `.set("ai", ...)` 或 `.forResult()`
- [ ] 调试的 Player API（`isDamaged` 等）真实存在
- [ ] `round: 1` / `usable: 1` 未误写在 viewAs 或父技能上

## 关键 API 对比

| 错误写法 | 正确写法 |
|---------|---------|
| `player.needsToRecover()` | `player.isDamaged()` |
| `lib.skill.global.has("x")` | `lib.skill.global.includes("x")` |
| `filterCard: false` | `filterCard() { return false; }` |
| `viewAs: { name: "sha" }` | `viewAs(cards, player) { return { name: "sha" }; }` |
| `trigger.name === "damageBegin3"` | filter 用 `name === "damageBegin3"`，content 用 `event.triggername` |
| `event.result.control`（content 中读 cost 结果）| `event.cost_data.control` |
| `chooseToDisable.set("ai", event => ...)` | `.set("ai", (event, player, list) => ...)` |
