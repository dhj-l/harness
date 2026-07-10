import readline from "readline";

interface AskUserParams {
  /** 向用户提出的问题 */
  question: string;
  /** 可选的选项列表，用户可选择序号或直接输入 */
  options?: string[];
}

/**
 * 向用户提问并等待用户输入，是 AI 与用户交互的桥梁。
 * 当 AI 需要获取更多信息、确认或选择时调用此工具。
 * - 如果提供了 options，用户可输入序号选择或直接输入文本
 * - 如果没有 options，用户可自由输入任何内容
 * @param question - 要提出的问题
 * @param options - 可选的选择列表
 * @returns 用户的回复内容
 */
export async function ask_user({
  question,
  options = [],
}: AskUserParams): Promise<string> {
  // 构建提示信息
  let prompt: string = `🤖 ${question}`;

  if (options.length > 0) {
    // 有预设选项时，展示序号列表引导用户选择
    prompt += `\n可选选项：\n${options
      .map((opt: string, idx: number) => `  ${idx + 1}. ${opt}`)
      .join("\n")}`;
    prompt += `\n请输入序号或直接输入内容：`;
  } else {
    // 无预设选项时，让用户自由输入
    prompt += `\n请输入您的回复：`;
  }

  // 使用 Promise 包装 readline，实现异步等待用户输入
  return new Promise<string>((resolve: (value: string) => void) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(prompt, (answer: string) => {
      rl.close();

      // 如果提供了选项，优先尝试解析序号
      if (options.length > 0) {
        const index: number = parseInt(answer, 10);
        if (!isNaN(index) && index >= 1 && index <= options.length) {
          // 有效序号 → 返回对应的选项文本
          resolve(options[index - 1]);
        } else {
          // 无效序号 → 直接返回用户输入的文本
          resolve(answer);
        }
      } else {
        resolve(answer);
      }
    });
  });
}
