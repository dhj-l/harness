import { execSync } from "child_process";
import path from "path";

export function git_tools({ action, path: repoPath, limit = 10 }: { action: string; path?: string; limit?: number }): string {
  try {
    const cwd = repoPath ? path.resolve(process.cwd(), repoPath) : process.cwd();
    if (!cwd.startsWith(process.cwd())) return `路径越权`;
    const l = Math.min(Math.max(1, limit ?? 10), 100);
    switch (action) {
      case "status":
        return execSync("git status", { cwd, encoding: "utf-8", maxBuffer: 1024 * 100 });
      case "log":
        return execSync(`git log --oneline -${l}`, { cwd, encoding: "utf-8", maxBuffer: 1024 * 100 });
      case "diff":
        return execSync("git diff", { cwd, encoding: "utf-8", maxBuffer: 1024 * 500 });
      case "branch":
        return execSync("git branch -a", { cwd, encoding: "utf-8", maxBuffer: 1024 * 100 });
      default:
        return `不支持的操作: ${action}，可选: status, log, diff, branch`;
    }
  } catch (err: any) {
    if (err.stderr) return err.stderr;
    return `git ${action} 失败: ${err.message}`;
  }
}
