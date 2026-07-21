import fs from "fs";
import { resolveSafePath, getFileInfo } from "./safe_path";

const MAX_SIZE = 10 * 1024 * 1024;

export function read_file({ path: input }: { path: string }): string {
  try {
    const resolved = resolveSafePath(input);
    const info = getFileInfo(resolved);

    if (!info.exists) return `文件不存在: ${input}`;
    if (!info.isFile) return `路径不是文件: ${input}`;
    if (info.size > MAX_SIZE) {
      return `文件过大 (${(info.size / 1024 / 1024).toFixed(1)}MB)，当前限制 ${MAX_SIZE / 1024 / 1024}MB`;
    }

    const buffer = fs.readFileSync(resolved);
    if (buffer.includes(0)) return `文件是二进制格式，无法以文本方式读取`;

    return buffer.toString("utf-8");
  } catch (err: any) {
    if (err.code === "ENOENT") return `文件不存在: ${input}`;
    if (err.code === "EACCES" || err.code === "EPERM") return `无权限读取: ${input}`;
    return `读取失败: ${err.message}`;
  }
}
