import OpenAI from "openai";
import { config } from "dotenv";
config();

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "查询指定城市的天气",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "城市名" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description: "执行四则运算",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "数学表达式，如 1+2*3" },
        },
        required: ["expression"],
      },
    },
  },
];

function executeToolCall(toolCall) {
  const { name, arguments: args } = JSON.parse(toolCall.function.arguments);

  switch (name) {
    case "get_weather":
      return `现在无法实时查询天气，但假设${args.city}今天是晴天，25°C`;
    case "calculate":
      try {
        const result = Function(`"use strict"; return (${args.expression})`)();
        return `${args.expression} = ${result}`;
      } catch {
        return `表达式 "${args.expression}" 无效`;
      }
    default:
      return `未知工具: ${name}`;
  }
}

async function agentLoop(userMessage) {
  const messages = [
    { role: "system", content: "你是一个有帮助的助手，可以调用工具来回答问题。" },
    { role: "user", content: userMessage },
  ];

  let round = 0;
  while (round++ < 10) {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages,
      tools: TOOLS,
    });

    const choice = res.choices[0];
    const { content, tool_calls } = choice.message;
    const finish = choice.finish_reason;

    console.log(`\n--- Round ${round} | finish: ${finish} ---`);

    if (content) {
      console.log("Assistant:", content);
    }

    if (finish === "stop") {
      return content || "完成";
    }

    if (finish === "tool_calls" && tool_calls) {
      messages.push(choice.message);
      for (const tc of tool_calls) {
        const result = executeToolCall(tc);
        console.log(`  Tool[${tc.function.name}] => ${result}`);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      continue;
    }

    throw new Error(`未预期的 finish_reason: ${finish}`);
  }

  throw new Error("超过最大轮数");
}

const userMsg = process.argv[2] || "北京的天气怎么样？顺便算一下 23*17+5";
const result = await agentLoop(userMsg);
console.log("\n========= 最终回答 =========");
console.log(result);
