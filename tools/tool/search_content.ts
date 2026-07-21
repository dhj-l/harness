import fs from "fs";
import path from "path";
import { resolveSafePath } from "./safe_path";

export function search_content({ pattern, include, path: input, max_matches = 100 }: { pattern: string; include?: string; path?: string; max_matches?: number }): string {
  try {
    const baseDir = input ? resolveSafePath(input) : process.cwd();
    const regex = new RegExp(pattern, "gi");
    const limit = Math.min(Math.max(1, max_matches), 500);
    const results: string[] = [];
    let count = 0;

    function walk(dir: string): void {
      if (count >= limit) return;
      let entries: fs.Dirent[];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        if (count >= limit) return;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!e.name.startsWith(".") && e.name !== "node_modules") walk(full);
        } else if (e.isFile()) {
          if (include && !e.name.endsWith(include.replace("*", ""))) continue;
          try {
            const content = fs.readFileSync(full, "utf-8");
            const lines = content.split("\n");
            for (let i = 0; i < lines.length && count < limit; i++) {
              if (regex.test(lines[i])) {
                const rel = path.relative(process.cwd(), full);
                results.push(`${rel}:${i + 1}:${lines[i].trim().substring(0, 150)}`);
                count++;
              }
            }
          } catch { /* skip unreadable/binary */ }
        }
      }
    }

    walk(baseDir);
    return results.length === 0 ? `未找到匹配内容: ${pattern}` : results.join("\n");
  } catch (err: any) {
    return `搜索失败: ${err.message}`;
  }
}
