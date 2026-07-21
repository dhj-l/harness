import fs from "fs";
import path from "path";
import { resolveSafePath } from "./safe_path";

const MAX_SIZE = 50 * 1024 * 1024;

export function write_file({ path: input, content }: { path: string; content: string }): string {
  try {
    if (content.length > MAX_SIZE) {
      return `内容过大 (${(content.length / 1024 / 1024).toFixed(1)}MB)，当前限制 ${MAX_SIZE / 1024 / 1024}MB`;
    }
    const resolved = resolveSafePath(input);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = resolved + ".tmp." + process.pid;
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, resolved);
    return `文件已写入: ${resolved}`;
  } catch (err: any) {
    if (err.code === "EACCES" || err.code === "EPERM") return `无权限写入: ${input}`;
    return `写入失败: ${err.message}`;
  }
}
