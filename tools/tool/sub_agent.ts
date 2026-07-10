import OpenAI from "openai";
import { tools, subagent_tools_blacklist, DEEP_NUM } from "../definitions";
import { saveMessagesSnapshot } from "../snapshot";
import { get_weather } from "./get_weather";
import { read_file } from "./read_file";
import { load_skills } from "./load_skills";
import { summarize_subAgent } from "./summarize_subAgent";
import { ask_user } from "./ask_user";

const switchTools = {
  get_weather,
  read_file,
  load_skills,
  summarize_subAgent,
  ask_user,
};

function filter_tools(tools, role = "subagent") {
  if (role === "subagent") {
    return tools.filter(
      (tool) => !subagent_tools_blacklist.includes(tool.function.name),
    );
  }
  return tools.filter(
    (tool) => tool.function.name !== "summarize_subAgent",
  );
}

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "sk-62b974098ae64b76b11a3cc3f7e59fd6",
});

export async function spawn_subagent({ system_prompt, prompt, deep = "low" }) {
  const size = DEEP_NUM[deep];
  const messages = [
    {
      role: "system",
      content: `${system_prompt}\n\n【重要规则】当你完成任务并找到最终答案后，必须调用 summarize_subAgent 工具返回答案，禁止直接输出文本。直接输出文本的答案将不被接受，你会被要求重新使用 summarize_subAgent 工具返回。`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];
  let isEnd = false;
  let content = "";
  let stopRetryCount = 0;
  const MAX_STOP_RETRIES = 3;
  for (let i = 0; i < size; i++) {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: messages,
      tools: filter_tools(tools),
    });
    const choice = res.choices[0];
    const { finish_reason } = choice;
    messages.push(choice.message);
    saveMessagesSnapshot(messages, "subAgent:模型回复");
    if (finish_reason === "tool_calls") {
      for (const tool of choice.message.tool_calls) {
        const { name, arguments: args } = tool.function;
        const fn = switchTools[name];
        if (!fn) throw new Error(`工具${name}不存在`);
        console.log(args, fn, "子代理");
        const argObj = JSON.parse(args);
        const result = await fn(argObj);
        messages.push({
          role: "tool",
          content: result,
          tool_call_id: tool.id,
        });
        saveMessagesSnapshot(messages, `subAgent:工具结果:${name}`);
        if (name === "summarize_subAgent") {
          isEnd = true;
          content += result;
        }
      }
    }
    if (finish_reason === "stop") {
      stopRetryCount++;
      if (stopRetryCount >= MAX_STOP_RETRIES) {
        content = summarize_subAgent({ content: choice.message.content || "" });
        isEnd = true;
      } else {
        messages.push({
          role: "user",
          content: `警告（第${stopRetryCount}次）：你必须使用 summarize_subAgent 工具返回答案，不要直接输出文本。请调用 summarize_subAgent 工具。`,
        });
      }
    }
    if (isEnd) {
      break;
    }
  }
  saveMessagesSnapshot(messages, "subAgent:结束");
  return content;
}
