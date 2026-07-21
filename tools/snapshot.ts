import fs from "fs";

/**
 * 将当前的 messages 数组快照保存到 message.json 文件中。
 * 使用 JSON.parse(JSON.stringify()) 实现深拷贝，避免引用问题。
 * 主要用于调试和追踪模型对话的完整过程。
 *
 * @param messages - 消息历史数组
 * @param label    - 快照标签（如 "main:模型回复"），说明当前保存的时机
 */
export function saveMessagesSnapshot(
  messages: unknown[],
  label: string,
  systemPrompt?: string,
): void {
  const data = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...JSON.parse(JSON.stringify(messages))]
    : JSON.parse(JSON.stringify(messages));
  fs.writeFileSync(
    "message.json",
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}
