import { readFileSync } from "fs";
import { filter_tools, getSkillsPrompt } from "..";
import { getWorkspace } from "../../utuits/get_workspase";
import { get_today } from "../../utuits/get_today";

type PromptSection = "identity" | "tools" | "workspace" | "memory" | "skills";

interface PromptParams {
  identity: string;
  tools: string;
  workspace: string;
  memory?: string;
  skills?: string;
}
const PROMPT_SECTIONS = new Map<PromptSection, string>();
let lastKey = "";
let lastSystemPrompt = "";
export const init_prompt = ({
  identity,
  tools,
  workspace,
  memory = "",
  skills = "",
}: PromptParams) => {
  PROMPT_SECTIONS.set("identity", identity);
  PROMPT_SECTIONS.set("tools", tools);
  PROMPT_SECTIONS.set("workspace", workspace);
  PROMPT_SECTIONS.set("memory", memory);
  PROMPT_SECTIONS.set("skills", skills);
};

//读取项目记忆,返回
export const update_context = () => {
  try {
    const memory = readFileSync("./memory.json", "utf-8");
    if (memory) {
      PROMPT_SECTIONS.set("memory", memory);
    }
  } catch {
    // memory.json 不存在则跳过
  }
  return PROMPT_SECTIONS;
};

//生成提示词key
export const get_system_prompt_key = () => {
  let fullKey = "";
  for (const [key, value] of PROMPT_SECTIONS) {
    fullKey += `${key}:${value} \n`;
  }
  return fullKey;
};

export const assemble_system_prompt = (fullKey: string) => {
  //如果key相同的情况，就复用上一次的系统提示词
  if (fullKey === lastKey) {
    console.log("缓存命中");

    return lastSystemPrompt;
  }
  //不同的情况下就开始拼接系统提示词
  const sections = [];
  for (const [key, value] of PROMPT_SECTIONS) {
    sections.push(value);
  }
  lastSystemPrompt = sections.join("\n");
  lastKey = fullKey;

  return lastSystemPrompt;
};

//获取系统提示词
export const get_system_prompt = () => {
  init_prompt({
    identity: "你是一个专业的AI助手,今天是" + get_today(),
    tools:
      "你可以使用以下工具: \n" +
      filter_tools("main")
        .map(
          ({ function: tool }) =>
            `名称: ${tool.name}\n描述: ${tool.description}`,
        )
        .join("\n"),
    workspace: "你可以在以下工作空间中操作: \n" + getWorkspace(),
    skills: "你可以调用以下技能:\n" + getSkillsPrompt(),
  });
  update_context();
  const fullKey = get_system_prompt_key();
  return assemble_system_prompt(fullKey);
};
