const API_KEY = process.env.WEATHER_API_KEY || "";
const BASE = "https://api.openweathermap.org/data/2.5/weather";

async function realWeather(location: string): Promise<string> {
  const url = `${BASE}?q=${encodeURIComponent(location)}&appid=${API_KEY}&lang=zh_cn&units=metric`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return `天气查询失败 (HTTP ${res.status})`;
    const data: any = await res.json();
    const desc = data.weather?.[0]?.description ?? "未知";
    const temp = data.main?.temp ?? "?";
    const feel = data.main?.feels_like ?? "?";
    const city = data.name ?? location;
    return `${city} 天气: ${desc}，温度 ${temp}°C，体感 ${feel}°C`;
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function get_weather({ location }: { location: string }): Promise<string> {
  if (API_KEY) {
    const real = await realWeather(location);
    if (real) return real;
  }
  return `${location} 的天气是晴朗（模拟数据；设置 WEATHER_API_KEY 可获取真实天气）`;
}
