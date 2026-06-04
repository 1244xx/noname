# Helper作用域风险补充

这份补充文档专门记录一个高频坑：

`在无名杀里，helper 一旦进入回调式入口，就必须非常慎重。`

---

## 1. 典型现象

很多 bug 表面看像是技能逻辑写错了，实际报错却总是这类：

- `safeName is not defined`
- `safeAttitude is not defined`
- `sourceCard is not defined`
- `zusZhishiShaTargetEnabled is not defined`

共同点是：

- 技能大方向是对的
- 但一进入 `step`、`chooseTarget`、`chooseButton`、`mod`、`AI` 回调，就突然找不到外层 helper

---

## 2. 根因

无名杀很多技能回调不是按普通 JavaScript 闭包直接执行的，而是可能会被引擎：

- 延后执行
- 转字符串
- 重新包装
- 再编译
- 放进另一层执行器里调用

一旦经过这条链，外层局部作用域就不再可靠。

所以在无名杀里要默认：

`只要一个函数可能被引擎延后、转译、包装、跨上下文执行，就不要假设它还能安全访问外层局部 helper。`

---

## 3. 高危位置

下面这些位置默认都按“可能丢外层作用域”处理：

- `content` 的多 `step`
- `chooseTarget` 的过滤函数和 `ai`
- `chooseButton` 的 `ai`
- `filterCard`
- `viewAs`
- `onChooseToUse`
- `mod.aiUseful / mod.aiValue`
- `intro.content`
- 各类 `filter / ai / hiddenCard / hiddenWuxie` 回调

---

## 4. 写法原则

### 4.1 小逻辑优先内联

能在当前回调里直接写完，就不要先抽局部 helper。

### 4.2 需要复用的 helper 挂全局安全入口

例如：

- `globalThis.zusSafeColor`
- `globalThis.zusResolveFengzhaoTarget`
- `globalThis.zusZhishiShaTargetEnabled`
- `Zus.callHelper("namespace", "helperName", ...)`

当前 `core/helper.js` 已提供稳定注册入口：

```js
Zus.bindHelper("namespace", "helperName", helperFn, "zusGlobalHelperName");
```

这会同时注册：

- `Zus.helpers.namespace.helperName`
- `Zus.callHelper("namespace", "helperName", ...)`
- `globalThis.zusGlobalHelperName(...)`

进入高危回调时，优先调用 `globalThis.zusGlobalHelperName(...)` 或 `Zus.callHelper(...)`，不要直接调用模块局部 helper。

如果 helper 只在本模块普通同步逻辑中使用，可以继续保持局部；但一旦会进入 `step / ai / filterCard / viewAs / mod / intro`，必须注册稳定入口。

### 4.3 `step` 之间共享数据只写 `event.xxx`

不要依赖 `step 0` 的局部变量能活到 `step 1`。

### 4.4 命名约定

- `localXxx`：只允许当前同步段或当前 step 内使用。
- `zusXxx`：允许注册到 `globalThis` 给高危回调使用。
- `Zus.bindHelper(namespace, name, fn, globalName)`：模块级复用 helper 的标准出口。

### 4.5 扫描工具

新增 `helper_scope_scan.py` 用于粗扫高危回调中的局部 helper 引用。

运行：

```powershell
python helper_scope_scan.py
```

输出：

- `helper_scope_scan_report.json`

注意：扫描是启发式的，会有误报；它用于提醒人工复核，不替代实机测试。

---

## 5. 对新架构的提醒

新架构更容易为了整洁先抽 helper，但无名杀引擎恰好对这种“整洁抽 helper”的写法最不友好。

所以当前项目最稳的策略仍然是：

`外层保持新架构组织，内层技能尽量旧架构写法。`

更具体一点就是：

- 能内联就内联
- 必须复用就上 `globalThis`
- 模块间复用优先 `Zus.bindHelper / Zus.callHelper`
- 跨 `step` 传数据就写 `event`

---

## 6. 结论

以后写技能时，把这条当硬规则：

`helper 一旦进入回调式入口，就要慎重；能内联就内联，必须复用就挂 globalThis，跨 step 共享就写 event。`
