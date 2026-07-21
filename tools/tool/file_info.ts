import fs from "fs";
import path from "path";
import { resolveSafePath } from "./safe_path";

function guessMime(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    ".txt": "text/plain", ".md": "text/markdown", ".json": "application/json",
    ".js": "text/javascript", ".ts": "text/typescript", ".html": "text/html",
    ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg",
    ".svg": "image/svg+xml", ".py": "text/x-python", ".yaml": "text/yaml",
    ".yml": "text/yaml", ".xml": "text/xml", ".csv": "text/csv",
    ".sh": "text/x-shellscript", ".bat": "text/x-bat", ".ps1": "text/x-powershell",
  };
  return map[ext] || "application/octet-stream";
}

export function file_info({ path: input }: { path: string }): string {
  try {
    const resolved = resolveSafePath(input);
    if (!fs.existsSync(resolved)) return `路径不存在: ${input}`;
    const stat = fs.statSync(resolved);
    const type = stat.isDirectory() ? "目录" : stat.isFile() ? "文件" : "其他";
    const sizeStr = stat.isFile() ? `${(stat.size / 1024).toFixed(1)} KB` : "-";
    return [
      `路径: ${resolved}`,
      `类型: ${type}`,
      `大小: ${sizeStr}`,
      `修改时间: ${stat.mtime.toLocaleString()}`,
      `创建时间: ${stat.birthtime.toLocaleString()}`,
      stat.isFile() ? `MIME: ${guessMime(resolved)}` : "",
    ].filter(Boolean).join("\n");
  } catch (err: any) {
    return `查询失败: ${err.message}`;
  }
}
