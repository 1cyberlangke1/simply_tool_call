import { LLM, LLMwithTool } from "../api/call_llm";
import { LLMconfig, ChatMessage } from "../types/types";
import { ToolRegister } from "../tool/register_tool";

async function basicLLMExample() {
  const config = new LLMconfig({
    baseURL: "https://api.openai.com/v1",
    apiKey: ["sk-your-api-key"],
    model: "gpt-3.5-turbo",
  });

  const llm = new LLM(config);

  const messages: ChatMessage[] = [{ role: "user", content: "Hello, how are you today?" }];

  try {
    const response = await llm.simplyChat(messages);
    console.log("LLM Response:", response);
  } catch (error) {
    console.error("Error calling LLM:", error);
  }
}

async function LLMWithToolExample() {
  const config = new LLMconfig({
    baseURL: "https://api.openai.com/v1",
    apiKey: ["sk-your-api-key"],
    model: "gpt-3.5-turbo",
  });

  const llm = new LLM(config);

  ToolRegister.addTool({
    name: "get_weather",
    description: "Get current weather for a location",
    params: [
      {
        type: "string",
        name: "location",
        description: "City name",
      },
    ],
    perform: async (args) => {
      return `Weather in ${args.location}: Sunny, 25°C`;
    },
  });

  const llmWithTool = new LLMwithTool(llm, ["get_weather"]);

  const messages: ChatMessage[] = [
    { role: "user", content: "What's the weather like in Beijing?" },
  ];

  try {
    const response = await llmWithTool.simplyChat(messages);
    console.log("LLM with Tools Response:", response);
  } catch (error) {
    console.error("Error calling LLM with tools:", error);
  }
}

basicLLMExample();
LLMWithToolExample();
