/**
 * 将工具参数类型转换为JS类型
 * @export
 * @param {string} type
 * @return {*}  {string}
 */
export function typeConversion(type: string): string {
  switch (type) {
    case "int":
    case "float":
      return "number";
    case "bool":
      return "boolean";
    case "string":
      return "string";
  }
  throw new Error(`unknow type: ${type}`);
}

/**
 * 移除输入字符串两段的引号和空白 支持 "" 和 ''
 * @export
 * @param {string} inString
 * @return {*}  {string}
 */
export function unquote(inString: string): string {
  inString = inString.trim();
  if (
    (inString[0] === inString[inString.length - 1] &&
      (inString[0] === '"' || inString[0] === "'")) ||
    (inString[0] === "“" && inString[inString.length - 1] === "”") ||
    (inString[0] === "‘" && inString[inString.length - 1] === "’")
  ) {
    inString = inString.substring(1, inString.length - 1);
  }
  return inString;
}
