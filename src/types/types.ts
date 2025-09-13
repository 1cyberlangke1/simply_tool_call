type ToolArgType = "int" | "float" | "bool" | "string";
type DomainEndPoint = "[]" | "()" | "[)" | "(]";
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * 工具参数定义
 * 用于描述一个工具输入参数的类型、名称、描述和取值范围。
 */
export interface ToolArg {
  /**
   * 参数的数据类型
   * @default "int" | "float" | "bool" | "string"
   */
  type: ToolArgType;

  /**
   * 参数的名称
   * @example "userName"
   */
  name: string;

  /**
   * 参数的详细描述, 用于说明其用途（可选）
   * @example "用户名称"
   */
  description?: string;

  /**
   * 参数的取值范围（可选）
   * - 对于数字类型, 表示 [最小值, 最大值, 端点?]
   * @example [0, 100, "(]"]
   * @example [1, 1000]
   */
  domain?: [number, number, DomainEndPoint?];
}

/**
 * 工具定义
 * 描述一个工具的元信息（名称、描述、参数）和实际执行函数。
 */
export interface Tool {
  /**
   * 工具名称, 用于标识该工具
   * @example "webView"
   */
  name: string;

  /**
   * 工具描述, 用于说明其功能和用途
   * LLM可根据此描述决定是否调用该工具
   * @example "查看网页内容"
   */
  description: string;

  /**
   * 工具参数列表（可选）
   * 如果工具无需输入参数, 可省略此字段
   * 每个参数需符合 ToolArg 定义
   */
  params?: Array<ToolArg>;

  /**
   * 工具的执行函数
   * 当工具被调用时, 会传入参数对象并执行此函数
   */
  perform: (args: Record<string, any>) => any | Promise<any>;
}

/**
 * LLM 服务配置类
 * 用于配置与大语言模型服务通信的各项参数
 *
 * @example
 * const config = new LLMconfig({
 *   baseURL: "https://api.openai.com/v1",
 *   apiKey: ["sk-xxx"],
 *   model: "gpt-4",
 *   temperature: 0.8
 * });
 */
export class LLMconfig {
  /**
   * LLM 服务的 API 基础 URL
   * @example "https://api.openai.com/v1"
   * @example "https://api.anthropic.com"
   */
  baseURL: string;

  /**
   * API 密钥列表
   * 支持轮换使用多个密钥以提高可用性
   * 列表不能为空
   */
  apiKey: Array<string>;

  /**
   * 指定使用的模型名称
   * @example "gpt-3.5-turbo"
   * @example "gpt-4"
   * @example "claude-2"
   */
  model: string;

  /**
   * 温度参数，控制输出的随机性
   * 值越高，输出越随机；值越低，输出越确定
   * @default 0.7
   * @range 0.0 - 2.0
   */
  temperature: number;

  /**
   * Top-p 采样参数（核采样），控制输出的多样性
   * 模型会考虑概率质量占比 top_p 的最小 token 集合
   * @default 1.0
   * @range 0.0 - 1.0
   */
  top_p: number;

  /**
   * 频率惩罚参数，降低重复 token 的出现概率
   * 值越高，越能抑制重复内容
   * @default 0.2
   * @range -2.0 - 2.0
   */
  frequency_penalty: number;

  /**
   * 存在惩罚参数，鼓励生成新主题内容
   * 值越高，越倾向于引入新话题
   * @default 0.0
   * @range -2.0 - 2.0
   */
  presence_penalty: number;

  /**
   * 生成响应的最大 token 数量
   * 限制模型输出长度
   * @default 2000
   * @range 1 - (模型最大上下文长度)
   */
  max_tokens: number;

  /**
   * 构造函数
   * @param {Object} config - 配置对象
   * @param {string} config.baseURL - API 基础 URL
   * @param {string[]} config.apiKey - API 密钥列表（至少一个）
   * @param {string} config.model - 模型名称
   * @param {number} [config.temperature=0.7] - 温度参数
   * @param {number} [config.top_p=1.0] - Top-p 参数
   * @param {number} [config.frequency_penalty=0.2] - 频率惩罚
   * @param {number} [config.presence_penalty=0.0] - 存在惩罚
   * @param {number} [config.max_tokens=2000] - 最大生成 token 数
   *
   * @throws {Error} 当 apiKey 列表为空时抛出错误
   *
   * @example
   * new LLMconfig({
   *   baseURL: "https://api.openai.com/v1",
   *   apiKey: ["sk-xxx"],
   *   model: "gpt-4"
   * })
   */
  constructor(config: {
    baseURL: string;
    apiKey: Array<string>;
    model: string;
    temperature?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    max_tokens?: number;
  }) {
    this.baseURL = config.baseURL;
    if (!config.apiKey.length) throw new Error("API key list cannot be empty");
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.temperature = config?.temperature ?? 0.7;
    this.top_p = config?.top_p ?? 1.0;
    this.frequency_penalty = config?.frequency_penalty ?? 0.2;
    this.presence_penalty = config?.presence_penalty ?? 0.0;
    this.max_tokens = config?.max_tokens ?? 2000;
  }
}
