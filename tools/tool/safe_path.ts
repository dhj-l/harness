import path from "path";
import fs from "fs";

const WORKSPACE = process.cwd();

export interface SafePathResult {
  resolved: string;
  exists: boolean;
  isFile: boolean;
  isDir: boolean;
  size: number;
}

export function resolveSafePath(input: string): string {
  const resolved = path.resolve(WORKSPACE, input);
  if (!resolved.startsWith(WORKSPACE)) {
    throw new Error(`路径越权: ${input} 不在工作空间 ${WORKSPACE} 内`);
  }
  return resolved;
}

export function getFileInfo(resolved: string): SafePathResult {
  const stat = fs.statSync(resolved);
  return {
    resolved,
    exists: true,
    isFile: stat.isFile(),
    isDir: stat.isDirectory(),
    size: stat.size,
  };
}
