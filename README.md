# ResumeFlow

ResumeFlow 是一个本地优先的 Chromium 浏览器扩展。它使用规则评分识别招聘页面中的表单字段，在 Side Panel 中让用户先检查映射，再由用户主动将本地简历写入网页。

## 功能

- 使用 Manifest V3，支持 Chrome、Microsoft Edge 和其他 Chromium 浏览器
- 在 `chrome.storage.local` 中编辑、保存结构化简历；无服务器、分析 SDK、广告或遥测
- 扫描 `input`、`textarea`、`select`、`contenteditable` 和常见 ARIA 自定义控件，包括开放的 Shadow DOM
- 综合 label、placeholder、name/id、ARIA、autocomplete、邻近文字和冲突词进行评分
- 展示置信度、评分依据，允许逐项取消或手动修改映射
- 通过原生 value setter 兼容 React/Vue 控制表单，并触发 `input`、`change`、`blur`
- 管理多段教育、项目、实习/工作经历，以及可复制或插入当前网页的常用文本
- 附带完全虚构的 Demo Resume 和本地字段识别测试页

## 开发与验证

需要 Node.js 22.13 或更高版本（推荐当前 LTS）。

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

生产构建输出到 `dist/`。`npm run dev` 可预览 Side Panel UI；浏览器 API 相关功能需要加载构建后的扩展验证。

## 加载到 Chrome

1. 执行 `npm run build`。
2. 打开 `chrome://extensions`。
3. 打开右上角“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择本项目的 `dist` 目录。
5. 打开普通网页或招聘表单，刷新一次页面以注入 Content Script。
6. 点击工具栏中的 ResumeFlow 图标，Side Panel 会打开。

## 加载到 Microsoft Edge

1. 执行 `npm run build`。
2. 打开 `edge://extensions`，启用“开发人员模式”。
3. 点击“加载解压缩的扩展”，选择 `dist` 目录。
4. 打开或刷新待填写页面，然后点击扩展图标。

## 使用测试页

最方便的方式是启动本地服务器：

```bash
npm run dev
```

然后访问 `http://localhost:5173/dev/form-test.html`。确保已加载扩展并刷新测试页，再从 Side Panel 扫描。页面底部会实时记录填表产生的 `input`、`change` 和 `blur` 事件。

也可直接打开 `dist/dev/form-test.html`。使用 `file://` 页面时，需要在扩展详情中开启“允许访问文件网址”。

## 目录

```text
src/background/   Side Panel 行为与 Service Worker
src/content/      DOM 扫描和可靠填表
src/matcher/      关键词规则与评分器
src/storage/      Demo 数据及本地持久化
src/adapters/     Resume Schema 到可填写值的转换
src/sidepanel/    React Side Panel 与四个功能页面
src/components/   通用 UI 组件
src/types/        数据模型与消息协议
dev/              本地字段识别测试页
tests/            Matcher 和 Form Filler 自动化测试
```

## 当前限制

- V0.1 使用规则匹配，不使用 AI；新网站的特殊文案可能需要手动改映射。
- 多段经历自动填表时默认使用第一条记录。重复表单分组的条目索引识别留待后续版本。
- 可扫描开放的 Shadow DOM，无法访问浏览器安全模型禁止的 closed Shadow DOM、跨域 iframe、`chrome://` 与 `edge://` 页面。
- 网站自行实现的复杂下拉框可能需要站点适配器；原生 select、input、radio、checkbox 和 contenteditable 已支持。
- 数据尚未本地加密；存储接口已独立封装，便于后续加入加密层。
