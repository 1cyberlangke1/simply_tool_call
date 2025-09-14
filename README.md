# simply_tool_call

通过简单提示词工程的简单的工具调用实现

## 项目结构

```
src/
├── api/
│   ├── call_llm.ts          # LLM 调用核心实现
│   └── openai_chat_server.ts # OpenAI API 兼容服务器
├── example/
│   ├── callLLM.ts           # LLM 调用示例
│   └── externalService.ts   # 对外服务示例
├── tool/
│   ├── execute_tool.ts      # 工具执行器
│   └── register_tool.ts     # 工具注册器
├── types/
│   └── types.ts             # 类型定义
└── utils/                   # 工具函数
```

## 特性

- 🔧 **工具调用**: 通过提示词工程实现工具调用
- 🔄 **API 轮换**: 支持多个 API key 自动轮换
- 🛡️ **重试机制**: 请求失败自动重试
- 🌐 **兼容 OpenAI**: 提供 OpenAI API 兼容的服务端点, 便于接入前端调试
- 📊 **统计信息**: API 调用次数和失败统计