import { unquote } from "./formatString";
import { ToolRegister } from "../tool/register_tool";

/**
 * 字符串转整数, 不合法抛出异常
 * @export
 * @param {string} inString - 输入的字符串
 * @return {*}  {number} - 输出的数字
 */
export function parseIntNumber(inString: string): number {
  inString = unquote(inString);
  if (!/^[-+]?\d+$/.test(inString)) throw new Error(`"${inString}" is not a integer`);
  return parseInt(inString);
}

/**
 * 字符串转浮点数, 不合法抛出异常
 * @export
 * @param {string} inString - 输入的字符串
 * @return {*}  {number} - 输出的数字
 */
export function parseFloatNumber(inString: string): number {
  inString = unquote(inString);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(inString))
    throw new Error(`"${inString}" is not a float`);
  return parseFloat(inString);
}

/**
 * 字符串转布尔值, 不合法抛出异常
 * @export
 * @param {string} inString
 * @return {*}  {boolean}
 */
export function parseBoolean(inString: string): boolean {
  inString = inString.toLowerCase();
  switch (inString) {
    case "true":
    case "1":
      return true;
    case "false":
    case "0":
      return false;
  }
  throw new Error(`"${inString}" is not a bool`);
}

const toolRegex: RegExp = new RegExp(
  `${ToolRegister.prefixChar}(\\w+)(?:[(（)]([^)）]*)[)）])?`,
  "u"
);

/**
 * 从字符串中解析工具名称和参数
 * @export
 * @param {string} inString
 * @return {*}  {({ toolName: string; toolArgs: Array<string> } | null)}
 */
export function _parseTool(inString: string): { toolName: string; toolArgs: Array<string> } | null {
  // 先全局匹配看是否有多个工具调用
  const globalMatch = inString.match(new RegExp(toolRegex.source, "g"));
  if (globalMatch && globalMatch.length > 1) {
    throw new Error("Only one tool call is allowed.");
  }

  const match = inString.match(toolRegex);
  if (!match) return null;

  const toolName = match[1] as string;
  const result = {
    toolName: toolName,
    toolArgs: [] as Array<string>,
  };

  if (match[2]) {
    const toolArgString = match[2] as string;
    result.toolArgs.push(
      ...toolArgString
        ?.split(/[,，]/)
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0)
    );
  }

  return result;
}
