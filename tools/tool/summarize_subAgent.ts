/**
 * 【子代理专用】汇总子代理的最终答案并返回。
 * 该函数是子代理输出结果的唯一出口——子代理完成任务后必须调用此函数，
 * 禁止直接输出文本，否则答案将被视为无效。
 * @param content - 子代理查找到的答案
 * @returns 原样返回答案内容
 */
export function summarize_subAgent({ content }: { content: string }): string {
  console.log(content, "子代理");
  return content;
}
