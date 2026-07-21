/**
 * ========================================
 * Harness — AI Agent 主入口
 * ========================================
 *
 * 职责：
 * 1. 初始化技能注册表（skills）
 * 2. 启动主代理对话循环（agent_loop）
 * 3. 管理用户输入（readline）
 *
 * 工具调度逻辑已拆分到 tools/ 目录下，本文件仅保留编排层代码。
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions/completions";
import readline from "readline";
import {
  filter_tools,
  dispatchToolCall,
  initSkills,
  getSkillsPrompt,
  saveMessagesSnapshot,
} from "./tools";
import { get_system_prompt } from "./tools/system/getSystem";

// ---- OpenAI 客户端 ----
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// ---- 技能配置 ----
interface SkillDef {
  /** 技能名称（唯一标识） */
  name: string;
  /** 技能描述 */
  description: string;
  /** 技能文件路径 */
  path: string;
}

/** 所有可注册的技能 */
const skills: SkillDef[] = [
  {
    name: "learning-enhancer",
    description:
      "专业教学文档简化器 — 将复杂专业文档转化为易懂内容，保留专业概念并添加简单解释。用于简化专业且枯燥的教学文档，让人由浅入深学习并掌握知识。",
    path: "./skills/learning-enhancer.md",
  },
];

// 初始化技能注册表（必须在 load_skills 被调用之前执行）
initSkills(skills);
//当前最大token
let MAX_TOKENS = 200;
// ===== 常量配置（可根据需要调整） =====
const ESCALATED_MAX_TOKENS = 64000; // 首次提升后的最大输出 token 数
const MAX_RECOVERY_RETRIES = 3; // 最大续写重试次数
let state = false; //是否扩展最大token
let recovery_retries = 0; //续写重试次数
/**
 * 主代理对话循环。
 *
 * 每一轮：
 * 1. 构建系统提示词（含技能列表） + 历史消息
 * 2. 调用 DeepSeek 模型（带过滤后的工具列表）
 * 3. 如果是 stop → 结束本轮对话
 * 4. 如果是 tool_calls → dispatchToolCall 执行工具并注入结果 → 继续下一轮
 *
 * @param messages - 对话消息列表（会被修改）
 */
async function agent_loop(
  messages: ChatCompletionMessageParam[],
): Promise<void> {
  while (true) {
    const system_prompt = get_system_prompt();
    // 调用模型
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: system_prompt,
        },
        ...messages,
      ],
      tools: filter_tools("main"),
      max_tokens: MAX_TOKENS,
    });

    const choice = res.choices[0];
    console.log(choice);

    // 将模型回复添加到消息历史
    messages.push(choice.message as ChatCompletionMessageParam);
    saveMessagesSnapshot(messages, "main:模型回复", system_prompt);

    const { finish_reason } = choice;

    // 模型认为任务完成，结束循环
    if (finish_reason === "stop") break;

    // 模型请求调用工具
    if (finish_reason === "tool_calls" && choice.message.tool_calls) {
      try {
        await dispatchToolCall(choice.message.tool_calls, messages);
      } catch (error) {
        console.error("dispatchToolCall 意外错误:", error);
      }
    }
    if (finish_reason === "length") {
      //如果没有扩展token,那就扩展
      if (!state) {
        MAX_TOKENS = ESCALATED_MAX_TOKENS;
        state = true;
        continue;
      }
      //如果超过了64k仍然被截断了，那就先将内容添加到上下文中
      messages.push({
        role: "assistant",
        content: choice.message.content || "",
      });
      //如果在扩展了token下还是被截断了，那就进行续写，前提是没有超过续写次数
      if (recovery_retries < MAX_RECOVERY_RETRIES) {
        messages.push({
          role: "user",
          content: "输出抵达上线了,请从中断的位置进行续写",
        });
        recovery_retries++;
        continue;
      }
      console.log("模型输出超过最大token数，已截断");
      return;
    }
  }
}

// ---- 用户交互（readline） ----
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * 通过命令行向用户提问，返回用户的输入。
 * @param query - 提示文本
 * @returns 用户输入的字符串
 */
function askQuestion(query: string): Promise<string> {
  return new Promise<string>((resolve) => {
    rl.question(query, resolve);
  });
}

/**
 * 主函数：持续从命令行读取用户问题 → 启动 agent_loop → 重复。
 */
async function main(): Promise<void> {
  const messages: ChatCompletionMessageParam[] = [];

  while (true) {
    const userInput: string = await askQuestion("\n请输入问题: ");
    messages.push({ role: "user", content: userInput });
    saveMessagesSnapshot(
      messages,
      "main:用户输入",
      `你是一个专业的助手,你可以调用以下技能:\n${getSkillsPrompt()}`,
    );
    await agent_loop(messages);
  }
}

main();
