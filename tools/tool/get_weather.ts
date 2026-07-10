/**
 * 获取指定地点的天气信息（模拟函数，返回固定值）
 * @param location - 查询天气的地点名称
 * @returns 天气描述字符串
 */
export function get_weather({ location }: { location: string }): string {
  return `${location}的天气是晴朗`;
}
