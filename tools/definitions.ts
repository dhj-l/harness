/**
 * ========================================
 * 工具定义（定义/常量）
 * ========================================
 *
 * 本文件集中管理所有 AI 工具的函数定义（Function Calling Schema）、
 * 角色黑名单以及子代理深度配置。
 * 单独抽离是为了避免 tools/index.ts 与 tools/tool/sub_agent.ts 之间
 * 出现循环依赖。
 */

/**
 * AI 工具函数定义列表。
 * 每个条目遵循 OpenAI Function Calling 的 JSON Schema 规范，
 * 用于告诉模型有哪些工具可用及如何调用。
 *
 * 使用 `as const` 确保 type: "function" 被推断为字面量类型
 * （而非 string），以满足 SDK 的类型约束。
 */
export const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_weather",
      description: "查询天气",
      parameters: {
        type: "object" as const,
        properties: {
          location: {
            type: "string" as const,
            description: "查询的天气地点",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "读取文件内容",
      parameters: {
        type: "object" as const,
        properties: {
          path: {
            type: "string" as const,
            description: "文件路径",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "load_skills",
      description: "加载技能",
      parameters: {
        type: "object" as const,
        properties: {
          name: {
            type: "string" as const,
            description: "技能名称",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "spawn_subagent",
      description: "启动一个子代理解决复杂的任务，只返回最终的结果",
      parameters: {
        type: "object" as const,
        properties: {
          system_prompt: {
            type: "string" as const,
            description: "子代理的系统提示词",
          },
          prompt: {
            type: "string" as const,
            description: "子代理的用户提示词",
          },
          deep: {
            type: "string" as const,
            enum: ["low", "medium", "high"],
            description: "问题的复杂度",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "summarize_subAgent",
      description:
        "【必须调用】这是你返回最终答案的唯一方式。当你完成任务并找到了答案后，请立即调用此函数返回答案。禁止直接输出文本，否则你的回答将被视为无效。",
      parameters: {
        type: "object" as const,
        properties: {
          content: {
            type: "string" as const,
            description: "查找到的答案",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ask_user",
      description:
        "当你需要向用户提问以获取更多信息、确认或选择时，调用此工具。你可以提供一个问题，以及可选的选项列表（数组）。",
      parameters: {
        type: "object" as const,
        properties: {
          question: {
            type: "string" as const,
            description: "你要向用户提出的问题",
          },
          options: {
            type: "array" as const,
            items: { type: "string" as const },
            description:
              "可选：提供给用户选择的选项列表。如果提供了选项，用户可以从其中选择一个；否则用户可自由输入。",
          },
        },
        required: ["question"],
      },
    },
  },
] as const;

/**
 * 子代理不允许调用的工具名称列表。
 * spawn_subagent：防止子代理无限制嵌套
 * load_skills：技能文件应由主代理管理
 * ask_user：只有主代理有权与用户交互
 */
export const subagent_tools_blacklist: readonly string[] = [
  "spawn_subagent",
  "load_skills",
  "ask_user",
];

/**
 * 主代理不允许调用的工具名称列表。
 * summarize_subAgent：该工具仅限子代理在上报最终结果时使用
 */
export const main_tools_blacklist: readonly string[] = ["summarize_subAgent"];

/**
 * 子代理按复杂度等级对应的最大思考轮数。
 * low    = 15 轮（简单问题，快速返回）
 * medium = 30 轮（中等复杂）
 * high   = 60 轮（复杂推理任务）
 */
export const DEEP_NUM: Record<string, number> = {
  low: 15,
  medium: 30,
  high: 60,
};
