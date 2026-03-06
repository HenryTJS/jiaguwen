# 甲骨文学习小程序

基于微信小程序原生框架开发的学习类项目，聚焦甲骨文入门与文化展示，包含每日卜辞、字典浏览、详情互动（点赞/评论）等功能。

## 项目简介

- 端侧：微信小程序（JavaScript + WXSS/SCSS）
- 后端：微信云开发（云函数 + 云数据库）
- 渲染：`Skyline` + `glass-easel`
- 当前定位：课程/作品型项目，可继续扩展为完整学习应用

## 主要功能

### 1. 首页（`pages/newpage/newpage`）

- 展示入口卡片（字典、场景等）
- 提供“今日卜辞”能力
- 支持分享给好友/分享到朋友圈
- 未开放功能（资源下载、商城）会给出提示

### 2. 字典页（`pages/partone/partone`）

- 读取 `miniprogram/utils/data.js` 的甲骨文字数据
- 支持关键词搜索
- 点击进入详情页
- 列表内支持点赞、评论入口

### 3. 文字详情页（`pages/worddetail/worddetail`）

- 展示单字图片与信息
- 支持点赞/取消点赞
- 支持评论发布与删除（仅可删除本人评论）

### 4. 个人中心（`pages/mine/mine`）

- 展示用户登录态和用户信息
- 依赖云函数获取 `openid`

## 技术与依赖

- 微信小程序原生框架
- 云函数：`wx-server-sdk`
- 类型定义：`miniprogram-api-typings`
- 其他：无重型第三方 UI 或状态管理依赖

> 说明：仓库根目录 `package.json` 主要用于开发期类型依赖；运行环境以微信开发者工具为主。

## 目录结构

```text
.
├─ cloudfunctions/
│  ├─ login/               # 获取当前用户 openid
│  └─ cleanupLikes/        # 清理重复点赞记录
├─ miniprogram/
│  ├─ app.js               # 小程序入口与云环境初始化
│  ├─ app.json             # 全局路由与窗口配置
│  ├─ components/
│  │  └─ word-item/
│  ├─ pages/
│  │  ├─ newpage/          # 首页
│  │  ├─ index/            # 登录/授权页
│  │  ├─ mine/             # 个人中心
│  │  ├─ partone/          # 字典页
│  │  ├─ parttwo/          # 预留页面
│  │  ├─ mapdetail/        # 场景详情
│  │  └─ worddetail/       # 文字详情
│  └─ utils/
│     ├─ data.js           # 甲骨文字数据
│     ├─ today.js          # 今日卜辞数据
│     ├─ map.js            # 场景数据
│     └─ util.js           # 通用工具
└─ typings/                # 微信 API 类型声明
```

## 运行方式

### 1. 准备环境

- 安装微信开发者工具
- 准备一个可用的小程序 AppID
- 开通云开发环境

### 2. 导入项目

1. 使用微信开发者工具打开仓库根目录（包含 `project.config.json`）。
2. 确认项目配置中的 `miniprogramRoot` 为 `miniprogram/`。
3. 根据你的账号调整 `appid`（`project.config.json`）。

### 3. 配置云开发

1. 在微信开发者工具中开通并绑定云环境。
2. 修改 `miniprogram/app.js` 中 `wx.cloud.init({ env: '...' })` 的环境 ID。
3. 上传并部署云函数：
   - `cloudfunctions/login`
   - `cloudfunctions/cleanupLikes`

### 4. 初始化云数据库（建议）

项目代码中会使用以下集合，请先创建：

- `likes`
- `comments`
- `daily_oracle`

可按需设置读写权限，开发阶段可先使用较宽松规则，发布前再收紧。

## 云函数说明

### `login`

- 功能：返回当前用户 `openid/appid/unionid`
- 调用位置：`miniprogram/app.js`

### `cleanupLikes`

- 功能：按 `type + key + _openid` 去重点赞数据
- 参数：
  - `dryRun: true` 仅统计，不删除
  - `dryRun: false` 执行删除

示例：

```js
wx.cloud.callFunction({
  name: 'cleanupLikes',
  data: { dryRun: true }
})
```

## 已知说明

- `parttwo` 当前为预留页面。
- 部分首页入口仅展示“暂未开通”提示。
- 点赞数量在前端按“同一用户只计 1 次”逻辑聚合统计。

## 开发建议

- 新增文字时，优先更新 `miniprogram/utils/data.js` 并补充图片资源。
- 扩展每日卜辞时，更新 `miniprogram/utils/today.js`。
- 若互动数据量增长，建议补充索引并优化查询。

## License

见 `LICENSE` 文件。
