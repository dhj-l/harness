import fs from "fs";
import { resolveSafePath } from "./safe_path";

export function delete_file({ path: input }: { path: string }): string {
  try {
    const resolved = resolveSafePath(input);
    if (!fs.existsSync(resolved)) return `文件不存在: ${input}`;
    if (!fs.statSync(resolved).isFile()) return `路径不是文件: ${input}`;
    fs.unlinkSync(resolved);
    return `文件已删除: ${resolved}`;
  } catch (err: any) {
    if (err.code === "EACCES" || err.code === "EPERM") return `无权限删除: ${input}`;
    return `删除失败: ${err.message}`;
  }
}
