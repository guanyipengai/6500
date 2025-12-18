# 人生牛市项目设计与开发计划

## 1. 总体目标

- 面向移动端优先的人生运势分析产品，核心能力：
  - 用户通过手机号 + 验证码登录/注册，可选填写邀请码。
  - 根据用户提供的命盘信息调用大模型，生成：
    - 多维度分析（性格、事业、财富、婚姻、健康、六亲、风水、币圈等）。
    - 1–100 岁人生 K 线图。
  - 邀请机制：每成功邀请若干新用户注册，可获得额外测算次数。
- 当前仓库已有一套前端原型（React + Vite + Recharts），未来作为参考保留在 `reference/` 目录，新实现按本设计逐步落地。

---

## 2. 用户流程设计（4 个页面）

### 2.1 第 1 页：登录 / 注册 + 邀请落地页（`/auth`）

- 入口：
  - 分享链接格式示例：`https://example.com/auth?ref=ED9E37`。
  - `ref` 参数即邀请码，页面加载时自动填入“邀请码”输入框（用户可修改或清空）。

- 表单字段：
  - 手机号（必填）。
  - 验证码（必填）。
  - 邀请码（选填，可通过 URL 带入）。

- 按钮与行为：
  - `发送验证码`：调用后端发送短信验证码（早期可 mock）。
  - `注册 / 登录`：
    - 首次手机号 + 验证码通过校验时，创建用户；
    - 若提供有效邀请码，则记录“被谁邀请”；
    - 非首次则视为登录，更新最近登录时间；
    - 成功后跳转到第 2 页 `/profile`。

- 邀请成功定义：
  - 当一个新用户使用某邀请码 + 手机号**成功注册**时，视为该邀请码“成功邀请 1 人”。

---

### 2.2 第 2 页：命盘基础信息表单（`/profile`）

- 目标：
  - 收集用于生成命理分析和 K 线的基础参数；
  - 页面底部展示邀请卡片（剩余次数 + 推广链接）。

- 表单字段（参考现有 `BaziForm`）：
  - 姓名（可选）。
  - 性别（必填，乾造/坤造）。
  - 出生年份（阳历，必填）。
  - 四柱干支（年柱、月柱、日柱、时柱，必填）。
  - 大运参数：
    - 起运年龄（虚岁，必填）。
    - 第一步大运干支（必填）。
  - （后端）模型、基座 URL、API Key 由后端配置，不再让用户填写。

- 邀请卡片（页面底部）：
  - 显示：
    - “今日剩余次数 5/5”。
    - “基础 5 次 / 推广 X 次”。
    - 专属推广链接（可复制）。
    - 简要规则说明（与 Figma 文案一致）。
  - 数据来源：
    - `GET /user/me` 或类似接口，返回今日配额和邀请统计。

- 提交按钮：
  - 按钮文案可沿用当前项目（如「生成人生 K 线」）。
  - 点击行为：
    1. 前端调用 `POST /analysis`，提交表单数据；
    2. 后端检查当日剩余次数，若不足则返回错误；
    3. 后端创建一条分析记录（状态 `pending`），启动后台任务调用大模型；
    4. 接口立即返回 `analysisId` 和输入信息；
    5. 前端跳转到 `/bazi/:analysisId`。

---

### 2.3 第 3 页：基础命理预览页（`/bazi/:analysisId`）

- 目标：
  - 作为“过渡页”，在后端后台调用大模型期间，向用户展示其基础命盘信息；
  - 提升可信度，让用户感觉不是“随便编数据”。

- 展示内容：
  - 用户刚刚填写的命盘信息：
    - 姓名、性别。
    - 出生年份、四柱干支。
    - 起运年龄、第一步大运干支。
    - 大运顺/逆行说明（可复用现有前端逻辑）。
  - 文案示例：
    - “请确认以下命盘信息是否正确，后续分析将基于这些信息展开。”

- 数据获取：
  - 可直接使用路由跳转时携带的 input 数据；
  - 或通过 `GET /analysis/:analysisId` 获取 `input_json` 回显。

- 按钮：
  - 文案示例：“开启我的人生牛市”。
  - 点击后跳转 `/result/:analysisId`。

---

