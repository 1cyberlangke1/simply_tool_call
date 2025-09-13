import { ToolArg, Tool } from "../types/types";

/**
 *
 * 将工具参数变成格式化文档字符串
 * _参数名称_(_参数类型_){参数范围:_取值范围_}:_描述_
 * @export
 * @param {ToolArg} toolArg
 * @return {*}  {string} - 结果字符串
 */
export function toolArgStringify(toolArg: ToolArg): string {
  let result: string = `${toolArg.name}(${toolArg.type})`;
  if (toolArg.domain) {
    const domain = toolArg.domain;
    let endPoint: String | undefined = domain?.[2];
    if (!endPoint) endPoint = "[]";
    result += `{参数范围:${endPoint[0]}${domain[0]},${domain[1]}${endPoint[1]}}`;
  }
  if (toolArg.description) result += `:${toolArg.description}`;
  result += "\n";
  return result;
}

/**
 * 将工具参数变成格式化文档字符串
 * _工具名字_(_参数列表_):_工具描述_
 * 参数具体描述
 * @export
 * @param {Tool} tool
 * @return {*}  {string}
 */
export function toolStringify(tool: Tool, prefixChar: string = ""): string {
  let result: string = "";
  if (tool.params) {
    let toolArgString: string = "";
    let toolArgNameString: string = "";
    for (let i: number = 0; i < tool.params.length; ++i) {
      const param = tool.params[i] as ToolArg;
      if (i) toolArgNameString += ",";
      toolArgNameString += param.name;
      toolArgString += toolArgStringify(param);
    }
    result = `${prefixChar}${tool.name}(${toolArgNameString}):${tool.description}\n${toolArgString}`;
  } else {
    result = `${prefixChar}${tool.name}:${tool.description}\n`;
  }
  return result;
}

/**
 * 将Error字符串化
 * @export
 * @param {*} error - 错误
 * @return {*}  {string} - 字符串
 */
export function errorStringify(error: any): string {
  return error instanceof Error ? error.message : String(error);
}
