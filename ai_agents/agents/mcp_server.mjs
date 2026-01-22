import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";

const app = express();

const server = new McpServer({
  name: "Math Server",
  version: "1.0.0",
});

server.tool(
  "add",
  { a: z.number(), b: z.number() },
  async ({ a, b }) => {
    return {
      content: [{ type: "text", text: String(a + b) }],
    };
  }
);

let transport;

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
});

app.post("/message", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  }
});

app.listen(3002, () => {
  console.log("MCP Server running on http://localhost:3002/sse");
});