### 2.4 第 4 页：分析结果 + 人生 K 线页（`/result/:analysisId`）

- 目标：
  - 展示由大模型生成的完整命理分析结果和人生 K 线图；
  - 在结果底部展示邀请卡片，形成闭环。

- 数据加载逻辑：
  - 页面加载时调用 `GET /analysis/:analysisId`：
    - 若 `status=pending`：
      - 显示“推演中(3–5 分钟)”的加载文案和动画；
      - 可以轮询该接口，直至状态变为 `done` 或 `error`。
    - 若 `status=done`：
      - 解析 `output_json` 为 `LifeDestinyResult`；
      - 渲染分析卡片和 K 线图。
    - 若 `status=error`：
      - 提示用户“分析失败，请稍后重试”，并可提供重试入口。

- 展示结构（从上到下）：
  1. 顶部标题 + 基本信息（可选）。
  2. 多个分析 block（参考当前项目 `AnalysisResult`）：
     - 命理总评。
     - 性格分析。
     - 事业行业。
     - 财富层级。
     - 婚姻情感。
     - 身体健康。
     - 六亲关系。
     - 发展风水。
     - 星座运势（关键年份 + 风格建议）。
  3. 人生 K 线图（1–100 岁），复用现有 `LifeKLineChart`：
     - 绿色 K 线代表运势上涨（吉），红色代表下跌（凶）。
     - 高点标红星，表现“人生巅峰年份”。
  4. 页面底部邀请卡片：
     - 显示：
       - 今日剩余次数 / 今日已用次数。
       - 累计邀请人数 / 今日新增邀请。
       - 专属推广链接，复制按钮。
       - 规则说明：每成功推荐 5 人，获得 +1 次额外机会，每天最多 +10 次等。

---

## 3. 大模型与数据结构设计

### 3.1 Prompt 模板与生成逻辑

- 模板来源：
  - 现有项目中的 `constants.ts` 中 `BAZI_SYSTEM_INSTRUCTION`。
  - 包含：
    - 年龄虚岁 1–100 岁。
    - 每年 `reason` 字段 20–30 字简要分析。
    - 所有评分使用 0–10 分。
    - 输出 JSON schema（包含 `bazi`、各维度分析、`chartPoints` 等）。

- user prompt 信息来源：
  - 使用第 2 页表单收集的信息：
    - 性别（乾造/坤造）。
    - 姓名（可选）。
    - 出生年份。
    - 四柱干支。
    - 起运年龄、第一步大运干支。
  - 补充大运顺逆行说明：
    - 基于年干阴阳 + 性别判断顺逆行。
    - 说明大运序列推演规则。

- 后端职责：
  - 使用系统 prompt + user prompt 调用大模型。
  - 处理模型输出：
    - 兼容 ```json ... ``` 包裹。
    - 校验 `chartPoints` 长度和字段完整性。
    - 将结果存入 `analyses.output_json`。

### 3.2 数据结构（与当前前端兼容）

- `LifeDestinyResult`：
  - `chartData: KLinePoint[]`
  - `analysis: AnalysisData`

- `KLinePoint`：
  - `age: number`
  - `year: number`
  - `ganZhi: string`
  - `daYun?: string`
  - `open, close, high, low: number`
  - `score: number`
  - `reason: string`

- `AnalysisData`：
  - `bazi: string[]`（年、月、日、时柱）
  - `summary + summaryScore`
  - `personality + personalityScore`
  - `industry + industryScore`
  - `fengShui + fengShuiScore`
  - `wealth + wealthScore`
  - `marriage + marriageScore`
  - `health + healthScore`
  - `family + familyScore`
  - `crypto + cryptoScore`
  - `cryptoYear`
  - `cryptoStyle`

---

## 4. 后端设计概要（Python）

### 4.1 技术栈建议

- 框架：FastAPI + Uvicorn。
- 持久化：PostgreSQL / MySQL（初期可 SQLite）。
- ORM：SQLAlchemy 或 Tortoise ORM。
- 背景任务：
  - FastAPI 内置 BackgroundTasks 足以支撑初期并发；
  - 若后期量增大，可引入 Celery + Redis。

### 4.2 核心数据模型

