# Repository Guidelines

## Project Structure & Module Organization

- `docs/`: 设计与需求文档（例如 `docs/design-and-plan.md`）。
- `reference/`: 旧版前端实现（Vite + React），保留作为参考。
  - `reference/index.tsx` / `reference/App.tsx`: app entry + top-level UI composition。
  - `reference/index.html`: Vite HTML entry（包含 Tailwind CDN + 全局样式）。
  - `reference/components/`: React UI 组件（PascalCase 文件名，例如 `ImportDataMode.tsx`）。
  - `reference/services/`: 有副作用的逻辑（LLM/API 调用），例如 `services/geminiService.ts`。
  - `reference/constants.ts`: 共享常量，包括系统提示词 `BAZI_SYSTEM_INSTRUCTION`。
  - `reference/types.ts`: 共享 TypeScript 类型。
  - `reference/assets/`: README 中使用的截图。
  - `reference/mock-data.json`: 本地演示数据（当 `apiKey === "demo"` 时使用）。
- 新的前后端代码将放在仓库根目录或单独子目录（例如 `backend/`, `frontend/`）。如有需要，可在对应目录下再添加更细的 `AGENTS.md` 说明。

## Build, Test, and Development Commands

- 旧版前端（`reference/`）：
  - `npm install`: install dependencies.
  - `npm run dev`: start the Vite dev server for local development.
  - `npm run build`: create a production build (primary “CI check”).
  - `npm run preview`: serve the production build locally to verify output.
- 新增的后端或前端子项目，请在各自目录下维护独立的运行/构建命令（例如 `backend/README.md`、`frontend/README.md`）。

## Coding Style & Naming Conventions

- `reference/` 目录：
  - Language: TypeScript + React function components with hooks.
  - Naming: components `PascalCase`, functions/vars `camelCase`, constants `UPPER_SNAKE_CASE`.
  - Formatting: no formatter/linter is configured; match the surrounding file’s style and avoid reformatting unrelated lines.
  - Organization: keep UI in `components/`, API/prompt logic in `services/`, and shared prompt/schema changes in `constants.ts`/`types.ts`.
- 新增后端（Python 等）：
  - 保持文件和模块命名清晰（例如 `snake_case.py`）。
  - 避免在没有本地格式化配置的情况下大范围重排已有代码。

## Testing Guidelines

- `reference/` 旧版前端：
  - No automated test framework is configured in `package.json`.
  - Validate changes by running `npm run build` and doing a quick smoke test via `npm run dev`.
  - For prompt/API flows, prefer `apiKey: "demo"` to load `mock-data.json` while iterating.
- 新增后端/前端工程：
  - 尽量提供最小的本地验证命令（例如 `pytest`、`npm run test`），并在各自 README 中记录。

## Commit & Pull Request Guidelines

- This checkout may not include `.git` history; use clear, imperative commit messages (or Conventional Commits like `feat: ...`, `fix: ...`).
- PRs should include: what changed, how to verify (`npm run build` output), and screenshots for UI changes.
- 如果修改旧版前端的 prompt 或 JSON schema，保持以下内容同步：
  - system prompt in `reference/constants.ts`
  - prompt copy flow in `reference/components/ImportDataMode.tsx`
  - API request/response parsing in `reference/services/geminiService.ts`
- 新版后端如果调整接口或数据结构，请同步更新：
  - `docs/design-and-plan.md`
  - 新前端中对应的类型定义和解析逻辑。

## Security & Configuration Tips

- Never commit API keys. Keep credentials user-supplied (current UI) or use local env files if you introduce them.
- `apiBaseUrl` targets an OpenAI-compatible `/chat/completions` endpoint; treat it as configurable and document any defaults you change.
