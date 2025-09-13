import http from "http";
import express from "express";
import { LLM, LLMwithTool } from "./call_llm";
import { errorStringify } from "../utils/stringify";
import OpenAI from "openai";

// 对外提供OpenAI API服务
export class LLMServer {
  private readonly _LLM: LLM | LLMwithTool;
  private readonly _host: string;
  private readonly _port: number;
  private _server: http.Server | null = null;

  /**
   * 构造函数
   * @param {(LLM | LLMwithTool)} LLM 处理请求的对象
   * @param {string} [host="127.0.0.1"] 主机
   * @param {number} [port=3000] 端口
   */
  constructor(LLM: LLM | LLMwithTool, host: string = "127.0.0.1", port: number = 3000) {
    this._LLM = LLM;
    this._host = host;
    this._port = port;
  }

  startServer() {
    const server = express();
    // 中间件
    server.use(express.json({ limit: "100mb" }));
    // 健康
    server.get("/health", (req, res) => {
      res.json({
        status: "ok",
        timeStamp: new Date().toISOString(),
        model: this._LLM.getModelName(),
        apiUsage: this._LLM.getAPIusage(),
        failedApiCalls: this._LLM.getFailedApiCalls(),
      });
    });
    // 对话API兼容
    server.post("/v1/chat/completions", async (req, res) => {
      const isStream = !!req.body.stream;
      try {
        const response = await this._LLM.rawRequest(req.body);

        if (isStream) {
          // 设置流式响应头
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");

          const chuck: OpenAI.ChatCompletionChunk = {
            id: response.id,
            created: Math.floor(Date.now() / 1000),
            model: response.model,
            object: "chat.completion.chunk",
            usage: response.usage as OpenAI.Completions.CompletionUsage,
            choices: response.choices.map((choice) => ({
              delta: {
                ...(choice.message as any),
              },
              index: choice.index,
              finish_reason: null,
            })),
          };
          res.write(`data: ${JSON.stringify(chuck)}\n\n`);
          res.write(`date: [DONE]\n\n`);
          res.end();
        } else {
          res.json(response);
        }
      } catch (error) {
        res.status(500).json({ error: errorStringify(error) });
      }
    });
    // 可用模型端口兼容
    server.get("/v1/models", (req, res) => {
      res.json({
        object: "list",
        data: [{ id: this._LLM.getModelName(), object: "model" }],
      });
    });
    // 开始监听
    this._server = server.listen(this._port, this._host, () => {
      console.log(`Start OPENAI Chat Server @${this._host}:${this._port}`);
    });
  }

  closeServer() {
    if (this._server) {
      this._server.close(() => {
        console.log(`Close server @${this._host}:${this._port}`);
        this._server = null;
      });
    }
  }
}
