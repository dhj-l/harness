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
export { write_memory, read_memory, list_memories } from "./tool/memory";
export { write_file } from "./tool/write_file";
export { list_directory } from "./tool/list_directory";
export { search_files } from "./tool/search_files";
export { search_content } from "./tool/search_content";
export { delete_file } from "./tool/delete_file";
export { file_info } from "./tool/file_info";
export { calculate } from "./tool/calculate";
export { encode_decode } from "./tool/encode_decode";
export { hash_string } from "./tool/hash_string";
export { transform_data } from "./tool/transform_data";
export { generate_uuid } from "./tool/generate_uuid";
export { fetch_url } from "./tool/fetch_url";
export { web_search } from "./tool/web_search";
export { execute_command } from "./tool/execute_command";
export { git_tools } from "./tool/git_tools";
export { saveMessagesSnapshot } from "./snapshot";

// ---- 内部导入（仅供本模块调度使用，不对外暴露） ----
import { tools, subagent_tools_blacklist, main_tools_blacklist } from "./definitions";
import { saveMessagesSnapshot } from "./snapshot";
import { get_weather } from "./tool/get_weather";
import { read_file } from "./tool/read_file";
import { load_skills } from "./tool/load_skills";
import { spawn_subagent } from "./tool/sub_agent";
import { summarize_subAgent } from "./tool/summarize_subAgent";
import { ask_user } from "./tool/ask_user";
import { write_memory, read_memory, list_memories } from "./tool/memory";
import { write_file } from "./tool/write_file";
import { list_directory } from "./tool/list_directory";
import { search_files } from "./tool/search_files";
import { search_content } from "./tool/search_content";
import { delete_file } from "./tool/delete_file";
import { file_info } from "./tool/file_info";
import { calculate } from "./tool/calculate";
import { encode_decode } from "./tool/encode_decode";
import { hash_string } from "./tool/hash_string";
import { transform_data } from "./tool/transform_data";
import { generate_uuid } from "./tool/generate_uuid";
import { fetch_url } from "./tool/fetch_url";
import { web_search } from "./tool/web_search";
import { execute_command } from "./tool/execute_command";
import { git_tools } from "./tool/git_tools";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageFunctionToolCall,
} from "openai/resources/chat/completions/completions";

// ---- 工具函数签名 ----
/**
 * 工具函数签名。
 * 所有工具函数接受一个解构参数的 JSON 对象，返回任意值（通常是字符串）。
 * 字符串返回值会被作为 tool 角色的 content 注入回对话，供模型继续推理。
 */
type ToolFn = (args: any) => any;

/**
 * 工具全量映射表。
 * 将工具函数名称（与 OpenAI Function Calling 的 name 一致）映射到对应的实现函数。
 * dispatchToolCall 通过此表完成名称 → 函数的路由。
 *
 * 每个键是 definitions.ts 中定义的 function.name，
 * 值是 tools/tool/ 目录下对应文件中导出的函数引用。
 *
 * 新增工具时需要在此注册，否则 dispatchToolCall 会抛出 "工具不存在" 错误。
 */
export const switchTools: Record<string, ToolFn> = {
  // ---- 基础工具 ----
  get_weather,
  read_file,
  load_skills,

  // ---- 子代理相关 ----
  spawn_subagent,
  summarize_subAgent,

  // ---- 交互工具 ----
  ask_user,

  // ---- 记忆系统 ----
  write_memory,
  read_memory,
  list_memories,

  // ---- 文件系统组 ----
  write_file,
  list_directory,
  search_files,
  search_content,
  delete_file,
  file_info,

  // ---- 数据处理组 ----
  calculate,
  encode_decode,
  hash_string,
  transform_data,
  generate_uuid,

  // ---- 网络组 ----
  fetch_url,
  web_search,

  // ---- 代码/调试组 ----
  execute_command,
  git_tools,
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
  const tasks = tool_calls
    .filter((t: any) => t.type === "function")
    .map(async (tool: any) => {
      const fnTool = tool as ChatCompletionMessageFunctionToolCall;
      const { name, arguments: args } = fnTool.function;

      const fn: ToolFn | undefined = switchTools[name];
      if (!fn) {
        return {
          id: tool.id,
          content: `工具 ${name} 不存在，请使用其他可用工具`,
        };
      }

      let argObj: Record<string, unknown>;
      try {
        argObj = JSON.parse(args);
      } catch {
        return {
          id: tool.id,
          content: `工具 ${name} 参数解析失败: ${args}`,
        };
      }
      console.log(argObj);

      let lastError: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const result = await fn(argObj);
          console.log(result, "工具函数返回");
          return { id: tool.id, content: result as string };
        } catch (error) {
          lastError = error;
          console.log(`工具 ${name} 执行失败(第${attempt}次):`, error);
          if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
        }
      }
      return {
        id: tool.id,
        content: `工具 ${name} 调用失败。错误: ${lastError}`,
      };
    });

  const results = await Promise.all(tasks);
  for (const r of results) {
    messages.push({
      role: "tool",
      content: r.content,
      tool_call_id: r.id,
    } as ChatCompletionMessageParam);
  }
  saveMessagesSnapshot(messages, `main:工具批量结果`);
}
