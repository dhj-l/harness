const MAX_BODY = 100 * 1024;

export async function fetch_url({ url, method = "GET", headers, body, timeout = 15 }: { url: string; method?: string; headers?: Record<string, string>; body?: string; timeout?: number }): Promise<string> {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return `不支持的协议: ${u.protocol}，仅支持 http/https`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), Math.min(Math.max(1, timeout ?? 15), 120) * 1000);
    try {
      const res = await fetch(url, {
        method: method.toUpperCase(),
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
        body: method.toUpperCase() !== "GET" ? body : undefined,
        signal: ctrl.signal,
      });
      const raw = await res.text();
      const truncated = raw.length > MAX_BODY ? raw.substring(0, MAX_BODY) + `\n\n...(已截断，共 ${raw.length} 字节)` : raw;
      const headerStr = Object.entries(Object.fromEntries(res.headers.entries())).slice(0, 20).map(([k, v]) => `  ${k}: ${v}`).join("\n");
      return `状态: ${res.status} ${res.statusText}\n头信息:\n${headerStr}\n\n正文:\n${truncated}`;
    } finally {
      clearTimeout(timer);
    }
  } catch (err: any) {
    if (err.name === "AbortError") return `请求超时 (${timeout}s): ${url}`;
    return `请求失败: ${err.message}`;
  }
}
