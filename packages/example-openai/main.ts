#!/usr/bin/env node

/**
 * WeChat + OpenAI example.
 *
 * Usage:
 *   npx tsx main.ts login              # QR-code login
 *   npx tsx main.ts list               # List logged-in accounts
 *   npx tsx main.ts start              # Start bot (all accounts)
 *
 * Environment variables:
 *   OPENAI_API_KEY      — Required
 *   OPENAI_BASE_URL     — Optional: custom API base URL
 *   OPENAI_MODEL        — Optional: model name (default: gpt-5.4)
 *   SYSTEM_PROMPT       — Optional: system prompt for the agent
 */

import { listWeixinAccountIds, login, startMultiple } from "weixin-agent-sdk";

import { OpenAIAgent } from "./src/openai-agent.js";

const command = process.argv[2];

async function main() {
  switch (command) {
    case "login": {
      await login();
      break;
    }

    case "list": {
      const ids = listWeixinAccountIds();
      if (ids.length === 0) {
        console.log("没有已登录的账号");
      } else {
        console.log(`已登录的账号 (${ids.length} 个):`);
        ids.forEach((id: string) => console.log(`  - ${id}`));
      }
      break;
    }

    case "start": {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("错误: 请设置 OPENAI_API_KEY 环境变量");
        process.exit(1);
      }

      const agent = new OpenAIAgent({
        apiKey,
        baseURL: process.env.OPENAI_BASE_URL,
        model: process.env.OPENAI_MODEL,
        systemPrompt: process.env.SYSTEM_PROMPT,
      });

      // Graceful shutdown
      const ac = new AbortController();
      process.on("SIGINT", () => {
        console.log("\n正在停止...");
        ac.abort();
      });
      process.on("SIGTERM", () => ac.abort());

      const accountIds = process.env.WEIXIN_ACCOUNT_IDS?.split(",").map(s => s.trim()).filter(Boolean);

      if (accountIds && accountIds.length > 0) {
        console.log(`启动指定账号: ${accountIds.join(", ")}`);
        await startMultiple(agent, { accountIds, abortSignal: ac.signal });
      } else {
        await startMultiple(agent, { abortSignal: ac.signal });
      }
      break;
    }

    default:
      console.log(`weixin-agent-openai — 微信 + OpenAI 示例

用法:
  npx tsx main.ts login              扫码登录微信
  npx tsx main.ts list               列出已登录的账号
  npx tsx main.ts start              启动 bot (所有账号)

环境变量:
  OPENAI_API_KEY           OpenAI API Key (必填)
  OPENAI_BASE_URL          自定义 API 地址
  OPENAI_MODEL             模型名称 (默认 gpt-5.4)
  SYSTEM_PROMPT            系统提示词
  WEIXIN_ACCOUNT_IDS       指定要启动的账号 (逗号分隔，可选)`);
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
