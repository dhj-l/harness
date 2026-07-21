export function encode_decode({ action, format, text }: { action: "encode" | "decode"; format: "base64" | "url" | "hex" | "unicode"; text: string }): string {
  try {
    switch (format) {
      case "base64":
        return action === "encode"
          ? Buffer.from(text, "utf-8").toString("base64")
          : Buffer.from(text, "base64").toString("utf-8");
      case "url":
        return action === "encode" ? encodeURIComponent(text) : decodeURIComponent(text);
      case "hex":
        return action === "encode"
          ? Buffer.from(text, "utf-8").toString("hex")
          : Buffer.from(text, "hex").toString("utf-8");
      case "unicode":
        if (action === "encode") {
          return Array.from(text).map(c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join("");
        }
        return text.replace(/\\u([\da-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      default:
        return `不支持的格式: ${format}`;
    }
  } catch (err: any) {
    return `${action === "encode" ? "编码" : "解码"}失败: ${err.message}`;
  }
}
