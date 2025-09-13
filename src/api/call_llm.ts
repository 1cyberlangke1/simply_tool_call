import OpenAI from "openai";
import { LLMconfig, ChatMessage } from "../types/types";
import { ToolRegister } from "../tool/register_tool";
import { parseTool, executeTool } from "../tool/execute_tool";
import { delayMs } from "../utils/delay";
import { errorStringify } from "../utils/stringify";

/**
 * 对OpenAI API的再次封装
 * @class LLM
 */
export class LLM {
  private _OpenAIclient: OpenAI;
  private _keys: Array<string>;
  private _chatConfig: {
    model: string;
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    max_tokens: number;
    stream: boolean;
  };
  private _retries: number;
  private _keyIndex: number = 0;
  private _apiUsage: number = 0;
  private _failedApiCalls: number = 0;

  /**
   * 构造 LLM 实例
   * @param {LLMconfig} config - LLM 配置对象，包含 API 地址、模型名称、调用参数等
   * @param {number} [retries=3] - 请求失败时的最大重试次数（不含首次请求），必须为非负整数
   */
  constructor(config: LLMconfig, retries: number = 3) {
    if (retries < 0) throw new Error("Retries must be a non-negative integer");
    this._retries = retries;
    this._OpenAIclient = new OpenAI({ baseURL: config.baseURL, apiKey: "" });
    this._keys = config.apiKey;
    this._chatConfig = {
      model: config.model,
      temperature: config.temperature,
      top_p: config.top_p,
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty,
      max_tokens: config.max_tokens,
      stream: false,
    };
  }

  /**
   * 通过json来请求
   * @param {OpenAI.ChatCompletionCreateParams} request
   * @return {Promise<OpenAI.ChatCompletion>}  返回 OpenAI API 的完整响应对象
   */
  async rawRequest(request: OpenAI.ChatCompletionCreateParams): Promise<OpenAI.ChatCompletion> {
    if (!request.messages[0])
      throw new Error("Messages array is empty. At least one message is required.");
    request.stream = false;
    for (let i = 1; i <= this._retries; i++) {
      this._OpenAIclient.apiKey = this._keys[this._keyIndex] as string;
      try {
        // console.log(`Now using key${this._keyIndex}`);
        const response = await this._OpenAIclient.chat.completions.create(request);
        this._keyIndex = (this._keyIndex + 1) % this._keys.length;
        return response as OpenAI.ChatCompletion;
      } catch (error) {
        ++this._failedApiCalls;
        if (i === this._retries) throw error;
        this._keyIndex = (this._keyIndex + 1) % this._keys.length;
        this._OpenAIclient.apiKey = this._keys[this._keyIndex] as string;
      } finally {
        ++this._apiUsage;
      }
    }
    throw new Error("All retries failed");
  }

  /**
   * 向 LLM 发起聊天请求，返回原始响应数据
   * @param {Array<ChatMessage>} messages - 聊天消息历史，格式符合 OpenAI 消息规范
   * @param {number} seed - 随机种子，用于控制生成结果的确定性（如果后端支持）
   * @returns {Promise<OpenAI.ChatCompletion>} 返回 OpenAI API 的完整响应对象
   * @description
   * 使用轮换的 API keys 发起请求，并在请求失败时自动重试。
   */
  async chat(messages: Array<ChatMessage>, seed?: number): Promise<OpenAI.ChatCompletion> {
    let params: OpenAI.ChatCompletionCreateParams = {
      messages: messages,
      ...this._chatConfig,
    };
    if (seed !== undefined && seed !== null) params.seed = seed;
    const response = await this.rawRequest(params);
    return response;
  }

  /**
   * 简化版聊天接口，直接返回模型生成的文本内容
   * @param {Array<ChatMessage>} messages - 聊天消息历史
   * @param {number} seed - 随机种子，用于控制生成结果的确定性
   * @returns {Promise<string>} 模型返回的文本内容
   */
  async simplyChat(messages: Array<ChatMessage>, seed?: number): Promise<string> {
    try {
      const response = await this.chat(messages, seed);
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error(`content not exist`);
      return content;
    } catch (error) {
      throw new Error(`LLM call failed: ${errorStringify(error)}`);
    }
  }

