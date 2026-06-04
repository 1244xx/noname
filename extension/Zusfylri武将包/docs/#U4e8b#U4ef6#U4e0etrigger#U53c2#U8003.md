# 事件与 trigger 参考

当前项目应遵循：

- 开局发牌优先研究 `gameDraw` 事件链
- 普通摸牌使用 `player.draw()`
- 失去牌优先用 `player.lose()` / `player.loseToDiscardpile()`
- 不直接用 UI DOM 操作作为规则结算