- `users`：
  - `id`
  - `phone`（唯一）
  - `referral_code`（系统生成的邀请码，用于分享）
  - `inviter_code`（记录该用户是由谁邀请）
  - `created_at`
  - `last_login_at`

- `invites`：
  - `id`
  - `inviter_user_id`
  - `invited_user_id`
  - `created_at`
  - 只要被邀请用户使用邀请码成功注册，就插入一条，作为“成功邀请”的记录。

- `analyses`：
  - `id`
  - `user_id`
  - `input_json`（保存第 2 页表单原始输入）
  - `output_json`（保存大模型返回的 JSON）
  - `status`：`pending | done | error`
  - `created_at`
  - `completed_at`
  - `error_message`（可选）

### 4.3 配额与邀请规则

- 每人每天基础测算次数 `base_quota = 5`。
- 额外次数：
  - 统计该用户当天“成功邀请注册”的人数 `success_invites_today`；
  - `extra_quota_today = min(floor(success_invites_today / 5), 10)`；
  - 即每成功邀请 5 人 +1 次额外机会，每天额外最多 +10 次。
- 剩余次数：
  - `used_today = 当天已完成的 analyses 条数（status=done）`；
  - `remaining = max(base_quota + extra_quota_today - used_today, 0)`。

### 4.4 主要后端接口草稿

- 认证相关：
  - `POST /auth/send-code`
    - 入参：`phone`。
    - 行为：发送短信验证码（早期可固定验证码或打印日志）。
  - `POST /auth/verify-code`
    - 入参：`phone, code, inviterCode?`。
    - 行为：
      - 若用户不存在：
        - 验证验证码；
        - 创建用户，生成 `referral_code`；
        - 若 `inviterCode` 合法，对应邀请人插入一条 `invites`。
      - 若用户存在：
        - 验证验证码；
        - 更新 `last_login_at`。
      - 返回认证 token 或 session。

- 用户信息与邀请统计：
  - `GET /user/me`
    - 返回：
      - 用户基础信息（phone、referral_code 等）。
      - 今日配额：`todayBaseQuota, todayExtraQuota, todayUsed, todayRemaining`。
      - 邀请统计：`totalInvited, invitedToday`。
      - 分享链接：`myReferralUrl`。

- 分析任务：
  - `POST /analysis`
    - 入参：命盘相关字段（第 2 页表单）。
    - 行为：
      - 检查今日剩余次数，若为 0 返回错误。
      - 创建 `analyses` 记录，`status=pending`，落地 `input_json`。
      - 启动后台任务调用大模型，填 `output_json`、更新 `status` 和 `completed_at`。
      - 返回 `analysisId` 和输入信息。
  - `GET /analysis/{id}`
    - 返回：
      - `status`
      - `input_json`
      - `output_json`（若 `status=done`）
      - （可选）基于 `output_json` 映射为前端需要的结构。

---

## 5. 前端架构与页面划分

### 5.1 路由结构

- 使用 React Router，将应用拆分为 4 个主要路由：
  - `/auth`：登录 / 注册 + 邀请落地页。
  - `/profile`：命盘基础信息表单页。
  - `/bazi/:analysisId`：基础命理预览页。
  - `/result/:analysisId`：分析结果 + K 线页。

### 5.2 页面组件职责

- `/auth`：
  - 解析 URL `ref`，填入邀请码输入框。
  - 表单提交时调用 `/auth/send-code` 和 `/auth/verify-code`。
  - 登录成功后保存 token（例如存在 localStorage 或内存），跳转 `/profile`。

- `/profile`：
  - 使用受控表单组件采集命盘信息。
  - 页面底部渲染邀请卡片（调用 `/user/me`）。
  - 提交时调用 `POST /analysis`，成功后跳转 `/bazi/:analysisId`。

- `/bazi/:analysisId`：
  - 展示来自上一步的输入（或从后端读取）。
  - 按钮点击后跳转 `/result/:analysisId`。

- `/result/:analysisId`：
  - 初次载入时轮询 `GET /analysis/:analysisId`。
  - `status=pending` 时展示 loading 区。
  - `status=done` 时使用数据渲染：
    - 分析卡片（复用当前 `AnalysisResult` 的思路）。
    - 人生 K 线图（复用当前 `LifeKLineChart` 的思路）。
  - 页面底部再渲染邀请卡片。

