import { config } from 'dotenv';
import readline from 'readline/promises';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

config();

let tools = [];

console.log("Loaded API Key:", process.env.GEMINI_API_KEY);

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const mcpClient = new Client({
  name: "example-client",
  version: "1.0.0",
});

const chatHistory = [];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Connect to MCP server and fetch tools
mcpClient.connect(new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp")))
  .then(async () => {
    console.log("✅ Connected to the MCP server");

    tools = (await mcpClient.listTools()).tools.map(tool => {
      return {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,   // schema from server
      };
    });

    console.log("📦 Available tools:", JSON.stringify(tools, null, 2));
  });

async function chatLoop() {
  const question = await rl.question('you: ');

  chatHistory.push({
    role: "user",
    parts: [{ text: question }],
  });

  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent({
    contents: chatHistory,
    tools: [
      {
        functionDeclarations: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters || {
            type: "object",
            properties: {},
          },
        })),
      },
    ],
  });

  // Print Gemini's normal text output
  const responseText = await result.response.text();
  if (responseText) {
    console.log("gemini:", responseText);
  }

  // Debug tool calls
  if (result.response.candidates?.[0]?.content?.parts) {
    for (const part of result.response.candidates[0].content.parts) {
      if (part.functionCall) {
        console.log("🔧 Tool requested:", part.functionCall.name);
        console.log("📩 With args:", part.functionCall.args);
      }
    }
  }

  chatLoop();
}

chatLoop();
