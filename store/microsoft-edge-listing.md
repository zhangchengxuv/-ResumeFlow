# Microsoft Edge Add-ons Listing Draft

## Package

- Upload package: `release/resumeflow-edge-0.1.0.zip`
- Extension logo: `public/icons/icon-300.png`
- Suggested category: Productivity
- Remote code: No
- Mature content: No

## Extension Name

ResumeFlow

## Short Description

本地优先的求职表单助手，快速插入简历资料、常用文本并记住网站字段映射。

## Store Description

ResumeFlow 是一个本地优先的求职表单助手，适用于招聘网站、公司招聘官网以及常见在线求职表单。它帮助用户维护结构化简历资料和常用回答，在填写网页表单时快速插入合适内容，减少重复输入。

扩展提供 Microsoft Edge Side Panel 侧边栏体验。用户可以先点击网页中的输入框，ResumeFlow 会记录当前正在填写的字段，并在资料库中根据字段名称、占位符、标签和所在区域推荐相关素材。用户确认后点击素材即可插入，不会在未经确认的情况下自动提交表单。

ResumeFlow 支持姓名、电话、邮箱、教育经历、项目经历、实习经历、技能、自我评价、职业规划等常见求职资料。资料库支持搜索、收藏、最近使用、分类管理和追加插入。对于用户手动校正过的网站字段，扩展会按域名保存本地映射，下次遇到相似字段时优先使用历史设置。

所有简历数据和字段映射默认保存在浏览器本地存储中。扩展不包含广告、分析 SDK 或远程代码，不会自动向招聘网站提交表单。由于网页组件实现方式不同，跨域 iframe、closed Shadow DOM、canvas 自绘控件或极端自定义编辑器可能无法直接填写，需要用户手动复制或站点级适配。

## Search Terms

resume, job, application, form filling, 求职, 简历, 招聘, 表单填写, 常用文本

## Single Purpose

帮助用户在求职表单中快速插入和管理本地简历资料、常用文本及网站字段映射。

## Permission Justification

- `storage`: 保存用户在本地维护的简历资料、常用文本、收藏、最近使用记录和字段映射。
- `activeTab`: 在用户当前激活的招聘表单页面中扫描字段并执行用户主动触发的插入。
- `sidePanel`: 提供 Microsoft Edge 侧边栏界面。
- `tabs`: 获取当前活动标签页，以便 Side Panel 与页面 content script 通信。
- `clipboardWrite`: 用户点击复制素材时写入剪贴板。
- Host permissions `<all_urls>`: 允许扩展在不同招聘网站和公司官网表单中识别可编辑字段。扩展只在用户使用时读取表单结构，不会自动提交网页内容。

## Privacy Disclosure Draft

- Data stored locally: resume profile, reusable text snippets, favorites, recent usage metadata, domain field mappings.
- Data transmitted externally by the extension: none.
- Remote code: none.
- Analytics/ads: none.
- User control: users can edit or delete stored snippets and resume data from the extension UI.

## Notes For Certification

ResumeFlow requires a webpage with editable fields to demonstrate insertion. To test:

1. Load the extension.
2. Open any regular webpage containing `input`, `textarea`, `select`, or `contenteditable` fields.
3. Click a webpage field.
4. Open the ResumeFlow Side Panel.
5. Use the library item click action to insert text into the last active field.
6. Use Current Page to scan and review high-confidence mappings before batch filling.

