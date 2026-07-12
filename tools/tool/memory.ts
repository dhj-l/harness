/**
 * ========================================
 * 项目级记忆系统（Memory System）
 * ========================================
 *
 * 功能：
 * 以键值对的形式将重要信息持久化存储在项目根目录的 memory.json 中，
 * 使得 AI 代理能够在不同会话之间保持上下文信息。
 *
 * 适用场景：
 * - 保存用户偏好（如"我喜欢用中文回答"）
 * - 记录项目关键约定（如"数据库表前缀为 app_"）
 * - 存储中间分析结论，避免重复推理
 *
 * 存储格式（memory.json）：
 *   {
 *     "用户名": "张三",
 *     "项目名": "AI Harness",
 *     "技术栈": "TypeScript + OpenAI SDK"
 *   }
 */

import fs from "fs";
import path from "path";

/**
 * 记忆文件的绝对路径。
 * - process.cwd() 指向项目根目录（即 main.ts 所在的目录）
 * - 采用硬编码文件名 "memory.json"，简单明确，无需外部配置
 * - 路径在模块加载时一次性计算，避免运行时重复运算
 */
const MEMORY_FILE = path.resolve(process.cwd(), "memory.json");

/**
 * 从 memory.json 中读取所有记忆。
 *
 * 读取策略：
 * - 使用 try/catch 包裹，因为首次运行时文件可能不存在（ENOENT），
 *   也可能因意外写入导致 JSON 格式损坏（SyntaxError）
 * - 无论何种异常，均视为"空记忆库"，返回空对象，确保系统健壮性
 *
 * @returns 包含所有键值对的普通对象，文件不存在或损坏时返回 {}
 */
function readMemories(): Record<string, string> {
  try {
    // 同步读取文件内容
    const raw = fs.readFileSync(MEMORY_FILE, "utf-8");
    // 将 JSON 字符串解析为对象
    return JSON.parse(raw);
  } catch {
    // 文件不存在 / 权限不足 / JSON 格式错误 → 返回空记忆库
    return {};
  }
}

/**
 * 将整个记忆数据覆写回 memory.json。
 *
 * 设计选择：
 * - 采用全量覆写而非增量追加，因为 memory.json 是一个小型文件（预期条目数 < 1000），
 *   全量覆写的开销可忽略不计，且实现简单、数据一致性高
 * - 使用 JSON.stringify 的第三个参数（缩进 2 空格）美化输出，方便人工阅读和调试
 *
 * @param data - 要持久化的完整记忆对象，会覆盖原有文件内容
 */
function writeMemories(data: Record<string, string>): void {
  // 将对象序列化为美化后的 JSON 字符串并写入文件
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * 写入（或更新）一条项目级记忆。
 *
 * 调用模式（AI 代理使用）：
 *   write_memory({ key: "用户偏好", value: "用简洁风格回答" })
 *
 * 幂等性：
 * - 如果 key 已存在，则用新 value 覆盖旧值（upsert 语义）
 * - 多次写入相同 key 不会产生重复条目
 *
 * @param param0.key   - 记忆的键名（应具有描述性，如"用户语言偏好"）
 * @param param0.value - 记忆的值（自由文本，可包含换行符）
 * @returns 写入成功的确认消息（会被 OpenAI SDK 返回给模型，可用于日志）
 */
export const write_memory = ({ key, value }: { key: string; value: string }): string => {
  // 1. 读取当前所有记忆
  const memories = readMemories();
  // 2. 设置/覆盖指定键的值
  memories[key] = value;
  // 3. 全量写回磁盘
  writeMemories(memories);
  // 4. 返回确认信息
  return `记忆已保存: ${key} = ${value}`;
};

/**
 * 根据键名读取一条项目级记忆。
 *
 * 使用示例（AI 代理调用）：
 *   read_memory({ key: "用户偏好" })
 *
 * 返回值策略：
 * - 键存在 → 直接返回对应的值字符串
 * - 键不存在 → 返回友好的中文提示，而非抛异常，便于模型理解
 *
 * @param param0.key - 要读取的记忆键名
 * @returns 对应的记忆值，或未找到的提示信息
 */
export const read_memory = ({ key }: { key: string }): string => {
  // 加载全量记忆
  const memories = readMemories();
  // 检查键是否存在
  if (key in memories) {
    return memories[key];
  }
  // 键不存在时返回友好提示
  return `未找到键为 "${key}" 的记忆`;
};

/**
 * 列出所有已保存的项目级记忆。
 *
 * 输出格式：
 *   key1: value1
 *   key2: value2
 *
 * 这种每行一条的格式对 LLM 解析最友好，比 JSON 数组更适合文本模型阅读。
 *
 * @returns 所有记忆的文本列表，无记忆时返回提示信息
 */
export const list_memories = (): string => {
  // 加载全量记忆
  const memories = readMemories();
  // 将对象转换为 [key, value] 元组数组
  const entries = Object.entries(memories);

  // 空库提示
  if (entries.length === 0) {
    return "当前没有任何项目记忆";
  }

  // 格式化为 "key: value" 的多行文本
  return entries.map(([k, v]) => `${k}: ${v}`).join("\n");
};
