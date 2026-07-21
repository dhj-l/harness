import crypto from "crypto";

export function generate_uuid({ version = "v4", count = 1 }: { version?: string; count?: number }): string {
  const n = Math.min(Math.max(1, count ?? 1), 100);
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    if (version === "v4") {
      ids.push(crypto.randomUUID());
    } else if (version === "v7") {
      const ts = Date.now().toString(16).padStart(12, "0");
      const rand = crypto.randomBytes(10).toString("hex");
      ids.push(`${ts}-${rand.substring(0, 4)}-7${rand.substring(4, 7)}-${rand.substring(7, 11)}-${rand.substring(11)}`);
    } else {
      return `不支持的版本: ${version}，可选: v4, v7`;
    }
  }
  return ids.join("\n");
}
