import fg from "fast-glob";
import path from "path";

const WORKSPACE = process.cwd();

export async function search_files({ pattern, path: input, max_results = 50 }: { pattern: string; path?: string; max_results?: number }): Promise<string> {
  try {
    const baseDir = input ? path.resolve(WORKSPACE, input) : WORKSPACE;
    if (!baseDir.startsWith(WORKSPACE)) return `路径越权: ${input} 不在工作空间内`;
    const results = await fg(pattern, {
      cwd: baseDir,
      absolute: false,
      dot: true,
      onlyFiles: true,
    });
    const limited = results.slice(0, Math.min(Math.max(1, max_results), 500));
    return limited.length === 0 ? `未找到匹配文件: ${pattern}` : limited.join("\n");
  } catch (err: any) {
    return `搜索失败: ${err.message}`;
  }
}
