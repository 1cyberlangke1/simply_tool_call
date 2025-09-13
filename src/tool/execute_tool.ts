import { Tool, ToolArg } from "../types/types";
import { ToolRegister } from "./register_tool";
import { _parseTool, parseIntNumber, parseFloatNumber, parseBoolean } from "../utils/parse";
import { unquote } from "../utils/formatString";
import { errorStringify } from "../utils/stringify";

/**
 * 解析工具, 拿到对应的工具对象和参数, 不存在或者参数不对抛出错误, 如果是普通字符串, 返回null
 * @export
 * @param {string} string - 输入字符串
 * @return {*}  {({
 *   toolObj: Tool;
 *   toolArgs: Array<number | string | boolean>;
 * } | null)} - 输出的对象
 */
export function parseTool(string: string): {
  toolObj: Tool;
  toolArgs: Array<number | string | boolean>;
} | null {
  const toolString: { toolName: string; toolArgs: Array<string> } | null = _parseTool(string);
  if (!toolString) return null;

  const toolObj: Tool = ToolRegister.getToolObj(toolString.toolName);
  const toolArgs: Array<number | string | boolean> = [];
  const expectedArgCount = toolObj?.params ? toolObj.params.length : 0;
  if (expectedArgCount != toolString.toolArgs.length) {
    throw new Error(
      `Tool "${toolString.toolName}" requires ${expectedArgCount} arguments, but got ${toolString.toolArgs.length}`
    );
  }
  for (let i: number = 0; i < expectedArgCount; ++i) {
    let arg: number | string | boolean = "";
    const argType = (toolObj.params as Array<ToolArg>)[i]?.type;
    const argString = toolString.toolArgs[i] as string;
    const argDomain = (toolObj.params as Array<ToolArg>)[i]?.domain;
    try {
      switch (argType) {
        case "int":
          arg = parseIntNumber(argString);
          break;
        case "float":
          arg = parseFloatNumber(argString);
          break;
        case "bool":
          arg = parseBoolean(argString);
          break;
        case "string":
          arg = unquote(argString);
          break;
      }
    } catch (error) {
      throw new Error(
        `Argument ${i + 1} of tool "${
          toolObj.name
        }" must be of type "${argType}", but ${errorStringify(error)}`
      );
    }
    if (argDomain) {
      let endPoint = argDomain[2];
      const left: number = argDomain[0];
      const right: number = argDomain[1];
      const argNumber = arg as number;
      if (!endPoint) endPoint = "[]";
      if (endPoint === "()" && (argNumber <= left || argNumber >= right)) {
        throw new Error(`Argument ${argNumber} is not in open interval (${left}, ${right})`);
      } else if (endPoint === "[)" && (argNumber < left || argNumber >= right)) {
        throw new Error(`Argument ${argNumber} is not in half-open interval [${left}, ${right})`);
      } else if (endPoint === "(]" && (argNumber <= left || argNumber > right)) {
        throw new Error(`Argument ${argNumber} is not in half-open interval (${left}, ${right}]`);
      } else if (endPoint === "[]" && (argNumber < left || argNumber > right)) {
        throw new Error(`Argument ${argNumber} is not in closed interval [${left}, ${right}]`);
      }
    }
    toolArgs.push(arg);
  }
  return { toolObj: toolObj, toolArgs: toolArgs };
}

/**
 *
 * 执行工具并返回结果
 * @export
 * @param {({
 *   toolObj: Tool; --工具对象
 *   args: Array<number | string | boolean>; --工具参数
 * })} args
 * @return {*}  {Promise<any>}
 */
export async function executeTool(args: {
  toolObj: Tool;
  toolArgs: Array<number | string | boolean>;
}): Promise<any> {
  let trueToolArgs: Record<string, any> = {};
  const params = args.toolObj.params;
  if (params) {
    for (let i = 0; i < params.length; ++i) {
      const param = params[i] as ToolArg;
      trueToolArgs[param.name] = args.toolArgs[i];
    }
  }
  return await args.toolObj.perform(trueToolArgs);
}
