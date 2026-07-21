import { execSync } from "child_process";
import path from "path";

const WHITELIST = [
  "node", "npm", "npx", "tsx", "git",
  "dir", "echo", "type", "cd", "pwd",
  "python", "python3", "pip", "nslookup", "ping",
  "curl", "where",
];

const BLOCK_REGEX = /[|;&`$(){}\[\]<>]/;

const MAX_OUTPUT = 50 * 1024;

export function execute_command({ command, timeout = 30, cwd }: { command: string; timeout?: number; cwd?: string }): string {
  try {
    const trimmed = command.trim();
    const cmdName = trimmed.split(/\s+/)[0].toLowerCase();

    if (!WHITELIST.includes(cmdName)) {
      return `命令 "${cmdName}" 不在白名单中。允许的命令: ${WHITELIST.join(", ")}`;
    }
    if (BLOCK_REGEX.test(trimmed)) {
      return `命令包含不允许的 shell 元字符（|;&等），已拒绝`;
    }

    let execCwd = process.cwd();
    if (cwd) {
      execCwd = path.resolve(process.cwd(), cwd);
      if (!execCwd.startsWith(process.cwd())) return `工作目录越权: ${cwd}`;
    }

    const t = Math.min(Math.max(1, timeout ?? 30), 120);
    const output = execSync(trimmed, {
      cwd: execCwd,
      timeout: t * 1000,
      encoding: "utf-8",
      maxBuffer: MAX_OUTPUT + 1024,
      windowsHide: true,
    });
    if (output.length > MAX_OUTPUT) {
      return output.substring(0, MAX_OUTPUT) + `\n\n...(已截断，共 ${output.length} 字节)`;
    }
    return output || "(命令执行成功，无输出)";
  } catch (err: any) {
    if (err.code === "ETIMEDOUT") return `命令执行超时 (${timeout}s)`;
    if (err.stderr) return err.stderr;
    return `命令执行失败: ${err.message}`;
  }
}
