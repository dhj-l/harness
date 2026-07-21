export function transform_data({ input, from, to, delimiter = "," }: { input: string; from: "json" | "csv"; to: "json" | "csv"; delimiter?: string }): string {
  if (from === to) return input;
  try {
    if (from === "json" && to === "csv") {
      const data = JSON.parse(input);
      const arr = Array.isArray(data) ? data : [data];
      if (arr.length === 0) return "(空数据)";
      const headers = Object.keys(arr[0]);
      const lines = arr.map(row => headers.map(h => {
        const v = row[h];
        const s = v == null ? "" : String(v);
        return s.includes(delimiter) || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(delimiter));
      return [headers.join(delimiter), ...lines].join("\n");
    }
    if (from === "csv" && to === "json") {
      const lines = input.trim().split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return "(数据行不足)";
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const result = lines.slice(1).map(line => {
        const vals = parseCSVLine(line, delimiter);
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
        return obj;
      });
      return JSON.stringify(result, null, 2);
    }
    return `不支持转换: ${from} → ${to}`;
  } catch (err: any) {
    return `转换失败: ${err.message}`;
  }
}

function parseCSVLine(line: string, delim: string): string[] {
  const result: string[] = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuote = true;
      else if (ch === delim) { result.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  result.push(cur);
  return result;
}
