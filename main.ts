import OpenAI from "openai";
import readline from "readline";
import {
  tools,
  switchTools,
  spawn_subagent,
  summarize_subAgent,
  filter_tools,
  dispatchToolCall,
  initSkills,
  getSkillsPrompt,
  saveMessagesSnapshot,
} from "./tools";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "sk-62b974098ae64b76b11a3cc3f7e59fd6",
});

const skills = [
  {
    name: "learning-enhancer",
    description:
      "专业教学文档简化器 — 将复杂专业文档转化为易懂内容，保留专业概念并添加简单解释。用于简化专业且枯燥的教学文档，让人由浅入深学习并掌握知识。",
    path: "./skills/learning-enhancer.md",
  },
];
initSkills(skills);

async function agent_loop(messages) {
  while (true) {
    const res = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: `你是一个专业的助手,你可以调用以下技能:\n${getSkillsPrompt()}`,
        },
        ...messages,
      ],
      tools: filter_tools("main"),
    });
    const choice = res.choices[0];
    console.log(choice);
    messages.push(choice.message);
    saveMessagesSnapshot(messages, "main:模型回复");
    const { finish_reason } = choice;
    if (finish_reason === "stop") {
      break;
    }
    if (finish_reason === "tool_calls") {
      await dispatchToolCall(choice.message.tool_calls, messages);
    }
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  const messages = [];
  while (true) {
    const userInput = await askQuestion("\n请输入问题: ");
    messages.push({ role: "user", content: userInput });
    saveMessagesSnapshot(messages, "main:用户输入");
    await agent_loop(messages);
  }
}

main();
