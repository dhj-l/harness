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
  /**
   * 写入记忆工具。
   * 模型调用此工具将一条键值对记忆持久化到项目根目录的 memory.json。
   */
  {
    type: "function" as const,
    function: {
      name: "write_memory",
      description:
        "写入一条项目级记忆（键值对），存储在项目根目录的 memory.json 中。可用于记住用户偏好、项目约定、中间结论等跨会话信息。",
      parameters: {
        type: "object" as const,
        properties: {
          key: {
            type: "string" as const,
            description:
              "记忆的键名，应具有描述性，例如 '用户语言偏好'、'项目技术栈'",
          },
          value: {
            type: "string" as const,
            description: "记忆的值，存储与该键关联的文本内容",
          },
        },
        // key 和 value 均为必填参数
        required: ["key", "value"],
      },
    },
  },
  /**
   * 读取记忆工具。
   * 模型调用此工具根据键名查找之前保存的记忆。
   */
  {
    type: "function" as const,
    function: {
      name: "read_memory",
      description:
        "当遇到了信息不完全的情况，可以根据键名读取一条项目级记忆。如果键不存在，会返回友好的提示信息。",
      parameters: {
        type: "object" as const,
        properties: {
          key: {
            type: "string" as const,
            description: "要读取的记忆键名",
          },
        },
        required: ["key"],
      },
    },
  },
  /**
   * 列出记忆工具。
   * 模型调用此工具查看所有已保存的项目级记忆概览。
   */
  {
    type: "function" as const,
    function: {
      name: "list_memories",
      description:
        "当你需要查看所有已保存的记忆时，调用此工具。列出所有项目级记忆。无参数，返回每行一条 'key: value' 格式的文本列表。",
      parameters: {
        type: "object" as const,
        // 无参数，但 OpenAI Function Calling 要求 parameters 字段存在，故保留空对象
        properties: {},
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
