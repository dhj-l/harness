import { readFileSync } from "fs";
type PromptSection = "identity" | "tools" | "workspace" | "memory";
interface PromptParams {
  identity: string;
  tools: string[];
  workspace: string;
  memory?: string;
}
const PROMPT_SECTIONS = new Map<PromptSection, string>();

const init_prompt = ({
  identity,
  tools,
  workspace,
  memory = "",
}: PromptParams) => {
  PROMPT_SECTIONS.set("identity", identity);
  PROMPT_SECTIONS.set("tools", tools.join("\n"));
  PROMPT_SECTIONS.set("workspace", workspace);
  PROMPT_SECTIONS.set("memory", memory);
};

//读取项目记忆,返回
const update_context = async () => {
  const memory = await readFileSync("memory.txt", "utf-8");
  PROMPT_SECTIONS.set("memory", memory);
  const res: Partial<Record<PromptSection, string>> = {};
  for (const [section, content] of PROMPT_SECTIONS) {
    res[section] = content;
  }
  return res;
};

//
