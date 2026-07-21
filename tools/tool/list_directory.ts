import fs from "fs";
import path from "path";
import { resolveSafePath } from "./safe_path";

function walk(dir: string, depth: number, pattern?: string): string[] {
  if (depth <= 0) return [];
  const result: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [`[ERR] 无法读取: ${dir}`];
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(process.cwd(), full);
    if (e.isDirectory()) {
      result.push(`[DIR] ${rel}/`);
      if (depth > 1) {
        result.push(...walk(full, depth - 1, pattern).map(l => "  " + l));
      }
    } else if (e.isFile()) {
      if (!pattern || e.name.includes(pattern)) {
        result.push(`[FILE] ${rel}`);
      }
    }
  }
  return result;
}

export function list_directory({ path: input, depth = 1, pattern }: { path: string; depth?: number; pattern?: string }): string {
  try {
    const resolved = resolveSafePath(input);
    if (!fs.existsSync(resolved)) return `目录不存在: ${input}`;
    if (!fs.statSync(resolved).isDirectory()) return `路径不是目录: ${input}`;
    const maxDepth = Math.min(Math.max(1, depth), 5);
    const lines = walk(resolved, maxDepth, pattern);
    return lines.join("\n") || "(空目录)";
  } catch (err: any) {
    return `列目录失败: ${err.message}`;
  }
}