  /**
   *
   *  获取chat请求配置的拷贝
   * @return {*}  {{
   *     model: string;
   *     temperature: number;
   *     top_p: number;
   *     frequency_penalty: number;
   *     presence_penalty: number;
   *     max_tokens: number;
   *     stream: boolean;
   *   }}
   */
  getChatConfig(): {
    model: string;
    temperature: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
    max_tokens: number;
    stream: boolean;
  } {
    return { ...this._chatConfig };
  }
  /**
   * 获取模型名字
   * @return {*}  {string} 模型名字
   */
  getModelName(): string {
    return this._chatConfig.model;
  }

  /**
   * 获取API调用次数
   * @return {*}  {number}
   */
  getAPIusage(): number {
    return this._apiUsage;
  }

  /**
   * 获取API调用失败次数
   * @return {*}  {number}
   */
  getFailedApiCalls(): number {
    return this._failedApiCalls;
  }
}

/**
 * 工具调用
 * @export
 * @class LLMwithTool
 */
export class LLMwithTool {
  private readonly _LLM: LLM;
  private readonly _toolList: Array<string>;
  private readonly _toolDoc: string;
  private readonly _toolCallPromptFormat: "markdown" | "XML" | "remove";
  private readonly _delayMs: number;
  private readonly _maxToolCalls: number;
  /**
   * 构造一个支持工具调用的 LLM 代理实例。
   *
   * @param {LLM} LLMobject - 已配置好的 LLM 实例，用于实际发起模型推理请求
   * @param {Array<string>} toolNameList - 要启用的工具名称列表，必须在 ToolRegister 中已注册
   * @param {"markdown" | "XML"} [toolCallPromptFormat="XML"] - 工具调用历史的嵌入格式，
   * @param {number} [delayMs=1000] - 调用的延时, 防止频繁调用LLM
   *   控制最终回复中工具执行链的展示方式：
   *   - `"XML"`: 使用 `<tool>...</tool>` 标签包裹
   *   - `"markdown"`: 使用 ```tool ... ``` 代码块包裹
   *   - `"remove"`: 移除工具执行链(意味会导致只有结果)
   */
  constructor(
    LLMobject: LLM,
    toolNameList: Array<string>,
    toolCallPromptFormat: "markdown" | "XML" | "remove" = "XML",
    delayMs: number = 1000,
    maxToolCalls: number = 10
  ) {
    if (!toolNameList.length)
      throw new Error("toolNameList is required and must contain at least one tool name.");
    this._LLM = LLMobject;
    this._toolList = toolNameList;
    this._toolDoc = ToolRegister.getToolDoc(this._toolList);
    this._toolCallPromptFormat = toolCallPromptFormat;
    this._delayMs = delayMs;
    this._maxToolCalls = maxToolCalls;
  }

