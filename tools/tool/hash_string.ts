import crypto from "crypto";

const ALGOS = ["md5", "sha1", "sha256"] as const;

export function hash_string({ algorithm, text }: { algorithm: string; text: string }): string {
  if (!ALGOS.includes(algorithm as any)) {
    return `不支持的算法: ${algorithm}，可选: ${ALGOS.join(", ")}`;
  }
  try {
    return crypto.createHash(algorithm).update(text, "utf-8").digest("hex");
  } catch (err: any) {
    return `哈希计算失败: ${err.message}`;
  }
}
