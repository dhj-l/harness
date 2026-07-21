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
        properties: {},
      },
    },
  },

  // ==================== 文件系统组 ====================

  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "将内容写入文件。自动创建父目录。如果文件已存在则覆盖。",
      parameters: {
        type: "object" as const,
        properties: {
          path: { type: "string" as const, description: "文件路径" },
          content: { type: "string" as const, description: "文件内容" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_directory",
      description: "列出目录内容，支持深度控制和模式过滤。",
      parameters: {
        type: "object" as const,
        properties: {
          path: { type: "string" as const, description: "目录路径" },
          depth: { type: "number" as const, description: "递归深度，默认1，最大5", default: 1 },
          pattern: { type: "string" as const, description: "可选的文件名过滤" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_files",
      description: "使用 glob 模式搜索文件。例如 *.ts 搜索所有 TypeScript 文件。",
      parameters: {
        type: "object" as const,
        properties: {
          pattern: { type: "string" as const, description: "glob 搜索模式，如 **/*.ts" },
          path: { type: "string" as const, description: "可选起始目录，默认工作空间根目录" },
          max_results: { type: "number" as const, description: "最大结果数，默认50，最大500", default: 50 },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_content",
      description: "在文件中搜索匹配正则表达式的行。递归搜索所有文件。",
      parameters: {
        type: "object" as const,
        properties: {
          pattern: { type: "string" as const, description: "正则表达式" },
          include: { type: "string" as const, description: "可选的文件后缀过滤，如 .ts" },
          path: { type: "string" as const, description: "可选搜索目录，默认工作空间根目录" },
          max_matches: { type: "number" as const, description: "最大匹配数，默认100，最大500", default: 100 },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_file",
      description: "删除指定文件。不可恢复，请确认后再操作。",
      parameters: {
        type: "object" as const,
        properties: {
          path: { type: "string" as const, description: "要删除的文件路径" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "file_info",
      description: "获取文件或目录的详细信息（大小、类型、修改时间、MIME等）。",
      parameters: {
        type: "object" as const,
        properties: {
          path: { type: "string" as const, description: "文件或目录路径" },
        },
        required: ["path"],
      },
    },
  },

  // ==================== 数据处理组 ====================

  {
    type: "function" as const,
    function: {
      name: "calculate",
      description: "安全计算数学表达式，支持 + - * / % ^ ( )。",
      parameters: {
        type: "object" as const,
        properties: {
          expression: { type: "string" as const, description: "数学表达式，如 (1+2)*3" },
        },
        required: ["expression"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "encode_decode",
      description: "编码或解码文本，支持 base64 / url / hex / unicode 格式。",
      parameters: {
        type: "object" as const,
        properties: {
          action: { type: "string" as const, enum: ["encode", "decode"], description: "编码或解码" },
          format: { type: "string" as const, enum: ["base64", "url", "hex", "unicode"], description: "编码格式" },
          text: { type: "string" as const, description: "待处理的文本" },
        },
        required: ["action", "format", "text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "hash_string",
      description: "计算字符串的哈希值，支持 md5、sha1、sha256。",
      parameters: {
        type: "object" as const,
        properties: {
          algorithm: { type: "string" as const, enum: ["md5", "sha1", "sha256"], description: "哈希算法" },
          text: { type: "string" as const, description: "要哈希的文本" },
        },
        required: ["algorithm", "text"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "transform_data",
      description: "在 JSON 和 CSV 之间互相转换数据格式。",
      parameters: {
        type: "object" as const,
        properties: {
          input: { type: "string" as const, description: "输入数据文本" },
          from: { type: "string" as const, enum: ["json", "csv"], description: "输入格式" },
          to: { type: "string" as const, enum: ["json", "csv"], description: "输出格式" },
          delimiter: { type: "string" as const, description: "CSV 分隔符，默认逗号", default: "," },
        },
        required: ["input", "from", "to"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generate_uuid",
      description: "生成 UUID v4（随机）或 v7（时间戳排序），支持批量生成。",
      parameters: {
        type: "object" as const,
        properties: {
          version: { type: "string" as const, enum: ["v4", "v7"], description: "UUID 版本，默认 v4", default: "v4" },
          count: { type: "number" as const, description: "生成数量，默认1，最大100", default: 1 },
        },
      },
    },
  },

  // ==================== 网络组 ====================

  {
    type: "function" as const,
    function: {
      name: "fetch_url",
      description: "发送 HTTP 请求获取网页内容或 API 响应。支持 GET/POST，可配超时和自定义头。",
      parameters: {
        type: "object" as const,
        properties: {
          url: { type: "string" as const, description: "请求 URL" },
          method: { type: "string" as const, enum: ["GET", "POST"], description: "HTTP 方法，默认 GET", default: "GET" },
          headers: { type: "object" as const, description: "可选的自定义请求头" },
          body: { type: "string" as const, description: "POST 请求体" },
          timeout: { type: "number" as const, description: "超时秒数，默认15，最大120", default: 15 },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "搜索网络获取最新信息。需要配置 SEARCH_API_KEY 和 SEARCH_ENGINE_ID 环境变量。",
      parameters: {
        type: "object" as const,
        properties: {
          query: { type: "string" as const, description: "搜索关键词" },
          count: { type: "number" as const, description: "返回结果数，默认5，最大20", default: 5 },
        },
        required: ["query"],
      },
    },
  },

  // ==================== 代码/调试组 ====================

  {
    type: "function" as const,
    function: {
      name: "execute_command",
      description: "在终端执行白名单命令（node/npm/git/dir/pwd/echo/type/python等）。有超时保护和安全限制。",
      parameters: {
        type: "object" as const,
        properties: {
          command: { type: "string" as const, description: "要执行的命令" },
          timeout: { type: "number" as const, description: "超时秒数，默认30，最大120", default: 30 },
          cwd: { type: "string" as const, description: "可选工作目录" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "git_tools",
      description: "执行 Git 操作：查看状态(status)、提交历史(log)、差异(diff)、分支列表(branch)。",
      parameters: {
        type: "object" as const,
        properties: {
          action: { type: "string" as const, enum: ["status", "log", "diff", "branch"], description: "Git 操作类型" },
          path: { type: "string" as const, description: "可选仓库路径" },
          limit: { type: "number" as const, description: "log 显示条数，默认10，最大100", default: 10 },
        },
        required: ["action"],
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
  "execute_command",
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
