import fs from "fs";

/**
 * 读取指定路径的文件内容（同步读取）
 * @param path - 文件路径（相对或绝对路径）
 * @returns 文件的文本内容
 */
export function read_file({ path }: { path: string }): string {
  const file_content: string = fs.readFileSync(path, "utf-8");
  return file_content;
}
