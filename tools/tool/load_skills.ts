import { read_file } from "./read_file";

/** 技能信息的数据结构 */
interface SkillInfo {
  /** 技能名称（唯一标识） */
  name: string;
  /** 技能描述 */
  description: string;
  /** 技能文件的路径 */
  path: string;
}

/**
 * 全局技能注册表。
 * 以技能名称为键，SkillInfo 为值，存储所有可用技能。
 */
const skillsMap: Map<string, SkillInfo> = new Map();

/**
 * 初始化技能注册表，将技能列表加载到 Map 中。
 * 在主程序启动时调用，需在 load_skills 使用之前执行。
 * @param skills - 技能配置数组
 */
export function initSkills(skills: SkillInfo[]): void {
  skills.forEach((skill: SkillInfo) => {
    skillsMap.set(skill.name, skill);
  });
}

/**
 * 生成技能提示词文本，供系统提示词使用。
 * 遍历所有已注册的技能，拼接为 "技能名: 技能描述" 格式。
 * @returns 格式化的技能提示词字符串
 */
export function getSkillsPrompt(): string {
  let prompt: string = "";
  for (const [name, skill] of skillsMap) {
    prompt += `${name}: ${skill.description}\n`;
  }
  return prompt;
}

/**
 * 根据技能名称加载对应的技能文件内容。
 * AI 通过此工具获取特定技能的详细指导文档。
 * @param name - 要加载的技能名称
 * @returns 技能文件内容或错误提示
 */
export function load_skills({ name }: { name: string }): string {
  const skill: SkillInfo | undefined = skillsMap.get(name);
  if (!skill) return `技能 ${name} 不存在`;
  return read_file({ path: skill.path });
}
