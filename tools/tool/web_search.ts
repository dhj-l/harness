const API_KEY = process.env.SEARCH_API_KEY || "";
const CX = process.env.SEARCH_ENGINE_ID || "";

export async function web_search({ query, count = 5 }: { query: string; count?: number }): Promise<string> {
  if (!API_KEY || !CX) {
    return `未配置搜索 API（需要设置 SEARCH_API_KEY 和 SEARCH_ENGINE_ID 环境变量）`;
  }
  try {
    const n = Math.min(Math.max(1, count ?? 5), 20);
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CX}&q=${encodeURIComponent(query)}&lr=lang_zh-CN&num=${n}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return `搜索失败 (HTTP ${res.status})`;
      const data: any = await res.json();
      if (!data.items || data.items.length === 0) return `未找到搜索结果: ${query}`;
      return data.items.map((item: any, i: number) =>
        `${i + 1}. ${item.title}\n   链接: ${item.link}\n   摘要: ${item.snippet || "(无摘要)"}`
      ).join("\n\n");
    } finally {
      clearTimeout(timer);
    }
  } catch (err: any) {
    if (err.name === "AbortError") return `搜索超时`;
    return `搜索失败: ${err.message}`;
  }
}
