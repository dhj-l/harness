export function calculate({ expression }: { expression: string }): string {
  const sanitized = expression.replace(/\s/g, "");
  if (!/^[\d+\-*/().%^,]+$/.test(sanitized)) {
    return `表达式包含不允许的字符，仅支持数字和 + - * / % ^ ( )`;
  }
  if (/[eE]/.test(sanitized)) return `不安全表达式，已拒绝`;
  try {
    const fn = new Function(`"use strict"; return (${sanitized})`);
    const result = fn();
    if (typeof result !== "number" || !isFinite(result)) return `结果无效: ${result}`;
    return String(result);
  } catch (err: any) {
    return `计算失败: ${err.message}`;
  }
}
