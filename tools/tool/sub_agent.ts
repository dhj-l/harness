/**
 * ========================================
 * 子代理调度器（spawn_subagent）
 * ========================================
 *
 * 子代理是一个独立的 agent 循环，用于处理复杂任务。
 * 它会创建自己的对话上下文，在限定轮数内调用可用工具
 * 来解决问题，最终通过 summarize_subAgent 上报结果。
 *
 * 重要设计决策：
 * - 本文件自建 switchTools（不含自身），避免循环导入 index.ts
 * - 自建 filter_tools，使用独立的黑名单过滤
 * - 复用 definitions.ts 中的 tools 数组和常量，无循环引用风险
 */

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
} from "openai/resources/chat/completions/completions";
import { tools, subagent_tools_blacklist, DEEP_NUM } from "../definitions";
import { saveMessagesSnapshot } from "../snapshot";
import { get_weather } from "./get_weather";
import { read_file } from "./read_file";
import { write_file } from "./write_file";
import { list_directory } from "./list_directory";
import { search_files } from "./search_files";
import { search_content } from "./search_content";
import { delete_file } from "./delete_file";
import { file_info } from "./file_info";
import { load_skills } from "./load_skills";
import { summarize_subAgent } from "./summarize_subAgent";
import { ask_user } from "./ask_user";
import { write_memory, read_memory, list_memories } from "./memory";
import { calculate } from "./calculate";
import { encode_decode } from "./encode_decode";
import { hash_string } from "./hash_string";
import { transform_data } from "./transform_data";
import { generate_uuid } from "./generate_uuid";
import { fetch_url } from "./fetch_url";
import { web_search } from "./web_search";
import { git_tools } from "./git_tools";

/**
 * 子代理可用的工具映射表。
 * 注意：不包含 spawn_subagent 自身，防止无限嵌套。
 */
const switchTools: Record<string, (args: any) => any> = {
  get_weather,
  read_file,
  write_file,
  list_directory,
  search_files,
  search_content,
  delete_file,
  file_info,
  load_skills,
  summarize_subAgent,
  ask_user,
  write_memory,
  read_memory,
  list_memories,
  calculate,
  encode_decode,
  hash_string,
  transform_data,
  generate_uuid,
  fetch_url,
  web_search,
  git_tools,
};

/**
 * 根据角色过滤工具列表。
 * @param tools - 完整工具定义列表
 * @param role  - 调用角色（subagent | main），默认为 subagent
 * @returns 过滤后的工具列表
 */
function filter_tools(tools: readonly any[], role: string = "subagent"): any[] {
  if (role === "subagent") {
    // 子代理移除黑名单中的工具
    return tools.filter(
      (tool: any) => !subagent_tools_blacklist.includes(tool.function.name),
    );
  }
  // 主代理移除 summarize_subAgent（子代理专用工具）
  return tools.filter(
    (tool: any) => tool.function.name !== "summarize_subAgent",
  );
}

/** DeepSeek API 客户端实例 */
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

interface SpawnSubagentParams {
  /** 子代理的系统提示词 */
  system_prompt: string;
  /** 子代理的用户提示词（任务描述） */
  prompt: string;
  /** 问题的复杂度等级，影响最大思考轮数 */
  deep?: "low" | "medium" | "high";
}

/**
 * 启动一个子代理来解决复杂任务。
 *
 * 工作流程：
 * 1. 根据 deep 参数决定最大迭代轮数
 * 2. 在每一轮中调用 DeepSeek 模型，传递过滤后的工具列表
 * 3. 如果模型调用工具则执行并注入结果
 * 4. 如果模型选择 stop 结束且未调用 summarize_subAgent，给予警告重试
 * 5. 当模型调用 summarize_subAgent 或超过最大重试次数时结束
 *
 * @param params.system_prompt - 子代理的系统提示词
 * @param params.prompt        - 用户提示词（任务描述）
 * @param params.deep          - 复杂度等级，默认 "low"
 * @returns 子代理的最终答案
 */
export async function spawn_subagent({
  system_prompt,
  prompt,
  deep = "low",
}: SpawnSubagentParams): Promise<string> {
  const size: number = DEEP_NUM[deep];

  // 初始化子代理对话消息列表
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${system_prompt}\n\n【重要规则】当你完成任务并找到最终答案后，必须调用 summarize_subAgent 工具返回答案，禁止直接输出文本。直接输出文本的答案将不被接受，你会被要求重新使用 summarize_subAgent 工具返回。`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  let isEnd: boolean = false;
  let content: string = "";
  let stopRetryCount: number = 0;
  const MAX_STOP_RETRIES: number = 3;

  // 迭代循环，最多 size 轮
  for (let i = 0; i < size; i++) {
    // 调用 DeepSeek 模型
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages,
      tools: filter_tools(tools),
    });

    const choice = res.choices[0];
    const { finish_reason } = choice;

    // 将模型回复追加到消息历史
    messages.push(choice.message as ChatCompletionMessageParam);
    saveMessagesSnapshot(messages, "subAgent:模型回复");

    // ---- 情况1：模型调用了工具 ----
    if (finish_reason === "tool_calls" && choice.message.tool_calls) {
      for (const tool of choice.message.tool_calls) {
        // 只处理 function 类型的工具调用（跳过 custom 类型）
        if (tool.type !== "function") continue;
        const fnTool = tool as ChatCompletionMessageFunctionToolCall;

        const { name, arguments: args } = fnTool.function;
        const fn = switchTools[name];
        if (!fn) throw new Error(`工具 ${name} 不存在`);

        console.log(args, fn, "子代理");
        const argObj = JSON.parse(args);
        const result = await Promise.race([
          fn(argObj),
          new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error("工具调用超时 (30s)")), 30000)
          ),
        ]);

        // 将工具调用结果注入消息列表
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: tool.id,
        } as ChatCompletionMessageParam);
        saveMessagesSnapshot(messages, `subAgent:工具结果:${name}`);

        // 如果模型调用了 summarize_subAgent，标记结束
        if (name === "summarize_subAgent") {
          isEnd = true;
          content += result;
        }
      }
    }

    // ---- 情况2：模型直接 stop（未使用 summarize_subAgent）----
    if (finish_reason === "stop") {
      stopRetryCount++;
      if (stopRetryCount >= MAX_STOP_RETRIES) {
        // 超过最大重试次数，强行以当前消息作为答案
        content = summarize_subAgent({ content: choice.message.content || "" });
        isEnd = true;
      } else {
        // 给予警告，要求模型使用 summarize_subAgent 返回
        messages.push({
          role: "user" as const,
          content: `警告（第${stopRetryCount}次）：你必须使用 summarize_subAgent 工具返回答案，不要直接输出文本。请调用 summarize_subAgent 工具。`,
        });
      }
    }

    if (isEnd) break;
  }

  saveMessagesSnapshot(messages, "subAgent:结束");
  return content;
}
