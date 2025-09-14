import { Tool } from "../types/types";
import { toolStringify } from "../utils/stringify";

export class ToolRegister {
  private static readonly _toolsMap: Map<string, Tool> = new Map();
  /**
   * 获取工具对象, 不存在直接抛出错误
   * @static
   * @param {string} toolName - 工具名称
   * @return {*}  {Tool} - 工具对象
   * @memberof ToolRegister
   */
  static getToolObj(toolName: string): Tool {
    const tool: Tool | undefined = ToolRegister._toolsMap.get(toolName);
    if (!tool) throw new Error(`tool ${toolName} no exist!`);
    return tool;
  }
  /**
   * 工具标识前缀字符
   * @static
   * @type {string}
   * @memberof ToolRegister
   */
  static prefixChar: string = "※";

  /**
   * 注册工具
   * @param {Tool} tool - 传入工具
   * @memberof ToolRegister
   */
  static addTool(tool: Tool): void {
    ToolRegister._toolsMap.set(tool.name, tool);
  }

  /**
   * 注册一些工具
   * @param {Tool} tools - 传入工具
   * @memberof ToolRegister
   */
  static addTools(tools: Array<Tool>): void {
    for (const it of tools) {
      ToolRegister._toolsMap.set(it.name, it);
    }
  }
  /**
   * 工具是否存在
   * @static
   * @param {string} toolName - 工具名称
   * @return {*}  {boolean} - 是否存在, 是就true
   * @memberof ToolRegister
   */
  static hasTool(toolName: string): boolean {
    return ToolRegister._toolsMap.has(toolName);
  }

  /**
   * 获取工具文档(提示词)
   * @static
   * @param {Array<string>} toolNames - 工具名字数组, 不存在直接抛出错误
   * @return {*}  {string} - 返回的文档
   * @memberof ToolRegister
   */
  static getToolDoc(toolNames: Array<string>): string {
    let result: string = "";
    for (let toolName of toolNames) {
      const tool = ToolRegister.getToolObj(toolName);
      result += toolStringify(tool, ToolRegister.prefixChar);
    }
    return toolCallPrompt + result;
  }
  /**
   * 获取所有工具文档(提示词)
   * @static
   * @return {*}  {string} - 返回的文档
   * @memberof ToolRegister
   */
  static getAllToolDoc(): string {
    let result: string = "";
    for (const tool of this._toolsMap.values()) {
      result += toolStringify(tool, ToolRegister.prefixChar);
    }
    return toolCallPrompt + result;
  }
}

const toolCallPrompt: string = `# 工具文档\n你可以使用以下工具来执行操作或者获取额外信息\n使用语法: ${ToolRegister.prefixChar}toolName 或者如果命令需要参数 ${ToolRegister.prefixChar}toolName("参数1", 1.2,...)\n不要使用代码块,字符串使用双引号.每次回复只能调用一个工具,后续的工具和注释将被忽略,但是默认允许多轮回复\n不允许自己编造工具调用结果\n不要解释或提及使用 \`<tool>\` 标签或 \`\`\`tool 代码块等格式.\n`;

//※|¶|
