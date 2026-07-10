export { tools, subagent_tools_blacklist, main_tools_blacklist } from "./definitions";
export { get_weather } from "./tool/get_weather";
export { read_file } from "./tool/read_file";
export { load_skills, initSkills, getSkillsPrompt } from "./tool/load_skills";
export { spawn_subagent } from "./tool/sub_agent";
export { summarize_subAgent } from "./tool/summarize_subAgent";
export { ask_user } from "./tool/ask_user";
export { saveMessagesSnapshot } from "./snapshot";

import { tools, subagent_tools_blacklist, main_tools_blacklist } from "./definitions";
import { saveMessagesSnapshot } from "./snapshot";
import { get_weather } from "./tool/get_weather";
import { read_file } from "./tool/read_file";
import { load_skills } from "./tool/load_skills";
import { spawn_subagent } from "./tool/sub_agent";
import { summarize_subAgent } from "./tool/summarize_subAgent";
import { ask_user } from "./tool/ask_user";

export const switchTools = {
  get_weather,
  read_file,
  load_skills,
  spawn_subagent,
  summarize_subAgent,
  ask_user,
};

export function filter_tools(role = "subagent") {
  if (role === "subagent") {
    return tools.filter(
      (tool) => !subagent_tools_blacklist.includes(tool.function.name),
    );
  }
  return tools.filter(
    (tool) => !main_tools_blacklist.includes(tool.function.name),
  );
}

export async function dispatchToolCall(tool_calls, messages) {
  for (const tool of tool_calls) {
    const { name, arguments: args } = tool.function;
    const fn = switchTools[name];
    if (!fn) throw new Error(`工具${name}不存在`);
    const argObj = JSON.parse(args);
    console.log(argObj);
    const result = await fn(argObj);
    console.log(result, "工具函数返回");
    messages.push({
      role: "tool",
      content: result,
      tool_call_id: tool.id,
    });
    saveMessagesSnapshot(messages, `main:工具结果:${name}`);
  }
}