  /**
   * 通过json来请求
   * @param {OpenAI.ChatCompletionCreateParams} request
   * @return {Promise<OpenAI.ChatCompletion>}  返回 OpenAI API 的完整响应对象
   */
  async rawRequest(request: OpenAI.ChatCompletionCreateParams): Promise<OpenAI.ChatCompletion> {
    const newMessages: Array<ChatMessage> = request.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })) as Array<ChatMessage>;

    let result: OpenAI.ChatCompletion = {
      id: "",
      choices: [],
      created: 0,
      model: "",
      object: "chat.completion",
    }; // 返回值
    // 添加工具文档
    if (newMessages[0]?.role !== "system") newMessages.unshift({ role: "system", content: "" });
    if (newMessages[0]) newMessages[0].content += this._toolDoc;
    let completionTokens: number = 0; // 生成token量
    const chainOfToolCall: Array<ChatMessage> = []; // 工具调用链, 最后会被放到一个<tool></tool>或者一个tool代码框里面
    const trueRequest = { ...request, messages: newMessages } as OpenAI.ChatCompletionCreateParams;
    // 循环调用
    for (let i: number = 1; i <= this._maxToolCalls; ++i) {
      const response: any = await this._LLM.rawRequest(trueRequest);
      const content = response.choices[0]?.message?.content as string | null | undefined;
      if (!content) throw new Error(`content not exist`);
      // 触发工具调用
      let toolCallResult: any;
      try {
        const prase = parseTool(content);
        if (!prase) {
          result = response;
          break;
        }
        toolCallResult = String(await executeTool(prase));
        if (i === this._maxToolCalls) toolCallResult += "\n已经达到最大工具次数";
        newMessages.push(
          { role: "assistant", content: content },
          { role: "user", content: `工具${prase.toolObj.name}调用结果: ${toolCallResult}` }
        );
        chainOfToolCall.push(
          { role: "assistant", content: content },
          { role: "user", content: `工具${prase.toolObj.name}调用结果: ${toolCallResult}` }
        );
      } catch (error) {
        toolCallResult = errorStringify(error);
        newMessages.push(
          { role: "assistant", content: content },
          { role: "user", content: `工具调用结果: ${toolCallResult}` }
        );
        chainOfToolCall.push(
          { role: "assistant", content: content },
          { role: "user", content: `工具调用结果: ${toolCallResult}` }
        );
      }
      completionTokens += response?.usage?.completion_tokens ?? 0;
      await delayMs(this._delayMs);
      //console.log(content + "\n" + `工具${prase.toolObj.name}调用结果: ${toolCallResult}`);
    }

    // 总token调用
    if (result?.usage?.completion_tokens) result.usage.completion_tokens += completionTokens;
    if (result?.usage?.total_tokens) result.usage.total_tokens += completionTokens;

    // 合成工具调用链
    const message = result.choices[0]?.message;
    if (message?.content && chainOfToolCall.length > 0) {
      let chainOfToolCallString = "";
      for (const msg of chainOfToolCall) {
        const content = msg.content;
        chainOfToolCallString += content + (content.endsWith("\n") ? "" : "\n");
      }
      if (this._toolCallPromptFormat === "XML") {
        message.content = `<tool>\n${chainOfToolCallString}</tool>\n${message.content}`;
      } else if (this._toolCallPromptFormat === "markdown") {
        message.content = `\`\`\`tool\n${chainOfToolCallString}\`\`\`\n${message.content}`;
      } else if (this._toolCallPromptFormat === "remove") {
        // 那就不修改了
      }
    }
    //console.log(JSON.stringify(result));
    return result;
  }

  /**
   * 向 LLM 发起支持工具调用的聊天请求。
   * 该方法会自动解析模型输出中的工具调用指令，执行对应工具，并将结果循环反馈给模型，
   * 直到模型不再发起新的工具调用为止。最终返回原始响应对象，并在消息中嵌入工具调用链记录。
   *
   * @param {Array<ChatMessage>} messages - 聊天消息历史，格式符合 OpenAI 消息规范
   * @param {number} [seed] - 随机种子，用于控制生成结果的确定性（如果后端模型支持）
   * @returns {Promise<OpenAI.ChatCompletion>} 返回最终的 OpenAI API 响应对象，包含合并后的 usage 和增强后的消息内容
   * @throws {Error} 当输入消息为空、内容解析失败或工具执行出错时抛出错误
   */
  async chat(messages: Array<ChatMessage>, seed?: number): Promise<OpenAI.ChatCompletion> {
    let params: OpenAI.ChatCompletionCreateParams = {
      ...this._LLM.getChatConfig(),
      messages: messages,
    };
    if (seed !== undefined && seed !== null) params.seed = seed;
    const response = await this.rawRequest(params);
    return response;
  }

  /**
   * 简化版聊天接口，支持自动工具调用，直接返回最终的文本内容。
   * 内部调用 `chat()` 方法处理多轮工具交互，仅提取最终响应中的文本内容。
   *
   * @param {Array<ChatMessage>} messages - 聊天消息历史
   * @param {number} [seed] - 随机种子，用于控制生成结果的确定性
   * @returns {Promise<string>} 模型最终返回的纯文本内容
   */
  async simplyChat(messages: Array<ChatMessage>, seed?: number): Promise<string> {
    try {
      const response = await this.chat(messages, seed);
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error(`content not exist`);
      return content;
    } catch (error) {
      throw new Error(`LLM call failed: ${errorStringify(error)}`);
    }
  }

  /**
   * 获取模型名字
   * @return {*}  {string} 模型名字
   */
  getModelName(): string {
    return this._LLM.getModelName();
  }

  /**
   * 获取API调用次数
   * @return {*}  {number}
   */
  getAPIusage(): number {
    return this._LLM.getAPIusage();
  }

  /**
   * 获取API调用失败次数
   * @return {*}  {number}
   */
  getFailedApiCalls(): number {
    return this._LLM.getFailedApiCalls();
  }
}
