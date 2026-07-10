/**
 * ========================================
 * tools 模块统一入口（Barrel）
 * ========================================
 *
 * 本文件是 tools 目录的对外出口，集中完成三件事：
 * 1. 重新导出所有工具函数和辅助函数（供 main.ts 及其他模块使用）
 * 2. 构建 switchTools 映射表（工具名 → 实现函数）
 * 3. 提供 dispatchToolCall / filter_tools 等运行时调度/过滤函数
 */

// ---- 重新导出 ----
export { tools, subagent_tools_blacklist, main_tools_blacklist } from "./definitions";
export { get_weather } from "./tool/get_weather";
export { read_file } from "./tool/read_file";
export { load_skills, initSkills, getSkillsPrompt } from "./tool/load_skills";
export { spawn_subagent } from "./tool/sub_agent";
export { summarize_subAgent } from "./tool/summarize_subAgent";
export { ask_user } from "./tool/ask_user";
export { saveMessagesSnapshot } from "./snapshot";

// ---- 内部导入 ----
import { tools, subagent_tools_blacklist, main_tools_blacklist } from "./definitions";
import { saveMessagesSnapshot } from "./snapshot";
import { get_weather } from "./tool/get_weather";
import { read_file } from "./tool/read_file";
import { load_skills } from "./tool/load_skills";
import { spawn_subagent } from "./tool/sub_agent";
import { summarize_subAgent } from "./tool/summarize_subAgent";
import { ask_user } from "./tool/ask_user";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
} from "openai/resources/chat/completions/completions";

// ---- 工具函数签名 ----
/** 工具函数签名：接收一个任意参数的 JSON 对象，返回任意值 */
type ToolFn = (args: any) => any;

/**
 * 工具全量映射表。
 * 将工具函数名称（与 OpenAI Function Calling 的 name 一致）映射到对应的实现函数。
 * dispatchToolCall 通过此表完成名称 → 函数的路由。
 */
export const switchTools: Record<string, ToolFn> = {
  get_weather,
  read_file,
  load_skills,
  spawn_subagent,
  summarize_subAgent,
  ask_user,
};

/**
 * 根据角色过滤工具定义列表。
 *
 * 设计原因：
 * - 某些工具（如 spawn_subagent / load_skills / ask_user）仅限主代理调用，
 *   子代理无权使用，防止无限嵌套或权限越界。
 * - summarize_subAgent 是子代理上报结果的专用工具，主代理不必暴露它。
 *
 * @param role - 调用者角色，默认 "subagent"
 * @returns 过滤后的工具定义数组，可直接传给 OpenAI API
 */
export function filter_tools(role: "subagent" | "main" = "subagent"): any[] {
  if (role === "subagent") {
    return tools.filter(
      (tool: any) => !subagent_tools_blacklist.includes(tool.function.name),
    );
  }
  return tools.filter(
    (tool: any) => !main_tools_blacklist.includes(tool.function.name),
  );
}

/**
 * 调度工具调用：解析模型返回的 tool_calls，逐一执行并将结果注入消息列表。
 *
 * 执行流程：
 * 1. 遍历工具调用数组
 * 2. 通过 switchTools 映射找到对应的实现函数
 * 3. JSON.parse 解析参数
 * 4. 执行函数并将结果以 tool 角色的消息追加到 messages
 * 5. 保存快照用于调试追踪
 *
 * @param tool_calls - 模型返回的工具调用列表
 * @param messages   - 当前对话消息列表（会被修改：追加工具结果）
 */
export async function dispatchToolCall(
  tool_calls: any[],
  messages: ChatCompletionMessageParam[],
): Promise<void> {
  for (const tool of tool_calls) {
    // 只处理 function 类型工具调用
    if (tool.type !== "function") continue;
    const fnTool = tool as ChatCompletionMessageFunctionToolCall;

    const { name, arguments: args } = fnTool.function;

    // 查找对应的实现函数
    const fn: ToolFn | undefined = switchTools[name];
    if (!fn) throw new Error(`工具 ${name} 不存在`);

    // 解析参数并执行
    const argObj: Record<string, unknown> = JSON.parse(args);
    console.log(argObj);

    const result: unknown = await fn(argObj);
    console.log(result, "工具函数返回");

    // 将工具结果以 tool 角色消息追加到对话中
    messages.push({
      role: "tool",
      content: result as string,
      tool_call_id: tool.id,
    } as ChatCompletionMessageParam);

    saveMessagesSnapshot(messages, `main:工具结果:${name}`);
  }
}
