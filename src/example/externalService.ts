import { LLMServer } from "../api/openai_chat_server";
import { LLM, LLMwithTool } from "../api/call_llm";
import { LLMconfig } from "../types/types";
import { ToolRegister } from "../tool/register_tool";

async function startBasicServerExample() {
  const config = new LLMconfig({
    baseURL: "https://api.openai.com/v1",
    apiKey: ["sk-your-api-key"],
    model: "gpt-3.5-turbo",
  });

  const llm = new LLM(config);
  const server = new LLMServer(llm, "127.0.0.1", 3000);

  server.startServer();
  console.log("Basic LLM Server started on http://127.0.0.1:3000");
  console.log("Health check: GET http://127.0.0.1:3000/health");
  console.log("Chat API: POST http://127.0.0.1:3000/v1/chat/completions");
}

async function startToolServerExample() {
  const config = new LLMconfig({
    baseURL: "https://api.openai.com/v1",
    apiKey: ["sk-your-api-key"],
    model: "gpt-3.5-turbo",
  });

  ToolRegister.addTool({
    name: "calculator",
    description: "Perform basic math calculations",
    params: [
      {
        type: "string",
        name: "expression",
        description: "Math expression to evaluate",
      },
    ],
    perform: async (args) => {
      try {
        const result = eval(args.expression);
        return `Result: ${result}`;
      } catch (error) {
        return `Error: Invalid expression`;
      }
    },
  });

  const llm = new LLM(config);
  const llmWithTool = new LLMwithTool(llm, ["calculator"]);
  const server = new LLMServer(llmWithTool, "127.0.0.1", 3001);

  server.startServer();
  console.log("LLM Tool Server started on http://127.0.0.1:3001");
  console.log("Try asking: What is 15 * 23 + 7?");
}

startBasicServerExample();
console.log("\n");
startToolServerExample();