### 5.3 响应式与 UI

- 短期目标：
  - 以移动端体验为主，采用简单响应式布局（例如 TailwindCSS 的栅格和断点）。
  - 保证在常见手机尺寸（iPhone/安卓主流机型）上表单和结果页面可正常显示和交互。
- 长期目标：
  - 等完整 Figma 稿完成后：
    - 将 `figma/autohtml-project` 中的静态 HTML/CSS 设计抽象为 React 组件；
    - 统一视觉风格，补齐桌面端适配。

---

## 6. 开发阶段划分

### 阶段 1：后端骨架 + 用户/邀请模型

- 目标：
  - 搭建基础后端服务。
  - 完成手机号登录/注册、邀请码记录、邀请统计。

- 任务：
  - 搭 FastAPI 项目，配置数据库连接。
  - 建立 `users` 和 `invites` 表。
  - 实现：
    - `POST /auth/send-code`（mock 短信逻辑）。
    - `POST /auth/verify-code`（注册/登录 + 邀请记录）。
    - `GET /user/me`（返回用户信息 + 邀请统计）。

- 验证：
  - 使用 curl/Postman 走通注册 + 登录流程。
  - 验证使用不同 `referral_code` 注册时，`invites` 记录是否正确插入。

### 阶段 2：分析任务与大模型调用

- 目标：
  - 提供完整的分析 API，支持异步调用大模型。

- 任务：
  - 建立 `analyses` 表。
  - 实现配额逻辑：
    - 按当天使用情况和邀请情况计算剩余次数。
  - 实现：
    - `POST /analysis`：创建分析任务、检查配额、启动后台任务调用大模型。
    - `GET /analysis/{id}`：返回任务状态与结果。
  - 将现有前端的 prompt 拼接和 JSON 解析逻辑迁移到后端。

- 验证：
  - 构造若干输入，检查分析任务从 `pending` → `done` 的状态变化。
  - 校验输出结构与 `LifeDestinyResult` 对齐。

### 阶段 3：前端路由与基础页面骨架

- 目标：
  - 搭建 4 个路由页面，实现从登录到结果页的端到端用户流程（可先用 mock 或真实后端）。

- 任务：
  - 引入 React Router，配置 `/auth`、`/profile`、`/bazi/:id`、`/result/:id`。
  - 将现有 K 线和分析组件迁移为 `/result/:id` 的展示部分。
  - 实现基本表单和 API 调用逻辑，连接后端。

- 验证：
  - 手动走一遍完整流程：
    - 从分享链接进入 `/auth`（带 `ref`）；
    - 注册/登录 → `/profile` 填表；
    - 触发分析 → `/bazi/:id`；
    - 再进入 `/result/:id` 查看 loading 和最终结果。

### 阶段 4：邀请卡片 + 剩余次数逻辑 & 分享

- 目标：
  - 前端邀请卡片展示真实配额和邀请统计，分享链接可用。

- 任务：
  - 扩展 `GET /user/me` 返回配额与统计。
  - 在 `/profile` 和 `/result` 页面底部实现邀请卡片组件。
  - 实现“复制专属推广链接”功能。

- 验证：
  - 使用两个账号交叉测试邀请：
    - A 获取专属链接，B 使用该链接注册；
    - 检查 A 的邀请统计和配额变化；
    - 测试“每成功推荐 5 人 +1 次额外机会（每天最多 +10 次）”规则。

### 阶段 5：打磨与部署准备

- 目标：
  - 提升稳定性与用户体验，为接入完整 UI 设计和生产部署做准备。

- 任务：
  - 前端：
    - 初步优化移动端布局和样式。
    - 针对大模型超时、错误增加友好提示。
  - 后端：
    - 添加调用超时与错误重试机制。
    - 对分析接口做简单限流或防刷保护。
  - 文档：
    - 更新本设计文档，记录实现细节和接口变更。

- 验证：
  - `npm run build` + 手动 E2E 验证。
  - 简单并发测试（几十到几百并发请求）验证稳定性。

---

本文件用于指导后续的代码重构与新功能开发，现有前端原型将被迁移到 `reference/` 目录作为参考实现保留。未来如有设计稿或需求变更，可在该文档基础上迭代更新。
