# 第二双眼睛

“第二双眼睛”现在是一个基于 Next.js 与 OpenAI Responses API 的界面评审工作台。

当前能力：

- 界面评审：上传界面截图，生成真实的结构化设计评审结果
- 可用性诊断：基于同一张截图输出任务路径与使用阻力诊断
- 风格提示词：当前仍为“即将上线”，未接入正式服务

## 主要文件

- `app/page.tsx`：Next.js 页面入口，复用现有工作台 UI
- `app/api/review/route.ts`：服务端评审接口，接收上传截图并调用 OpenAI
- `lib/openai/ui-review-prompt.ts`：OpenAI developer prompt
- `lib/openai/ui-review-schema.ts`：Structured Outputs / JSON Schema
- `lib/openai/ui-review-service.ts`：OpenAI Responses API 调用与结果校验
- `lib/openai/proxy-support.ts`：代理环境变量读取与 dispatcher 配置
- `types/ui-review.ts`：评审结果与接口类型定义
- `index.html`：现有页面结构源文件
- `styles.css`：现有界面样式与响应式布局
- `app.js`：前端上传、预览、模式切换与评审渲染逻辑

## 本地配置

1. 安装依赖

   ```bash
   npm install
   ```

2. 在项目根目录创建 `.env.local`

   ```bash
   OPENAI_API_KEY=你的_OpenAI_API_Key
   ```

3. 如果当前网络访问 `api.openai.com` 不稳定，可额外配置代理

   ```bash
   HTTPS_PROXY=http://127.0.0.1:7890
   HTTP_PROXY=http://127.0.0.1:7890
   NO_PROXY=localhost,127.0.0.1
   ```

4. 启动开发环境

   ```bash
   npm run dev
   ```

5. 打开浏览器访问

   ```text
   http://localhost:3000
   ```

## 评审接口

- 路由：`POST /api/review`
- 请求：`multipart/form-data`
  - `screenshot`：上传的界面截图
  - `context`：前端表单上下文 JSON
- 模型：`gpt-4.1-mini`
- 返回：`{ ok: true, result: UiReviewResult }`

返回结构至少包含：

- `overall_score`
- `dimension_scores.information_hierarchy`
- `dimension_scores.content_clarity`
- `dimension_scores.visual_balance`
- `dimension_scores.accessibility`
- `summary`
- `key_findings`
- `risks`
- `priorities`
- `confidence`
- `notes`

同时还会返回 `visible_interface_type` 和 `diagnosis`，用于驱动“可用性诊断”模式。

## 使用说明

- OpenAI 只会根据截图中可见内容生成结论，不会编造业务数据、用户调研或上线效果。
- 如果截图模糊、被裁切或关键区域不可见，返回的 `confidence` 会降低，并在 `notes` 中说明。
- 现有 UI 基本保持不变，前端会把服务端 JSON 映射到右侧评分卡片、中间结果区和诊断视图。
- 如果设置了 `HTTPS_PROXY / HTTP_PROXY`，服务端 OpenAI 请求会自动通过代理发送，并在日志中打印 `proxyEnabled` 状态。
